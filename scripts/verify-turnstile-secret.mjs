import fs from 'node:fs';
import path from 'node:path';

function loadSecretFromEnvFiles() {
  const keys = ['TURNSTILE_SECRET_KEY', 'TURNSTILE_SECRET'];
  for (const key of keys) {
    const val = process.env[key]?.trim();
    if (val) return { key, value: val };
  }

  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) continue;
    for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const name = line.slice(0, eq).trim();
      if (!keys.includes(name)) continue;
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (val.trim()) return { key: `${name} (${filename})`, value: val.trim() };
    }
  }

  return null;
}

async function main() {
  const found = loadSecretFromEnvFiles();
  if (!found) {
    console.error(
      '❌ TURNSTILE_SECRET_KEY / TURNSTILE_SECRET belum diset di environment atau .env / .env.local.'
    );
    process.exit(1);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(10_000),
    body: new URLSearchParams({
      secret: found.value,
      response: 'XXXX.DUMMY.TOKEN.XXXX',
    }),
  });

  if (!response.ok) {
    console.error(`❌ Cloudflare siteverify HTTP error: ${response.status}`);
    process.exit(1);
  }

  const payload = await response.json();
  const errorCodes = Array.isArray(payload['error-codes']) ? payload['error-codes'] : [];

  if (
    payload.success === false &&
    errorCodes.includes('invalid-input-response') &&
    !errorCodes.includes('invalid-input-secret')
  ) {
    console.log(
      `✅ Turnstile secret tervalidasi (${found.key}): dummy token diterima sebagai secret valid.`
    );
    process.exit(0);
  }

  console.error(
    `❌ Validasi secret Turnstile gagal (${found.key}). error-codes: ${JSON.stringify(errorCodes)}`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('❌ Gagal menghubungi Cloudflare siteverify:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
