import { PrismaClient } from '@prisma/client';
import { upsertIdCardShowcaseProduct } from '../prisma/batchShowcaseData';

const prisma = new PrismaClient();

async function run() {
  const store = await prisma.store.findFirst({
    where: {
      OR: [
        { id: 'demo-store-001' },
        { domain: 'demo.larismanis.online' },
        { domain: 'demo-store.local' },
      ],
    },
    select: { id: true, name: true, domain: true },
  });

  if (!store) {
    throw new Error('Demo store not found in database');
  }

  const product = await upsertIdCardShowcaseProduct(prisma, store.id);
  console.log(
    `✅ Showcase Batch Pricing upserted for ${store.name} (${store.domain}): ${product.name} [slug=${product.slug}]`
  );
}

run()
  .catch((err) => {
    console.error('❌ Failed to upsert batch pricing showcase:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
