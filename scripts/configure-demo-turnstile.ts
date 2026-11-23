import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_SITE_KEY = '0x4AAAAAAGOyEGvopPqTPLIf';

function readEnvValue(key: string): string {
  const fromEnv = process.env[key]?.trim();
  if (fromEnv) return fromEnv;

  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) continue;
    for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      if (line.slice(0, eq).trim() !== key) continue;
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (val) return val.trim();
    }
  }

  return '';
}

async function run() {
  const demoStore = await prisma.store.findFirst({
    where: {
      OR: [
        { id: 'demo-store-001' },
        { domain: 'demo.larisdari.web.id' },
        { isDemo: true },
      ],
    },
    include: { settings: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!demoStore) {
    throw new Error('Demo store not found in database.');
  }

  const useExistingDbSecret = process.argv.includes('--use-existing-db-secret');
  const targetSiteKey = readEnvValue('NEXT_PUBLIC_TURNSTILE_SITE_KEY') || DEFAULT_SITE_KEY;
  const envSecret = readEnvValue('TURNSTILE_SECRET_KEY') || readEnvValue('TURNSTILE_SECRET');
  const dbSecret = demoStore.settings?.turnstileSecretKey?.trim() || '';
  const hasEnvSecret = Boolean(envSecret);
  const hasExistingDbSecret = Boolean(dbSecret);
  const enableTurnstile = hasEnvSecret || (useExistingDbSecret && hasExistingDbSecret);

  const settingsPayload: {
    turnstileSiteKey: string;
    turnstileEnabled: boolean;
    turnstileSecretKey?: null;
  } = {
    turnstileSiteKey: targetSiteKey,
    turnstileEnabled: enableTurnstile,
  };

  if (hasEnvSecret) {
    // Clear any stale DB secret override so .env / .env.production stays authoritative
    settingsPayload.turnstileSecretKey = null;
  }

  if (demoStore.settings) {
    await prisma.storeSettings.update({
      where: { storeId: demoStore.id },
      data: settingsPayload,
    });
  } else {
    await prisma.storeSettings.create({
      data: {
        storeId: demoStore.id,
        ...settingsPayload,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        storeId: demoStore.id,
        domain: demoStore.domain,
        turnstileSiteKey: targetSiteKey,
        hasEnvSecret,
        hasExistingDbSecret,
        turnstileEnabled: enableTurnstile,
      },
      null,
      2
    )
  );

  if (!enableTurnstile) {
    console.log(
      'ℹ️ TURNSTILE_SECRET_KEY / TURNSTILE_SECRET belum diset di .env / .env.local. turnstileSiteKey sudah disimpan, namun turnstileEnabled diset false untuk mencegah mismatch dengan secret lama. Tambahkan TURNSTILE_SECRET_KEY ke .env / .env.production lalu jalankan: node scripts/verify-turnstile-secret.mjs && npx ts-node scripts/configure-demo-turnstile.ts'
    );
  }
}

run()
  .catch((err) => {
    console.error('❌ Gagal mengonfigurasi Turnstile demo store:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
