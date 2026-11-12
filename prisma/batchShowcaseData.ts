import type { PrismaClient } from '@prisma/client';

export interface ShowcaseTierSpec {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}

export interface ShowcaseVariantSpec {
  id: string;
  optionType: 'CUSTOM';
  optionValue: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minOrderQty: number;
  tiers: ShowcaseTierSpec[];
}

export const SHOWCASE_CATEGORY_SPEC = {
  id: 'demo-cat-06',
  name: 'Percetakan & Merchandise',
  slug: 'percetakan-merchandise',
  description:
    'Layanan cetak kartu identitas PVC, merchandise acara, dan perlengkapan kantor custom dengan harga grosir bertingkat.',
};

export const ID_CARD_PVC_SHOWCASE = {
  id: 'demo-prod-idcard-001',
  name: 'Cetak ID Card PVC Custom (Ekonomis Pigmen & Premium Laser)',
  slug: 'cetak-id-card-pvc-custom',
  sku: 'IDCARD-PVC-CUSTOM',
  shortDescription:
    'Cetak ID Card PVC tebal 0.76mm berkualitas tajam untuk karyawan, panitia event, dan kartu pelajar dengan daftar harga grosir bertingkat.',
  description:
    '<p><strong>Cetak ID Card PVC Custom</strong> menggunakan material PVC berkualitas kartu ATM (0.76mm), tahan air, dan tidak mudah pudar.</p><ul><li><strong>Ekonomis (Pigmen)</strong>: Cocok untuk kebutuhan event, panitia, dan pemesanan satuan mulai 1 pcs.</li><li><strong>Premium (Laser)</strong>: Hasil cetak laser super tajam, warna solid tahan lama untuk kartu karyawan/anggota tetap (minimal pemesanan 11 pcs).</li></ul><p>Pilih varian dan masukkan jumlah pesanan untuk mendapatkan tarif grosir otomatis per rentang kuantitas.</p>',
  imageUrl: '/images/id-card-pvc-demo.jpg',
  imageAlt: 'Cetak ID Card PVC Custom Ekonomis Pigmen dan Premium Laser',
  basePrice: 1400,
  sellingPrice: 1800,
  stock: 10000,
  minOrderQty: 1,
  variants: [
    {
      id: 'demo-var-idcard-eco',
      optionType: 'CUSTOM',
      optionValue: 'Ekonomis (Pigmen)',
      name: 'Ekonomis (Pigmen)',
      sku: 'IDCARD-ECO',
      price: 5250,
      stock: 5000,
      minOrderQty: 1,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 5250 },
        { minQty: 11, maxQty: 20, unitPrice: 4750 },
        { minQty: 21, maxQty: 30, unitPrice: 4250 },
        { minQty: 31, maxQty: 40, unitPrice: 3750 },
        { minQty: 41, maxQty: 49, unitPrice: 3250 },
        { minQty: 50, maxQty: 99, unitPrice: 2750 },
        { minQty: 100, maxQty: 499, unitPrice: 2250 },
        { minQty: 500, maxQty: 999, unitPrice: 2000 },
        { minQty: 1000, maxQty: null, unitPrice: 1800 },
      ],
    },
    {
      id: 'demo-var-idcard-prem',
      optionType: 'CUSTOM',
      optionValue: 'Premium (Laser)',
      name: 'Premium (Laser)',
      sku: 'IDCARD-PREM',
      price: 6000,
      stock: 5000,
      minOrderQty: 11,
      tiers: [
        { minQty: 11, maxQty: 20, unitPrice: 6000 },
        { minQty: 21, maxQty: 30, unitPrice: 5000 },
        { minQty: 31, maxQty: 40, unitPrice: 4500 },
        { minQty: 41, maxQty: 49, unitPrice: 4000 },
        { minQty: 50, maxQty: 99, unitPrice: 3500 },
        { minQty: 100, maxQty: 499, unitPrice: 3000 },
        { minQty: 500, maxQty: 999, unitPrice: 2750 },
        { minQty: 1000, maxQty: null, unitPrice: 2550 },
      ],
    },
  ] satisfies ShowcaseVariantSpec[],
};

/**
 * Idempotently upserts the batch-pricing ID Card PVC showcase product, variants,
 * category, image, and all 17 price tiers for a store without disturbing existing data.
 */
