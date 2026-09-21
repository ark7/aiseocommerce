'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { STATUS_LABELS } from '@/lib/orderStatus';
import type { OrderStatus } from '@prisma/client';

interface OrderHistoryRow {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  historyTruncated: boolean;
  orders: OrderHistoryRow[];
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  MANUAL_VERIFICATION: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-red-100 text-red-800',
};

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function statusLabel(status: string) {
  return STATUS_LABELS[status as OrderStatus] || status;
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const customerId = (params?.id as string) || '';

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Anda harus login terlebih dahulu');
        return;
      }

      const response = await fetch(`/api/admin/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pelanggan');
      }

      const data = await response.json();
      setCustomer(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pelanggan');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) fetchCustomer();
  }, [customerId, fetchCustomer]);

  const headings = ['No. Pesanan', 'Tanggal', 'Total', 'Status'];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-gray-500">
        Memuat pelanggan...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Pelanggan tidak ditemukan'}
        </div>
        <Link
          href="/admin/customers"
          className="inline-block mt-4 text-indigo-600 hover:text-indigo-900"
        >
          &larr; Kembali ke daftar pelanggan
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/customers" className="text-sm text-indigo-600 hover:text-indigo-900">
        &larr; Kembali ke daftar pelanggan
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500">
            Pelanggan sejak {new Date(customer.createdAt).toLocaleDateString('id-ID')}
          </p>
        </div>
        <span
          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
            customer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {customer.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Pesanan</h2>

          {customer.orders.length === 0 ? (
            <p className="text-sm text-gray-500">Pelanggan ini belum pernah memesan.</p>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {headings.map((heading) => (
                      <th
                        key={heading}
                        className="py-2 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customer.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 text-sm">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 text-sm text-gray-900">
                        {formatIDR(order.totalAmount)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {customer.historyTruncated && (
                <p className="mt-3 text-xs text-gray-500">
                  Menampilkan 100 pesanan terbaru; total di samping mencakup seluruh riwayat.
                </p>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Total pesanan</dt>
                <dd className="text-gray-900">{customer.orderCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total belanja</dt>
                <dd className="text-gray-900">{formatIDR(customer.totalSpent)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900">Kontak</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-gray-900">{customer.email}</p>
              <p className="text-gray-500">{customer.phone || 'Telepon belum diisi'}</p>
              <p className="text-xs text-gray-500 pt-2 border-t">
                {customer.emailVerified ? 'Email terverifikasi' : 'Email belum terverifikasi'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
