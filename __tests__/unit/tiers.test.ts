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
    it('allows GUEST to browse public storefront, catalog, product details, and auth paths comfortably', () => {
      expect(gateFor('GUEST', '/')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/login')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/register')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/products')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/demo-store/product/shoes')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/product/cetak-id-card-pvc-custom')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/category/cetak')).toEqual({ gated: false, redirectPath: null });
      expect(gateFor('GUEST', '/articles/panduan')).toEqual({ gated: false, redirectPath: null });
    });

    it('gates GUEST when attempting to access cart, orders, or admin pages', () => {
      expect(gateFor('GUEST', '/cart')).toEqual({
        gated: true,
        redirectPath: '/login?from=%2Fcart',
      });
      expect(gateFor('GUEST', '/demo-store/cart')).toEqual({
        gated: true,
        redirectPath: '/login?from=%2Fdemo-store%2Fcart',
      });
      expect(gateFor('GUEST', '/orders')).toEqual({
        gated: true,
        redirectPath: '/login?from=%2Forders',
      });
      expect(gateFor('GUEST', '/admin/settings')).toEqual({
        gated: true,
        redirectPath: '/login?from=%2Fadmin%2Fsettings',
      });
    });

    it('allows CUSTOMER to navigate to store products and cart', () => {
      expect(gateFor('CUSTOMER', '/demo-store/product/shoes')).toEqual({
        gated: false,
        redirectPath: null,
      });
      expect(gateFor('CUSTOMER', '/cart')).toEqual({
        gated: false,
        redirectPath: null,
      });
    });

    it('gates CUSTOMER attempting to navigate to admin', () => {
      const result = gateFor('CUSTOMER', '/admin/settings');
      expect(result.gated).toBe(true);
      expect(result.redirectPath).toBe('/login?from=%2Fadmin%2Fsettings');
    });
  });
});
