import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  pass?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  storeId?: string;
  config?: SmtpConfig;
}

export interface DnsCheckResult {
  domain: string;
  spf: {
    valid: boolean;
    record: string | null;
    note: string;
  };
  dmarc: {
    valid: boolean;
    record: string | null;
    note: string;
  };
  mx: {
    valid: boolean;
    records: string[];
    note: string;
  };
}

/**
 * Mengambil konfigurasi SMTP aktif dari StoreSettings berdasarkan storeId.
 */
export async function getStoreSmtpConfig(storeId: string): Promise<SmtpConfig | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { settings: true },
  });

  const s = store?.settings;
  if (!s || !s.smtpHost) {
    return null;
  }

  return {
    host: s.smtpHost,
    port: s.smtpPort || 587,
    secure: s.smtpSecure ?? false,
    user: s.smtpUser || null,
    pass: s.smtpPass || null,
    fromName: s.smtpFromName || store.name,
    fromEmail: s.smtpFromEmail || store.email,
    replyTo: s.smtpReplyTo || undefined,
  };
}

/**
 * Membuat transporter Nodemailer dengan timeout aman.
 */
export function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true untuk port 465, false untuk port 587 / 25
    auth: config.user && config.pass ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Menguji koneksi SMTP ke mail server (handshake).
 */
export async function verifySmtpConnection(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.host) {
      return { success: false, message: 'Host SMTP wajib diisi' };
    }

    const transporter = createTransporter(config);
    await transporter.verify();

    return {
      success: true,
      message: 'Koneksi ke server SMTP berhasil diverifikasi.',
    };
  } catch (error: any) {
    logger.error('SMTP verification failed', {
      host: config.host,
      port: config.port,
      error: error.message,
    });
    return {
      success: false,
      message: `Gagal menghubungkan ke server SMTP: ${error.message || 'Error tidak diketahui'}`,
    };
  }
}

/**
 * Mengirim email transaksional menggunakan konfigurasi SMTP toko atau config manual.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    let config = options.config;
    if (!config && options.storeId) {
      config = await getStoreSmtpConfig(options.storeId) || undefined;
    }

    if (!config) {
      return { success: false, error: 'Konfigurasi SMTP tidak ditemukan atau belum disetel.' };
    }

    const transporter = createTransporter(config);
    const fromAddress = config.fromEmail || 'no-reply@localhost';
    const fromFormatted = config.fromName ? `"${config.fromName}" <${fromAddress}>` : fromAddress;

    const info = await transporter.sendMail({
      from: fromFormatted,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      replyTo: config.replyTo || undefined,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    logger.error('Failed to send email via SMTP', {
      to: options.to,
      subject: options.subject,
      error: error.message,
    });
    return {
      success: false,
      error: error.message || 'Gagal mengirim email',
    };
  }
}

/**
 * Mengirim kode verifikasi 6-digit untuk membuktikan kepemilikan alamat email pengirim.
 */
