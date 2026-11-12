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

export interface PriceTierInput {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}

export interface BatchPriceResolution {
  unitPrice: number;
  matchedTier: PriceTierInput | null;
  nextTier: { minQty: number; unitPrice: number; neededQty: number } | null;
  isBelowMinimum: boolean;
  effectiveMinOrderQty: number;
}

/**
 * Formats a quantity tier band cleanly for Indonesian UI labels.
 */
export function formatTierRangeLabel(minQty: number, maxQty: number | null): string {
  const fmt = (n: number) => n.toLocaleString('id-ID');
  if (maxQty === null || maxQty === undefined) {
    return `≥ ${fmt(minQty)} pcs`;
  }
  if (minQty === maxQty) {
    return `${fmt(minQty)} pcs`;
  }
  return `${fmt(minQty)} – ${fmt(maxQty)} pcs`;
}

/**
 * Computes the lowest and highest unit price across active batch pricing tiers.
 */
export function getBatchPriceRange(tiers: PriceTierInput[] | null | undefined): { minPrice: number; maxPrice: number } | null {
  const valid = (tiers || []).filter((t) => Number.isFinite(t.unitPrice) && t.unitPrice > 0);
  if (valid.length === 0) return null;
  let minPrice = valid[0].unitPrice;
  let maxPrice = valid[0].unitPrice;
  for (const t of valid) {
    if (t.unitPrice < minPrice) minPrice = t.unitPrice;
    if (t.unitPrice > maxPrice) maxPrice = t.unitPrice;
  }
  return { minPrice, maxPrice };
}

/**
 * Resolves the authoritative unit price for a given ordered quantity from batch tiers,
 * enforcing product/variant minimum order quantity (MOQ).
 */
export function resolveBatchUnitPrice(
  fallbackUnitPrice: number,
  tiers: PriceTierInput[] | null | undefined,
  quantity: number,
  explicitMinOrderQty: number = 1
): BatchPriceResolution {
  const cleanQty = Math.max(0, Math.floor(Number(quantity) || 0));
  const normalizedExplicitMin = Math.max(1, Math.floor(Number(explicitMinOrderQty) || 1));

  if (!tiers || tiers.length === 0) {
    return {
      unitPrice: fallbackUnitPrice,
      matchedTier: null,
      nextTier: null,
      isBelowMinimum: cleanQty < normalizedExplicitMin,
      effectiveMinOrderQty: normalizedExplicitMin,
    };
  }

  const sorted = [...tiers]
    .filter((t) => Number.isFinite(t.minQty) && t.minQty >= 1 && Number.isFinite(t.unitPrice) && t.unitPrice >= 0)
    .sort((a, b) => a.minQty - b.minQty);

  if (sorted.length === 0) {
    return {
      unitPrice: fallbackUnitPrice,
      matchedTier: null,
      nextTier: null,
      isBelowMinimum: cleanQty < normalizedExplicitMin,
      effectiveMinOrderQty: normalizedExplicitMin,
    };
  }

  const effectiveMinOrderQty = Math.max(normalizedExplicitMin, sorted[0].minQty);
  const isBelowMinimum = cleanQty < effectiveMinOrderQty;

  let matchedTier: PriceTierInput | null = null;
  for (const tier of sorted) {
    const fitsMin = cleanQty >= tier.minQty;
    const fitsMax = tier.maxQty === null || tier.maxQty === undefined || cleanQty <= tier.maxQty;
    if (fitsMin && fitsMax) {
      matchedTier = tier;
      break;
    }
  }

  if (!matchedTier && cleanQty >= sorted[0].minQty) {
    const belowOrEqual = sorted.filter((t) => t.minQty <= cleanQty);
    matchedTier = belowOrEqual.length > 0 ? belowOrEqual[belowOrEqual.length - 1] : null;
  }

  const unitPrice = matchedTier ? matchedTier.unitPrice : (sorted[0]?.unitPrice ?? fallbackUnitPrice);

  const nextCandidate = !isBelowMinimum
    ? sorted.find((t) => t.minQty > cleanQty && t.unitPrice < unitPrice)
    : undefined;

  const nextTier = nextCandidate
    ? {
        minQty: nextCandidate.minQty,
        unitPrice: nextCandidate.unitPrice,
        neededQty: Math.max(1, nextCandidate.minQty - cleanQty),
      }
    : null;

  return {
    unitPrice,
    matchedTier,
    nextTier,
    isBelowMinimum,
    effectiveMinOrderQty,
  };
}

export interface CatalogProductPricingInput extends SalePricing {
  hasBatchPricing?: boolean | null;
  priceTiers?: PriceTierInput[] | null;
  variants?: Array<{ priceTiers?: PriceTierInput[] | null }> | null;
}

/**
 * Resolves catalog card display price info for fixed, flash-sale, and batch-tiered products.
 */
export function getCatalogDisplayPricing(
  product: CatalogProductPricingInput,
  now = new Date()
): {
  isBatch: boolean;
  onSale: boolean;
  effectivePrice: number;
  maxPrice: number | null;
} {
  const isBatch = Boolean(product.hasBatchPricing);
  if (isBatch) {
    const allTiers: PriceTierInput[] = [
      ...(product.priceTiers ?? []),
      ...((product.variants ?? []).flatMap((v) => v.priceTiers ?? [])),
    ];
    const range = getBatchPriceRange(allTiers);
    return {
      isBatch: true,
      onSale: false,
      effectivePrice: range ? range.minPrice : product.sellingPrice,
      maxPrice: range ? range.maxPrice : null,
    };
  }

  return {
    isBatch: false,
    onSale: isSaleActive(product, now),
    effectivePrice: resolveUnitPrice(product, now),
    maxPrice: null,
  };
}
