'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
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

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setError('Pilih file bukti transfer terlebih dahulu');
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setNotice(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login untuk mengunggah bukti.');
        return;
      }

      const formData = new FormData();
      formData.append('file', proofFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal mengunggah file bukti');
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.fileUrl || uploadData.url;

      const submitResponse = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileUrl }),
      });

      if (!submitResponse.ok) {
        const data = await submitResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan bukti pembayaran');
      }

      setNotice('Bukti transfer berhasil dikirim. Menunggu verifikasi admin.');
      setProofFile(null);
      fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim bukti transfer');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!confirm('Pastikan Anda sudah menerima pesanan ini. Lanjutkan konfirmasi?')) {
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login terlebih dahulu.');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyelesaikan pesanan');
      }

      setNotice('Terima kasih! Pesanan Anda telah ditandai selesai.');
      fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengonfirmasi penerimaan');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StoreHeader />
        <div className="flex-1 container mx-auto px-4 py-12 text-center text-gray-500 w-full">Memuat pesanan...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StoreHeader />
        <div className="flex-1 container mx-auto px-4 py-12 max-w-3xl w-full">
          <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg">{error || 'Pesanan tidak ditemukan.'}</div>
          <Link href="/orders" className="inline-block mt-4 text-indigo-600 hover:text-indigo-900">
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-3xl w-full">
        <Link href="/orders" className="text-sm text-indigo-600 hover:text-indigo-900">
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

        {/* Progress Timeline */}
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStep && currentStep !== -1;
              return (
                <div key={step.key} className="flex-1 text-center">
                  <div
                    className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-semibold ${
                      done ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual Payment Proof Upload */}
        {canUploadProof && (
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Bukti Transfer Bank</h2>
            <p className="text-sm text-gray-600 mb-4">
              Silakan lakukan transfer sejumlah <strong className="text-indigo-600">{formatIDR(order.totalAmount)}</strong>, lalu lampirkan struk / tangkapan layar bukti transfer di bawah ini.
            </p>
            <form onSubmit={handleUploadProof} className="space-y-4">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <button
                type="submit"
                disabled={busy || !proofFile}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {busy ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
              </button>
            </form>
          </div>
        )}

        {/* Delivered Confirmation Button */}
        {order.status === 'DELIVERED' && (
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pesanan Telah Tiba</h2>
              <p className="text-sm text-gray-600">Konfirmasi bila Anda telah menerima pesanan dengan baik.</p>
            </div>
            <button
              onClick={handleConfirmReceived}
              disabled={busy}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {busy ? 'Memproses...' : 'Pesanan Diterima'}
            </button>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rincian Produk</h2>
          <div className="divide-y">
            {order.orderItems.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.product?.name || 'Produk'}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} x {formatIDR(item.unitPrice)}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">{formatIDR(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatIDR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t">
              <span>Total Pembayaran</span>
              <span className="text-indigo-600">{formatIDR(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <StoreFooter />
    </div>
  );
}

