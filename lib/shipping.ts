export type ShippingZone = 'INNER' | 'OUTER' | 'FREE' | 'DIGITAL' | 'BITESHIP';

export interface ShippingConfig {
  originCity?: string | null;
  flatRateInner: number;
  flatRateOuter: number;
  freeThreshold?: number | null;
  calculationType?: string | null;
}

export interface CalculateShippingParams {
  hasPhysicalItems: boolean;
  subtotal: number;
  selectedZone?: 'INNER' | 'OUTER' | string | null;
  config: ShippingConfig;
}

export interface ShippingCalculationResult {
  cost: number;
  zone: ShippingZone;
  isFreeShipping: boolean;
  freeShippingQualified: boolean;
}

/**
 * Pure calculation logic for store flat-rate shipping.
 * Guarantees server-side integrity and predictable calculations.
 */
export function calculateOrderShipping(params: CalculateShippingParams): ShippingCalculationResult {
  const { hasPhysicalItems, subtotal, selectedZone, config } = params;

  // 1. Digital products or event tickets are always free shipping (instant electronic delivery)
  if (!hasPhysicalItems) {
    return {
      cost: 0,
      zone: 'DIGITAL',
      isFreeShipping: true,
      freeShippingQualified: false,
    };
  }

  // 2. Check for free shipping qualification threshold
  const freeThreshold = config.freeThreshold;
  if (typeof freeThreshold === 'number' && freeThreshold > 0 && subtotal >= freeThreshold) {
    return {
      cost: 0,
      zone: 'FREE',
      isFreeShipping: true,
      freeShippingQualified: true,
    };
  }

  // 3. Resolve by chosen destination zone
  const zone = selectedZone === 'INNER' ? 'INNER' : 'OUTER';
  const rawCost = zone === 'INNER' ? config.flatRateInner : config.flatRateOuter;
  const cost = Math.max(0, Number(rawCost) || 0);

  return {
    cost,
    zone,
    isFreeShipping: cost === 0,
    freeShippingQualified: false,
  };
}

