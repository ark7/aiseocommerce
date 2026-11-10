import { POST as handleChangePassword } from '@/app/api/auth/change-password/route';
import { POST as handleForgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as handleResetPassword } from '@/app/api/auth/reset-password/route';
import { prisma } from '@/lib/prisma';
import { requireUser, comparePassword, hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/emailService';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
  comparePassword: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('new-hashed-password-123'),
}));

jest.mock('@/lib/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Self-Service Password Management (Change, Forgot, & Reset Password)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Endpoint POST /api/auth/change-password (Logged-in)', () => {
    it('menolak request tanpa autentikasi (401 Unauthorized)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'old-pass',
          newPassword: 'new-pass-123',
          confirmPassword: 'new-pass-123',
        }),
      });

      const response = await handleChangePassword(request);
      expect(response.status).toBe(401);
    });

    it('menolak pengubahan password pada akun demo bersama (403 Forbidden)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        id: 'user-admin-demo',
        email: 'admin@demo-store.local',
        role: 'ADMIN',
        storeId: 'demo-store-001',
      });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'password',
          newPassword: 'hacker-password-123',
          confirmPassword: 'hacker-password-123',
        }),
      });

      const response = await handleChangePassword(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Password akun demo bersifat tetap');
      expect(data.isDemoRestricted).toBe(true);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('menolak jika password saat ini salah (400 Bad Request)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        id: 'user-client-1',
        email: 'owner@tokoklien.com',
        role: 'ADMIN',
        storeId: 'store-client-123',
      });

      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'store-client-123',
        domain: 'tokoklien.com',
        isDemo: false,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-client-1',
        email: 'owner@tokoklien.com',
        passwordHash: 'actual-hashed-password',
        storeId: 'store-client-123',
      });

      (comparePassword as jest.Mock).mockResolvedValueOnce(false);

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'wrong-password',
          newPassword: 'new-pass-12345',
          confirmPassword: 'new-pass-12345',
        }),
      });

      const response = await handleChangePassword(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Password saat ini yang Anda masukkan salah');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('berhasil memperbarui password jika input valid (200 OK)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        id: 'user-client-1',
        email: 'owner@tokoklien.com',
        role: 'ADMIN',
        storeId: 'store-client-123',
      });

      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'store-client-123',
        domain: 'tokoklien.com',
        isDemo: false,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-client-1',
        email: 'owner@tokoklien.com',
        passwordHash: 'actual-hashed-password',
        storeId: 'store-client-123',
      });

      (comparePassword as jest.Mock).mockResolvedValueOnce(true);

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'correct-password',
          newPassword: 'brand-new-secret-123',
          confirmPassword: 'brand-new-secret-123',
        }),
      });

      const response = await handleChangePassword(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-client-1' },
        data: {
          passwordHash: 'new-hashed-password-123',
          resetToken: null,
          resetTokenExp: null,
        },
      });
    });
  });

  describe('2. Endpoint POST /api/auth/forgot-password (Lupa Password)', () => {
    it('memberikan informasi password tetap untuk akun demo', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'user-admin-demo',
        email: 'admin@demo-store.local',
        store: { id: 'demo-store-001', name: 'Demo Store', domain: 'demo-store.local', isDemo: true },
      });

      const request = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@demo-store.local' }),
      });

      const response = await handleForgotPassword(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDemo).toBe(true);
      expect(data.message).toContain('password');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('membuat resetToken dan mengirim email untuk akun klien nyata', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'user-client-99',
        email: 'client@toko.com',
        firstName: 'Budi',
        store: { id: 'store-client-99', name: 'Toko Sepatu Budi', domain: 'tokosepatubudi.com', isDemo: false },
      });

      const request = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'client@toko.com' }),
      });

      const response = await handleForgotPassword(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-client-99' },
          data: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExp: expect.any(Date),
          }),
        })
      );
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe('3. Endpoint POST /api/auth/reset-password (Reset Password via Token)', () => {
    it('menolak token yang tidak ditemukan atau kedaluwarsa (400 Bad Request)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid-token-xyz',
          newPassword: 'my-new-password-123',
          confirmPassword: 'my-new-password-123',
        }),
      });

      const response = await handleResetPassword(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('tidak valid atau sudah pernah digunakan');
    });

    it('berhasil mereset password dan membersihkan token jika token valid (200 OK)', async () => {
      const validFutureDate = new Date(Date.now() + 1800000); // 30 menit ke depan
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'user-client-99',
        email: 'client@toko.com',
        storeId: 'store-client-99',
        resetTokenExp: validFutureDate,
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-secure-token-64char',
          newPassword: 'completely-new-password-123',
          confirmPassword: 'completely-new-password-123',
        }),
      });

      const response = await handleResetPassword(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-client-99' },
        data: {
          passwordHash: 'new-hashed-password-123',
          resetToken: null,
          resetTokenExp: null,
        },
      });
    });
  });
});
