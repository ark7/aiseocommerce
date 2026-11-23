import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_DOMAIN = 'demo.larisdari.web.id';
const TARGET_NAME = 'LarisDari Demo Store';

function migrateBrandText(value?: string | null): string | null | undefined {
  if (typeof value !== 'string') return value;
  return value
    .replace(/LarisManis\.online/gi, 'LarisDari.web.id')
    .replace(/LarisManis Demo Store/gi, TARGET_NAME)
    .replace(/LarisManis/gi, 'LarisDari')
    .replace(/demo\.larismanis\.online/gi, TARGET_DOMAIN)
    .replace(/larismanis\.online/gi, 'larisdari.web.id');
}

async function run() {
  const demoStore = await prisma.store.findFirst({
    where: {
      OR: [
        { id: 'demo-store-001' },
        { domain: TARGET_DOMAIN },
        { domain: 'demo.larismanis.online' },
        { domain: 'demo-store.local' },
        { isDemo: true },
      ],
    },
    include: { settings: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!demoStore) {
    console.log('ℹ️ Tidak ditemukan store demo di database; tidak ada perubahan yang diperlukan.');
    return;
  }

  const beforeSummary = {
    id: demoStore.id,
    domain: demoStore.domain,
    name: demoStore.name,
    businessName: demoStore.settings?.businessName ?? null,
    defaultSeoTitle: demoStore.settings?.defaultSeoTitle ?? null,
    heroSubtitle: demoStore.settings?.heroSubtitle ?? null,
  };

  if (demoStore.domain !== TARGET_DOMAIN) {
    const conflict = await prisma.store.findUnique({
      where: { domain: TARGET_DOMAIN },
      select: { id: true, name: true, domain: true, isDemo: true },
    });
    if (conflict && conflict.id !== demoStore.id) {
      throw new Error(
        `Domain ${TARGET_DOMAIN} sudah digunakan oleh store lain (${conflict.id} / ${conflict.name}).`
      );
    }
  }

  const nextName = /larismanis/i.test(demoStore.name) ? TARGET_NAME : demoStore.name;
  const shouldUpdateStore =
    demoStore.domain !== TARGET_DOMAIN || nextName !== demoStore.name;

  if (shouldUpdateStore) {
    await prisma.store.update({
      where: { id: demoStore.id },
      data: {
        domain: TARGET_DOMAIN,
        name: nextName,
      },
    });
  }

  if (demoStore.settings) {
    const nextBusinessName = migrateBrandText(demoStore.settings.businessName) ?? null;
    const nextHeroSubtitle = migrateBrandText(demoStore.settings.heroSubtitle) ?? null;
    const nextDefaultSeoTitle = migrateBrandText(demoStore.settings.defaultSeoTitle) ?? null;

    const shouldUpdateSettings =
      nextBusinessName !== demoStore.settings.businessName ||
      nextHeroSubtitle !== demoStore.settings.heroSubtitle ||
      nextDefaultSeoTitle !== demoStore.settings.defaultSeoTitle;

    if (shouldUpdateSettings) {
      await prisma.storeSettings.update({
        where: { storeId: demoStore.id },
        data: {
          businessName: nextBusinessName,
          heroSubtitle: nextHeroSubtitle,
          defaultSeoTitle: nextDefaultSeoTitle,
        },
      });
    }
  }

  const updatedStore = await prisma.store.findUnique({
    where: { id: demoStore.id },
    include: { settings: true },
  });

  const afterSummary = {
    id: updatedStore?.id,
    domain: updatedStore?.domain,
    name: updatedStore?.name,
    businessName: updatedStore?.settings?.businessName ?? null,
    defaultSeoTitle: updatedStore?.settings?.defaultSeoTitle ?? null,
    heroSubtitle: updatedStore?.settings?.heroSubtitle ?? null,
  };

  console.log('✅ Migrasi domain demo store selesai (idempoten):');
  console.log('Before:', JSON.stringify(beforeSummary, null, 2));
  console.log('After :', JSON.stringify(afterSummary, null, 2));
}

run()
  .catch((err) => {
    console.error('❌ Gagal migrasi domain demo store:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
