'use client';

import { useState, useEffect, useCallback } from 'react';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

const LEDGER_TYPES = ['INCOME', 'EXPENSE', 'PETTY_CASH', 'CAPITAL', 'LOAN', 'REFUND'] as const;
type LedgerType = (typeof LEDGER_TYPES)[number];

const TYPE_LABEL: Record<LedgerType, string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  PETTY_CASH: 'Kas Kecil',
  CAPITAL: 'Modal',
  LOAN: 'Pinjaman',
  REFUND: 'Refund',
};

const PERIOD_LABEL: Record<string, string> = {
  day: 'Hari ini',
  week: 'Minggu ini',
  month: 'Bulan ini',
  year: 'Tahun ini',
};

interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  description: string;
  category: string | null;
  createdAt: string;
  runningBalance: number;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  pettyCashBalance: number;
  profitLoss: number;
  totalCapital: number;
  totalLoans: number;
}

const EMPTY_SUMMARY: Summary = {
  totalIncome: 0,
  totalExpense: 0,
  pettyCashBalance: 0,
  profitLoss: 0,
  totalCapital: 0,
  totalLoans: 0,
};

const EMPTY_FORM = { type: 'INCOME' as LedgerType, amount: '', description: '', category: '' };

export default function FinancePage() {
  const [period, setPeriod] = useState('month');
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [todaySales, setTodaySales] = useState({ count: 0, amount: 0 });
  const [alerts, setAlerts] = useState({ lowStockProducts: 0, pendingPayments: 0 });

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const loadSummary = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return;

    try {
      const response = await fetch(`/api/admin/finance/summary?period=${period}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat ringkasan');

      setSummary(data.summary ?? EMPTY_SUMMARY);
      setTodaySales(data.todaySales ?? { count: 0, amount: 0 });
      setAlerts(data.alerts ?? { lowStockProducts: 0, pendingPayments: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan');
    }
  }, [period, authHeaders]);

  const loadEntries = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (typeFilter) params.append('type', typeFilter);
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/finance/ledger?${params}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat buku besar');

      setEntries(data.entries ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat buku besar');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search, authHeaders]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  /** Both halves move together: a new entry changes the totals as well as the list. */
  const reload = async () => {
    await Promise.all([loadSummary(), loadEntries()]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const headers = authHeaders();
    if (!headers) {
      setError('Anda harus login terlebih dahulu');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/admin/finance/ledger', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan transaksi');

      setNotice('Transaksi dicatat.');
      setForm(EMPTY_FORM);
      setPage(1);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: LedgerEntry) => {
    if (!confirm(`Hapus transaksi "${entry.description}"?`)) return;

    const headers = authHeaders();
    if (!headers) return;

    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/admin/finance/ledger', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus transaksi');

      setNotice('Transaksi dihapus.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus transaksi');
    }
  };

  const cards: Array<{ label: string; value: number; tone?: 'good' | 'bad' }> = [
    { label: 'Pemasukan', value: summary.totalIncome, tone: 'good' },
    { label: 'Pengeluaran', value: summary.totalExpense, tone: 'bad' },
    { label: 'Laba / Rugi', value: summary.profitLoss, tone: summary.profitLoss >= 0 ? 'good' : 'bad' },
    { label: 'Kas Kecil', value: summary.pettyCashBalance },
    { label: 'Modal', value: summary.totalCapital },
    { label: 'Pinjaman', value: summary.totalLoans },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keuangan</h1>
          <p className="text-gray-500 mt-1">Ringkasan dan buku besar toko Anda</p>
        </div>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="Periode"
        >
          {Object.entries(PERIOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {notice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{notice}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-4 rounded-lg shadow border">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p
              className={`text-xl font-bold mt-1 ${
                card.tone === 'good' ? 'text-green-600' : card.tone === 'bad' ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {IDR.format(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-500">Penjualan hari ini</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{IDR.format(todaySales.amount)}</p>
          <p className="text-xs text-gray-400">{todaySales.count} pesanan dibayar</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-500">Pembayaran menunggu</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{alerts.pendingPayments}</p>
          <p className="text-xs text-gray-400">perlu diverifikasi</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-500">Stok menipis</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{alerts.lowStockProducts}</p>
          <p className="text-xs text-gray-400">produk terbit dengan stok ≤ 5</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Catat Transaksi</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="type">
              Jenis *
            </label>
            <select
              id="type"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as LedgerType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {LEDGER_TYPES.map((type) => (
                <option key={type} value={type}>{TYPE_LABEL[type]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="amount">
              Jumlah (Rp) *
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">
              Kategori
            </label>
            <input
              id="category"
              type="text"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Operasional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              Keterangan *
            </label>
            <input
              id="description"
              type="text"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Beli kemasan"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Catat Transaksi'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Buku Besar</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Cari keterangan atau kategori..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Cari transaksi"
            />
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter jenis"
            >
              <option value="">Semua jenis</option>
              {LEDGER_TYPES.map((type) => (
                <option key={type} value={type}>{TYPE_LABEL[type]}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-500">Memuat buku besar...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Belum ada transaksi pada filter ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Jenis</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{TYPE_LABEL[entry.type] ?? entry.type}</td>
                    <td className="px-4 py-3 text-gray-900">{entry.description}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.category || '—'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${entry.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {IDR.format(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry)}
                        className="text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
