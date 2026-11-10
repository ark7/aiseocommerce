import { GET as listStaff, POST as createStaff } from '@/app/api/admin/staff/route';
import {
  GET as getStaff,
  PUT as updateStaff,
  DELETE as deleteStaff,
} from '@/app/api/admin/staff/[id]/route';
import { requireUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('mock_hashed_pw'),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('/api/admin/staff routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/staff', () => {
    it('returns 401 when unauthenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/admin/staff');
      const res = await listStaff(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 when user is STAFF without staff permission', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-staff-1',
        storeId: 'store-1',
        role: 'STAFF',
        permissions: ['products', 'orders'],
      });

      const req = new NextRequest('http://localhost/api/admin/staff');
      const res = await listStaff(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Akses Ditolak');
    });

    it('returns staff list when user is ADMIN', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'u-staff-1',
          email: 'staff@example.com',
          firstName: 'Budi',
          lastName: 'Santoso',
          phone: '08123456789',
          title: 'CS Support',
          role: 'STAFF',
          permissions: ['dashboard', 'orders', 'customers'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const req = new NextRequest('http://localhost/api/admin/staff');
      const res = await listStaff(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.staff).toHaveLength(1);
      expect(data.staff[0].permissions).toEqual(['dashboard', 'orders', 'customers']);
      expect(data.availablePermissions).toBeDefined();
    });
  });

  describe('POST /api/admin/staff', () => {
    it('returns 409 when email already exists in store', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: 'staff@example.com',
      });

      const req = new NextRequest('http://localhost/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          email: 'staff@example.com',
          password: 'password123',
          firstName: 'Budi',
          title: 'Staff Gudang',
          permissions: ['products', 'orders'],
        }),
      });

      const res = await createStaff(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe('Email sudah terdaftar untuk toko ini');
    });

    it('creates staff account successfully', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-staff-1',
        email: 'staff2@example.com',
        firstName: 'Dewi',
        lastName: 'Lestari',
        phone: '08987654321',
        title: 'Akuntan',
        role: 'STAFF',
        permissions: ['dashboard', 'finance', 'orders'],
        isActive: true,
        createdAt: new Date(),
      });

      const req = new NextRequest('http://localhost/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          email: 'staff2@example.com',
          password: 'password123',
          firstName: 'Dewi',
          lastName: 'Lestari',
          phone: '08987654321',
          title: 'Akuntan',
          permissions: ['dashboard', 'finance', 'orders'],
        }),
      });

      const res = await createStaff(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.staff.email).toBe('staff2@example.com');
      expect(data.staff.permissions).toEqual(['dashboard', 'finance', 'orders']);
    });
  });

  describe('PUT /api/admin/staff/[id]', () => {
    it('updates staff permissions and title', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'target-staff',
        storeId: 'store-1',
        role: 'STAFF',
      });

      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'target-staff',
        email: 'staff@example.com',
        firstName: 'Budi Updated',
        lastName: 'Santoso',
        phone: null,
        title: 'Manager Operasional',
        role: 'STAFF',
        permissions: ['dashboard', 'products', 'categories', 'orders'],
        isActive: true,
        updatedAt: new Date(),
      });

      const req = new NextRequest('http://localhost/api/admin/staff/target-staff', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: 'Budi Updated',
          title: 'Manager Operasional',
          permissions: ['dashboard', 'products', 'categories', 'orders'],
        }),
      });

      const res = await updateStaff(req, { params: Promise.resolve({ id: 'target-staff' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.staff.title).toBe('Manager Operasional');
      expect(data.staff.permissions).toEqual(['dashboard', 'products', 'categories', 'orders']);
    });

    it('prevents user from deactivating themselves', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      const req = new NextRequest('http://localhost/api/admin/staff/u-admin-1', {
        method: 'PUT',
        body: JSON.stringify({
          isActive: false,
        }),
      });

      const res = await updateStaff(req, { params: Promise.resolve({ id: 'u-admin-1' }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('tidak dapat menonaktifkan akun Anda sendiri');
    });
  });

  describe('DELETE /api/admin/staff/[id]', () => {
    it('prevents deleting own account', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      const req = new NextRequest('http://localhost/api/admin/staff/u-admin-1', {
        method: 'DELETE',
      });

      const res = await deleteStaff(req, { params: Promise.resolve({ id: 'u-admin-1' }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Operasi Ditolak');
    });

    it('deletes staff member successfully', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'u-admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'target-staff',
        storeId: 'store-1',
        role: 'STAFF',
      });

      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'target-staff' });

      const req = new NextRequest('http://localhost/api/admin/staff/target-staff', {
        method: 'DELETE',
      });

      const res = await deleteStaff(req, { params: Promise.resolve({ id: 'target-staff' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('berhasil dihapus');
    });
  });
});