export async function upsertIdCardShowcaseProduct(prisma: PrismaClient, storeId: string) {
  const category = await prisma.category.upsert({
    where: {
      storeId_slug: {
        storeId,
        slug: SHOWCASE_CATEGORY_SPEC.slug,
      },
    },
    update: {
      name: SHOWCASE_CATEGORY_SPEC.name,
      description: SHOWCASE_CATEGORY_SPEC.description,
    },
    create: {
      id: storeId === 'demo-store-001' ? SHOWCASE_CATEGORY_SPEC.id : undefined,
      storeId,
      name: SHOWCASE_CATEGORY_SPEC.name,
      slug: SHOWCASE_CATEGORY_SPEC.slug,
      description: SHOWCASE_CATEGORY_SPEC.description,
    },
  });

  const existing = await prisma.product.findUnique({
    where: {
      storeId_slug: {
        storeId,
        slug: ID_CARD_PVC_SHOWCASE.slug,
      },
    },
    select: { id: true },
  });

  const product = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: ID_CARD_PVC_SHOWCASE.name,
          shortDescription: ID_CARD_PVC_SHOWCASE.shortDescription,
          description: ID_CARD_PVC_SHOWCASE.description,
          basePrice: ID_CARD_PVC_SHOWCASE.basePrice,
          sellingPrice: ID_CARD_PVC_SHOWCASE.sellingPrice,
          discountPrice: null,
          saleStartsAt: null,
          saleEndsAt: null,
          saleQuota: null,
          stock: ID_CARD_PVC_SHOWCASE.stock,
          minStock: 50,
          hasBatchPricing: true,
          minOrderQty: ID_CARD_PVC_SHOWCASE.minOrderQty,
          isPublished: true,
          isFeatured: true,
          sandboxEnabled: false,
          categoryId: category.id,
        },
      })
    : await prisma.product.create({
        data: {
          id: storeId === 'demo-store-001' ? ID_CARD_PVC_SHOWCASE.id : undefined,
          storeId,
          sku: ID_CARD_PVC_SHOWCASE.sku,
          name: ID_CARD_PVC_SHOWCASE.name,
          slug: ID_CARD_PVC_SHOWCASE.slug,
          shortDescription: ID_CARD_PVC_SHOWCASE.shortDescription,
          description: ID_CARD_PVC_SHOWCASE.description,
          basePrice: ID_CARD_PVC_SHOWCASE.basePrice,
          sellingPrice: ID_CARD_PVC_SHOWCASE.sellingPrice,
          stock: ID_CARD_PVC_SHOWCASE.stock,
          minStock: 50,
          hasBatchPricing: true,
          minOrderQty: ID_CARD_PVC_SHOWCASE.minOrderQty,
          isPublished: true,
          isFeatured: true,
          sandboxEnabled: false,
          categoryId: category.id,
        },
      });

  await prisma.productPriceTier.deleteMany({ where: { productId: product.id } });
  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.productImage.create({
    data: {
      productId: product.id,
      url: ID_CARD_PVC_SHOWCASE.imageUrl,
      altText: ID_CARD_PVC_SHOWCASE.imageAlt,
      order: 0,
      isPrimary: true,
    },
  });

  // Preserve variant IDs if possible when re-upserting (avoid breaking existing cart links),
  // otherwise recreate cleanly.
  for (const vSpec of ID_CARD_PVC_SHOWCASE.variants) {
    const existingVariant = await prisma.productVariant.findFirst({
      where: { productId: product.id, optionValue: vSpec.optionValue },
    });

    const variant = existingVariant
      ? await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            name: vSpec.name,
            optionType: vSpec.optionType,
            sku: vSpec.sku,
            price: vSpec.price,
            stock: vSpec.stock,
            minOrderQty: vSpec.minOrderQty,
          },
        })
      : await prisma.productVariant.create({
          data: {
            id: storeId === 'demo-store-001' ? vSpec.id : undefined,
            productId: product.id,
            name: vSpec.name,
            optionType: vSpec.optionType,
            optionValue: vSpec.optionValue,
            sku: vSpec.sku,
            price: vSpec.price,
            stock: vSpec.stock,
            minOrderQty: vSpec.minOrderQty,
          },
        });

    await prisma.productPriceTier.createMany({
      data: vSpec.tiers.map((tier) => ({
        productId: product.id,
        variantId: variant.id,
        minQty: tier.minQty,
        maxQty: tier.maxQty,
        unitPrice: tier.unitPrice,
      })),
    });
  }

  return product;
}
