import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/services/transactionService', () => ({ recordOrderIncome: jest.fn() }));

const PROD_KEY = 'prod-server-key';
const SANDBOX_KEY = 'SB-server-key';

/** The route reads its production key at import time, so load it fresh per test. */
function loadRoute() {
  process.env.MIDTRANS_SERVER_KEY = PROD_KEY;
  let route: typeof import('@/app/api/payment/webhook/route');
  jest.isolateModules(() => {
    route = require('@/app/api/payment/webhook/route');
  });
  return route!;
}

function signed(key: string) {
  const payload = { order_id: 'order-1', transaction_status: 'settlement', transaction_id: 'tx-1' };
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHash('sha512').update(rawBody + key).digest('hex');
  return new Request('http://localhost/api/payment/webhook', {
    method: 'POST',
    headers: { 'x-gateway': 'midtrans', 'x-signature': signature, 'Content-Type': 'application/json' },
    body: rawBody,
  });
}

/** `select` is the signature-key lookup; the other call is the full order. */
function stubOrder(order: { isSandbox: boolean }, settings: Record<string, unknown> | null) {
  (prisma.order.findUnique as jest.Mock).mockImplementation((args: any) =>
    Promise.resolve(
      args.select
        ? { isSandbox: order.isSandbox, store: { settings } }
        : { id: 'order-1', totalAmount: 100000, isSandbox: order.isSandbox, payments: [] }
    )
  );
  (prisma.$transaction as jest.Mock).mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops)
  );
  (prisma.payment.create as jest.Mock).mockResolvedValue({});
  (prisma.order.update as jest.Mock).mockResolvedValue({});
}

describe('POST /api/payment/webhook — sandbox signatures', () => {
  it('accepts a sandbox order signed with the sandbox key, and marks the payment sandbox', async () => {
    stubOrder({ isSandbox: true }, { midtransSandboxServerKey: SANDBOX_KEY });

    const response = await loadRoute().POST(signed(SANDBOX_KEY));

    expect(response.status).toBe(200);
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isSandbox: true, status: 'PAID' }),
    });
  });

  it('rejects a sandbox order signed with the production key', async () => {
    stubOrder({ isSandbox: true }, { midtransSandboxServerKey: SANDBOX_KEY });

    const response = await loadRoute().POST(signed(PROD_KEY));

    expect(response.status).toBe(401);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a sandbox order when no sandbox key is configured, instead of using the live key', async () => {
    stubOrder({ isSandbox: true }, { midtransServerKey: 'store-live-key' });

    const response = await loadRoute().POST(signed(PROD_KEY));

    expect(response.status).toBe(401);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('still verifies a real order with the production key, and not with a sandbox one', async () => {
    stubOrder({ isSandbox: false }, { midtransSandboxServerKey: SANDBOX_KEY });

    expect((await loadRoute().POST(signed(SANDBOX_KEY))).status).toBe(401);

    stubOrder({ isSandbox: false }, { midtransSandboxServerKey: SANDBOX_KEY });
    expect((await loadRoute().POST(signed(PROD_KEY))).status).toBe(200);
  });
});

