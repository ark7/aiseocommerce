import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, comparePassword, hashPassword } from '@/lib/auth';
import { isDemoStore, isDemoEmail, DEMO_PASSWORD_LOCKED_MESSAGE } from '@/lib/demoGuard';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password baru wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password baru tidak cocok',
  path: ['confirmPassword'],
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    // 1. Perlindungan Akun Demo: Jangan izinkan mengganti password akun demo bersama
    if (isDemoEmail(user.email) || (await isDemoStore(user.storeId))) {
      return NextResponse.json(
        {
          error: DEMO_PASSWORD_LOCKED_MESSAGE,
          isDemoRestricted: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ChangePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Input tidak valid',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // 2. Ambil data user dari database untuk memverifikasi password saat ini
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, passwordHash: true, storeId: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Password saat ini yang Anda masukkan salah' },
        { status: 400 }
      );
    }

    // 3. Hash password baru dan simpan ke database
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    logger.info('User password changed successfully', {
      userId: dbUser.id,
      storeId: dbUser.storeId,
    });

    return NextResponse.json({
      success: true,
      message: 'Kata sandi akun Anda berhasil diperbarui.',
    });
  } catch (error) {
    logger.error('Failed to change user password', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui kata sandi' },
      { status: 500 }
    );
  }
}
