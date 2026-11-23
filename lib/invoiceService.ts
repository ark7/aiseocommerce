import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/emailService';
import { logger } from '@/lib/logger';
import { buildOrderInvoiceHtml } from '@/lib/invoicePricing';

export * from '@/lib/invoicePricing';

export interface SendOrderInvoiceEmailResult {
  sent: boolean;
  reason?: 'ORDER_NOT_FOUND' | 'NO_CUSTOMER_EMAIL' | 'SMTP_NOT_CONFIGURED' | 'SEND_FAILED';
  recipient?: string;
  messageId?: string;
  message: string;
}

/**
 * Dispatches an invoice HTML email for the given order when the store's SMTP
 * gateway is enabled and configured. Returns structured status without throwing.
 */
export async function sendOrderInvoiceEmail(options: {
  orderId: string;
  adjustmentNote?: string | null;
}): Promise<SendOrderInvoiceEmailResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: options.orderId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        orderItems: {
          include: { product: { select: { name: true } } },
        },
        store: {
          include: { settings: true },
        },
      },
    });

    if (!order || !order.store) {
      return {
        sent: false,
        reason: 'ORDER_NOT_FOUND',
        message: 'Pesanan atau toko tidak ditemukan.',
      };
    }

    const recipient = (order.customerEmail || order.user?.email || '').trim();
    if (!recipient) {
      return {
        sent: false,
        reason: 'NO_CUSTOMER_EMAIL',
        message: 'Pelanggan tidak memiliki alamat email pada pesanan ini.',
      };
    }

    const settings = order.store.settings;
    if (!settings || !settings.smtpEnabled || !settings.smtpHost) {
      return {
        sent: false,
        reason: 'SMTP_NOT_CONFIGURED',
        recipient,
        message: 'SMTP belum aktif atau dikonfigurasi pada Pengaturan > Email & SMTP.',
      };
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (order.store.domain ? `https://${order.store.domain}` : 'http://localhost:3000');

    const customerName =
      order.customerName ||
      [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') ||
      'Pelanggan';

    const html = buildOrderInvoiceHtml({
      store: {
        name: order.store.name,
        address: order.store.address,
        phone: order.store.phone,
        email: order.store.email,
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        customerName,
        customerEmail: recipient,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        shippingZone: order.shippingZone,
        courierServiceName: order.courierServiceName,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shippingCost,
        taxAmount: order.taxAmount,
        taxLabel: order.taxLabel,
        taxRate: order.taxRate,
        customFeesAmount: order.customFeesAmount,
        customFeesSnapshot: order.customFeesSnapshot,
        invoiceShowTax: order.invoiceShowTax,
        invoiceShowCustomFees: order.invoiceShowCustomFees,
        invoiceRevision: order.invoiceRevision,
        totalAmount: order.totalAmount,
      },
      items: order.orderItems.map((it) => ({
        name: it.product?.name || 'Produk',
        variation: it.variation,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      invoiceNotes: settings.invoiceNotes,
      adjustmentNote: options.adjustmentNote,
      orderDetailUrl: `${appUrl.replace(/\/$/, '')}/orders/${order.id}`,
    });

    const revision = Math.max(1, Number(order.invoiceRevision) || 1);
    const subject =
      revision > 1
        ? `[${order.store.name}] Pembaruan Invoice #INV-${order.orderNumber} (Revisi #${revision})`
        : `[${order.store.name}] Invoice Pesanan #INV-${order.orderNumber}`;

    const sendResult = await sendEmail({
      storeId: order.storeId,
      to: recipient,
      subject,
      html,
    });

    if (!sendResult.success) {
      return {
        sent: false,
        reason: 'SEND_FAILED',
        recipient,
        message: sendResult.error || 'Gagal mengirim email invoice via SMTP.',
      };
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { lastInvoiceSentAt: new Date() },
    });

    return {
      sent: true,
      recipient,
      messageId: sendResult.messageId,
      message: `Invoice berhasil dikirim ke ${recipient}.`,
    };
  } catch (error) {
    logger.error(
      'Failed to send order invoice email',
      { orderId: options.orderId },
      error instanceof Error ? error : String(error)
    );
    return {
      sent: false,
      reason: 'SEND_FAILED',
      message: error instanceof Error ? error.message : 'Gagal mengirim email invoice.',
    };
  }
}
