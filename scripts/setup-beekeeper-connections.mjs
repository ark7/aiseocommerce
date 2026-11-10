import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const BEEKEEPER_DIR = '/home/ngabsenid/.config/beekeeper-studio';
const DB_PATH = path.join(BEEKEEPER_DIR, 'app.db');
const KEY_PATH = path.join(BEEKEEPER_DIR, '.key');

const DEFAULT_ENCRYPTION_KEY = '38782F413F442A472D4B6150645367566B59703373367639792442264529482B';

function createEncryptor(key) {
  const cryptoKey = crypto.createHash('sha256').update(key).digest();

  function hmac(text) {
    return crypto.createHmac('sha256', cryptoKey).update(text).digest('hex');
  }

  return {
    encrypt(obj) {
      const json = JSON.stringify(obj);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', cryptoKey, iv);
      const encryptedJson = cipher.update(json, 'utf8', 'base64') + cipher.final('base64');
      let result = iv.toString('hex') + encryptedJson;
      result = hmac(result) + result;
      return result;
    },
    decrypt(cipherText) {
      if (!cipherText) return null;
      const expectedHmac = cipherText.substring(0, 64);
      const remaining = cipherText.substring(64);
      const actualHmac = hmac(remaining);
      if (actualHmac !== expectedHmac) throw new Error('HMAC mismatch');
      const iv = Buffer.from(remaining.substring(0, 32), 'hex');
      const encryptedJson = remaining.substring(32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', cryptoKey, iv);
      const json = decipher.update(encryptedJson, 'base64', 'utf8') + decipher.final('utf8');
      return JSON.parse(json);
    }
  };
}

function getBeekeeperKey() {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error(`Beekeeper key file not found at: ${KEY_PATH}`);
  }
  const keyFileContent = fs.readFileSync(KEY_PATH, 'utf8').trim();
  const defaultEncryptor = createEncryptor(DEFAULT_ENCRYPTION_KEY);
  const decrypted = defaultEncryptor.decrypt(keyFileContent);
  if (!decrypted || !decrypted.encryptionKey) {
    throw new Error('Failed to decrypt Beekeeper Studio master encryption key.');
  }
  return decrypted.encryptionKey;
}

function now() {
  const d = new Date();
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

export async function setupConnections() {
  console.log('🐝 Mengonfigurasi Beekeeper Studio Database Connections...');

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Beekeeper Studio database not found at: ${DB_PATH}`);
  }

  const appKey = getBeekeeperKey();
  const encryptor = createEncryptor(appKey);

  const remotePassword = 'npg_1u2GyWNRqVgz';
  const localPassword = 'postgres123';

  const connections = [
    {
      name: 'AI SEO E-Commerce - Remote Neon DB (AWS Singapore)',
      connectionType: 'postgres',
      host: 'ep-icy-scene-azp2bur3-pooler.c-3.ap-southeast-1.aws.neon.tech',
      port: 5432,
      username: 'neondb_owner',
      password: encryptor.encrypt(remotePassword),
      defaultDatabase: 'neondb',
      ssl: 1,
      sslRejectUnauthorized: 0,
      labelColor: 'red',
      position: 1.0,
    },
    {
      name: 'AI SEO E-Commerce - Local PostgreSQL',
      connectionType: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: encryptor.encrypt(localPassword),
      defaultDatabase: 'aiseocommerce_local',
      ssl: 0,
      sslRejectUnauthorized: 0,
      labelColor: 'green',
      position: 2.0,
    }
  ];

  const db = new DatabaseSync(DB_PATH);

  try {
    const findStmt = db.prepare('SELECT id FROM saved_connection WHERE name = ? OR (host = ? AND defaultDatabase = ?)');
    const updateStmt = db.prepare(`
      UPDATE saved_connection SET
        updatedAt = ?,
        connectionType = ?,
        host = ?,
        port = ?,
        username = ?,
        password = ?,
        defaultDatabase = ?,
        ssl = ?,
        sslRejectUnauthorized = ?,
        labelColor = ?,
        rememberPassword = 1,
        options = ?,
        position = ?
      WHERE id = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO saved_connection (
        createdAt, updatedAt, version, connectionType, host, port, username, defaultDatabase,
        path, url, uniqueHash, name, password, sshEnabled, sshHost, sshPort, sshMode,
        sshKeyfile, sshUsername, rememberPassword, rememberSshPassword, rememberSshKeyfilePassword,
        sshKeyfilePassword, sshPassword, ssl, sshBastionHost, labelColor, serviceName, domain,
        sslCaFile, sslCertFile, sslKeyFile, sslRejectUnauthorized, workspaceId, trustServerCertificate,
        socketPathEnabled, socketPath, options, sshKeepaliveInterval, redshiftOptions, cassandraOptions,
        readOnlyMode, bigQueryOptions, azureAuthOptions, authId, libsqlOptions, sqlAnywhereOptions,
        surrealDbOptions, iamAuthOptions, connectionFolderId, position, sshBastionHostPort,
        sshBastionMode, sshBastionUsername, sshBastionKeyfile, sshBastionPassword,
        sshBastionKeyfilePassword, dynamoDbOptions, snowflakeOptions, windowsAuthEnabled, sqlServerOptions
      ) VALUES (
        ?, ?, 2, ?, ?, ?, ?, ?,
        NULL, NULL, 'DEPRECATED', ?, ?, 0, NULL, NULL, 'keyfile',
        NULL, NULL, 1, 1, 1,
        NULL, NULL, ?, NULL, ?, NULL, NULL,
        NULL, NULL, NULL, ?, -1, 0,
        0, NULL, ?, 60, '{}', '{}',
        0, '{}', '{}', NULL, '{}', '{}',
        '{}', '{}', NULL, ?, NULL,
        'agent', NULL, NULL, NULL,
        NULL, '{}', '{}', 0, '{}'
      )
    `);

    for (const conn of connections) {
      const existing = findStmt.get(conn.name, conn.host, conn.defaultDatabase);
      const timestamp = now();
      const optionsJson = JSON.stringify({ connectionMethod: 'manual' });

      if (existing) {
        updateStmt.run(
          timestamp,
          conn.connectionType,
          conn.host,
          conn.port,
          conn.username,
          conn.password,
          conn.defaultDatabase,
          conn.ssl,
          conn.sslRejectUnauthorized,
          conn.labelColor,
          optionsJson,
          conn.position,
          existing.id
        );
        console.log(`✅ Diperbarui: "${conn.name}" (ID: ${existing.id}) [Label: ${conn.labelColor}]`);
      } else {
        insertStmt.run(
          timestamp,
          timestamp,
          conn.connectionType,
          conn.host,
          conn.port,
          conn.username,
          conn.defaultDatabase,
          conn.name,
          conn.password,
          conn.ssl,
          conn.labelColor,
          conn.sslRejectUnauthorized,
          optionsJson,
          conn.position
        );
        console.log(`✅ Ditambahkan: "${conn.name}" [Label: ${conn.labelColor}]`);
      }
    }

    // Verify all saved connections
    const allQuery = db.prepare('SELECT id, name, connectionType, host, port, username, defaultDatabase, ssl, labelColor FROM saved_connection ORDER BY id ASC');
    const allConnections = allQuery.all();
    console.log('\n📋 Daftar Semua Koneksi di Beekeeper Studio saat ini:');
    console.table(allConnections);

  } finally {
    db.close();
  }
}

// Run if called directly
setupConnections().catch((err) => {
  console.error('❌ Gagal mengonfigurasi koneksi:', err);
  process.exit(1);
});

