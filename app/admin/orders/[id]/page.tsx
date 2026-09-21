'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { nextStatuses, STATUS_LABELS } from '@/lib/orderStatus';
import type { OrderStatus } from '@prisma/client';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  subtotal: number;
  totalAmount: number;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  /** Campaign that brought this order in; null for direct or organic traffic. */
  attribution: Attribution | null;
  orderItems: OrderItem[];
  payments: PaymentInfo[];
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

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

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
      setTrackingUrl(data.order?.trackingUrl || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

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

  const loadProof = async (paymentId: string) => {
    try {
      setError(null);
      const headers = authHeaders();
      if (!headers) return;

      const response = await fetch(`/api/payment/proof?paymentId=${paymentId}`, { headers });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Bukti bayar tidak tersedia');
      }
      const data = await response.json();
      const mime = data.fileInfo?.type || 'image/jpeg';
      setProofDataUri(`data:${mime};base64,${data.proofData}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat bukti bayar');
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center text-gray-500">Memuat pesanan...</div>;
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error || 'Pesanan tidak ditemukan'}</div>
        <Link href="/admin/orders" className="inline-block mt-4 text-indigo-600 hover:text-indigo-900">
          &larr; Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const payment = order.payments[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/orders" className="text-sm text-indigo-600 hover:text-indigo-900">
        &larr; Kembali ke daftar pesanan
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            Dibuat {new Date(order.createdAt).toLocaleString('id-ID')}
          </p>
        </div>
        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          {order.status}
        </span>
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
                    <td className="py-3 text-sm text-gray-900">{item.product?.name || '(produk dihapus)'}</td>
                    <td className="py-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                    <td className="py-3 text-sm text-gray-700 text-right">{formatIDR(item.unitPrice)}</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{formatIDR(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 pt-4 border-t flex justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatIDR(order.totalAmount)}</span>
            </div>
          </div>

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
                {payment.proofFile && (
                  <button
                    onClick={() => loadProof(payment.id)}
                    className="mt-2 text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    Lihat bukti bayar
                  </button>
                )}
                {proofDataUri && (
                  <div className="mt-4 border rounded-lg p-2">
                    <Image
                      src={proofDataUri}
                      alt="Bukti pembayaran"
                      width={600}
                      height={800}
                      unoptimized
                      className="w-full h-auto object-contain"
                    />
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
                <p className="text-gray-600 pt-2 border-t">{order.shippingAddress}</p>
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
              <div className="space-y-3">
                <label className="block">
                  <span className="text-gray-700 text-sm">URL Tracking Pengiriman</span>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </label>
                <button
                  onClick={markShipped}
                  disabled={busy || !trackingUrl}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Tandai Dikirim
                </button>
              </div>
            )}

            {order.status === 'SHIPPED' && (
              <div className="text-sm text-gray-600">
                <p>Menunggu pelanggan mengonfirmasi penerimaan.</p>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-indigo-600 hover:text-indigo-900"
                  >
                    Buka halaman tracking
                  </a>
                )}
              </div>
            )}

            {['DELIVERED', 'COMPLETED', 'CANCELLED', 'PENDING', 'PAID'].includes(order.status) && (
              <p className="text-sm text-gray-500">Tidak ada aksi yang tersedia untuk status ini.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
