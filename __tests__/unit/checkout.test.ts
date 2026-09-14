import { POST } from '../../app/api/checkout/route';

// Mock prisma
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

import { prisma } from '../../lib/prisma';

describe('POST /api/checkout', () => {
  const mockOrder = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    storeId: '123e4567-e89b-12d3-a456-426614174001',
    totalAmount: 100000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a payment and return redirect URL for MIDTRANS', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
    (prisma.payment.create as jest.Mock).mockResolvedValue({
      id: 'payment-456',
      orderId: mockOrder.id,
      method: 'MIDTRANS',
      amount: 100000,
      status: 'PENDING',
    });

    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: mockOrder.storeId,
        orderId: mockOrder.id,
        paymentMethod: 'MIDTRANS',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.payment).toMatchObject({
      id: 'payment-456',
      orderId: mockOrder.id,
      method: 'MIDTRANS',
      amount: 100000,
      status: 'PENDING',
    });
    expect(data.paymentGatewayResponse.redirectUrl).toBe(
      'https://simulator.payment-gateway.example.com/pay/payment-456'
    );
  });

  it('should return 404 if order not found', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: mockOrder.storeId,
        orderId: mockOrder.id,
        paymentMethod: 'MIDTRANS',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Order not found');
  });

  it('should return 403 if storeId mismatch', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      ...mockOrder,
      storeId: '123e4567-e89b-12d3-a456-426614174002',
    });

    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: mockOrder.storeId,
        orderId: mockOrder.id,
        paymentMethod: 'MIDTRANS',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle Zod validation errors', async () => {
    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: 'invalid-uuid',
        orderId: mockOrder.id,
        paymentMethod: 'MIDTRANS',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid input');
  });
});