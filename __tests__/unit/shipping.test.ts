import { calculateOrderShipping, ShippingConfig } from '@/lib/shipping';

describe('Shipping Logic (lib/shipping.ts)', () => {
  const baseConfig: ShippingConfig = {
    originCity: 'Bandung',
    flatRateInner: 10000,
    flatRateOuter: 25000,
    freeThreshold: 150000,
    calculationType: 'FLAT_MANUAL',
  };

  it('assigns 0 cost and DIGITAL zone for orders with non-physical items', () => {
    const result = calculateOrderShipping({
      hasPhysicalItems: false,
      subtotal: 50000,
      selectedZone: 'OUTER',
      config: baseConfig,
    });

    expect(result.cost).toBe(0);
    expect(result.zone).toBe('DIGITAL');
    expect(result.isFreeShipping).toBe(true);
    expect(result.freeShippingQualified).toBe(false);
  });

  it('calculates inner-city flat rate properly', () => {
    const result = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal: 100000,
      selectedZone: 'INNER',
      config: baseConfig,
    });

    expect(result.cost).toBe(10000);
    expect(result.zone).toBe('INNER');
    expect(result.isFreeShipping).toBe(false);
    expect(result.freeShippingQualified).toBe(false);
  });

  it('calculates outer-city flat rate properly', () => {
    const result = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal: 100000,
      selectedZone: 'OUTER',
      config: baseConfig,
    });

    expect(result.cost).toBe(25000);
    expect(result.zone).toBe('OUTER');
    expect(result.isFreeShipping).toBe(false);
  });

  it('defaults to outer-city when zone is unspecified or null', () => {
    const result = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal: 100000,
      selectedZone: null,
      config: baseConfig,
    });

    expect(result.cost).toBe(25000);
    expect(result.zone).toBe('OUTER');
  });

  it('qualifies for free shipping when subtotal reaches freeThreshold', () => {
    const result = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal: 150000,
      selectedZone: 'OUTER',
      config: baseConfig,
    });

    expect(result.cost).toBe(0);
    expect(result.zone).toBe('FREE');
    expect(result.isFreeShipping).toBe(true);
    expect(result.freeShippingQualified).toBe(true);
  });

  it('does not qualify for free shipping when freeThreshold is null or 0', () => {
    const configNoFree: ShippingConfig = {
      ...baseConfig,
      freeThreshold: null,
    };

    const result = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal: 500000,
      selectedZone: 'OUTER',
      config: configNoFree,
    });

    expect(result.cost).toBe(25000);
    expect(result.zone).toBe('OUTER');
    expect(result.isFreeShipping).toBe(false);
    expect(result.freeShippingQualified).toBe(false);
  });

  it('handles zero or negative rates safely', () => {
    const configFreeStore: ShippingConfig = {
      flatRateInner: 0,
      flatRateOuter: -5000 as any,
      freeThreshold: null,
    };

    const resultInner = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal: 50000,
      selectedZone: 'INNER',
      config: configFreeStore,
    });
    expect(resultInner.cost).toBe(0);
    expect(resultInner.isFreeShipping).toBe(true);

    const resultOuter = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal: 50000,
      selectedZone: 'OUTER',
      config: configFreeStore,
    });
    expect(resultOuter.cost).toBe(0);
  });
});

