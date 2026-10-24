import { GET as getCategories } from '@/app/api/categories/route';
import { POST as postCheckout } from '@/app/api/checkout/route';
import { POST as postOrderReceived } from '@/app/api/orders/[id]/received/route';
import { POST as postOrderComplete } from '@/app/api/orders/[id]/complete/route';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { requireUser, verifyToken } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/store', () => ({
  getActiveStore: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('@/services/auditService', () => ({
  auditOrderStatusChanged: jest.fn(),
}));

describe('Strange Behaviors Audit & Fix Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Behavior 1 & 3: Category Multi-Tenant Scoping with getActiveStore()', () => {
    it('scopes categories to active store when storeId is not provided in query or auth', async () => {
      (verifyToken as jest.Mock).mockResolvedValue(null);
      (getActiveStore as jest.Mock).mockResolvedValue({
        id: 'store-active-123',
        name: 'Toko Aktif Yuhu',
        domain: 'tokodemoyuhu.com',
      });

      (prisma.category.findMany as jest.Mock).mockResolvedValue([
        { id: 'cat-1', name: 'Elektronik', storeId: 'store-active-123' },
      ]);
      (prisma.category.count as jest.Mock).mockResolvedValue(1);

      const request = new Request('http://tokodemoyuhu.com/api/categories');
      const response = await getCategories(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toHaveLength(1);
      expect(getActiveStore).toHaveBeenCalled();
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId: 'store-active-123',
          }),
        })
      );
    });
  });

  describe('Behavior 4: Checkout Authorization & Order Ownership Checks', () => {
    const mockOrder = {
      id: 'order-001',
      storeId: 'store-abc',
      userId: 'customer-1',
      totalAmount: 150000,
      isSandbox: false,
    };

    it('rejects checkout when authenticated caller belongs to a different store', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        storeId: 'different-store',
        role: 'CUSTOMER',
      });

      const request = new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-abc',
          orderId: 'order-001',
          paymentMethod: 'MANUAL',
        }),
      });

      const response = await postCheckout(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('rejects checkout when authenticated user is not the order owner', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'customer-impostor',
        storeId: 'store-abc',
        role: 'CUSTOMER',
      });

      const request = new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-abc',
          orderId: 'order-001',
          paymentMethod: 'MANUAL',
        }),
      });

      const response = await postCheckout(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('allows checkout when authenticated user is the legitimate owner', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        storeId: 'store-abc',
        role: 'CUSTOMER',
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'pay-001',
        orderId: mockOrder.id,
        method: 'MANUAL',
        amount: 150000,
        status: 'PENDING',
      });

      const request = new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-abc',
          orderId: 'order-001',
          paymentMethod: 'MANUAL',
        }),
      });

      const response = await postCheckout(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });

  describe('Behavior 2: Customer Order Receipt & Completion Lifecycle', () => {
    const shippedOrder = {
      id: 'order-ship-1',
      storeId: 'store-abc',
      userId: 'customer-1',
      status: 'SHIPPED',
    };

    const deliveredOrder = {
      id: 'order-ship-1',
      storeId: 'store-abc',
      userId: 'customer-1',
      status: 'DELIVERED',
    };

    it('successfully transitions order from SHIPPED to DELIVERED when customer confirms receipt', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        storeId: 'store-abc',
        role: 'CUSTOMER',
      });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(shippedOrder);
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...shippedOrder,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });

      const request = new Request('http://localhost/api/orders/order-ship-1/received', {
        method: 'POST',
      });
      const response = await postOrderReceived(request, { params: { id: 'order-ship-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order.status).toBe('DELIVERED');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-ship-1' },
          data: expect.objectContaining({ status: 'DELIVERED' }),
        })
      );
    });

    it('rejects order received confirmation if status is not SHIPPED', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        storeId: 'store-abc',
        role: 'CUSTOMER',
      });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...shippedOrder,
        status: 'PENDING',
      });

      const request = new Request('http://localhost/api/orders/order-ship-1/received', {
        method: 'POST',
      });
      const response = await postOrderReceived(request, { params: { id: 'order-ship-1' } });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Order has not been shipped yet');
    });

    it('successfully transitions order from DELIVERED to COMPLETED when customer completes order', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        storeId: 'store-abc',
        role: 'CUSTOMER',
      });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(deliveredOrder);
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...deliveredOrder,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const request = new Request('http://localhost/api/orders/order-ship-1/complete', {
        method: 'POST',
      });
      const response = await postOrderComplete(request, { params: { id: 'order-ship-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order.status).toBe('COMPLETED');
    });

    it('rejects order complete if status is not DELIVERED', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        storeId: 'store-abc',
        role: 'CUSTOMER',
      });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(shippedOrder); // still SHIPPED

      const request = new Request('http://localhost/api/orders/order-ship-1/complete', {
        method: 'POST',
      });
      const response = await postOrderComplete(request, { params: { id: 'order-ship-1' } });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Order must be DELIVERED before it can be completed');
    });
  });
});
