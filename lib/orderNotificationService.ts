import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

export interface TelegramInlineButton {
  text: string;
  url: string;
}

/**
 * Send Markdown message with optional inline keyboard buttons to a Telegram chat.
 */
export async function sendTelegramMessage(options: {
  botToken: string;
  chatId: string;
  text: string;
  buttons?: TelegramInlineButton[][];
}): Promise<{ success: boolean; error?: string }> {
  const { botToken, chatId, text, buttons } = options;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  };

  if (buttons && buttons.length > 0) {
    body.reply_markup = {
      inline_keyboard: buttons,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson?.description || `Telegram API error (${res.status})`;
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    return {
      success: false,
      error: isTimeout ? 'Timeout saat menghubungi Telegram' : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send text message to WhatsApp via Fonnte Gateway or Generic Webhook.
 */
export async function sendWhatsappMessage(options: {
  provider: 'FONNTE' | 'GENERIC_WEBHOOK';
  token: string;
  targetPhone: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  const { provider, token, targetPhone, text } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    if (provider === 'FONNTE') {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: targetPhone,
          message: text,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, error: `Fonnte WhatsApp error (${res.status}): ${errText}` };
      }

      return { success: true };
    } else {
      // Generic Webhook
      const res = await fetch(token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPhone,
          message: text,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return { success: false, error: `Webhook error (${res.status})` };
      }

      return { success: true };
    }
  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    return {
      success: false,
      error: isTimeout ? 'Timeout saat menghubungi gateway WhatsApp' : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Trigger order created notification (Non-blocking async).
 */
export function dispatchOrderCreatedNotification(orderId: string): void {
  // Execute in background
  Promise.resolve().then(async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: { product: true },
          },
          store: {
            include: { settings: true },
          },
        },
      });

      if (!order || !order.store) return;
      const s = order.store.settings;
      if (!s) return;

      const itemsSummary = (order.orderItems || [])
        .map((it) => `• ${it.product?.name || 'Produk'} (${it.quantity}x) - ${formatRupiah(it.totalPrice || it.unitPrice * it.quantity)}`)
        .join('\n');

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const orderAdminUrl = `${appUrl}/admin/orders/${order.id}`;
      const cleanPhone = cleanPhoneNumber(order.customerPhone);
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

      // 1. Send Telegram Notification
      if (s.notifyTelegramEnabled && s.notifyOnNewOrder && s.notifyTelegramBotToken && s.notifyTelegramChatId) {
        const text = `🛍️ *[PESANAN BARU MASUK]*
*Toko:* ${order.store.name}
*No. Order:* \`${order.orderNumber || order.id.slice(-8)}\`
*Total:* *${formatRupiah(order.totalAmount)}*
*Pembeli:* ${order.customerName || 'Tamu'} (${order.customerPhone || '-'})
*Status:* \`${order.status}\`

📦 *Item Belanja:*
${itemsSummary || '1 item'}

🕒 _${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB_`;

        const buttons: TelegramInlineButton[][] = [
          [
            { text: '📦 Buka Pesanan di Admin', url: orderAdminUrl },
            ...(waLink ? [{ text: '💬 Hubungi Pembeli (WA)', url: waLink }] : []),
          ],
        ];

        sendTelegramMessage({
          botToken: s.notifyTelegramBotToken,
          chatId: s.notifyTelegramChatId,
          text,
          buttons,
        }).catch((err) => logger.warn('Telegram new order notification failed', { error: err }));
      }

      // 2. Send WhatsApp Notification
      if (s.notifyWhatsappEnabled && s.notifyOnNewOrder && s.notifyWhatsappToken && s.notifyWhatsappTargetPhone) {
        const waText = `🛍️ *[PESANAN BARU]* - ${order.store.name}
No. Order: *${order.orderNumber || order.id.slice(-8)}*
Total: *${formatRupiah(order.totalAmount)}*
Pembeli: *${order.customerName}* (${order.customerPhone || '-'})

Item:
${itemsSummary}

Lihat pesanan: ${orderAdminUrl}`;

        sendWhatsappMessage({
          provider: (s.notifyWhatsappProvider as any) || 'FONNTE',
          token: s.notifyWhatsappToken,
          targetPhone: s.notifyWhatsappTargetPhone,
          text: waText,
        }).catch((err) => logger.warn('WhatsApp new order notification failed', { error: err }));
      }
    } catch (error) {
      logger.error('Failed to dispatch order created notification', { orderId }, error as any);
    }
  });
}

/**
 * Trigger payment proof uploaded notification (Non-blocking async).
 */
