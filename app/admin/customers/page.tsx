'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DateRangeFilter from '@/components/common/DateRangeFilter';
import Pagination from '@/components/common/Pagination';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

interface CustomerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-';
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [pagination, setPagination] = useState<CustomerPagination | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Anda harus login terlebih dahulu');
        return;
      }

      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set('search', search.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/admin/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pelanggan');
      }

      const data = await response.json();
      setCustomers(data.customers || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pelanggan');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, startDate, endDate]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const headings = ['Pelanggan', 'Kontak', 'Pesanan', 'Total Belanja', 'Terakhir', ''];

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
          <p className="text-sm text-gray-500">
            {pagination ? `${pagination.total} pelanggan terdaftar` : 'Memuat…'}
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Muat Ulang
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, atau telepon"
            aria-label="Cari pelanggan"
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />

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

        {error && <div className="px-4 py-3 bg-red-50 text-red-700 text-sm border-b">{error}</div>}

        {loading ? (
          <div className="px-4 py-12 text-center text-gray-500">Memuat pelanggan...</div>
        ) : customers.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            {search ? 'Tidak ada pelanggan yang cocok' : 'Belum ada pelanggan'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headings.map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500">
                        {customer.isActive ? 'Aktif' : 'Nonaktif'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div>{customer.email}</div>
                      <div className="text-xs text-gray-500">{customer.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatIDR(customer.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(customer.lastOrderAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/customers/${customer.id}`}
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

        {pagination && (
          <div className="px-4 py-3 border-t">
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
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
