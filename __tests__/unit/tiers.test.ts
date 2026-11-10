import { gateFor, meetsTier, requiredTierFor } from '@/lib/tiers';

describe('Tiers & GatedLink Auth System', () => {
  describe('meetsTier', () => {
    it('ranks GUEST < CUSTOMER < STAFF < ADMIN', () => {
      expect(meetsTier('GUEST', 'CUSTOMER')).toBe(false);
      expect(meetsTier('CUSTOMER', 'CUSTOMER')).toBe(true);
      expect(meetsTier('STAFF', 'CUSTOMER')).toBe(true);
      expect(meetsTier('ADMIN', 'CUSTOMER')).toBe(true);
    });
  });

  describe('requiredTierFor', () => {
    it('returns GUEST for open storefront paths and auth paths', () => {
      expect(requiredTierFor('/')).toBe('GUEST');
      expect(requiredTierFor('/login')).toBe('GUEST');
      expect(requiredTierFor('/register')).toBe('GUEST');
      expect(requiredTierFor('/demo-store/product/item-1')).toBe('GUEST');
    });

    it('returns CUSTOMER for cart, orders, checkout', () => {
      expect(requiredTierFor('/demo-store/cart')).toBe('CUSTOMER');
      expect(requiredTierFor('/api/checkout')).toBe('CUSTOMER');
    });

    it('returns STAFF for admin paths', () => {
      expect(requiredTierFor('/admin/settings')).toBe('STAFF');
      expect(requiredTierFor('/api/admin/products')).toBe('STAFF');
    });
  });

  describe('gateFor', () => {
    it('does not gate public auth paths', () => {
      expect(gateFor('GUEST', '/')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/login')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/register')).toEqual({ gated: false, redirectPath: null });
    });

    it('gates GUEST attempting to navigate to store products / categories', () => {
      const result = gateFor('GUEST', '/demo-store/product/shoes');
      expect(result.gated).toBe(true);
      expect(result.redirectPath).toBe('/login?from=%2Fdemo-store%2Fproduct%2Fshoes');
    });

    it('allows CUSTOMER to navigate to store products', () => {
      const result = gateFor('CUSTOMER', '/demo-store/product/shoes');
      expect(result.gated).toBe(false);
      expect(result.redirectPath).toBe(null);
    });

    it('gates CUSTOMER attempting to navigate to admin', () => {
      const result = gateFor('CUSTOMER', '/admin/settings');
      expect(result.gated).toBe(true);
      expect(result.redirectPath).toBe('/login?from=%2Fadmin%2Fsettings');
    });
  });
});
