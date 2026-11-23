import { STATUS_LABELS, type OrderStatus } from '@/lib/orderStatus';

export type CustomFeeType = 'FIXED' | 'PERCENT';

export interface CustomFeeConfigItem {
  id: string;
  name: string;
  type: CustomFeeType;
  amount: number;
  enabled: boolean;
  showOnInvoice: boolean;
}

export interface OrderCustomFeeLine {
  id: string;
  name: string;
  type: CustomFeeType;
  rateOrAmount: number;
  computedAmount: number;
  showOnInvoice: boolean;
}

export interface CalculateOrderPricingInput {
  subtotal: number;
  discount?: number;
  shippingCost?: number;
  taxEnabled?: boolean;
  taxLabel?: string | null;
  taxRate?: number;
  customFees?: Array<{
    id?: string;
    name: string;
    type: CustomFeeType;
    amount: number;
    enabled?: boolean;
    showOnInvoice?: boolean;
  }>;
}

export interface CalculatedOrderPricing {
  dpp: number;
  taxRate: number;
  taxLabel: string;
  taxAmount: number;
  customFees: OrderCustomFeeLine[];
  customFeesAmount: number;
  shippingCost: number;
  totalAmount: number;
}

export function formatInvoiceRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely normalizes custom fees configuration stored in StoreSettings.customFeesConfig.
 */
export function parseCustomFeesConfig(raw: unknown): CustomFeeConfigItem[] {
  if (!Array.isArray(raw)) return [];
  const normalized: CustomFeeConfigItem[] = [];

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) return;

    const rawType = typeof obj.type === 'string' ? obj.type.toUpperCase() : 'FIXED';
    const type: CustomFeeType = rawType === 'PERCENT' ? 'PERCENT' : 'FIXED';
    const rawAmount = Number(obj.amount);
    const amount = Number.isFinite(rawAmount) && rawAmount >= 0 ? rawAmount : 0;

    normalized.push({
      id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `fee-${index + 1}`,
      name,
      type,
      amount,
      enabled: obj.enabled !== false,
      showOnInvoice: obj.showOnInvoice !== false,
    });
  });

  return normalized;
}

/**
 * Safely normalizes snapshotted custom fee lines stored in Order.customFeesSnapshot.
 */
export function parseOrderCustomFees(raw: unknown): OrderCustomFeeLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: OrderCustomFeeLine[] = [];

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) return;

    const rawType = typeof obj.type === 'string' ? obj.type.toUpperCase() : 'FIXED';
    const type: CustomFeeType = rawType === 'PERCENT' ? 'PERCENT' : 'FIXED';
    const rateOrAmount = Number.isFinite(Number(obj.rateOrAmount ?? obj.amount))
      ? Math.max(0, Number(obj.rateOrAmount ?? obj.amount))
      : 0;
    const computedAmount = Number.isFinite(Number(obj.computedAmount))
      ? Math.max(0, Math.round(Number(obj.computedAmount)))
      : 0;

    lines.push({
      id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `fee-${index + 1}`,
      name,
      type,
      rateOrAmount,
      computedAmount,
      showOnInvoice: obj.showOnInvoice !== false,
    });
  });

  return lines;
}

/**
 * Computes order totals consistently across checkout, admin revision, and UI preview.
 * PPN is calculated on DPP = max(0, subtotal - discount).
 */
