import type { Product } from '@prisma/client';

export interface SalePricing {
  sellingPrice: number;
  discountPrice: number | null;
  saleStartsAt: Date | string | null;
  saleEndsAt: Date | string | null;
  saleQuota: number | null;
  saleSold: number;
}

export function isSaleActive(product: SalePricing, now: Date = new Date()): boolean {
  const discountPrice = product.discountPrice;
  const saleStartsAt = product.saleStartsAt ? new Date(product.saleStartsAt) : null;
  const saleEndsAt = product.saleEndsAt ? new Date(product.saleEndsAt) : null;
  const saleQuota = product.saleQuota;
  const saleSold = product.saleSold;

  // Check if discountPrice is valid and within sale period and quota
  return (
    discountPrice !== null &&
    discountPrice < product.sellingPrice &&
    (saleStartsAt === null || now >= saleStartsAt) &&
    (saleEndsAt === null || now < saleEndsAt) &&
    (saleQuota === null || saleSold < saleQuota)
  );
}

export function resolveUnitPrice(product: SalePricing, now: Date = new Date()): number {
  if (!product.discountPrice || product.discountPrice >= product.sellingPrice) {
    return product.sellingPrice;
  }

  if (product.saleStartsAt && now < new Date(product.saleStartsAt)) {
    return product.sellingPrice;
  }

  if (product.saleEndsAt && now >= new Date(product.saleEndsAt)) {
    return product.sellingPrice;
  }

  if (product.saleQuota !== null && product.saleSold >= product.saleQuota) {
    return product.sellingPrice;
  }

  return product.discountPrice;
}

export function saleRemaining(product: SalePricing): number | null {
  if (product.saleQuota === null) return null;
  return Math.max(0, product.saleQuota - product.saleSold);
}