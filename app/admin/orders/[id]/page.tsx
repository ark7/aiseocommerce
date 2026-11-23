'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { nextStatuses, STATUS_LABELS, type OrderStatus } from '@/lib/orderStatus';
import {
  calculateOrderPricing,
  parseCustomFeesConfig,
  parseOrderCustomFees,
  type CustomFeeConfigItem,
  type CustomFeeType,
} from '@/lib/invoicePricing';
import OrderInvoiceModal, { type InvoiceModalStoreInfo } from '@/components/OrderInvoiceModal';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variation?: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    images: { url: string; altText: string | null }[];
  } | null;
}

interface PaymentInfo {
  id: string;
  method: string;
  status: string;
  amount: number;
  proofFile: string | null;
  proofUrl?: string | null;
  verifiedAt: string | null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: string | null;
  shippingCost?: number;
  shippingZone?: string | null;
  discount?: number;
  subtotal: number;
  taxAmount?: number;
  taxLabel?: string | null;
  taxRate?: number;
  customFeesAmount?: number;
  customFeesSnapshot?: unknown;
  invoiceShowTax?: boolean;
  invoiceShowCustomFees?: boolean;
  invoiceRevision?: number;
  lastInvoiceSentAt?: string | null;
  notes?: string | null;
  totalAmount: number;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  courierCode?: string | null;
  courierService?: string | null;
  courierServiceName?: string | null;
  courierEtd?: string | null;
  waybillNumber?: string | null;
  biteshipOrderId?: string | null;
  biteshipTrackingId?: string | null;
  biteshipStatus?: string | null;
  createdAt: string;
  /** Campaign that brought this order in; null for direct or organic traffic. */
  attribution: Attribution | null;
  orderItems: OrderItem[];
  payments: PaymentInfo[];
}

interface InvoiceDefaults {
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number;
  invoiceShowTax: boolean;
  invoiceShowCustomFees: boolean;
  customFeesConfig: CustomFeeConfigItem[];
}

interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  gclid?: string;
  fbclid?: string;
  landingPage?: string;
  referrer?: string;
  capturedAt?: string;
}

