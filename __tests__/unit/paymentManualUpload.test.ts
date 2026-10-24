import { POST } from '@/app/api/payment/manual/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { dispatchPaymentProofNotification } from '@/lib/orderNotificationService';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/orderNotificationService', () => ({
  dispatchPaymentProofNotification: jest.fn(),
}));

function createFakeFile(name: string, type: string, size: number, content?: string): File {
  const data = content ? content : new Uint8Array(size);
  const blob = new Blob([data], { type });
  return new File([blob], name, { type });
}

function createUploadRequest(
  fields: { orderId?: string; proof?: File },
  token: string | null = 'valid-token'
): Request {
  const formData = new FormData();
  if (fields.orderId !== undefined) {
    formData.append('orderId', fields.orderId);
  }
  if (fields.proof !== undefined) {
    formData.append('proof', fields.proof);
  }

  return new Request('http://localhost/api/payment/manual', {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
}

describe('POST /api/payment/manual — Customer Payment Proof Upload', () => {
  const STORE_ID = 'store-tokodemoku';
  const CUSTOMER_ID = 'cust-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockResolvedValue({
      id: CUSTOMER_ID,
      storeId: STORE_ID,
      role: 'CUSTOMER',
    });
  });

  it('returns 401 when authorization header is missing or invalid', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(null);

    const file = createFakeFile('struk.jpg', 'image/jpeg', 1024);
    const req = createUploadRequest({ orderId: 'ord-1', proof: file }, null);

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when orderId or proof file is missing', async () => {
    const file = createFakeFile('struk.jpg', 'image/jpeg', 1024);
    const reqMissingOrderId = createUploadRequest({ proof: file });

    const res = await POST(reqMissingOrderId);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('orderId and proof required');
  });

  it('returns 400 when file size exceeds 2MB limit', async () => {
    const largeFile = createFakeFile('huge.png', 'image/png', 3 * 1024 * 1024);
    const req = createUploadRequest({ orderId: 'ord-1', proof: largeFile });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('File too large');
  });

  it('returns 400 when file MIME type is unsupported', async () => {
    const textFile = createFakeFile('script.sh', 'application/x-sh', 500);
    const req = createUploadRequest({ orderId: 'ord-1', proof: textFile });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Format file tidak didukung');
  });

  it('returns 404 when order does not exist', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    const file = createFakeFile('struk.jpg', 'image/jpeg', 1024);
    const req = createUploadRequest({ orderId: 'non-existent', proof: file });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 403 when order belongs to another tenant store', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-other-store',
      storeId: 'different-store',
      userId: CUSTOMER_ID,
      status: 'PENDING',
    });

    const file = createFakeFile('struk.jpg', 'image/jpeg', 1024);
    const req = createUploadRequest({ orderId: 'ord-other-store', proof: file });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when customer tries to upload proof for another customer order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-stranger',
      storeId: STORE_ID,
      userId: 'stranger-id',
      status: 'PENDING',
    });

    const file = createFakeFile('struk.jpg', 'image/jpeg', 1024);
    const req = createUploadRequest({ orderId: 'ord-stranger', proof: file });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Pesanan bukan milik akun Anda');
  });

  it('returns 400 when order status is not PENDING or MANUAL_VERIFICATION', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-completed',
      storeId: STORE_ID,
      userId: CUSTOMER_ID,
      status: 'COMPLETED',
    });

    const file = createFakeFile('struk.jpg', 'image/jpeg', 1024);
    const req = createUploadRequest({ orderId: 'ord-completed', proof: file });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('not waiting for payment');
  });

  it('successfully uploads proof as CUSTOMER and updates order to MANUAL_VERIFICATION', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-pending',
      storeId: STORE_ID,
      userId: CUSTOMER_ID,
      status: 'PENDING',
      totalAmount: 329000,
    });

    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'pay-1',
      orderId: 'ord-pending',
    });

    const savedPayment = { id: 'pay-1', orderId: 'ord-pending', status: 'PENDING' };
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      savedPayment,
      { id: 'ord-pending', status: 'MANUAL_VERIFICATION' },
      { id: 'audit-1' },
    ]);

    const file = createFakeFile('bukti-transfer.png', 'image/png', 2048, 'binary-image-data');
    const req = createUploadRequest({ orderId: 'ord-pending', proof: file });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('Payment proof uploaded');

    // Verify transaction executed
    expect(prisma.$transaction).toHaveBeenCalled();

    // Verify WhatsApp/Telegram notification dispatched
    expect(dispatchPaymentProofNotification).toHaveBeenCalledWith('pay-1');
  });
});
