'use client';

import { useEffect } from 'react';
import { formatInvoiceRupiah, parseOrderCustomFees } from '@/lib/invoicePricing';
import { STATUS_LABELS, type OrderStatus } from '@/lib/orderStatus';

export interface InvoiceModalOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  shippingZone?: string | null;
  courierServiceName?: string | null;
  subtotal: number;
  discount?: number | null;
  shippingCost?: number | null;
  taxAmount?: number | null;
  taxLabel?: string | null;
  taxRate?: number | null;
  customFeesAmount?: number | null;
  customFeesSnapshot?: unknown;
  invoiceShowTax?: boolean;
  invoiceShowCustomFees?: boolean;
  invoiceRevision?: number;
  totalAmount: number;
  orderItems: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variation?: string | null;
    product: { name: string } | null;
  }>;
}

export interface InvoiceModalStoreInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  invoiceNotes?: string | null;
}

interface OrderInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  order: InvoiceModalOrder;
  storeInfo?: InvoiceModalStoreInfo | null;
}

/**
 * Printable invoice modal used across Admin and Customer order detail pages.
 * Respects per-order visibility options for PPN and custom additional fees.
 */
export default function OrderInvoiceModal({
  open,
  onClose,
  order,
  storeInfo,
}: OrderInvoiceModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const revision = Math.max(1, Number(order.invoiceRevision) || 1);
  const showTaxLine = order.invoiceShowTax !== false && Number(order.taxAmount || 0) > 0;
  const visibleCustomFees =
    order.invoiceShowCustomFees !== false
      ? parseOrderCustomFees(order.customFeesSnapshot).filter(
          (f) => f.showOnInvoice !== false && f.computedAmount > 0
        )
      : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0 print:static"
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice INV-${order.orderNumber}`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-0 print:rounded-none">
        {/* Toolbar (hidden when printing) */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">Pratinjau Invoice Resmi</span>
            {revision > 1 && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800">
                Revisi #{revision}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
            >
              🖨️ Cetak / Simpan PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 space-y-6 text-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-gray-200 pb-5">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">
                {storeInfo?.name || 'Toko Online Resmi'}
              </h2>
              {storeInfo?.address && (
                <p className="text-xs text-gray-500 mt-1 max-w-sm whitespace-pre-line">
                  {storeInfo.address}
                </p>
              )}
              {(storeInfo?.phone || storeInfo?.email) && (
                <p className="text-xs text-gray-500 mt-1">
                  {[storeInfo?.phone, storeInfo?.email].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                INVOICE
              </p>
              <p className="text-base font-bold text-indigo-700 font-mono">
                INV-{order.orderNumber}
                {revision > 1 ? ` (Rev #${revision})` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(order.createdAt).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                {STATUS_LABELS[order.status as OrderStatus] || order.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div>
              <p className="font-bold uppercase text-gray-500 text-[10px] mb-1">Tagihan Kepada</p>
              <p className="font-semibold text-gray-900 text-sm">{order.customerName || 'Pelanggan'}</p>
              {order.customerEmail && <p className="text-gray-600">{order.customerEmail}</p>}
              {order.customerPhone && <p className="text-gray-600">{order.customerPhone}</p>}
            </div>
            <div>
              <p className="font-bold uppercase text-gray-500 text-[10px] mb-1">Pengiriman</p>
              <p className="text-gray-800 whitespace-pre-line">
                {order.shippingAddress || 'Pengiriman Digital / Non-Fisik'}
              </p>
              {(order.courierServiceName || order.shippingZone) && (
                <p className="text-indigo-700 font-semibold mt-1">
                  Kurir: {order.courierServiceName || order.shippingZone}
                </p>
              )}
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 text-gray-600">
                <th className="py-2.5 px-3 text-left font-bold uppercase text-[11px]">Produk</th>
                <th className="py-2.5 px-3 text-right font-bold uppercase text-[11px]">Qty</th>
                <th className="py-2.5 px-3 text-right font-bold uppercase text-[11px]">Harga</th>
                <th className="py-2.5 px-3 text-right font-bold uppercase text-[11px]">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.orderItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-3 text-gray-900">
                    <span className="font-medium">{item.product?.name || 'Produk'}</span>
                    {item.variation && (
                      <span className="block text-[11px] text-gray-500">{item.variation}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-3 px-3 text-right text-gray-700">
                    {formatInvoiceRupiah(item.unitPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900">
                    {formatInvoiceRupiah(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal Produk</span>
              <span>{formatInvoiceRupiah(order.subtotal)}</span>
            </div>

            {Number(order.discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Diskon Voucher</span>
                <span>- {formatInvoiceRupiah(Number(order.discount))}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>
                Ongkos Kirim
                {order.courierServiceName
                  ? ` (${order.courierServiceName})`
                  : order.shippingZone
                    ? ` (${order.shippingZone})`
                    : ''}
              </span>
              <span>{formatInvoiceRupiah(Number(order.shippingCost || 0))}</span>
            </div>

            {showTaxLine && (
              <div className="flex justify-between text-gray-700">
                <span>
                  {order.taxLabel || 'PPN'}
                  {Number(order.taxRate || 0) > 0 ? ` (${Number(order.taxRate)}%)` : ''}
                </span>
                <span>{formatInvoiceRupiah(Number(order.taxAmount || 0))}</span>
              </div>
            )}

            {visibleCustomFees.map((fee) => (
              <div key={fee.id} className="flex justify-between text-gray-700">
                <span>
                  {fee.name}
                  {fee.type === 'PERCENT' ? ` (${fee.rateOrAmount}%)` : ''}
                </span>
                <span>{formatInvoiceRupiah(fee.computedAmount)}</span>
              </div>
            ))}

            <div className="pt-3 border-t-2 border-gray-200 flex justify-between items-center text-base font-extrabold text-gray-900">
              <span>Total Tagihan</span>
              <span className="text-indigo-700 text-lg">
                {formatInvoiceRupiah(order.totalAmount)}
              </span>
            </div>
          </div>

          {storeInfo?.invoiceNotes && (
            <div className="pt-4 border-t border-dashed border-gray-300 text-xs text-gray-600 whitespace-pre-line">
              <strong className="block text-gray-800 mb-1">Catatan Invoice:</strong>
              {storeInfo.invoiceNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
