import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sendEmail, SmtpConfig } from '@/lib/emailService';
import { z } from 'zod';

const TestEmailSchema = z.object({
  recipient: z.string().email('Format email penerima tidak valid'),
  host: z.string().optional(),
  port: z.coerce.number().optional(),
  secure: z.boolean().optional(),
  user: z.string().optional().nullable(),
  pass: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
  fromEmail: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = TestEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { recipient, host, port, secure, user: smtpUser, pass, fromName, fromEmail } = parsed.data;

    let explicitConfig: SmtpConfig | undefined = undefined;
    if (host && port) {
      explicitConfig = {
        host,
        port,
        secure: secure ?? false,
        user: smtpUser || null,
        pass: pass && pass !== '********' ? pass : null,
        fromName: fromName || null,
        fromEmail: fromEmail || null,
      };
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="display: inline-block; padding: 6px 12px; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; border-radius: 6px; margin-bottom: 16px;">
          ✓ UJI KONEKSI SMTP BERHASIL
        </div>
        <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px;">Email Uji Coba Berhasil Terkirim!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Konfigurasi SMTP server toko Anda telah terhubung dan mampu mengirimkan pesan email keluar dengan lancar.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 13px; color: #334155;">
          <div><strong>Waktu Kirim:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</div>
          <div style="margin-top: 4px;"><strong>Penerima:</strong> ${recipient}</div>
          <div style="margin-top: 4px;"><strong>Sistem:</strong> AI SEO E-Commerce SMTP Mailer</div>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Pesan ini dikirim secara otomatis sebagai bagian dari pengujian fitur email.
        </p>
      </div>
    `;

    const result = await sendEmail({
      to: recipient,
      subject: `[Uji Coba SMTP] Notifikasi Berhasil Terkirim`,
      html: htmlContent,
      storeId: user.storeId,
      config: explicitConfig,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Gagal mengirim email uji coba' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Email uji coba berhasil dikirim ke ${recipient}`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat menguji pengiriman email' },
      { status: 500 }
    );
  }
}