export function dispatchPaymentProofNotification(paymentId: string): void {
  Promise.resolve().then(async () => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            include: {
              store: {
                include: { settings: true },
              },
            },
          },
        },
      });

      if (!payment || !payment.order || !payment.order.store) return;
      const { order } = payment;
      const s = order.store.settings;
      if (!s) return;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const orderAdminUrl = `${appUrl}/admin/orders/${order.id}`;

      // 1. Telegram
      if (s.notifyTelegramEnabled && s.notifyOnPaymentProof && s.notifyTelegramBotToken && s.notifyTelegramChatId) {
        const text = `📸 *[BUKTI TRANSFER MASUK - BUTUH VERIFIKASI]*
*Toko:* ${order.store.name}
*No. Order:* \`${order.orderNumber || order.id.slice(-8)}\`
*Jumlah:* *${formatRupiah(payment.amount)}*
*Pembeli:* ${order.customerName} (${order.customerPhone || '-'})
*Metode:* Transfer Bank Manual

⚠️ _Pembeli telah mengunggah struk pembayaran. Harap segera periksa dan setujui di dashboard admin!_`;

        const buttons: TelegramInlineButton[][] = [
          [{ text: '✅ Verifikasi Pembayaran Sekarang', url: orderAdminUrl }],
        ];

        sendTelegramMessage({
          botToken: s.notifyTelegramBotToken,
          chatId: s.notifyTelegramChatId,
          text,
          buttons,
        }).catch((err) => logger.warn('Telegram payment proof notification failed', { error: err }));
      }

      // 2. WhatsApp
      if (s.notifyWhatsappEnabled && s.notifyOnPaymentProof && s.notifyWhatsappToken && s.notifyWhatsappTargetPhone) {
        const waText = `📸 *[BUKTI TRANSFER MASUK]* - ${order.store.name}
Pembeli telah mengunggah bukti bayar untuk Order *#${order.orderNumber || order.id.slice(-8)}* senilai *${formatRupiah(payment.amount)}*.

Harap verifikasi di admin: ${orderAdminUrl}`;

        sendWhatsappMessage({
          provider: (s.notifyWhatsappProvider as any) || 'FONNTE',
          token: s.notifyWhatsappToken,
          targetPhone: s.notifyWhatsappTargetPhone,
          text: waText,
        }).catch((err) => logger.warn('WhatsApp payment proof notification failed', { error: err }));
      }
    } catch (error) {
      logger.error('Failed to dispatch payment proof notification', { paymentId }, error as any);
    }
  });
}

/**
 * Trigger payment success notification (Non-blocking async).
 */
export function dispatchPaymentVerifiedNotification(orderId: string): void {
  Promise.resolve().then(async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          store: {
            include: { settings: true },
          },
        },
      });

      if (!order || !order.store) return;
      const s = order.store.settings;
      if (!s) return;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const orderAdminUrl = `${appUrl}/admin/orders/${order.id}`;

      // 1. Telegram
      if (s.notifyTelegramEnabled && s.notifyOnPaymentSuccess && s.notifyTelegramBotToken && s.notifyTelegramChatId) {
        const text = `🎉 *[PEMBAYARAN LUNAS TERKONFIRMASI]*
*Toko:* ${order.store.name}
*No. Order:* \`${order.orderNumber || order.id.slice(-8)}\`
*Total:* *${formatRupiah(order.totalAmount)}*
*Pembeli:* ${order.customerName}

📦 _Status pesanan kini **PROCESSING**. Segera kemas dan siapkan pengiriman produk!_`;

        const buttons: TelegramInlineButton[][] = [
          [{ text: '📦 Proses & Kirim Pesanan', url: orderAdminUrl }],
        ];

        sendTelegramMessage({
          botToken: s.notifyTelegramBotToken,
          chatId: s.notifyTelegramChatId,
          text,
          buttons,
        }).catch((err) => logger.warn('Telegram payment success notification failed', { error: err }));
      }

      // 2. WhatsApp
      if (s.notifyWhatsappEnabled && s.notifyOnPaymentSuccess && s.notifyWhatsappToken && s.notifyWhatsappTargetPhone) {
        const waText = `🎉 *[PEMBAYARAN LUNAS]* - ${order.store.name}
Pembayaran Order *#${order.orderNumber || order.id.slice(-8)}* (${formatRupiah(order.totalAmount)}) telah berhasil diterima.
Status: PROCESSING. Segera siapkan pesanan pembeli!

Detail: ${orderAdminUrl}`;

        sendWhatsappMessage({
          provider: (s.notifyWhatsappProvider as any) || 'FONNTE',
          token: s.notifyWhatsappToken,
          targetPhone: s.notifyWhatsappTargetPhone,
          text: waText,
        }).catch((err) => logger.warn('WhatsApp payment success notification failed', { error: err }));
      }
    } catch (error) {
      logger.error('Failed to dispatch payment verified notification', { orderId }, error as any);
    }
  });
}

/**
 * Trigger low stock warning notification (Non-blocking async).
 */
