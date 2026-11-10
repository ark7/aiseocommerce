'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import DateRangeFilter from '@/components/common/DateRangeFilter';
import Pagination from '@/components/common/Pagination';

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
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Date Filter State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login untuk melihat pesanan Anda.');
        return;
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pesanan');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      if (data.pagination) {
        setTotal(data.pagination.total || 0);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [page, limit, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Saya</h1>
          <p className="text-sm text-gray-500 font-medium">{total} pesanan tercatat</p>
        </div>

        {/* Date Filter */}
        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onFilterChange={({ startDate: start, endDate: end }) => {
              setStartDate(start);
              setEndDate(end);
              setPage(1);
            }}
          />
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-xl text-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('login') && (
              <Link
                href="/login?from=/orders"
                className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium text-xs rounded-lg hover:bg-indigo-700 transition shrink-0"
              >
                Masuk Sekarang &rarr;
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Memuat pesanan...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow border px-4 py-12 text-center">
            <p className="text-gray-500 mb-4">
              {startDate || endDate
                ? 'Tidak ada pesanan pada rentang tanggal yang dipilih.'
                : 'Belum ada pesanan.'}
            </p>
            <Link
              href="/"
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
                href={`/orders/${order.id}`}
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

            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                limit={limit}
                onPageChange={(p) => setPage(p)}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <StoreFooter />
    </div>
  );
}
