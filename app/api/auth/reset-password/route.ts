import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { allow } from '@/lib/rateLimit';
import { getIPAddress } from '@/lib/ip';
import { verifyRequestTurnstileOrPass } from '@/lib/turnstile';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token reset wajib disertakan'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password baru wajib diisi'),
  turnstileToken: z.string().optional(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password baru tidak cocok',
  path: ['confirmPassword'],
});

export async function POST(request: Request) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`reset_pw:${ip}`, 5)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan reset kata sandi. Silakan coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

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
        store: {
          select: {
            settings: {
              select: {
                turnstileEnabled: true,
                turnstileSiteKey: true,
                turnstileSecretKey: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Tautan pengaturan ulang kata sandi tidak valid atau sudah pernah digunakan.' },
        { status: 400 }
      );
    }

    const turnstileCheck = await verifyRequestTurnstileOrPass(
      request,
      (user as { store?: { settings?: { turnstileEnabled?: boolean | null; turnstileSiteKey?: string | null; turnstileSecretKey?: string | null } | null } }).store?.settings,
      parsed.data.turnstileToken
    );
    if (!turnstileCheck.allowed) {
      return NextResponse.json({ error: turnstileCheck.error }, { status: turnstileCheck.status });
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
