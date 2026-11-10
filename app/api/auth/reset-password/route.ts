import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token reset wajib disertakan'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password baru wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password baru tidak cocok',
  path: ['confirmPassword'],
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Input tidak valid',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    // 1. Cari pengguna berdasarkan token reset aktif
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
      },
      select: {
        id: true,
        email: true,
        storeId: true,
        resetTokenExp: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Tautan pengaturan ulang kata sandi tidak valid atau sudah pernah digunakan.' },
        { status: 400 }
      );
    }

    // 2. Periksa masa kedaluwarsa token (1 jam)
    if (!user.resetTokenExp || user.resetTokenExp < new Date()) {
      return NextResponse.json(
        { error: 'Tautan pengaturan ulang kata sandi telah kedaluwarsa. Silakan ajukan permintaan baru.' },
        { status: 400 }
      );
    }

    // 3. Hash password baru dan bersihkan token
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    logger.info('User password successfully reset via token', {
      userId: user.id,
      storeId: user.storeId,
    });

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui! Silakan login menggunakan kata sandi baru Anda.',
    });
  } catch (error) {
    logger.error('Reset password execution failed', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Gagal mengatur ulang kata sandi' },
      { status: 500 }
    );
  }
}
