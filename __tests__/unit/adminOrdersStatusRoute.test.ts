import { PATCH } from '@/app/api/admin/orders/[id]/status/route';
import { prisma } from '@/lib/prisma';
import { requireStoreRole } from '@/lib/auth';
import { updateOrderStatus } from '@/services/orderStatusService';

jest.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: jest.fn() } },
}));

jest.mock('@/lib/auth', () => ({ requireStoreRole: jest.fn() }));

jest.mock('@/services/orderStatusService', () => ({ updateOrderStatus: jest.fn() }));

const ORDER = { id: 'order-1', storeId: 'store-1' };
const ADMIN = { id: 'user-1', storeId: 'store-1', email: 'a@b.c', role: 'ADMIN' };

function patchRequest(body: unknown, id = ORDER.id) {
  return {
    request: new Request(`http://localhost/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    context: { params: { id } },
  };
}

describe('PATCH /api/admin/orders/[id]/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when the order does not exist', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
    const { request, context } = patchRequest({ status: 'SHIPPED' });

    const response = await PATCH(request, context);

    expect(response.status).toBe(404);
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller has no role in that store', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(ORDER);
    (requireStoreRole as jest.Mock).mockResolvedValue(null);
    const { request, context } = patchRequest({ status: 'SHIPPED' });

    const response = await PATCH(request, context);

    expect(response.status).toBe(403);
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('delegates with the authenticated user, not the id in the request body', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(ORDER);
    (requireStoreRole as jest.Mock).mockResolvedValue(ADMIN);
    (updateOrderStatus as jest.Mock).mockResolvedValue({ success: true, status: 'SHIPPED' });
    const { request, context } = patchRequest({
      status: 'SHIPPED',
      note: 'resi JNE',
      userId: 'attacker',
    });

    const response = await PATCH(request, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, status: 'SHIPPED' });
    expect(updateOrderStatus).toHaveBeenCalledWith({
      orderId: ORDER.id,
      storeId: ORDER.storeId,
      userId: ADMIN.id,
      newStatus: 'SHIPPED',
      note: 'resi JNE',
    });
  });

  it('rejects an unknown status with 400 and never reaches the service', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(ORDER);
    (requireStoreRole as jest.Mock).mockResolvedValue(ADMIN);
    const { request, context } = patchRequest({ status: 'TELEPORTED' });

    const response = await PATCH(request, context);

    expect(response.status).toBe(400);
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('surfaces an illegal transition from the service as 400', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(ORDER);
    (requireStoreRole as jest.Mock).mockResolvedValue(ADMIN);
    (updateOrderStatus as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Cannot move order from CANCELLED to SHIPPED',
    });
    const { request, context } = patchRequest({ status: 'SHIPPED' });

    const response = await PATCH(request, context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Cannot move order from CANCELLED to SHIPPED',
    });
  });
});
