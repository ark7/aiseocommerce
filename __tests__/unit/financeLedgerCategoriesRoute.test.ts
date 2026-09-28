import { DELETE, GET, PATCH, POST } from '@/app/api/admin/finance/categories/route';
import { POST as postLedger } from '@/app/api/admin/finance/ledger/route';
import { prisma } from '@/lib/prisma';
import { requireUser, verifyToken } from '@/lib/auth';
import { logAuditAction } from '@/services/auditService';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ledgerCategory: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ledger: { create: jest.fn(), count: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({ requireUser: jest.fn(), verifyToken: jest.fn() }));
jest.mock('@/lib/ip', () => ({ getIPAddress: jest.fn().mockReturnValue('127.0.0.1') }));
jest.mock('@/services/auditService', () => ({
  logAuditAction: jest.fn().mockResolvedValue(undefined),
  auditLedgerCreated: jest.fn().mockResolvedValue(undefined),
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', role: 'ADMIN' };
const CATEGORY = {
  id: 'cat-1',
  storeId: 'store-1',
  type: 'EXPENSE',
  name: 'Operasional',
  isActive: true,
};

function request(method: string, body?: unknown, query = '') {
  return new Request(`http://localhost/api/admin/finance/categories${query}`, {
    method,
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('finance ledger categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.ledgerCategory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.ledgerCategory.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.ledgerCategory.findUnique as jest.Mock).mockResolvedValue(CATEGORY);
    (prisma.ledgerCategory.create as jest.Mock).mockResolvedValue(CATEGORY);
    (prisma.ledgerCategory.update as jest.Mock).mockResolvedValue(CATEGORY);
    (prisma.ledgerCategory.delete as jest.Mock).mockResolvedValue(CATEGORY);
    (prisma.ledger.count as jest.Mock).mockResolvedValue(0);
    (prisma.$transaction as jest.Mock).mockResolvedValue([CATEGORY, { count: 2 }]);
  });

  it('scopes the list to the token store, never a query param', async () => {
    const response = await GET(request('GET', undefined, '?storeId=other-store'));

    expect(response.status).toBe(200);
    expect(prisma.ledgerCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: ADMIN.storeId }),
      })
    );
  });

  it('hides inactive rows unless asked for them', async () => {
    await GET(request('GET'));
    expect(prisma.ledgerCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
    );

    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.ledgerCategory.findMany as jest.Mock).mockResolvedValue([]);

    await GET(request('GET', undefined, '?includeInactive=true'));
    expect(prisma.ledgerCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: ADMIN.storeId } })
    );
  });

  it('separates a missing token from a mere customer', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    expect((await GET(request('GET'))).status).toBe(401);

    (requireUser as jest.Mock).mockResolvedValue({ ...ADMIN, role: 'CUSTOMER' });
    expect((await GET(request('GET'))).status).toBe(403);
  });

  it('refuses a duplicate name for the same type', async () => {
    (prisma.ledgerCategory.findFirst as jest.Mock).mockResolvedValue({ id: 'cat-1' });

    const response = await POST(request('POST', { type: 'EXPENSE', name: 'Operasional' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Kategori sudah ada' });
    expect(prisma.ledgerCategory.create).not.toHaveBeenCalled();
  });

  it('allows the same name under a different type', async () => {
    // The unique key is [storeId, type, name], so "Operasional" may be both an
    // expense and a petty-cash category.
    const response = await POST(request('POST', { type: 'PETTY_CASH', name: 'Operasional' }));

    expect(response.status).toBe(200);
    expect(prisma.ledgerCategory.create).toHaveBeenCalledWith({
      data: { storeId: ADMIN.storeId, type: 'PETTY_CASH', name: 'Operasional' },
    });
  });

  it('carries a rename into the ledger rows, scoped to the type', async () => {
    (prisma.ledgerCategory.findUnique as jest.Mock).mockResolvedValue(CATEGORY);

    const response = await PATCH(request('PATCH', { id: 'cat-1', name: 'Biaya Operasional' }));

    expect(response.status).toBe(200);
    expect(prisma.ledger.updateMany).toHaveBeenCalledWith({
      where: { storeId: ADMIN.storeId, type: 'EXPENSE', category: 'Operasional' },
      data: { category: 'Biaya Operasional' },
    });
  });

  it('deactivating does not touch the ledger', async () => {
    await PATCH(request('PATCH', { id: 'cat-1', isActive: false }));

    expect(prisma.ledger.updateMany).not.toHaveBeenCalled();
    expect(prisma.ledgerCategory.update).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
      data: { isActive: false },
    });
  });

  it('hides another store category', async () => {
    (prisma.ledgerCategory.findUnique as jest.Mock).mockResolvedValue({
      ...CATEGORY,
      storeId: 'other-store',
    });

    expect((await PATCH(request('PATCH', { id: 'cat-1', name: 'X' }))).status).toBe(403);
    expect((await DELETE(request('DELETE', { id: 'cat-1' }))).status).toBe(403);
  });

  it('keeps a category that transactions still point at', async () => {
    (prisma.ledger.count as jest.Mock).mockResolvedValue(3);

    const response = await DELETE(request('DELETE', { id: 'cat-1' }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/nonaktifkan/);
    expect(prisma.ledgerCategory.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused category and audits what it was', async () => {
    const response = await DELETE(request('DELETE', { id: 'cat-1' }));

    expect(response.status).toBe(200);
    expect(prisma.ledgerCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    expect(logAuditAction).toHaveBeenCalledWith(
      'DELETE',
      'LEDGER_CATEGORY',
      'cat-1',
      ADMIN.id,
      ADMIN.storeId,
      expect.objectContaining({ name: 'Operasional' }),
      null,
      '127.0.0.1'
    );
  });

  it('rejects a ledger write whose category is not configured', async () => {
    (prisma.ledgerCategory.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await postLedger(
      new Request('http://localhost/api/admin/finance/ledger', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({
          type: 'EXPENSE',
          amount: 50000,
          description: 'Kemasan',
          category: 'Karangan',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Kategori tidak terdaftar');
    expect(prisma.ledger.create).not.toHaveBeenCalled();
  });

  it('accepts a configured category, and an empty one', async () => {
    (prisma.ledgerCategory.findFirst as jest.Mock).mockResolvedValue({ id: 'cat-1' });
    (prisma.ledger.create as jest.Mock).mockResolvedValue({
      id: 'led-1',
      type: 'EXPENSE',
      amount: -50000,
    });

    const withCategory = await postLedger(
      new Request('http://localhost/api/admin/finance/ledger', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({
          type: 'EXPENSE',
          amount: 50000,
          description: 'Kemasan',
          category: 'Operasional',
        }),
      })
    );
    expect(withCategory.status).toBe(200);

    (prisma.ledgerCategory.findFirst as jest.Mock).mockResolvedValue(null);
    const withoutCategory = await postLedger(
      new Request('http://localhost/api/admin/finance/ledger', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ type: 'EXPENSE', amount: 50000, description: 'Kemasan' }),
      })
    );
    expect(withoutCategory.status).toBe(200);
  });
});
