import {
  hasPermission,
  canAccessPath,
  normalizePermissions,
  getRequiredPermissionForPath,
  ALL_MENU_PERMISSIONS,
  ROLE_PRESETS,
} from '@/lib/rbac';

describe('RBAC Utility & Permissions Engine', () => {
  describe('normalizePermissions', () => {
    it('normalizes string array correctly', () => {
      expect(normalizePermissions(['products', 'orders'])).toEqual(['products', 'orders']);
    });

    it('parses valid JSON string array', () => {
      expect(normalizePermissions('["products","orders"]')).toEqual(['products', 'orders']);
    });

    it('returns empty array on null or undefined or empty', () => {
      expect(normalizePermissions(null)).toEqual([]);
      expect(normalizePermissions(undefined)).toEqual([]);
      expect(normalizePermissions('')).toEqual([]);
    });

    it('wraps raw string if not JSON', () => {
      expect(normalizePermissions('products')).toEqual(['products']);
    });
  });

  describe('hasPermission', () => {
    it('grants full access to ADMIN role unconditionally', () => {
      const adminUser = { role: 'ADMIN', permissions: [] };
      expect(hasPermission(adminUser, 'dashboard')).toBe(true);
      expect(hasPermission(adminUser, 'finance')).toBe(true);
      expect(hasPermission(adminUser, 'settings')).toBe(true);
      expect(hasPermission(adminUser, 'staff')).toBe(true);
      expect(hasPermission(adminUser, 'unknown_module')).toBe(true);
    });

    it('grants permission to STAFF if the key is in their permissions array', () => {
      const staffUser = { role: 'STAFF', permissions: ['products', 'orders'] };
      expect(hasPermission(staffUser, 'products')).toBe(true);
      expect(hasPermission(staffUser, 'orders')).toBe(true);
      expect(hasPermission(staffUser, 'finance')).toBe(false);
      expect(hasPermission(staffUser, 'settings')).toBe(false);
    });

    it('supports wildcard asterisk permission for STAFF', () => {
      const staffSuper = { role: 'STAFF', permissions: ['*'] };
      expect(hasPermission(staffSuper, 'finance')).toBe(true);
      expect(hasPermission(staffSuper, 'settings')).toBe(true);
    });

    it('denies access to CUSTOMER role even if permissions field is set', () => {
      const customer = { role: 'CUSTOMER', permissions: ['dashboard', 'products'] };
      expect(hasPermission(customer, 'dashboard')).toBe(false);
      expect(hasPermission(customer, 'products')).toBe(false);
    });

    it('returns false for null or undefined user', () => {
      expect(hasPermission(null, 'dashboard')).toBe(false);
      expect(hasPermission(undefined, 'dashboard')).toBe(false);
    });
  });

  describe('getRequiredPermissionForPath', () => {
    it('maps admin paths to expected permission keys', () => {
      expect(getRequiredPermissionForPath('/admin')).toBe('dashboard');
      expect(getRequiredPermissionForPath('/admin/products')).toBe('products');
      expect(getRequiredPermissionForPath('/admin/products/add')).toBe('products');
      expect(getRequiredPermissionForPath('/admin/categories')).toBe('categories');
      expect(getRequiredPermissionForPath('/admin/orders')).toBe('orders');
      expect(getRequiredPermissionForPath('/admin/orders/123')).toBe('orders');
      expect(getRequiredPermissionForPath('/admin/customers')).toBe('customers');
      expect(getRequiredPermissionForPath('/admin/finance')).toBe('finance');
      expect(getRequiredPermissionForPath('/admin/promo')).toBe('promo');
      expect(getRequiredPermissionForPath('/admin/cms')).toBe('cms');
      expect(getRequiredPermissionForPath('/admin/articles')).toBe('articles');
      expect(getRequiredPermissionForPath('/admin/analytics')).toBe('analytics');
      expect(getRequiredPermissionForPath('/admin/funnel')).toBe('analytics');
      expect(getRequiredPermissionForPath('/admin/settings')).toBe('settings');
      expect(getRequiredPermissionForPath('/admin/system/errors')).toBe('settings');
      expect(getRequiredPermissionForPath('/admin/staff')).toBe('staff');
    });

    it('returns null for unmapped non-admin path', () => {
      expect(getRequiredPermissionForPath('/store/checkout')).toBeNull();
    });
  });

  describe('canAccessPath', () => {
    it('allows ADMIN to access any admin URL', () => {
      const admin = { role: 'ADMIN', permissions: [] };
      expect(canAccessPath(admin, '/admin/finance')).toBe(true);
      expect(canAccessPath(admin, '/admin/settings')).toBe(true);
      expect(canAccessPath(admin, '/admin/staff')).toBe(true);
    });

    it('allows STAFF to access only delegated paths', () => {
      const warehouseStaff = {
        role: 'STAFF',
        permissions: ['dashboard', 'products', 'orders'],
      };

      expect(canAccessPath(warehouseStaff, '/admin')).toBe(true);
      expect(canAccessPath(warehouseStaff, '/admin/products')).toBe(true);
      expect(canAccessPath(warehouseStaff, '/admin/products/edit/123')).toBe(true);
      expect(canAccessPath(warehouseStaff, '/admin/orders')).toBe(true);
      // Not allowed:
      expect(canAccessPath(warehouseStaff, '/admin/finance')).toBe(false);
      expect(canAccessPath(warehouseStaff, '/admin/settings')).toBe(false);
      expect(canAccessPath(warehouseStaff, '/admin/staff')).toBe(false);
    });

    it('blocks CUSTOMER from accessing admin paths', () => {
      const customer = { role: 'CUSTOMER', permissions: ['*'] };
      expect(canAccessPath(customer, '/admin')).toBe(false);
      expect(canAccessPath(customer, '/admin/products')).toBe(false);
    });
  });

  describe('Presets and Permissions consistency', () => {
    it('defines 12 distinct menu permissions', () => {
      expect(ALL_MENU_PERMISSIONS.length).toBe(12);
      const keys = ALL_MENU_PERMISSIONS.map((m) => m.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(12);
    });

    it('all role preset permissions belong to ALL_MENU_PERMISSIONS', () => {
      const validKeys = new Set(ALL_MENU_PERMISSIONS.map((m) => m.key));

      ROLE_PRESETS.forEach((preset) => {
        preset.permissions.forEach((permKey) => {
          expect(validKeys.has(permKey)).toBe(true);
        });
      });
    });
  });
});

