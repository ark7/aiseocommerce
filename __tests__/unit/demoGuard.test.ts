import {
  isDemoStore,
  isDemoEmail,
  assertNotDemoStore,
  createDemoReadOnlyResponse,
  DemoReadOnlyError,
  DEMO_READ_ONLY_MESSAGE,
  DEMO_PASSWORD_LOCKED_MESSAGE,
} from '@/lib/demoGuard';
import { POST as handleCreateProduct, DELETE as handleDeleteProduct } from '@/app/api/products/route';
import { POST as handleCreateCategory, DELETE as handleDeleteCategory } from '@/app/api/categories/route';
import { PUT as handleUpdateGeneralSettings } from '@/app/api/admin/settings/general/route';
import { POST as handleCreateStaff } from '@/app/api/admin/staff/route';
import { prisma } from '@/lib/prisma';
import { verifyToken, requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    storeSettings: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
  requireUser: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('@/lib/revalidate', () => ({
  revalidateProduct: jest.fn(),
  revalidateCategory: jest.fn(),
}));

jest.mock('@/services/auditService', () => ({
  auditProductCreated: jest.fn(),
  auditProductDeleted: jest.fn(),
  auditCategoryCreated: jest.fn(),
  auditCategoryDeleted: jest.fn(),
}));

describe('Demo Read-Only Guard & Multi-Tenant CRUD Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Core Utility Functions (lib/demoGuard)', () => {
    it('mengidentifikasi email demo bersama dengan benar', () => {
      expect(isDemoEmail('admin@demo-store.local')).toBe(true);
      expect(isDemoEmail('staff@demo-store.local')).toBe(true);
      expect(isDemoEmail('customer1@demo-store.local')).toBe(true);
      expect(isDemoEmail('owner@tokoklien.com')).toBe(false);
      expect(isDemoEmail(null)).toBe(false);
    });

    it('mengidentifikasi toko demo berdasarkan id, domain, dan flag isDemo', async () => {
      // 1. Berdasarkan id hardcoded demo-store-001
      expect(await isDemoStore('demo-store-001')).toBe(true);

      // 2. Berdasarkan flag isDemo: true di database
      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'store-custom-demo',
        domain: 'toko-preview.com',
        isDemo: true,
      });
      expect(await isDemoStore('store-custom-demo')).toBe(true);

      // 3. Berdasarkan domain demo.larismanis.online
      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'store-subdomain-demo',
        domain: 'demo.larismanis.online',
        isDemo: false,
      });
      expect(await isDemoStore('store-subdomain-demo')).toBe(true);

      // 4. Toko klien nyata (produksi) menghasilkan false
      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'store-client-real',
        domain: 'tokosepatu.com',
        isDemo: false,
      });
      expect(await isDemoStore('store-client-real')).toBe(false);
    });

    it('assertNotDemoStore melempar DemoReadOnlyError pada toko demo dan lolos pada toko klien', async () => {
      // 1. Toko demo melempar DemoReadOnlyError
      await expect(assertNotDemoStore('demo-store-001')).rejects.toThrow(DemoReadOnlyError);

      // 2. Toko klien normal lolos tanpa error
      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'store-client-real',
        isDemo: false,
        domain: 'tokoklien.id',
      });

      await expect(assertNotDemoStore('store-client-real')).resolves.toBeUndefined();
    });
  });

  describe('2. Pembatasan CRUD Produk pada Mode Demo', () => {
    it('menolak penghapusan produk di toko demo (403 Forbidden)', async () => {
      (verifyToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-admin-demo',
        role: 'ADMIN',
        storeId: 'demo-store-001',
      });

      const request = new Request('http://localhost:3000/api/products', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer token-demo',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'prod-demo-1' }),
      });

      const response = await handleDeleteProduct(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Aksi dibatasi pada Akun Demo');
      expect(data.isDemoRestricted).toBe(true);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('mengizinkan penghapusan produk di toko klien normal', async () => {
      (verifyToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-admin-client',
        role: 'ADMIN',
        storeId: 'store-client-123',
      });

      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'store-client-123',
        domain: 'tokoklien.com',
        isDemo: false,
      });

      (prisma.product.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'prod-client-1',
        storeId: 'store-client-123',
        images: [],
      });

      const request = new Request('http://localhost:3000/api/products', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer token-client',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'prod-client-1' }),
      });

      const response = await handleDeleteProduct(request);
      expect(response.status).toBe(200);
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-client-1' } });
    });
  });

  describe('3. Pembatasan CRUD Kategori & Settings pada Mode Demo', () => {
    it('menolak pembuatan kategori di toko demo (403 Forbidden)', async () => {
      (verifyToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-admin-demo',
        role: 'ADMIN',
        storeId: 'demo-store-001',
      });

      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-demo',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Kategori Uji Coba', slug: 'kategori-uji-coba' }),
      });

      const response = await handleCreateCategory(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Aksi dibatasi pada Akun Demo');
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('menolak pengubahan pengaturan umum toko di toko demo (403 Forbidden)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        id: 'user-admin-demo',
        role: 'ADMIN',
        storeId: 'demo-store-001',
      });

      const request = new Request('http://localhost:3000/api/admin/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nama Toko Diubah Hacker' }),
      });

      const response = await handleUpdateGeneralSettings(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Aksi dibatasi pada Akun Demo');
      expect(prisma.store.update).not.toHaveBeenCalled();
    });
  });
});