const ATTRIBUTION_LABELS: { key: keyof Attribution; label: string }[] = [
  { key: 'source', label: 'Sumber' },
  { key: 'medium', label: 'Medium' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'term', label: 'Keyword' },
  { key: 'content', label: 'Konten Iklan' },
  { key: 'gclid', label: 'Google Click ID' },
  { key: 'fbclid', label: 'Meta Click ID' },
  { key: 'landingPage', label: 'Halaman Masuk' },
  { key: 'referrer', label: 'Referrer' },
];

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = (params?.id as string) || '';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [proofDataUri, setProofDataUri] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [isDispatchingBiteship, setIsDispatchingBiteship] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<any | null>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  // Invoice & Pricing Revision states
  const [storeInfo, setStoreInfo] = useState<InvoiceModalStoreInfo | null>(null);
  const [smtpReady, setSmtpReady] = useState(false);
  const [invoiceDefaults, setInvoiceDefaults] = useState<InvoiceDefaults | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  const [revShippingCost, setRevShippingCost] = useState<string>('0');
  const [revShippingZone, setRevShippingZone] = useState<string>('MANUAL');
  const [revCourierName, setRevCourierName] = useState<string>('');
  const [revTaxEnabled, setRevTaxEnabled] = useState<boolean>(false);
  const [revTaxLabel, setRevTaxLabel] = useState<string>('PPN');
  const [revTaxRate, setRevTaxRate] = useState<string>('0');
  const [revInvoiceShowTax, setRevInvoiceShowTax] = useState<boolean>(true);
  const [revInvoiceShowCustomFees, setRevInvoiceShowCustomFees] = useState<boolean>(true);
  const [revCustomFees, setRevCustomFees] = useState<CustomFeeConfigItem[]>([]);
  const [revNewStatus, setRevNewStatus] = useState<string>('');
  const [revAdjustmentNote, setRevAdjustmentNote] = useState<string>('');
  const [revResendEmail, setRevResendEmail] = useState<boolean>(false);
  const [savingPricing, setSavingPricing] = useState<boolean>(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

  const syncRevisionFormFromOrder = useCallback(
    (ord: OrderDetail, defaults: InvoiceDefaults | null) => {
      setRevShippingCost(String(ord.shippingCost ?? 0));
      setRevShippingZone(ord.shippingZone || 'MANUAL');
      setRevCourierName(ord.courierServiceName || '');
      const hasOrderTax = Number(ord.taxRate || 0) > 0 || Number(ord.taxAmount || 0) > 0;
      setRevTaxEnabled(hasOrderTax);
      setRevTaxLabel(ord.taxLabel || defaults?.taxLabel || 'PPN');
      setRevTaxRate(String(ord.taxRate ?? (hasOrderTax ? defaults?.taxRate ?? 0 : 0)));
      setRevInvoiceShowTax(ord.invoiceShowTax ?? true);
      setRevInvoiceShowCustomFees(ord.invoiceShowCustomFees ?? true);
      const snapFees = parseOrderCustomFees(ord.customFeesSnapshot).map((line) => ({
        id: line.id,
        name: line.name,
        type: line.type,
        amount: line.rateOrAmount,
        enabled: true,
        showOnInvoice: line.showOnInvoice,
      }));
      setRevCustomFees(snapFees);
      setRevNewStatus('');
      setRevAdjustmentNote('');
    },
    []
  );

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = authHeaders();
      if (!headers) {
        setError('Anda harus login terlebih dahulu');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}`, { headers });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pesanan');
      }

      const data = await response.json();
      setOrder(data.order);
      setStoreInfo(data.storeInfo || null);
      const isSmtpReady = Boolean(data.smtpReady);
      setSmtpReady(isSmtpReady);
      setInvoiceDefaults(data.invoiceDefaults || null);
      setTrackingUrl(data.order?.trackingUrl || '');
      if (data.order) {
        syncRevisionFormFromOrder(data.order, data.invoiceDefaults || null);
        setRevResendEmail(isSmtpReady && Boolean(data.order.customerEmail));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [orderId, syncRevisionFormFromOrder]);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId, fetchOrder]);

  const runAction = async (fn: () => Promise<Response>, successMessage: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fn();
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Aksi gagal');
      }
      setNotice(successMessage);
      await fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aksi gagal');
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = () => {
    const headers = authHeaders();
    if (!headers) return;
    return runAction(
      () =>
        fetch('/api/payments/confirm', {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, action: 'approve' }),
        }),
      'Pembayaran dikonfirmasi. Pesanan masuk ke proses pengiriman.'
    );
  };

  const rejectPayment = () => {
    if (!window.confirm('Tolak bukti bayar ini? Pesanan akan dibatalkan dan stok dikembalikan.')) {
      return;
    }
    const headers = authHeaders();
    if (!headers) return;
    return runAction(
      () =>
        fetch('/api/payments/confirm', {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, action: 'reject' }),
        }),
      'Pembayaran ditolak. Stok sudah dikembalikan.'
    );
  };

  const markShipped = () => {
    const headers = authHeaders();
    if (!headers) return;
    return runAction(
      () =>
        fetch(`/api/orders/${orderId}/ship`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingUrl }),
        }),
      'Pesanan ditandai dikirim.'
    );
  };

  const handleDispatchBiteship = async () => {
    if (!order) return;
    setIsDispatchingBiteship(true);
    setError(null);
    try {
      const headers = authHeaders();
      const res = await fetch(`/api/admin/orders/${order.id}/dispatch-biteship`, {
        method: 'POST',
        headers: { ...(headers || {}) },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pengiriman Biteship');
      }
      setNotice('Pesanan berhasil di-booking via Biteship! Nomor resi telah diterbitkan.');
      await fetchOrder();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pengiriman Biteship');
    } finally {
      setIsDispatchingBiteship(false);
    }
  };

  const handleFetchTracking = async () => {
    if (!order) return;
    setIsLoadingTracking(true);
    try {
      const headers = authHeaders();
      const res = await fetch(`/api/shipping/track?orderId=${order.id}`, { headers: headers || {} });
      const data = await res.json();
      if (res.ok && data.tracking) {
        setTrackingInfo(data.tracking);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingTracking(false);
    }
  };

  /** Cancelling or refunding puts stock back and writes a reversing ledger entry. */
  const REVERSING: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

  const changeStatus = (status: OrderStatus) => {
    if (
      REVERSING.includes(status) &&
      !window.confirm(
        `Ubah status ke "${STATUS_LABELS[status]}"? Stok dikembalikan dan jurnal pembalik dicatat.`
      )
    ) {
      return;
    }

    const headers = authHeaders();
    if (!headers) return;

    return runAction(
      () =>
        fetch(`/api/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }),
      `Status pesanan diubah ke ${STATUS_LABELS[status]}.`
    );
  };

  const handleSendInvoiceEmail = async () => {
    if (!order) return;
    const headers = authHeaders();
    if (!headers) return;

    setSendingInvoice(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/invoice/send`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: revAdjustmentNote.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim invoice via SMTP');
      }
      setNotice(data.message || 'Invoice berhasil dikirim ulang ke email pelanggan.');
      await fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim invoice');
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleLoadCmsDefaultsToOrder = () => {
    if (!invoiceDefaults) return;
    setRevTaxEnabled(invoiceDefaults.taxEnabled);
    setRevTaxLabel(invoiceDefaults.taxLabel || 'PPN');
    setRevTaxRate(String(invoiceDefaults.taxRate ?? 0));
    setRevInvoiceShowTax(invoiceDefaults.invoiceShowTax);
    setRevInvoiceShowCustomFees(invoiceDefaults.invoiceShowCustomFees);
    setRevCustomFees(parseCustomFeesConfig(invoiceDefaults.customFeesConfig));
  };

  const handleSavePricingRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const headers = authHeaders();
    if (!headers) return;

    const shippingNum = Number(revShippingCost);
    if (!Number.isFinite(shippingNum) || shippingNum < 0) {
      setError('Ongkos kirim manual harus berupa angka >= 0');
      return;
    }

    const taxRateNum = Number(revTaxRate);
    if (!Number.isFinite(taxRateNum) || taxRateNum < 0 || taxRateNum > 100) {
      setError('Tarif PPN harus antara 0% dan 100%');
      return;
    }

    setSavingPricing(true);
    setError(null);
    setNotice(null);
    try {
      const cleanedCustomFees = revCustomFees
        .map((fee, idx) => ({
          id: fee.id || `fee-${idx + 1}`,
          name: fee.name.trim(),
          type: fee.type,
          amount: Math.max(0, Number(fee.amount) || 0),
          enabled: fee.enabled !== false,
          showOnInvoice: fee.showOnInvoice !== false,
        }))
        .filter((f) => f.name.length > 0);

      const res = await fetch(`/api/admin/orders/${order.id}/pricing`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingCost: shippingNum,
          shippingZone: revShippingZone,
          courierServiceName: revCourierName.trim() || null,
          taxEnabled: revTaxEnabled,
          taxLabel: revTaxLabel.trim() || 'PPN',
          taxRate: revTaxRate ? taxRateNum : 0,
          invoiceShowTax: revInvoiceShowTax,
          invoiceShowCustomFees: revInvoiceShowCustomFees,
          customFees: cleanedCustomFees,
          ...(revNewStatus ? { newStatus: revNewStatus } : {}),
          adjustmentNote: revAdjustmentNote.trim() || null,
          resendInvoiceEmail: revResendEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan penyesuaian harga & ongkir manual');
      }

      const emailFeedback = data.emailResult
        ? data.emailResult.sent
          ? ` Email invoice berhasil dikirim ke ${data.emailResult.recipient}.`
          : ` Catatan email: ${data.emailResult.message}`
        : '';

      setNotice(
        `Tagihan & Invoice berhasil diperbarui (Rev #${data.order?.invoiceRevision || (order.invoiceRevision || 1) + 1}).${emailFeedback}`
      );
      await fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui tagihan');
    } finally {
      setSavingPricing(false);
    }
  };

  const loadProof = async (paymentId: string) => {
    if (proofDataUri) {
      setProofDataUri(null);
      return;
    }

    try {
      setLoadingProof(true);
      setError(null);
      const headers = authHeaders();
      if (!headers) return;

      const response = await fetch(`/api/payment/proof?paymentId=${paymentId}`, { headers });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Bukti bayar tidak tersedia');
      }
      const data = await response.json();
      setProofFileName(data.fileInfo?.name || null);

      if (data.proofData) {
        const mime = data.fileInfo?.type || 'image/jpeg';
        setProofDataUri(`data:${mime};base64,${data.proofData}`);
      } else if (data.proofUrl) {
        setProofDataUri(data.proofUrl);
      } else {
        throw new Error('File bukti bayar tidak ditemukan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat bukti bayar');
    } finally {
      setLoadingProof(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto text-center text-gray-500">Memuat pesanan...</div>;
  }

  if (!order) {
    return (
      <div className="container mx-auto">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error || 'Pesanan tidak ditemukan'}</div>
        <Link href="/admin/orders" className="inline-block mt-4 text-indigo-600 hover:text-indigo-900">
          &larr; Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const payment = order.payments[0];
  const canRevisePricing = !['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(order.status);
  const revisionPricingPreview = calculateOrderPricing({
    subtotal: order.subtotal,
    discount: order.discount || 0,
    shippingCost: Number(revShippingCost) || 0,
    taxEnabled: revTaxEnabled,
    taxLabel: revTaxLabel,
    taxRate: Number(revTaxRate) || 0,
    customFees: revCustomFees,
  });
  const previewDiff = revisionPricingPreview.totalAmount - order.totalAmount;

  return (
    <div className="container mx-auto">
      <Link href="/admin/orders" className="text-sm text-indigo-600 hover:text-indigo-900">
        &larr; Kembali ke daftar pesanan
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            {Boolean(order.invoiceRevision && order.invoiceRevision > 1) && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Invoice Rev #{order.invoiceRevision}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Dibuat {new Date(order.createdAt).toLocaleString('id-ID')}
            {order.lastInvoiceSentAt && (
              <span className="ml-2 text-xs text-emerald-700">
                • Invoice terakhir dikirim {new Date(order.lastInvoiceSentAt).toLocaleString('id-ID')}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setInvoiceModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition"
          >
            🧾 Lihat / Cetak Invoice
          </button>
          <button
            type="button"
            onClick={handleSendInvoiceEmail}
            disabled={sendingInvoice || !smtpReady || !order.customerEmail}
            title={
              !smtpReady
                ? 'SMTP belum aktif di Pengaturan > Email & SMTP'
                : !order.customerEmail
                  ? 'Pelanggan tidak memiliki email'
                  : 'Kirim ulang invoice HTML ke email pelanggan'
            }
            className="px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition disabled:opacity-50"
          >
            {sendingInvoice ? 'Mengirim...' : '✉️ Kirim Ulang Invoice'}
          </button>
          <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {order.status}
          </span>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {notice && <div className="mb-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {order.attribution && Object.keys(order.attribution).length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sumber Campaign</h2>
              <dl className="space-y-2 text-sm">
                {ATTRIBUTION_LABELS.filter(({ key }) => order.attribution?.[key]).map(
                  ({ key, label }) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="text-gray-900 text-right break-all">
                        {order.attribution?.[key]}
                      </dd>
                    </div>
                  )
                )}
              </dl>
              {order.attribution.capturedAt && (
                <p className="mt-3 pt-3 border-t text-xs text-gray-500">
                  Dilacak {new Date(order.attribution.capturedAt).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Pesanan</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Harga</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.orderItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 text-sm text-gray-900">
                      <span>{item.product?.name || '(produk dihapus)'}</span>
                      {item.variation && (
                        <span className="block text-xs text-gray-500">{item.variation}</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                    <td className="py-3 text-sm text-gray-700 text-right">{formatIDR(item.unitPrice)}</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{formatIDR(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 pt-4 border-t space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal Produk</span>
                <span>{formatIDR(order.subtotal)}</span>
              </div>
              {Boolean(order.discount && order.discount > 0) && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon Voucher</span>
                  <span>- {formatIDR(order.discount!)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>
                  Ongkos Kirim
                  {order.shippingZone === 'INNER'
                    ? ' (Dalam Kota)'
                    : order.shippingZone === 'OUTER'
                    ? ' (Luar Kota)'
                    : order.shippingZone === 'FREE'
                    ? ' (Bebas Ongkir)'
                    : order.shippingZone === 'DIGITAL'
                    ? ' (Digital)'
                    : order.courierServiceName
                    ? ` (${order.courierServiceName})`
                    : order.shippingZone === 'MANUAL'
                    ? ' (Manual Admin)'
                    : ''}
                </span>
                <span>{order.shippingCost ? formatIDR(order.shippingCost) : 'Rp 0'}</span>
              </div>
              {Boolean(order.taxAmount && order.taxAmount > 0) && (
                <div className="flex justify-between items-center">
                  <span>
                    {order.taxLabel || 'PPN'}
                    {Number(order.taxRate || 0) > 0 ? ` (${Number(order.taxRate)}%)` : ''}
                    {order.invoiceShowTax === false && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        Disembunyikan di Invoice
                      </span>
                    )}
                  </span>
                  <span>{formatIDR(order.taxAmount!)}</span>
                </div>
              )}
              {parseOrderCustomFees(order.customFeesSnapshot).map((fee) => (
                <div key={fee.id} className="flex justify-between items-center">
                  <span>
                    {fee.name}
                    {fee.type === 'PERCENT' ? ` (${fee.rateOrAmount}%)` : ''}
                    {(order.invoiceShowCustomFees === false || !fee.showOnInvoice) && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        Disembunyikan di Invoice
                      </span>
                    )}
                  </span>
                  <span>{formatIDR(fee.computedAmount)}</span>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between text-base font-semibold text-gray-900">
                <span>Total Pesanan</span>
                <span className="text-indigo-600">{formatIDR(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {canRevisePricing && (
            <form onSubmit={handleSavePricingRevision} className="bg-white p-6 rounded-lg shadow border space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    🚚 Penyesuaian Ongkir Manual, PPN &amp; Biaya Tambahan
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tambahkan ongkir manual, atur PPN/biaya kustom di invoice, ubah status order, dan kirim ulang invoice via email.
                  </p>
                </div>
                {invoiceDefaults && (
                  <button
                    type="button"
                    onClick={handleLoadCmsDefaultsToOrder}
                    className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold shrink-0"
                  >
                    Muat Default CMS
                  </button>
                )}
              </div>

              {/* Manual Shipping Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ongkos Kirim Manual (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="500"
                    value={revShippingCost}
                    onChange={(e) => setRevShippingCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Zona / Tipe Ongkir
                  </label>
                  <select
                    value={revShippingZone}
                    onChange={(e) => setRevShippingZone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="MANUAL">Ongkir Manual</option>
                    <option value="INNER">Dalam Kota</option>
                    <option value="OUTER">Luar Kota</option>
                    <option value="BITESHIP">Kurir Ekspedisi</option>
                    <option value="FREE">Bebas Ongkir</option>
                    <option value="DIGITAL">Digital / Tanpa Ongkir</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Kurir / Keterangan Layanan
                  </label>
                  <input
                    type="text"
                    value={revCourierName}
                    onChange={(e) => setRevCourierName(e.target.value)}
                    placeholder="Contoh: JNE Cargo / Kurir Toko"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* PPN Adjustment Row */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revTaxEnabled}
                      onChange={(e) => setRevTaxEnabled(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Kenakan PPN pada pesanan ini</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revInvoiceShowTax}
                      onChange={(e) => setRevInvoiceShowTax(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Tampilkan baris PPN pada Invoice</span>
                  </label>
                </div>

                {revTaxEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Label Pajak
                      </label>
                      <input
                        type="text"
                        value={revTaxLabel}
                        onChange={(e) => setRevTaxLabel(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Tarif PPN (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={revTaxRate}
                        onChange={(e) => setRevTaxRate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Fees Adjustment Row */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-800">Biaya Tambahan Kustom</span>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={revInvoiceShowCustomFees}
                        onChange={(e) => setRevInvoiceShowCustomFees(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Tampilkan di Invoice</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setRevCustomFees((prev) => [
                          ...prev,
                          {
                            id: `fee-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            name: '',
                            type: 'FIXED',
                            amount: 0,
                            enabled: true,
                            showOnInvoice: true,
                          },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50"
                    >
                      + Tambah Biaya
                    </button>
                  </div>
                </div>

                {revCustomFees.map((fee) => (
                  <div key={fee.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200">
                    <input
                      type="text"
                      value={fee.name}
                      onChange={(e) =>
                        setRevCustomFees((prev) =>
                          prev.map((it) => (it.id === fee.id ? { ...it, name: e.target.value } : it))
                        )
                      }
                      placeholder="Nama biaya (mis. Packing Kayu)"
                      className="sm:col-span-5 px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <select
                      value={fee.type}
                      onChange={(e) =>
                        setRevCustomFees((prev) =>
                          prev.map((it) =>
                            it.id === fee.id ? { ...it, type: e.target.value as CustomFeeType } : it
                          )
                        )
                      }
                      className="sm:col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                    >
                      <option value="FIXED">Rp</option>
                      <option value="PERCENT">%</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={fee.amount}
                      onChange={(e) =>
                        setRevCustomFees((prev) =>
                          prev.map((it) =>
                            it.id === fee.id
                              ? { ...it, amount: Math.max(0, Number(e.target.value) || 0) }
                              : it
                          )
                        )
                      }
                      className="sm:col-span-2 px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <label className="sm:col-span-2 inline-flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fee.showOnInvoice}
                        onChange={(e) =>
                          setRevCustomFees((prev) =>
                            prev.map((it) =>
                              it.id === fee.id ? { ...it, showOnInvoice: e.target.checked } : it
                            )
                          )
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Di Invoice</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setRevCustomFees((prev) => prev.filter((it) => it.id !== fee.id))
                      }
                      className="sm:col-span-1 text-rose-600 text-xs font-bold hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>

              {/* Status Update & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Update Status Pesanan Setelah Perubahan
                  </label>
                  <select
                    value={revNewStatus}
                    onChange={(e) => setRevNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
                  >
                    <option value="">
                      Pertahankan Status Saat Ini ({STATUS_LABELS[order.status as OrderStatus] || order.status})
                    </option>
                    {['PENDING', 'MANUAL_VERIFICATION', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']
                      .filter((st) => st !== order.status)
                      .map((st) => (
                        <option key={st} value={st}>
                          Ubah ke: {STATUS_LABELS[st as OrderStatus] || st}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Catatan Perubahan (Tampil di Email Invoice)
                  </label>
                  <input
                    type="text"
                    value={revAdjustmentNote}
                    onChange={(e) => setRevAdjustmentNote(e.target.value)}
                    placeholder="Contoh: Penambahan ongkir kargo manual 25 kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* SMTP Email Resend Toggle */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1.5">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revResendEmail}
                    onChange={(e) => setRevResendEmail(e.target.checked)}
                    disabled={!smtpReady || !order.customerEmail}
                    className="rounded text-indigo-600 disabled:opacity-50"
                  />
                  <span>Kirim ulang invoice terbaru ke email pelanggan via SMTP</span>
                </label>
                <p className="text-[11px] text-gray-600 pl-6">
                  {!order.customerEmail ? (
                    'Email pelanggan tidak tercatat pada pesanan ini.'
                  ) : !smtpReady ? (
                    <>
                      SMTP belum tersambung.{' '}
                      <Link href="/admin/settings?tab=email" className="text-indigo-600 underline font-semibold">
                        Konfigurasi Email &amp; SMTP di Pengaturan
                      </Link>
                      .
                    </>
                  ) : (
                    `Invoice revisi akan dikirim ke ${order.customerEmail}.`
                  )}
                </p>
              </div>

              {/* Preview Old vs New Total */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                <div className="text-xs text-gray-600">
                  <span>Total Saat Ini: </span>
                  <strong className="text-gray-900">{formatIDR(order.totalAmount)}</strong>
                  <span className="mx-2">&rarr;</span>
                  <span>Total Baru: </span>
                  <strong className="text-indigo-700 text-sm">
                    {formatIDR(revisionPricingPreview.totalAmount)}
                  </strong>
                  {previewDiff !== 0 && (
                    <span
                      className={`ml-2 font-semibold ${
                        previewDiff > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      ({previewDiff > 0 ? '+' : ''}
                      {formatIDR(previewDiff)})
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={savingPricing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 transition shrink-0"
                >
                  {savingPricing ? 'Menyimpan...' : 'Simpan Ongkir & Perbarui Invoice'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pembayaran</h2>
            {payment ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Metode</span>
                  <span className="text-gray-900">{payment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="text-gray-900">{payment.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Jumlah</span>
                  <span className="text-gray-900">{formatIDR(payment.amount)}</span>
                </div>
                {payment.verifiedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Diverifikasi</span>
                    <span className="text-gray-900">
                      {new Date(payment.verifiedAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {(payment.proofFile || payment.proofUrl) && (
                  <button
                    onClick={() => loadProof(payment.id)}
                    disabled={loadingProof}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-900 font-medium transition disabled:opacity-50"
                  >
                    {loadingProof ? (
                      <>
                        <span className="inline-block animate-spin">⏳</span> Memuat bukti bayar...
                      </>
                    ) : proofDataUri ? (
                      'Sembunyikan bukti bayar'
                    ) : (
                      'Lihat bukti bayar'
                    )}
                  </button>
                )}
                {proofDataUri && (
                  <div className="mt-4 border border-indigo-100 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold text-gray-800">
                        📎 {proofFileName || 'Bukti Pembayaran'}
                      </span>
                      <div className="flex items-center gap-3">
                        <a
                          href={proofDataUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          Buka tab baru ↗
                        </a>
                        <button
                          onClick={() => setProofDataUri(null)}
                          className="text-gray-400 hover:text-gray-700 font-semibold"
                          title="Tutup pratinjau"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="relative max-h-96 overflow-auto rounded-lg bg-white border border-gray-200 flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofDataUri}
                        alt="Bukti pembayaran"
                        className="max-w-full h-auto max-h-96 object-contain rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Belum ada data pembayaran.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ubah Status</h2>
            <p className="text-sm text-gray-500 mb-3">
              Status saat ini: <span className="text-gray-900">{STATUS_LABELS[order.status as OrderStatus] || order.status}</span>
            </p>

            {nextStatuses(order.status as OrderStatus).length === 0 ? (
              <p className="text-sm text-gray-500">Pesanan ini sudah berstatus akhir.</p>
            ) : (
              <div className="space-y-2">
                {nextStatuses(order.status as OrderStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => changeStatus(status)}
                    disabled={busy}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                      REVERSING.includes(status)
                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                        : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    {STATUS_LABELS[status] || status}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pelanggan</h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-900">{order.customerName || '-'}</p>
              <p className="text-gray-500">{order.customerEmail || '-'}</p>
              <p className="text-gray-500">{order.customerPhone || '-'}</p>
              {order.shippingAddress && (
                <div className="pt-2 border-t space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">Alamat Pengiriman:</span>
                    {order.shippingZone && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                        {order.shippingZone === 'INNER'
                          ? 'Dalam Kota'
                          : order.shippingZone === 'OUTER'
                          ? 'Luar Kota'
                          : order.shippingZone === 'FREE'
                          ? 'Bebas Ongkir'
                          : order.shippingZone}
                      </span>
                    )}
                  </div>
                  {order.courierServiceName && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg font-medium">
                      <span>🚚</span>
                      <span>Kurir: <strong>{order.courierServiceName}</strong></span>
                    </div>
                  )}
                  {order.waybillNumber && (
                    <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <span className="text-gray-600">No. Resi: <strong className="font-mono text-gray-900">{order.waybillNumber}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          if (order.waybillNumber) {
                            navigator.clipboard.writeText(order.waybillNumber);
                            alert('Nomor resi disalin ke clipboard!');
                          }
                        }}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Salin
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{order.shippingAddress}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi</h2>

            {order.status === 'MANUAL_VERIFICATION' && (
              <div className="space-y-3">
                <button
                  onClick={confirmPayment}
                  disabled={busy}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Konfirmasi Pembayaran
                </button>
                <button
                  onClick={rejectPayment}
                  disabled={busy}
                  className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Tolak
                </button>
              </div>
            )}

            {order.status === 'PROCESSING' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <span className="text-xs font-bold text-indigo-900">Biteship Automated Dispatch</span>
                  </div>
                  <p className="text-xs text-indigo-700">
                    Panggil kurir pick-up otomatis dan terbitkan nomor resi resmi via Biteship API.
                  </p>
                  <button
                    onClick={handleDispatchBiteship}
                    disabled={isDispatchingBiteship || busy}
                    className="w-full bg-indigo-600 text-white py-2 px-3 rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
                  >
                    {isDispatchingBiteship ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Memproses Booking Biteship...</span>
                      </>
                    ) : (
                      <>
                        <span>🚚</span>
                        <span>Request Pickup via Biteship</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <span className="text-xs font-semibold text-gray-700 block">Atau Tandai Manual:</span>
                  <label className="block">
                    <span className="text-gray-500 text-xs">Nomor Resi / URL Tracking Pengiriman</span>
                    <input
                      type="text"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="Contoh: JNE123456789 atau https://..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                    />
                  </label>
                  <button
                    onClick={markShipped}
                    disabled={busy || !trackingUrl}
                    className="w-full bg-gray-100 text-gray-800 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-50 border border-gray-300"
                  >
                    Tandai Dikirim Manual
                  </button>
                </div>
              </div>
            )}

            {['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
              <div className="space-y-3">
                <div className="text-xs text-gray-600 space-y-2">
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <span>📦 Status Pengiriman:</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                      {order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'Paket Telah Tiba' : 'Sedang Dikirim'}
                    </span>
                  </p>
                  {order.waybillNumber && (
                    <p className="text-gray-700">
                      No. Resi: <strong className="font-mono text-indigo-700">{order.waybillNumber}</strong>
                    </p>
                  )}
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-900 font-semibold"
                    >
                      <span>Buka Halaman Lacak Biteship</span>
                      <span>↗</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleFetchTracking}
                  disabled={isLoadingTracking}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoadingTracking ? 'Memuat Posisi...' : '📍 Lacak Live Status Kurir'}
                </button>

                {trackingInfo && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <p className="text-xs font-bold text-gray-900">
                      Posisi Terkini: <span className="text-indigo-600">{trackingInfo.statusLabel}</span>
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {trackingInfo.history?.map((h: any, idx: number) => (
                        <div key={idx} className="text-[11px] border-l-2 border-indigo-400 pl-2.5 py-1">
                          <p className="font-semibold text-gray-800">{h.note}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(h.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            {h.location ? ` • ${h.location}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {['CANCELLED', 'PENDING', 'PAID'].includes(order.status) && (
              <p className="text-sm text-gray-500">Tidak ada aksi yang tersedia untuk status ini.</p>
            )}
          </div>
        </div>
      </div>

      <OrderInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        order={order}
        storeInfo={storeInfo}
      />
    </div>
  );
}
