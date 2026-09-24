'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import { buildPurchaseCalls, fireOnce, getTrackingConfig } from '@/lib/tracking';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: { id: string; name: string; slug: string } | null;
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
  subtotal: number;
  totalAmount: number;
  shippingAddress: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  orderItems: OrderItem[];
  payments: PaymentInfo[];
}

const STEPS = [
  { key: 'PENDING', label: 'Dibuat' },
  { key: 'MANUAL_VERIFICATION', label: 'Bukti Diunggah' },
  { key: 'PROCESSING', label: 'Dikonfirmasi' },
  { key: 'SHIPPED', label: 'Dikirim' },
  { key: 'DELIVERED', label: 'Diterima' },
  { key: 'COMPLETED', label: 'Selesai' },
];

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const storeDomain = (params?.storeDomain as string) || '';
  const orderId = (params?.id as string) || '';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login untuk melihat detail pesanan.');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pesanan');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId, fetchOrder]);

  // Report the purchase once per order. Firing here rather than at checkout means
  // the value is the order's final total, and reloading cannot double-count it.
  useEffect(() => {
    if (!order) return;

    fireOnce(
      `purchase:${order.id}`,
      buildPurchaseCalls(getTrackingConfig(), {
        orderId: order.id,
        value: order.totalAmount,
        items: order.orderItems.map((item) => ({
          id: item.product?.id || item.id,
          name: item.product?.name || 'Produk',
          price: item.unitPrice,
          quantity: item.quantity,
        })),
      })
    );
  }, [order]);

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

  const uploadProof = () => {
    if (!proofFile) {
      setError('Pilih file bukti bayar terlebih dahulu.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('proof', proofFile);

    return runAction(
      () =>
        fetch('/api/payment/manual', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }),
      'Bukti bayar terkirim. Menunggu konfirmasi admin.'
    );
  };

  const confirmReceived = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    return runAction(
      () =>
        fetch(`/api/orders/${orderId}/received`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      'Terima kasih. Pesanan ditandai sudah diterima.'
    );
  };

  const completeOrder = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    return runAction(
      () =>
        fetch(`/api/orders/${orderId}/complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      'Transaksi selesai.'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StoreHeader storeDomain={storeDomain} />
        <div className="container mx-auto px-4 py-12 text-center text-gray-500">Memuat pesanan...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StoreHeader storeDomain={storeDomain} />
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg">{error || 'Pesanan tidak ditemukan.'}</div>
          <Link href={`/${storeDomain}/orders`} className="inline-block mt-4 text-indigo-600 hover:text-indigo-900">
            &larr; Kembali ke pesanan saya
          </Link>
        </div>
      </div>
    );
  }

  const payment = order.payments[0];
  const currentStep = STEPS.findIndex((step) => step.key === order.status);
  const canUploadProof = order.status === 'PENDING' && payment?.method === 'MANUAL';

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader storeDomain={storeDomain} />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href={`/${storeDomain}/orders`} className="text-sm text-indigo-600 hover:text-indigo-900">
        &larr; Kembali ke pesanan saya
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

      {currentStep >= 0 && (
        <div className="bg-white p-6 rounded-lg shadow border mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Pesanan</h2>
          <ol className="flex flex-wrap gap-x-6 gap-y-2">
            {STEPS.map((step, index) => (
              <li key={step.key} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-3 h-3 rounded-full ${
                    index <= currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                />
                <span className={index <= currentStep ? 'text-gray-900' : 'text-gray-400'}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow border mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Pesanan</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.orderItems.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-sm text-gray-900">{item.product?.name || '(produk dihapus)'}</td>
                <td className="py-3 text-sm text-gray-700 text-right">{item.quantity}</td>
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

      {order.trackingUrl && (
        <div className="bg-white p-6 rounded-lg shadow border mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Pengiriman</h2>
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-900"
          >
            Lacak pengiriman
          </a>
        </div>
      )}

      <div className="space-y-3">
        {canUploadProof && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Bukti Bayar</h2>
            <p className="text-sm text-gray-500 mb-4">
              Transfer ke rekening toko, lalu unggah bukti. Maks 2 MB (JPG, PNG, WEBP).
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 mb-4"
            />
            <button
              onClick={uploadProof}
              disabled={busy || !proofFile}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Kirim Bukti Bayar
            </button>
          </div>
        )}

        {order.status === 'SHIPPED' && (
          <button
            onClick={confirmReceived}
            disabled={busy}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Pesanan Diterima
          </button>
        )}

        {order.status === 'DELIVERED' && (
          <button
            onClick={completeOrder}
            disabled={busy}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Selesaikan Transaksi
          </button>
        )}

        {order.status === 'MANUAL_VERIFICATION' && (
          <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg text-sm">
            Bukti bayar sedang diperiksa admin.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
