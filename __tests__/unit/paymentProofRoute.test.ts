import { GET } from '@/app/api/payment/proof/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { readPaymentProofFile } from '@/lib/paymentStorage';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/paymentStorage', () => ({
  readPaymentProofFile: jest.fn(),
  ensureProofOnDisk: jest.fn(),
}));

describe('GET /api/payment/proof — Payment Proof API', () => {
  const mockUser = {
    id: 'user-admin',
    storeId: 'demo-store-001',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when paymentId is missing', async () => {
    const request = new Request('http://localhost/api/payment/proof');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('paymentId required');
  });

  it('returns 401 when unauthenticated', async () => {
    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user belongs to different store', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      order: { storeId: 'other-store', orderNumber: 'ORD-OTHER', totalAmount: 100000 },
    });

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-1', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Unauthorized');
  });

  it('returns 403 when customer tries to access another customer order proof', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({
      id: 'customer-1',
      storeId: 'demo-store-001',
      role: 'CUSTOMER',
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-cust-2',
      orderId: 'order-cust-2',
      order: {
        storeId: 'demo-store-001',
        userId: 'customer-2', // different customer!
        orderNumber: 'ORD-002',
        totalAmount: 150000,
      },
    });

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-cust-2', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Pesanan bukan milik akun Anda');
  });

  it('returns 404 when payment is not found', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-not-found', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Payment not found');
  });

  it('reads file directly from isolated store disk folder when available', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-disk-1',
      orderId: 'order-disk-1',
      proofData: null,
      proofFile: JSON.stringify({
        filename: 'pay-disk-1-12345-struk.jpg',
        name: 'struk.jpg',
        type: 'image/jpeg',
      }),
      proofUrl: null,
      method: 'MANUAL',
      order: { storeId: 'demo-store-001', orderNumber: 'DEMO-ORD-DISK', totalAmount: 200000 },
    });

    (readPaymentProofFile as jest.Mock).mockResolvedValue({
      buffer: Buffer.from('disk-file-binary-content'),
      mimeType: 'image/jpeg',
      size: 24,
    });

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-disk-1', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.source).toBe('disk');
    expect(data.proofData).toBe(Buffer.from('disk-file-binary-content').toString('base64'));
    expect(readPaymentProofFile).toHaveBeenCalledWith({
      storeId: 'demo-store-001',
      filename: 'pay-disk-1-12345-struk.jpg',
    });
  });

  it('returns 403 when path traversal is attempted in filename', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-traversal',
      orderId: 'order-traversal',
      proofData: null,
      proofFile: JSON.stringify({
        filename: '../../secret.jpg',
        name: 'secret.jpg',
      }),
      method: 'MANUAL',
      order: { storeId: 'demo-store-001', orderNumber: 'DEMO-ORD-TRAV', totalAmount: 200000 },
    });

    (readPaymentProofFile as jest.Mock).mockRejectedValue(
      new Error('Path traversal attempt detected')
    );

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-traversal', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Invalid file path');
  });

  it('returns proofData base64 and parsed fileInfo when user uploaded proof', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      proofData: 'bW9jay1iYXNlNjQ=',
      proofFile: JSON.stringify({ name: 'spectrum emosi.jpeg', type: 'image/jpeg', size: 31171 }),
      proofUrl: null,
      method: 'MANUAL',
      order: { storeId: 'demo-store-001', orderNumber: 'DEMO-ORD-005', totalAmount: 494000 },
    });

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-1', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.proofData).toBe('bW9jay1iYXNlNjQ=');
    expect(data.fileInfo.name).toBe('spectrum emosi.jpeg');
    expect(data.fileInfo.type).toBe('image/jpeg');
  });

  it('safely handles non-JSON plain string proofFile without throwing', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      proofData: 'bW9jay1kYXRh',
      proofFile: 'plain-filename-proof.jpg',
      proofUrl: null,
      method: 'MANUAL',
      order: { storeId: 'demo-store-001', orderNumber: 'DEMO-ORD-005', totalAmount: 100000 },
    });

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-1', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.fileInfo.name).toBe('plain-filename-proof.jpg');
    expect(data.fileInfo.type).toBe('image/jpeg');
  });

  it('returns proofUrl when proofData is null but proofUrl is set', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-2',
      orderId: 'order-2',
      proofData: null,
      proofFile: 'proof.jpg',
      proofUrl: 'https://example.com/receipt.jpg',
      method: 'MANUAL',
      order: { storeId: 'demo-store-001', orderNumber: 'DEMO-ORD-002', totalAmount: 250000 },
    });

    const request = new Request('http://localhost/api/payment/proof?paymentId=pay-2', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.proofUrl).toBe('https://example.com/receipt.jpg');
    expect(data.proofData).toBeNull();
  });

  it('generates demo receipt SVG base64 when both proofData and proofUrl are null for demo manual payment', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'demo-payment-005',
      orderId: 'demo-order-005',
      proofData: null,
      proofFile: null,
      proofUrl: null,
      method: 'MANUAL',
      order: { storeId: 'demo-store-001', orderNumber: 'DEMO-ORD-005', totalAmount: 350000 },
    });

    const request = new Request('http://localhost/api/payment/proof?paymentId=demo-payment-005', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.proofData).toBe('string');
    expect(data.fileInfo.type).toBe('image/svg+xml');
    const decoded = Buffer.from(data.proofData, 'base64').toString('utf-8');
    expect(decoded).toContain('DEMO-ORD-005');
    expect(decoded).toContain('BUKTI TRANSFER BERHASIL');
  });
});