export async function sendOwnershipChallengeCode(
  storeId: string,
  toEmail: string,
  explicitConfig?: Partial<SmtpConfig>
): Promise<{ success: boolean; message: string }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { settings: true },
  });

  if (!store || !store.settings) {
    return { success: false, message: 'Toko tidak ditemukan.' };
  }

  // Gabungkan konfigurasi tersimpan dengan override yang dikirim client jika ada
  const mergedConfig: SmtpConfig = {
    host: explicitConfig?.host || store.settings.smtpHost || '',
    port: explicitConfig?.port || store.settings.smtpPort || 587,
    secure: explicitConfig?.secure !== undefined ? explicitConfig.secure : (store.settings.smtpSecure ?? false),
    user: explicitConfig?.user !== undefined ? explicitConfig.user : store.settings.smtpUser,
    pass: (explicitConfig?.pass && explicitConfig.pass !== '********') ? explicitConfig.pass : store.settings.smtpPass,
    fromName: explicitConfig?.fromName || store.settings.smtpFromName || store.name,
    fromEmail: toEmail,
  };

  if (!mergedConfig.host) {
    return { success: false, message: 'Host SMTP belum dikonfigurasi. Harap isi host server terlebih dahulu.' };
  }

  // Generate 6-digit OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 menit

  // Simpan token verifikasi di database
  const tokenPayload = JSON.stringify({ code, email: toEmail.toLowerCase().trim(), expiresAt });
  await prisma.storeSettings.update({
    where: { storeId },
    data: { smtpVerificationToken: tokenPayload },
  });

  // Kirim email tantangan
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px; background: #ffffff;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">Verifikasi Kepemilikan Email Pengirim Toko</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Halo Admin <strong>${store.name}</strong>,
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Anda telah meminta verifikasi kepemilikan alamat email pengirim (<strong>${toEmail}</strong>) untuk digunakan pada platform toko online Anda.
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">KODE VERIFIKASI ANDA</span>
        <div style="font-size: 32px; font-weight: 700; color: #4f46e5; letter-spacing: 6px; margin-top: 6px;">${code}</div>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        * Kode ini berlaku selama <strong>15 menit</strong>. Jangan bagikan kode ini kepada siapapun demi keamanan toko Anda.
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
        Email dikirim secara otomatis oleh sistem notifikasi ${store.name}. Jika Anda tidak meminta kode ini, abaikan pesan ini.
      </p>
    </div>
  `;

  const sendResult = await sendEmail({
    to: toEmail,
    subject: `[${store.name}] Kode Verifikasi Email Pengirim: ${code}`,
    html: htmlContent,
    config: mergedConfig,
  });

  if (!sendResult.success) {
    return {
      success: false,
      message: `Gagal mengirim email verifikasi: ${sendResult.error}`,
    };
  }

  return {
    success: true,
    message: `Kode verifikasi telah dikirim ke ${toEmail}. Silakan cek kotak masuk atau folder spam Anda.`,
  };
}

/**
 * Mengonfirmasi kode verifikasi 6-digit untuk menandai kepemilikan email sebagai terverifikasi.
 */
export async function confirmOwnershipChallengeCode(
  storeId: string,
  inputCode: string
): Promise<{ success: boolean; message: string }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { settings: true },
  });

  const rawToken = store?.settings?.smtpVerificationToken;
  if (!rawToken) {
    return { success: false, message: 'Tidak ada kode verifikasi aktif. Silakan minta kode baru.' };
  }

  try {
    const { code, email, expiresAt } = JSON.parse(rawToken);

    if (Date.now() > expiresAt) {
      return { success: false, message: 'Kode verifikasi telah kadaluarsa. Silakan minta kode baru.' };
    }

    if (code.trim() !== inputCode.trim()) {
      return { success: false, message: 'Kode verifikasi yang Anda masukkan salah.' };
    }

    // Update status verifikasi di database
    await prisma.storeSettings.update({
      where: { storeId },
      data: {
        smtpVerified: true,
        smtpVerifiedAt: new Date(),
        smtpVerificationToken: null,
      },
    });

    return {
      success: true,
      message: `Kepemilikan email ${email} berhasil diverifikasi! Pengaturan pengiriman email kini aktif.`,
    };
  } catch (error) {
    return { success: false, message: 'Format token verifikasi tidak valid. Silakan minta kode baru.' };
  }
}

/**
 * Memeriksa status DNS record publik (SPF, DMARC, MX) untuk domain email pengirim.
 * Menggunakan module bawaan node:dns/promises.
 */
export async function checkDomainDnsRecords(domainInput: string): Promise<DnsCheckResult> {
  const cleanDomain = domainInput.trim().toLowerCase().replace(/^@/, '');

  const result: DnsCheckResult = {
    domain: cleanDomain,
    spf: {
      valid: false,
      record: null,
      note: 'Record SPF tidak ditemukan. Tambahkan TXT record dengan nilai v=spf1 include:... ~all untuk mencegah email masuk spam.',
    },
    dmarc: {
      valid: false,
      record: null,
      note: 'Record DMARC tidak ditemukan. Tambahkan TXT record pada _dmarc.' + cleanDomain + ' dengan nilai v=DMARC1; p=none;',
    },
    mx: {
      valid: false,
      records: [],
      note: 'Record MX tidak ditemukan. Pastikan domain telah memiliki mail exchange record aktif.',
    },
  };

  try {
    // 1. Check TXT Records for SPF
    try {
      const txtRecords = await dns.resolveTxt(cleanDomain);
      const flattened = txtRecords.map((chunk) => chunk.join(''));
      const spfRecord = flattened.find((r) => r.startsWith('v=spf1'));

      if (spfRecord) {
        result.spf.valid = true;
        result.spf.record = spfRecord;
        result.spf.note = 'Record SPF aktif dan valid.';
      }
    } catch {
      // ignore dns resolve errors
    }

    // 2. Check DMARC Record on _dmarc.${domain}
    try {
      const dmarcDomain = `_dmarc.${cleanDomain}`;
      const dmarcRecords = await dns.resolveTxt(dmarcDomain);
      const flattened = dmarcRecords.map((chunk) => chunk.join(''));
      const dmarcRecord = flattened.find((r) => r.startsWith('v=DMARC1'));

      if (dmarcRecord) {
        result.dmarc.valid = true;
        result.dmarc.record = dmarcRecord;
        result.dmarc.note = 'Record DMARC aktif dan terkonfigurasi.';
      }
    } catch {
      // ignore
    }

    // 3. Check MX Records
    try {
      const mxRecords = await dns.resolveMx(cleanDomain);
      if (mxRecords && mxRecords.length > 0) {
        result.mx.valid = true;
        result.mx.records = mxRecords
          .sort((a, b) => a.priority - b.priority)
          .map((m) => `${m.exchange} (Priority: ${m.priority})`);
        result.mx.note = `${mxRecords.length} mail exchange server terdeteksi.`;
      }
    } catch {
      // ignore
    }

    return result;
  } catch (error: any) {
    logger.warn('DNS lookup exception in checkDomainDnsRecords', {
      domain: cleanDomain,
      error: error.message,
    });
    return result;
  }
}
