import { GET as productsGET } from '@/app/api/products/route';
import { GET as ordersGET, POST as ordersPOST } from '@/app/api/orders/route';
import { prisma } from '@/lib/prisma';
import { verifyToken, requireUser } from '@/lib/auth';
import { createOrder } from '@/services/transactionService';
import { MixedCartSandboxError, SandboxModeDisabledError } from '@/lib/paymentGateway';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: { findMany: jest.fn(), count: jest.fn() },
    order: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn(), requireUser: jest.fn() }));

jest.mock('@/lib/revalidate', () => ({ revalidateProduct: jest.fn() }));
jest.mock('@/services/auditService', () => ({
  auditProductCreated: jest.fn(),
  auditProductUpdated: jest.fn(),
  auditProductDeleted: jest.fn(),
}));
jest.mock('fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn(), unlink: jest.fn() }));

jest.mock('@/services/transactionService', () => {
  const actual = jest.requireActual('@/services/transactionService');
  return { ...actual, createOrder: jest.fn() };
});

const STORE = 'store-1';

function productsRequest(query = '', token?: string) {
  return new Request(`http://localhost/api/products${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function productWhere() {
  return (prisma.product.findMany as jest.Mock).mock.calls[0][0].where;
}

describe('GET /api/products hides sandbox products from the public', () => {
  beforeEach(() => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
  });

  it('never lists them for an anonymous visitor', async () => {
    await productsGET(productsRequest(`?storeId=${STORE}`));

    expect(productWhere().sandboxEnabled).toBe(false);
  });

  it('ignores a ?sandbox=true filter from an anonymous visitor', async () => {
    await productsGET(productsRequest(`?storeId=${STORE}&sandbox=true`));

    expect(productWhere().sandboxEnabled).toBe(false);
  });

  it('never lists them for a signed-in customer', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'c1', storeId: STORE, role: 'CUSTOMER' });

    await productsGET(productsRequest('?sandbox=true', 'token'));

    expect(productWhere().sandboxEnabled).toBe(false);
  });

  it('lets store staff list everything, or only sandbox with ?sandbox=true', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'a1', storeId: STORE, role: 'ADMIN' });

    await productsGET(productsRequest('', 'token'));
    expect(productWhere()).not.toHaveProperty('sandboxEnabled');

    (prisma.product.findMany as jest.Mock).mockClear();
    await productsGET(productsRequest('?sandbox=true', 'token'));
    expect(productWhere().sandboxEnabled).toBe(true);
  });
});

describe('GET /api/orders keeps test orders out of the working list', () => {
  function ordersRequest(query = '') {
    return new Request(`http://localhost/api/orders${query}`, {
      headers: { Authorization: 'Bearer token' },
    });
  }

  function orderWhere() {
    return (prisma.order.findMany as jest.Mock).mock.calls[0][0].where;
  }

  beforeEach(() => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'a1', storeId: STORE, role: 'ADMIN' });
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.order.count as jest.Mock).mockResolvedValue(0);
  });

  it('shows real orders only by default', async () => {
    await ordersGET(ordersRequest());

    expect(orderWhere().isSandbox).toBe(false);
  });

  it('shows sandbox orders only on request', async () => {
    await ordersGET(ordersRequest('?sandbox=true'));

    expect(orderWhere().isSandbox).toBe(true);
  });

  it('shows both only when asked for all', async () => {
    await ordersGET(ordersRequest('?sandbox=all'));

    expect(orderWhere()).not.toHaveProperty('isSandbox');
  });

  it('never hides a customer’s own sandbox orders from them', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'c1', storeId: STORE, role: 'CUSTOMER' });

    await ordersGET(ordersRequest());

    expect(orderWhere()).not.toHaveProperty('isSandbox');
  });
});

describe('POST /api/orders explains sandbox rejections', () => {
  function create() {
    return ordersPOST(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ productId: 'p1', quantity: 1 }] }),
      })
    );
  }

  beforeEach(() => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'c1', storeId: STORE, role: 'CUSTOMER' });
  });

  it('answers 409 with a readable message for a mixed cart', async () => {
    (createOrder as jest.Mock).mockRejectedValue(new MixedCartSandboxError());

    const response = await create();
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('SANDBOX_MIXED_CART');
    expect(body.error).toMatch(/sandbox/i);
  });

  it('answers 409 when sandbox mode is off', async () => {
    (createOrder as jest.Mock).mockRejectedValue(new SandboxModeDisabledError());

    const response = await create();
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('SANDBOX_DISABLED');
  });
});

