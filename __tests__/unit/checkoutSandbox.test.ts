import { POST } from '../../app/api/checkout/route';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  },
}));

describe('POST /api/checkout — Sandbox Routing', () => {
  const STORE_ID = 'store-test-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates payment with isSandbox=true and routes to sandbox simulator when order is sandbox', async () => {
    const sandboxOrder = {
      id: 'order-sb-1',
      storeId: STORE_ID,
      totalAmount: 150000,
      isSandbox: true,
    };

    (prisma.order.findUnique as jest.Mock).mockResolvedValue(sandboxOrder);
    (prisma.payment.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'pay-sb-999', ...data })
    );

    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: STORE_ID,
        orderId: 'order-sb-1',
        paymentMethod: 'MIDTRANS',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isSandbox).toBe(true);

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-sb-1',
        method: 'MIDTRANS',
        amount: 150000,
        status: 'PENDING',
        isSandbox: true,
      }),
    });

    expect(data.paymentGatewayResponse.redirectUrl).toBe(
      'https://simulator.payment-gateway.example.com/sandbox/pay/pay-sb-999'
    );
  });

  it('creates payment with isSandbox=false and routes to production simulator when order is regular', async () => {
    const regularOrder = {
      id: 'order-real-1',
      storeId: STORE_ID,
      totalAmount: 200000,
      isSandbox: false,
    };

    (prisma.order.findUnique as jest.Mock).mockResolvedValue(regularOrder);
    (prisma.payment.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'pay-real-100', ...data })
    );

    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: STORE_ID,
        orderId: 'order-real-1',
        paymentMethod: 'MIDTRANS',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isSandbox).toBe(false);

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-real-1',
        method: 'MIDTRANS',
        amount: 200000,
        status: 'PENDING',
        isSandbox: false,
      }),
    });

    expect(data.paymentGatewayResponse.redirectUrl).toBe(
      'https://simulator.payment-gateway.example.com/pay/pay-real-100'
    );
  });
});

