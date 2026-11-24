import { requirePermission, requireAnyPermission } from '@/lib/rbacServer';
import { requireUser, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Server-Side RBAC Guard (lib/rbacServer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when request is unauthenticated by default', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    (verifyToken as jest.Mock).mockResolvedValue(null);

    const res = await requirePermission(new Request('http://localhost/api/admin/stats'), 'dashboard');
    expect(res.authorized).toBe(false);
    if (!res.authorized) {
      expect(res.response.status).toBe(401);
    }
  });

  it('returns 403 when unauthenticatedStatus is explicitly 403', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    (verifyToken as jest.Mock).mockResolvedValue(null);

    const res = await requirePermission(new Request('http://localhost/api/admin/customers'), 'customers', {
      unauthenticatedStatus: 403,
    });
    expect(res.authorized).toBe(false);
    if (!res.authorized) {
      expect(res.response.status).toBe(403);
    }
  });

  it('allows ADMIN unconditionally without needing module permissions', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 'admin-1',
      storeId: 'store-1',
      email: 'admin@store.com',
      role: 'ADMIN',
      permissions: [],
    });

    const res = await requirePermission(new Request('http://localhost/api/admin/finance/ledger'), 'finance');
    expect(res.authorized).toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows active STAFF with the required DB module permission', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      storeId: 'store-1',
      email: 'staff@store.com',
      role: 'STAFF',
      permissions: ['products'],
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      isActive: true,
      role: 'STAFF',
      storeId: 'store-1',
      permissions: ['products', 'orders'],
    });

    const res = await requirePermission(new Request('http://localhost/api/admin/orders/1/status'), 'orders');
    expect(res.authorized).toBe(true);
    if (res.authorized) {
      expect(res.user.permissions).toEqual(['products', 'orders']);
    }
  });

  it('blocks STAFF lacking the required DB module permission with 403', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      storeId: 'store-1',
      email: 'staff@store.com',
      role: 'STAFF',
      permissions: ['finance'], // stale JWT still claimed finance
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      isActive: true,
      role: 'STAFF',
      storeId: 'store-1',
      permissions: ['products'], // revoked in DB!
    });

    const res = await requirePermission(new Request('http://localhost/api/admin/finance/ledger'), 'finance');
    expect(res.authorized).toBe(false);
    if (!res.authorized) {
      expect(res.response.status).toBe(403);
    }
  });

  it('blocks deactivated STAFF account (isActive: false in DB) immediately with 403', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      storeId: 'store-1',
      email: 'staff@store.com',
      role: 'STAFF',
      permissions: ['products'],
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      isActive: false,
      role: 'STAFF',
      storeId: 'store-1',
      permissions: ['products'],
    });

    const res = await requirePermission(new Request('http://localhost/api/products'), 'products');
    expect(res.authorized).toBe(false);
    if (!res.authorized) {
      expect(res.response.status).toBe(403);
    }
  });

  it('rejects CUSTOMER role with 403', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 'cust-1',
      storeId: 'store-1',
      email: 'cust@buyer.com',
      role: 'CUSTOMER',
      permissions: ['*'],
    });

    const res = await requirePermission(new Request('http://localhost/api/admin/stats'), 'dashboard');
    expect(res.authorized).toBe(false);
    if (!res.authorized) {
      expect(res.response.status).toBe(403);
    }
  });

  it('supports requireAnyPermission across multiple modules', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 'staff-cms',
      storeId: 'store-1',
      email: 'cms@store.com',
      role: 'STAFF',
      permissions: ['cms'],
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      isActive: true,
      role: 'STAFF',
      storeId: 'store-1',
      permissions: ['cms'],
    });

    const res = await requireAnyPermission(new Request('http://localhost/api/admin/ai/chat'), [
      'products',
      'cms',
    ]);
    expect(res.authorized).toBe(true);
  });
});
