'use client';

import { useState, useEffect, useCallback } from 'react';

interface FunnelRow {
  id: string;
  name: string;
  slug: string;
  views: number;
  addToCarts: number;
  checkoutStarts: number;
  orders: number;
}

const WINDOWS = [7, 30, 90];

/** A rate over an empty column is unknown, not zero percent. */
function rate(part: number, whole: number): string {
  if (whole === 0) return '—';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export default function AdminFunnelPage() {
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFunnel = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Anda harus login terlebih dahulu');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/funnel?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat funnel');

      setRows(data.products ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat funnel');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funnel Produk</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dilihat → keranjang → checkout → pesanan. Dihitung per kunjungan, bukan per unit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {WINDOWS.map((window) => (
            <button
              key={window}
              onClick={() => setDays(window)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                days === window ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {window} hari
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Belum ada data funnel pada rentang ini. Angka mulai terkumpul setelah pembeli membuka
            halaman produk.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dilihat</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">+Keranjang</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Checkout</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pesanan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Konversi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{row.views}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {row.addToCarts}
                    <span className="ml-2 text-xs text-gray-400">{rate(row.addToCarts, row.views)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{row.checkoutStarts}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{row.orders}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {rate(row.orders, row.views)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Kunjungan dihitung sekali per produk per sesi. Pembeli yang memblokir penyimpanan situs
        terhitung sebagai sesi terpisah, jadi angka ini bisa lebih tinggi dari jumlah orang.
      </p>
    </div>
  );
}
