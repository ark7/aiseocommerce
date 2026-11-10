'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Anda harus login terlebih dahulu');
          return;
        }

        // Fetch dashboard stats
        const statsResponse = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (statsResponse.status === 401) {
          localStorage.removeItem('token');
          setError('Sesi login telah berakhir, silakan login kembali.');
          setLoading(false);
          return;
        }

        if (statsResponse.ok) {
          const data = await statsResponse.json();
          if (data.stats) {
            setStats(data.stats);
          }
        }

        // Fetch recent orders
        const ordersResponse = await fetch('/api/orders?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (ordersResponse.ok) {
          const data = await ordersResponse.json();
          setRecentOrders(data.orders || []);
        }

        setLoading(false);
      } catch (err) {
        setError('Gagal memuat data dashboard. Silakan refresh halaman.');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Selamat datang di panel admin AI SEO E-Commerce</p>
        </div>
        <Link
          href="/admin/products/add"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Tambah Produk</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Produk */}
        <Link
          href="/admin/products"
          className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 hover:shadow-md hover:border-indigo-400 transition-all duration-200 group block relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                <svg className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{stats.products}</div>
                <div className="text-sm text-gray-500">Total Produk</div>
              </div>
            </div>
            <div className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Total Pesanan */}
        <Link
          href="/admin/orders"
          className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 hover:shadow-md hover:border-green-400 transition-all duration-200 group block relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <svg className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.orders}</div>
                <div className="text-sm text-gray-500">Total Pesanan</div>
              </div>
            </div>
            <div className="text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Total Pelanggan */}
        <Link
          href="/admin/customers"
          className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 hover:shadow-md hover:border-blue-400 transition-all duration-200 group block relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.customers}</div>
                <div className="text-sm text-gray-500">Total Pelanggan</div>
              </div>
            </div>
            <div className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Pendapatan */}
        <Link
          href="/admin/finance"
          className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 hover:shadow-md hover:border-purple-400 transition-all duration-200 group block relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                <svg className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                  Rp {stats.revenue.toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-gray-500">Pendapatan</div>
              </div>
            </div>
            <div className="text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Pesanan Tertunda */}
        <Link
          href="/admin/orders?status=PENDING"
          className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 hover:shadow-md hover:border-amber-400 transition-all duration-200 group block relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                <svg className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{stats.pendingOrders}</div>
                <div className="text-sm text-gray-500 flex items-center gap-1.5">
                  <span>Pesanan Tertunda</span>
                  {stats.pendingOrders > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-gray-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link
            href="/admin/products/add"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">Tambah Produk</span>
          </Link>
          
          <Link
            href="/admin/products"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">Daftar Produk</span>
          </Link>
          
          <Link
            href="/admin/orders"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">Kelola Pesanan</span>
          </Link>
          
          <Link
            href="/admin/categories"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">Kelola Kategori</span>
          </Link>

          <Link
            href="/admin/cms"
            className="flex flex-col items-center p-4 bg-indigo-50/60 rounded-lg hover:bg-indigo-100/70 border border-indigo-100 transition-colors"
          >
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-2 text-white">
              <span className="text-xl">📝</span>
            </div>
            <span className="text-sm font-bold text-indigo-900 text-center">CMS & Konten</span>
          </Link>

          <Link
            href="/admin/articles"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-xl">📰</span>
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">Tulis Artikel</span>
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pesanan Terbaru</h2>
          <Link href="/admin/orders" className="text-indigo-600 text-sm hover:underline">
            Lihat semua pesanan
          </Link>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p>Belum ada pesanan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pesanan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        title="Lihat detail pesanan"
                      >
                        #{order.orderNumber || order.id.substring(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {order.customerName || (order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : null) || 'Pelanggan'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      Rp {(order.totalAmount ?? order.total ?? 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/admin/orders/${order.id}`}>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${
                          order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-xs hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
