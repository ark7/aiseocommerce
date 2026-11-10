import {
  ALL_MENU_PERMISSIONS,
  ROLE_PRESETS,
  hasPermission,
  canAccessPath,
  normalizePermissions,
  getRequiredPermissionForPath,
  PermissionKey,
} from '@/lib/rbac';

describe('Staff RBAC Delegation & Menu Access Control (lib/rbac)', () => {
  describe('Module & Presets Definitions', () => {
    it('defines exactly 12 granular menu modules across logical categories', () => {
      expect(ALL_MENU_PERMISSIONS.length).toBe(12);
      const keys = ALL_MENU_PERMISSIONS.map((m) => m.key);

      expect(keys).toContain('dashboard');
      expect(keys).toContain('products');
      expect(keys).toContain('categories');
      expect(keys).toContain('orders');
      expect(keys).toContain('customers');
      expect(keys).toContain('finance');
      expect(keys).toContain('promo');
      expect(keys).toContain('cms');
      expect(keys).toContain('articles');
      expect(keys).toContain('analytics');
      expect(keys).toContain('settings');
      expect(keys).toContain('staff');
    });

    it('provides standard operational role presets', () => {
      const presetIds = ROLE_PRESETS.map((p) => p.id);
      expect(presetIds).toContain('MANAGER');
      expect(presetIds).toContain('CS');
      expect(presetIds).toContain('WAREHOUSE');
      expect(presetIds).toContain('FINANCE');
      expect(presetIds).toContain('MARKETING');

      // Verify each preset only contains valid permission keys
      ROLE_PRESETS.forEach((preset) => {
        preset.permissions.forEach((perm) => {
          const isValidKey = ALL_MENU_PERMISSIONS.some((m) => m.key === perm);
          expect(isValidKey).toBe(true);
        });
      });
    });
  });

  describe('normalizePermissions helper', () => {
    it('normalizes string array', () => {
      expect(normalizePermissions(['products', 'orders'])).toEqual(['products', 'orders']);
    });

    it('normalizes stringified JSON array', () => {
      expect(normalizePermissions(JSON.stringify(['finance', 'settings']))).toEqual(['finance', 'settings']);
    });

    it('handles null, undefined, or empty gracefully', () => {
      expect(normalizePermissions(null)).toEqual([]);
      expect(normalizePermissions(undefined)).toEqual([]);
      expect(normalizePermissions([])).toEqual([]);
    });
  });

  describe('hasPermission & canAccessPath', () => {
    const adminUser = {
      role: 'ADMIN',
      permissions: [],
    };

    const warehouseStaff = {
      role: 'STAFF',
      permissions: ['products', 'categories', 'orders'],
    };

    const financeStaff = {
      role: 'STAFF',
      permissions: ['dashboard', 'orders', 'finance'],
    };

    const customerUser = {
      role: 'CUSTOMER',
      permissions: [],
    };

    it('grants ADMIN bypass access to all menus and paths', () => {
      ALL_MENU_PERMISSIONS.forEach((menu) => {
        expect(hasPermission(adminUser, menu.key)).toBe(true);
        expect(canAccessPath(adminUser, menu.path)).toBe(true);
      });
    });

    it('grants warehouse staff access only to designated catalog & order menus', () => {
      // Allowed
      expect(hasPermission(warehouseStaff, 'products')).toBe(true);
      expect(canAccessPath(warehouseStaff, '/admin/products')).toBe(true);
      expect(hasPermission(warehouseStaff, 'categories')).toBe(true);
      expect(canAccessPath(warehouseStaff, '/admin/categories')).toBe(true);
      expect(hasPermission(warehouseStaff, 'orders')).toBe(true);
      expect(canAccessPath(warehouseStaff, '/admin/orders')).toBe(true);

      // Blocked
      expect(hasPermission(warehouseStaff, 'finance')).toBe(false);
      expect(canAccessPath(warehouseStaff, '/admin/finance')).toBe(false);
      expect(hasPermission(warehouseStaff, 'settings')).toBe(false);
      expect(canAccessPath(warehouseStaff, '/admin/settings')).toBe(false);
      expect(hasPermission(warehouseStaff, 'staff')).toBe(false);
      expect(canAccessPath(warehouseStaff, '/admin/staff')).toBe(false);
    });

    it('grants finance staff access to finance & orders but restricts settings & staff', () => {
      expect(hasPermission(financeStaff, 'finance')).toBe(true);
      expect(canAccessPath(financeStaff, '/admin/finance')).toBe(true);

      expect(hasPermission(financeStaff, 'settings')).toBe(false);
      expect(canAccessPath(financeStaff, '/admin/settings')).toBe(false);
      expect(hasPermission(financeStaff, 'staff')).toBe(false);
      expect(canAccessPath(financeStaff, '/admin/staff')).toBe(false);
    });

    it('strictly denies CUSTOMER role access to any admin path', () => {
      expect(canAccessPath(customerUser, '/admin')).toBe(false);
      expect(canAccessPath(customerUser, '/admin/products')).toBe(false);
      expect(canAccessPath(customerUser, '/admin/orders')).toBe(false);
      expect(canAccessPath(customerUser, '/admin/settings')).toBe(false);
    });
  });
});