export function dispatchLowStockWarningNotification(
  productName: string,
  remainingStock: number,
  storeId: string
): void {
  Promise.resolve().then(async () => {
    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: { settings: true },
      });

      if (!store || !store.settings) return;
      const s = store.settings;

      const threshold = s.notifyLowStockThreshold || 3;
      if (!s.notifyOnLowStock || remainingStock > threshold) return;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const productsUrl = `${appUrl}/admin/products`;

      // 1. Telegram
      if (s.notifyTelegramEnabled && s.notifyTelegramBotToken && s.notifyTelegramChatId) {
        const text = `⚠️ *[PERINGATAN STOK MENIPIS / HABIS]*
*Toko:* ${store.name}
*Produk:* *${productName}*
*Sisa Stok:* \`${remainingStock} unit\` (Ambang Batas: ${threshold})

🚨 _Stok produk ini hampir habis! Harap segera lakukan restock inventaris agar tidak kehilangan potensi penjualan._`;

        const buttons: TelegramInlineButton[][] = [
          [{ text: '📦 Kelola Stok Produk', url: productsUrl }],
        ];

        sendTelegramMessage({
          botToken: s.notifyTelegramBotToken,
          chatId: s.notifyTelegramChatId,
          text,
          buttons,
        }).catch((err) => logger.warn('Telegram low stock notification failed', { error: err }));
      }

      // 2. WhatsApp
      if (s.notifyWhatsappEnabled && s.notifyWhatsappToken && s.notifyWhatsappTargetPhone) {
        const waText = `⚠️ *[PERINGATAN STOK]* - ${store.name}
Produk *${productName}* tersisa *${remainingStock} unit*!
Segera lakukan restock di: ${productsUrl}`;

        sendWhatsappMessage({
          provider: (s.notifyWhatsappProvider as any) || 'FONNTE',
          token: s.notifyWhatsappToken,
          targetPhone: s.notifyWhatsappTargetPhone,
          text: waText,
        }).catch((err) => logger.warn('WhatsApp low stock notification failed', { error: err }));
      }
    } catch (error) {
      logger.error('Failed to dispatch low stock warning notification', { productName, storeId }, error as any);
    }
  });
}

/**
 * Send a test notification to verify Telegram or WhatsApp channel connectivity.
 */
export async function sendTestNotification(params: {
  channel: 'TELEGRAM' | 'WHATSAPP';
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsappProvider?: 'FONNTE' | 'GENERIC_WEBHOOK';
  whatsappToken?: string;
  whatsappTargetPhone?: string;
  storeName?: string;
}): Promise<{ success: boolean; message: string }> {
  const storeName = params.storeName || 'Toko Anda';
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  if (params.channel === 'TELEGRAM') {
    if (!params.telegramBotToken || !params.telegramChatId) {
      return { success: false, message: 'Bot Token dan Chat ID Telegram wajib diisi.' };
    }

    const testText = `🔔 *[NOTIFIKASI UJI COBA TELEGRAM]*
*Toko:* ${storeName}
*Status:* ✅ Terhubung dengan Sukses!
*Waktu:* ${timestamp} WIB

Selamat! Bot Telegram Anda telah aktif dan siap mengirimkan notifikasi pesanan masuk, bukti transfer, dan peringatan stok secara instan.`;

    const res = await sendTelegramMessage({
      botToken: params.telegramBotToken,
      chatId: params.telegramChatId,
      text: testText,
      buttons: [[{ text: '🌐 Buka Dashboard Admin', url: 'http://localhost:3000/admin' }]],
    });

    if (!res.success) {
      return { success: false, message: res.error || 'Gagal mengirim pesan uji coba ke Telegram.' };
    }

    return {
      success: true,
      message: 'Pesan uji coba berhasil dikirim ke Telegram! Silakan cek aplikasi Telegram Anda.',
    };
  } else {
    // WhatsApp
    if (!params.whatsappToken || !params.whatsappTargetPhone) {
      return { success: false, message: 'Token dan Nomor WhatsApp Tujuan wajib diisi.' };
    }

    const waText = `🔔 *[NOTIFIKASI UJI COBA WHATSAPP]*
Toko: *${storeName}*
Status: ✅ Terhubung dengan Sukses!
Waktu: ${timestamp} WIB

Selamat! Gateway WhatsApp toko Anda siap menerima notifikasi pesanan baru.`;

    const res = await sendWhatsappMessage({
      provider: params.whatsappProvider || 'FONNTE',
      token: params.whatsappToken,
      targetPhone: params.whatsappTargetPhone,
      text: waText,
    });

    if (!res.success) {
      return { success: false, message: res.error || 'Gagal mengirim pesan uji coba ke WhatsApp.' };
    }

    return {
      success: true,
      message: 'Pesan uji coba berhasil dikirim ke WhatsApp! Silakan cek chat WhatsApp Anda.',
    };
  }
}
