'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface OrderRow {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  payments: { id: string; method: string; status: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  MANUAL_VERIFICATION: 'Menunggu Konfirmasi',
  PAID: 'Terbayar',
  PROCESSING: 'Diproses',
  SHIPPED: 'Dikirim',
  DELIVERED: 'Diterima',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dikembalikan',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  MANUAL_VERIFICATION: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function CustomerOrdersPage() {
  const params = useParams();
  const storeDomain = (params?.storeDomain as string) || '';

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login untuk melihat pesanan Anda.');
        return;
      }

      const response = await fetch('/api/orders?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pesanan');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pesanan Saya</h1>

      {error && (
        <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat pesanan...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow border px-4 py-12 text-center">
          <p className="text-gray-500 mb-4">Belum ada pesanan.</p>
          <Link
            href={`/${storeDomain}`}
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/${storeDomain}/orders/${order.id}`}
              className="block bg-white rounded-lg shadow border p-4 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatIDR(order.totalAmount)}</p>
                  <span
                    className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                      STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
