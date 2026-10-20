'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { OrderStatus } from '@prisma/client';
import { REVENUE_STATUSES, STATUS_LABELS } from '@/lib/orderStatus';
import DateRangeFilter from '@/components/common/DateRangeFilter';
import Pagination from '@/components/common/Pagination';

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
  payments: { id: string; method: string; status: string }[];
}

const STATUS_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'PENDING', label: 'Menunggu Pembayaran' },
  { value: 'PAID', label: 'Dibayar' },
  { value: 'MANUAL_VERIFICATION', label: 'Menunggu Konfirmasi' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'SHIPPED', label: 'Dikirim' },
  { value: 'DELIVERED', label: 'Diterima' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

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

const PAGE_SIZES = [5, 10, 25, 50, 100];

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') || '';

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState(urlStatus);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/admin/settings/general', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.defaultPageSize) {
            setLimit(data.settings.defaultPageSize);
          }
        }
      } catch {}
    }
    loadSettings();
  }, []);

  useEffect(() => {
    const s = searchParams.get('status') ?? '';
    setStatus(s);
    setPage(1);
  }, [searchParams]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Anda harus login terlebih dahulu');
        return;
      }

      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);
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
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [status, page, limit, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /** A new filter or page size changes which rows exist, so start over at page 1. */
  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const changeLimit = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  // Derived during render, not stored. Only the rows on screen are summed, so
  // the label says "halaman ini" instead of claiming the whole store's revenue.
  const revenue = orders
    .filter((order) => REVENUE_STATUSES.includes(order.status as OrderStatus))
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesanan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} pesanan · penjualan di halaman ini: {formatIDR(revenue)}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Muat Ulang
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => changeStatus(filter.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  status === filter.value
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <DateRangeFilter
              compact
              startDate={startDate}
              endDate={endDate}
              onFilterChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
                setPage(1);
              }}
            />
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-700 text-sm border-b">{error}</div>
        )}

        {loading ? (
          <div className="px-4 py-12 text-center text-gray-500">Memuat pesanan...</div>
        ) : orders.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">Belum ada pesanan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. Pesanan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pelanggan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.customerName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatIDR(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="px-4 py-3 border-t">
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
        )}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6 text-center text-gray-500">
          Memuat pesanan...
        </div>
      }
    >
      <AdminOrdersContent />
    </Suspense>
  );
}
