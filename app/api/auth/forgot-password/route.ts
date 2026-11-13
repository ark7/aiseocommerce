import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { isDemoStore, isDemoEmail } from '@/lib/demoGuard';
import { sendEmail } from '@/lib/emailService';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { allow } from '@/lib/rateLimit';
import { getIPAddress } from '@/lib/ip';
import { verifyRequestTurnstileOrPass } from '@/lib/turnstile';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  storeDomain: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`forgot_pw:${ip}`, 5)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan reset kata sandi. Silakan coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Email tidak valid' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const domainHint = parsed.data.storeDomain?.trim();

    // 1. Dapatkan konteks toko aktif (multi-tenant)
    let store = await getActiveStore(domainHint);
    let targetUser = null;

    if (store) {
      targetUser = await prisma.user.findUnique({
        where: {
          storeId_email: {
            storeId: store.id,
            email,
          },
        },
      });
    }

    // Jika tidak ditemukan di store aktif, cari kandidat toko lain yang memiliki user ini
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { email },
        include: { store: { include: { settings: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (targetUser?.store) {
        store = targetUser.store;
      }
    }

    const turnstileCheck = await verifyRequestTurnstileOrPass(
      request,
      (store as { settings?: { turnstileEnabled?: boolean | null; turnstileSiteKey?: string | null; turnstileSecretKey?: string | null } | null } | null)?.settings,
      parsed.data.turnstileToken
    );
    if (!turnstileCheck.allowed) {
      return NextResponse.json({ error: turnstileCheck.error }, { status: turnstileCheck.status });
    }

    // 2. Jika user tidak ditemukan, kembalikan pesan aman (mencegah enumerasi akun)
    if (!targetUser || !store) {
      return NextResponse.json({
        success: true,
        message: 'Jika alamat email tersebut terdaftar pada sistem kami, tautan reset kata sandi telah dikirim.',
      });
    }

    // 3. Tangani Akun Demo Bersama
    if (isDemoEmail(email) || (await isDemoStore(store.id))) {
      return NextResponse.json({
        success: true,
        isDemo: true,
        message: 'Akun demo menggunakan kata sandi tetap: "password". Silakan langsung login menggunakan password tersebut.',
      });
    }

    // 4. Generate Token Reset Aman (32 bytes = 64 karakter hex)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Berlaku 1 jam

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        resetToken: token,
        resetTokenExp: expiresAt,
      },
    });

    // 5. Susun Tautan Reset
    const origin = request.headers.get('origin') || `https://${store.domain}`;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // 6. Kirim Email Reset Password (jika SMTP toko aktif)
    const emailResult = await sendEmail({
      storeId: store.id,
      to: email,
      subject: `Atur Ulang Kata Sandi Akun - ${store.name}`,
      text: `Halo ${targetUser.firstName || 'Pengguna'},\n\nKami menerima permintaan untuk mengatur ulang kata sandi akun Anda pada toko ${store.name}.\n\nKlik tautan berikut untuk membuat kata sandi baru (berlaku 1 jam):\n${resetUrl}\n\nJika Anda tidak meminta reset kata sandi, abaikan email ini.\n\nSalam,\nTim ${store.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #1e293b; margin-top: 0;">Atur Ulang Kata Sandi Akun</h2>
          <p>Halo <strong>${targetUser.firstName || 'Pengguna'}</strong>,</p>
          <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda pada toko <strong>${store.name}</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Buat Kata Sandi Baru
            </a>
          </p>
          <p style="color: #64748b; font-size: 13px;">
            Tautan di atas berlaku selama <strong>1 jam</strong>.<br/>
            Jika tombol tidak dapat diklik, salin tautan berikut ke peramban Anda:<br/>
            <span style="word-break: break-all; color: #4f46e5;">${resetUrl}</span>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Jika Anda tidak merasa meminta pengaturan ulang kata sandi ini, silakan abaikan pesan ini dengan aman.</p>
        </div>
      `,
    }).catch(() => ({ success: false }));

    logger.info('Password reset token generated', {
      userId: targetUser.id,
      storeId: store.id,
      emailSent: emailResult.success,
    });

    return NextResponse.json({
      success: true,
      message: 'Tautan pengaturan ulang kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.',
      // Sertakan resetUrl untuk pengembang / demonstrasi jika SMTP belum terkonfigurasi
      resetUrl: process.env.NODE_ENV !== 'production' || !emailResult.success ? resetUrl : undefined,
    });
  } catch (error) {
    logger.error('Forgot password request failed', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Gagal memproses permintaan reset password' },
      { status: 500 }
    );
  }
}
