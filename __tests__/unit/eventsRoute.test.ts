import { POST } from '@/app/api/events/route';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { reset } from '@/lib/rateLimit';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: { findFirst: jest.fn() },
    productEvent: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const PRODUCT = { id: 'product-1', storeId: 'store-1' };
const ADDRESS = '203.0.113.7';

const VALID = {
  storeDomain: 'demo-store.local',
  productId: PRODUCT.id,
  step: 'VIEW',
  sessionId: 'session-abcdef12',
};

function post(body: unknown, ip: string = ADDRESS) {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** The `data` of the single row the handler asked Prisma to write. */
function written() {
  const calls = (prisma.productEvent.create as jest.Mock).mock.calls;
  expect(calls).toHaveLength(1);
  return calls[0][0].data;
}

describe('POST /api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The window lives in module memory and would otherwise leak between cases.
    reset();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT);
    (prisma.productEvent.create as jest.Mock).mockResolvedValue({});
  });

  it('records the step against the store that owns the product', async () => {
    const response = await POST(post(VALID));

    expect(response.status).toBe(200);
    expect(written()).toEqual({
      storeId: 'store-1',
      productId: 'product-1',
      type: 'VIEW',
      sessionId: 'session-abcdef12',
      attribution: undefined,
    });
  });

  it('resolves the store from the domain rather than trusting a storeId in the body', async () => {
    await POST(post(VALID));

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-1', store: { domain: 'demo-store.local' } },
      select: { id: true, storeId: true },
    });
  });

  it('refuses a product the named store does not own', async () => {
    // A caller naming another store's product would otherwise write events into
    // a tenant that never saw the visit.
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(post(VALID));

    expect(response.status).toBe(404);
    expect(prisma.productEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a step that is not part of the funnel', async () => {
    const response = await POST(post({ ...VALID, step: 'PURCHASE' }));

    expect(response.status).toBe(400);
    expect(prisma.productEvent.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown field instead of storing it', async () => {
    const response = await POST(post({ ...VALID, note: 'anything' }));

    expect(response.status).toBe(400);
    expect(prisma.productEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a session id too short to be a real one', async () => {
    const response = await POST(post({ ...VALID, sessionId: 'abc' }));

    expect(response.status).toBe(400);
  });

  it('answers 400 rather than 500 for a malformed body', async () => {
    const response = await POST(post('this is not json'));

    expect(response.status).toBe(400);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('refuses an oversized payload before parsing it', async () => {
    const response = await POST(post({ ...VALID, padding: 'x'.repeat(5000) }));

    expect(response.status).toBe(413);
    expect(prisma.productEvent.create).not.toHaveBeenCalled();
  });

  it('keeps the campaign the client sent, so a visit can be joined to a sale', async () => {
    await POST(post({ ...VALID, attribution: { campaign: 'promo-agustus', source: 'meta' } }));

    expect(written().attribution).toEqual({ campaign: 'promo-agustus', source: 'meta' });
  });

  it('stops one address that floods the endpoint, without touching the database', async () => {
    for (let i = 0; i < 60; i += 1) {
      await POST(post(VALID));
    }
    (prisma.productEvent.create as jest.Mock).mockClear();

    const response = await POST(post(VALID));

    expect(response.status).toBe(429);
    expect(prisma.productEvent.create).not.toHaveBeenCalled();
  });

  it('counts the limit per address, so one flooder cannot silence other visitors', async () => {
    for (let i = 0; i < 61; i += 1) {
      await POST(post(VALID, '198.51.100.9'));
    }

    const response = await POST(post(VALID, ADDRESS));

    expect(response.status).toBe(200);
  });

  it('answers 500 and logs when the write itself fails', async () => {
    (prisma.productEvent.create as jest.Mock).mockRejectedValue(new Error('db down'));

    const response = await POST(post(VALID));

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to record funnel event',
      undefined,
      expect.any(Error)
    );
  });
});