export function calculateOrderPricing(input: CalculateOrderPricingInput): CalculatedOrderPricing {
  const safeSubtotal = Math.max(0, Math.round(Number(input.subtotal) || 0));
  const safeDiscount = Math.max(0, Math.round(Number(input.discount) || 0));
  const dpp = Math.max(0, safeSubtotal - safeDiscount);

  const rawRate = Number(input.taxRate);
  const effectiveTaxRate =
    input.taxEnabled && Number.isFinite(rawRate) && rawRate > 0
      ? Math.min(100, Math.max(0, rawRate))
      : 0;

  const taxAmount = effectiveTaxRate > 0 ? Math.round((dpp * effectiveTaxRate) / 100) : 0;

  const customFees: OrderCustomFeeLine[] = [];
  let feeCounter = 0;

  for (const fee of input.customFees || []) {
    if (!fee || fee.enabled === false) continue;
    const name = typeof fee.name === 'string' ? fee.name.trim() : '';
    if (!name) continue;
    const rawAmount = Number(fee.amount);
    if (!Number.isFinite(rawAmount) || rawAmount < 0) continue;

    feeCounter += 1;
    const type: CustomFeeType = fee.type === 'PERCENT' ? 'PERCENT' : 'FIXED';
    const computedAmount =
      type === 'PERCENT' ? Math.round((dpp * rawAmount) / 100) : Math.round(rawAmount);

    customFees.push({
      id: typeof fee.id === 'string' && fee.id.trim() ? fee.id.trim() : `fee-${feeCounter}`,
      name,
      type,
      rateOrAmount: rawAmount,
      computedAmount,
      showOnInvoice: fee.showOnInvoice !== false,
    });
  }

  const customFeesAmount = customFees.reduce((sum, item) => sum + item.computedAmount, 0);
  const safeShipping = Math.max(0, Math.round(Number(input.shippingCost) || 0));
  const totalAmount = dpp + safeShipping + taxAmount + customFeesAmount;

  const cleanLabel =
    typeof input.taxLabel === 'string' && input.taxLabel.trim()
      ? input.taxLabel.trim()
      : 'PPN';

  return {
    dpp,
    taxRate: effectiveTaxRate,
    taxLabel: cleanLabel,
    taxAmount,
    customFees,
    customFeesAmount,
    shippingCost: safeShipping,
    totalAmount,
  };
}

export interface BuildOrderInvoiceHtmlParams {
  store: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: Date | string;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    shippingAddress?: string | null;
    shippingZone?: string | null;
    courierServiceName?: string | null;
    subtotal: number;
    discount?: number | null;
    shippingCost: number;
    taxAmount: number;
    taxLabel?: string | null;
    taxRate?: number | null;
    customFeesAmount?: number | null;
    customFeesSnapshot?: unknown;
    invoiceShowTax?: boolean;
    invoiceShowCustomFees?: boolean;
    invoiceRevision?: number | null;
    totalAmount: number;
  };
  items: Array<{
    name: string;
    variation?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  invoiceNotes?: string | null;
  adjustmentNote?: string | null;
  orderDetailUrl?: string;
}

/**
 * Generates clean responsive HTML email markup for an order invoice, respecting
 * per-order visibility options for PPN and custom additional fees.
 */
