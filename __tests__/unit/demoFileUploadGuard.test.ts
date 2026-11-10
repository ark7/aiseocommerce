import { POST as handleUpload } from '@/app/api/upload/route';
import { POST as handleManualPayment } from '@/app/api/payment/manual/route';
import {
  isDemoStore,
  createDemoUploadBlockedResponse,
  DEMO_FILE_UPLOAD_LOCKED_MESSAGE,
} from '@/lib/demoGuard';
import { prisma } from '@/lib/prisma';
import { requireUser, verifyToken } from '@/lib/auth';
import { requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { optimizeAndSaveImage, validateRawImage } from '@/lib/imageOptimizer';
import { savePaymentProofFile } from '@/lib/paymentStorage';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
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
  requireUser: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/superAdminAuth', () => ({
  requireSuperAdminOwner: jest.fn(),
}));

jest.mock('@/lib/imageOptimizer', () => ({
  optimizeAndSaveImage: jest.fn(),
  validateRawImage: jest.fn(),
  IMAGE_TYPE_CONFIGS: { general: {}, product: {}, logo: {}, favicon: {}, banner: {} },
}));

jest.mock('@/lib/orderNotificationService', () => ({
  dispatchPaymentProofNotification: jest.fn(),
}));

jest.mock('@/lib/paymentStorage', () => ({
  savePaymentProofFile: jest.fn().mockResolvedValue({
    filename: 'proof.png',
    relativePath: 'proofs/store-client-real-999/proof.png',
    storedFilename: 'proof.png',
    filePath: '/tmp/proof.png',
    url: '/uploads/proofs/proof.png',
    sizeBytes: 1024,
    mimeType: 'image/png',
  }),
}));

function createFakeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe('Demo File Upload Restrictions Guard (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Demo Upload Guard Utilities', () => {
    it('mengembalikan Response HTTP 403 dengan kode DEMO_FILE_UPLOAD_LOCKED', async () => {
      const response = createDemoUploadBlockedResponse();
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('DEMO_FILE_UPLOAD_LOCKED');
      expect(data.error).toBe(DEMO_FILE_UPLOAD_LOCKED_MESSAGE);
    });
  });

  describe('2. POST /api/upload — Store Image Upload Guard', () => {
    it('memblokir upload gambar (HTTP 403) khusus pada akun toko demo', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'user-demo-admin',
        email: 'admin@demo-store.local',
        role: 'ADMIN',
        storeId: 'demo-store-001',
      });
      (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);

      const file = createFakeFile('product.jpg', 'image/jpeg', 5000);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'product');

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('DEMO_FILE_UPLOAD_LOCKED');
      expect(optimizeAndSaveImage).not.toHaveBeenCalled();
    });

    it('mengizinkan upload gambar pada toko klien nyata (non-demo)', async () => {
      const CLIENT_STORE = 'store-client-real-999';
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'user-client-owner',
        email: 'owner@tokosaya.com',
        role: 'ADMIN',
        storeId: CLIENT_STORE,
      });
      (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: CLIENT_STORE,
        domain: 'tokosaya.com',
        isDemo: false,
      });
      (validateRawImage as jest.Mock).mockReturnValue({ valid: true });
      (optimizeAndSaveImage as jest.Mock).mockResolvedValue({
        url: '/uploads/products/optimized.webp',
        originalSize: 5000,
        optimizedSize: 2500,
        savingsPercent: 50,
      });

      const file = createFakeFile('product.jpg', 'image/jpeg', 5000);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'product');

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(optimizeAndSaveImage).toHaveBeenCalled();
    });
  });

  describe('3. POST /api/payment/manual — Manual Payment Proof Upload Guard', () => {
    it('memblokir upload bukti transfer (HTTP 403) pada pesanan toko demo', async () => {
      const DEMO_STORE = 'demo-store-001';
      const file = createFakeFile('receipt.jpg', 'image/jpeg', 1000);
      const formData = new FormData();
      formData.append('orderId', 'order-demo-01');
      formData.append('proof', file);

      // Authenticated customer of demo store
      (verifyToken as jest.Mock).mockResolvedValue({
        id: 'customer-demo-1',
        email: 'pembeli@demo-store.local',
        role: 'CUSTOMER',
        storeId: DEMO_STORE,
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-demo-01',
        storeId: DEMO_STORE,
        userId: 'customer-demo-1',
        status: 'PENDING',
        user: { id: 'customer-demo-1' },
      });

      const request = new Request('http://localhost/api/payment/manual', {
        method: 'POST',
        headers: { authorization: 'Bearer demo-token' },
        body: formData,
      });

      const response = await handleManualPayment(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('DEMO_FILE_UPLOAD_LOCKED');
      expect(data.error).toContain('Unggah bukti transfer dinonaktifkan pada Akun Demo');
    });

    it('mengizinkan upload bukti transfer pada pesanan toko klien nyata', async () => {
      const CLIENT_STORE = 'store-client-real-999';
      const file = createFakeFile('receipt.jpg', 'image/jpeg', 1000);
      const formData = new FormData();
      formData.append('orderId', 'order-client-01');
      formData.append('proof', file);

      (verifyToken as jest.Mock).mockResolvedValue({
        id: 'customer-client-1',
        email: 'pembeli@client.com',
        role: 'CUSTOMER',
        storeId: CLIENT_STORE,
      });

      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: CLIENT_STORE,
        domain: 'tokoclient.com',
        isDemo: false,
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-client-01',
        storeId: CLIENT_STORE,
        userId: 'customer-client-1',
        status: 'PENDING',
        user: { id: 'customer-client-1' },
      });

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: 'pay-001',
        orderId: 'order-client-01',
      });
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        id: 'pay-001',
        orderId: 'order-client-01',
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({
        id: 'order-client-01',
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({
        id: 'audit-001',
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (arg) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg(prisma);
      });

      const request = new Request('http://localhost/api/payment/manual', {
        method: 'POST',
        headers: { authorization: 'Bearer client-token' },
        body: formData,
      });

      const response = await handleManualPayment(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