export function buildOrderInvoiceHtml(params: BuildOrderInvoiceHtmlParams): string {
  const { store, order, items, invoiceNotes, adjustmentNote, orderDetailUrl } = params;
  const revision = Math.max(1, Number(order.invoiceRevision) || 1);
  const statusLabel = STATUS_LABELS[order.status as OrderStatus] || order.status;
  const formattedDate = new Date(order.createdAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const showTaxLine = order.invoiceShowTax !== false && Number(order.taxAmount) > 0;
  const customFeeLines =
    order.invoiceShowCustomFees !== false
      ? parseOrderCustomFees(order.customFeesSnapshot).filter(
          (line) => line.showOnInvoice !== false && line.computedAmount > 0
        )
      : [];

  const shippingSubtitle = order.courierServiceName
    ? ` (${escapeHtml(order.courierServiceName)})`
    : order.shippingZone
      ? ` (${escapeHtml(order.shippingZone)})`
      : '';

  const itemRowsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;">
          <strong>${escapeHtml(item.name)}</strong>
          ${item.variation ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">Varian: ${escapeHtml(item.variation)}</div>` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#334155;font-size:13px;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#334155;font-size:13px;">${formatInvoiceRupiah(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f172a;font-weight:600;font-size:13px;">${formatInvoiceRupiah(item.totalPrice)}</td>
      </tr>`
    )
    .join('');

  const customFeeRowsHtml = customFeeLines
    .map(
      (fee) => `
      <tr>
        <td style="padding:6px 0;color:#475569;font-size:13px;">
          ${escapeHtml(fee.name)}${fee.type === 'PERCENT' ? ` (${fee.rateOrAmount}%)` : ''}
        </td>
        <td style="padding:6px 0;text-align:right;color:#0f172a;font-size:13px;">${formatInvoiceRupiah(fee.computedAmount)}</td>
      </tr>`
    )
    .join('');

  const revisionBadgeHtml =
    revision > 1
      ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:999px;font-size:11px;font-weight:700;">Revisi #${revision}</span>`
      : '';

  const adjustmentBannerHtml = adjustmentNote
    ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin:16px 0;color:#1e3a8a;font-size:13px;">
        <strong>Catatan Pembaruan Tagihan:</strong> ${escapeHtml(adjustmentNote)}
      </div>`
    : '';

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
      <div style="border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;">
        <div style="font-size:20px;font-weight:800;color:#0f172a;">${escapeHtml(store.name)}</div>
        ${store.address ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">${escapeHtml(store.address)}</div>` : ''}
        ${store.phone || store.email ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${[store.phone, store.email].filter(Boolean).map(escapeHtml).join(' • ')}</div>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;">
        <tr>
          <td style="vertical-align:top;padding:4px 0;">
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:700;">No. Invoice</div>
            <div style="font-weight:700;color:#0f172a;font-size:15px;">INV-${escapeHtml(order.orderNumber)}${revisionBadgeHtml}</div>
            <div style="color:#64748b;font-size:12px;margin-top:2px;">Tanggal: ${escapeHtml(formattedDate)}</div>
            <div style="margin-top:6px;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:700;">${escapeHtml(statusLabel)}</span></div>
          </td>
          <td style="vertical-align:top;padding:4px 0;text-align:right;">
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:700;">Tagihan Kepada</div>
            <div style="font-weight:700;color:#0f172a;">${escapeHtml(order.customerName || 'Pelanggan')}</div>
            ${order.customerEmail ? `<div style="color:#475569;font-size:12px;">${escapeHtml(order.customerEmail)}</div>` : ''}
            ${order.customerPhone ? `<div style="color:#475569;font-size:12px;">${escapeHtml(order.customerPhone)}</div>` : ''}
          </td>
        </tr>
      </table>

      ${order.shippingAddress ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:12px;color:#334155;">
        <strong>Alamat Pengiriman:</strong> ${escapeHtml(order.shippingAddress)}
      </div>` : ''}

      ${adjustmentBannerHtml}

      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569;">Produk</th>
            <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;color:#475569;">Qty</th>
            <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;color:#475569;">Harga</th>
            <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;color:#475569;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="padding:6px 0;color:#475569;font-size:13px;">Subtotal Produk</td>
          <td style="padding:6px 0;text-align:right;color:#0f172a;font-size:13px;">${formatInvoiceRupiah(order.subtotal)}</td>
        </tr>
        ${Number(order.discount) > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#047857;font-size:13px;">Diskon Voucher</td>
          <td style="padding:6px 0;text-align:right;color:#047857;font-size:13px;">- ${formatInvoiceRupiah(Number(order.discount))}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:6px 0;color:#475569;font-size:13px;">Ongkos Kirim${shippingSubtitle}</td>
          <td style="padding:6px 0;text-align:right;color:#0f172a;font-size:13px;">${formatInvoiceRupiah(order.shippingCost)}</td>
        </tr>
        ${showTaxLine ? `
        <tr>
          <td style="padding:6px 0;color:#475569;font-size:13px;">${escapeHtml(order.taxLabel || 'PPN')}${Number(order.taxRate) > 0 ? ` (${Number(order.taxRate)}%)` : ''}</td>
          <td style="padding:6px 0;text-align:right;color:#0f172a;font-size:13px;">${formatInvoiceRupiah(order.taxAmount)}</td>
        </tr>` : ''}
        ${customFeeRowsHtml}
        <tr>
          <td style="padding:12px 0 4px;border-top:2px solid #cbd5e1;font-weight:800;font-size:16px;color:#0f172a;">Total Tagihan</td>
          <td style="padding:12px 0 4px;border-top:2px solid #cbd5e1;text-align:right;font-weight:800;font-size:18px;color:#4f46e5;">${formatInvoiceRupiah(order.totalAmount)}</td>
        </tr>
      </table>

      ${invoiceNotes ? `
      <div style="margin-top:18px;padding-top:12px;border-top:1px dashed #cbd5e1;font-size:12px;color:#475569;white-space:pre-line;">
        ${escapeHtml(invoiceNotes)}
      </div>` : ''}

      ${orderDetailUrl ? `
      <div style="margin-top:22px;text-align:center;">
        <a href="${escapeHtml(orderDetailUrl)}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
          Lihat Detail Pesanan &amp; Pembayaran
        </a>
      </div>` : ''}
    </div>
  </div>`;
}
