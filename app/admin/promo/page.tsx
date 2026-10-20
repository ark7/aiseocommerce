'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'FIXED' | 'PERCENT';
  value: number;
  maxDiscount: number | null;
  minPurchase: number | null;
  startsAt: string | null;
  endsAt: string | null;
  quota: number | null;
  claimed: number;
  used: number;
  isActive: boolean;
  totalSales?: number;
  totalDiscount?: number;
  orderCount?: number;
  stats?: {
    claimedCount: number;
    usedCount: number;
    totalOrders: number;
    totalSales: number;
    totalDiscount: number;
  };
}

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  type: 'PERCENT' as 'FIXED' | 'PERCENT',
  value: '',
  maxDiscount: '',
  minPurchase: '',
  startsAt: '',
  endsAt: '',
  quota: '',
  isActive: true,
};

/** `<input type="datetime-local">` hanya menerima `YYYY-MM-DDTHH:mm` waktu lokal. */
function toDateTimeInput(value: string | null): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part: number) => String(part).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Blank means "no limit", not zero. Sending 0 for an empty quota would make
 * the voucher unclaimable the moment it is saved.
 */
function toNumberOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

function toDateOrNull(value: string): string | null {
  return value.trim() === '' ? null : new Date(value).toISOString();
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function describeValue(voucher: Voucher): string {
  if (voucher.type === 'FIXED') return formatIDR(voucher.value);

  return voucher.maxDiscount
    ? `${voucher.value}% (maks ${formatIDR(voucher.maxDiscount)})`
    : `${voucher.value}%`;
}

export default function AdminPromoPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const headers = authHeaders();
      const response = await fetch('/api/admin/vouchers', { headers });

      if (response.status === 401) {
        setError('Sesi telah berakhir atau Anda belum login.');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat voucher');
      setVouchers(data.vouchers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat voucher');
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;

    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (voucher: Voucher) => {
    setEditingId(voucher.id);
    setNotice(null);
    setError(null);
    setForm({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description ?? '',
      type: voucher.type,
      value: String(voucher.value),
      maxDiscount: voucher.maxDiscount == null ? '' : String(voucher.maxDiscount),
      minPurchase: voucher.minPurchase == null ? '' : String(voucher.minPurchase),
      startsAt: toDateTimeInput(voucher.startsAt),
      endsAt: toDateTimeInput(voucher.endsAt),
      quota: voucher.quota == null ? '' : String(voucher.quota),
      isActive: voucher.isActive,
    });
  };

  const payloadFrom = (form: typeof EMPTY_FORM) => ({
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    type: form.type,
    value: Number(form.value),
    maxDiscount: toNumberOrNull(form.maxDiscount),
    minPurchase: toNumberOrNull(form.minPurchase),
    startsAt: toDateOrNull(form.startsAt),
    endsAt: toDateOrNull(form.endsAt),
    quota: toNumberOrNull(form.quota),
    isActive: form.isActive,
  });

  /** Zod answers with a field map; the first message is the actionable one. */
  const firstFieldError = (details: unknown): string | undefined => {
    if (!details || typeof details !== 'object') return undefined;

    return Object.values(details as Record<string, { _errors?: string[] }>)
      .flatMap((field) => field?._errors ?? [])
      .at(0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      const response = await fetch(
        editingId ? `/api/admin/vouchers/${editingId}` : '/api/admin/vouchers',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(payloadFrom(form)),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(firstFieldError(data.details) || data.error || 'Gagal menyimpan voucher');
      }

      setNotice(editingId ? 'Voucher diperbarui.' : 'Voucher dibuat.');
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan voucher');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (voucher: Voucher) => {
    setError(null);
    try {
      const headers = authHeaders();
      const response = await fetch(`/api/admin/vouchers/${voucher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          code: voucher.code,
          name: voucher.name,
          description: voucher.description,
          type: voucher.type,
          value: voucher.value,
          maxDiscount: voucher.maxDiscount,
          minPurchase: voucher.minPurchase,
          startsAt: voucher.startsAt,
          endsAt: voucher.endsAt,
          quota: voucher.quota,
          isActive: !voucher.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal mengubah status');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status');
    }
  };

  const remove = async (voucher: Voucher) => {
    setError(null);
    setNotice(null);
    try {
      const headers = authHeaders();
      const response = await fetch(`/api/admin/vouchers/${voucher.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menghapus voucher');
      }

      if (editingId === voucher.id) resetForm();
      setNotice('Voucher dihapus.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus voucher');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Promo &amp; Voucher</h1>
        <p className="text-gray-500 mt-1">
          Kelola voucher diskon toko, kuota klaim, dan pantau performa omset belanjaan yang dihasilkan.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          {(error.includes('login') || error.includes('Sesi') || error.includes('Unauthorized') || error.includes('Admin access') || error.includes('Forbidden')) && (
            <Link
              href="/login?from=/admin/promo"
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Login Ulang
            </Link>
          )}
        </div>
      )}
      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm shadow-xs">
          {notice}
        </div>
      )}

      {/* Analytics Summary Cards for Evaluation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Voucher</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{vouchers.length}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {vouchers.filter((v) => v.isActive).length} Aktif
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Diklaim</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-600">
              {vouchers.reduce((sum, v) => sum + (v.claimed || 0), 0)}
            </span>
            <span className="text-xs text-gray-500">pengguna</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Terpakai</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">
              {vouchers.reduce((sum, v) => sum + (v.used || 0), 0)}
            </span>
            <span className="text-xs text-gray-500">transaksi</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Omset dari Voucher</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">
              {formatIDR(vouchers.reduce((sum, v) => sum + (v.totalSales || 0), 0))}
            </span>
            <span className="text-xs text-gray-400">GMV</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {editingId ? 'Ubah Voucher' : 'Voucher Baru'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="code">
              Kode *
            </label>
            <input
              id="code"
              name="code"
              value={form.code}
              onChange={handleChange}
              required
              placeholder="HEMAT10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
              Nama *
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Diskon 10% semua produk"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
            Keterangan
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="type">
              Jenis *
            </label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="PERCENT">Persen (%)</option>
              <option value="FIXED">Nominal (Rp)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="value">
              {form.type === 'PERCENT' ? 'Besar Diskon (%) *' : 'Potongan (Rp) *'}
            </label>
            <input
              id="value"
              name="value"
              type="number"
              min="1"
              value={form.value}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxDiscount">
              Batas Potongan (Rp)
            </label>
            <input
              id="maxDiscount"
              name="maxDiscount"
              type="number"
              min="0"
              value={form.maxDiscount}
              onChange={handleChange}
              placeholder="Tanpa batas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="mt-1 text-xs text-gray-500">Dipakai untuk jenis persen.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="minPurchase">
              Min. Belanja (Rp)
            </label>
            <input
              id="minPurchase"
              name="minPurchase"
              type="number"
              min="0"
              value={form.minPurchase}
              onChange={handleChange}
              placeholder="Tanpa minimum"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startsAt">
              Mulai Berlaku
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              value={form.startsAt}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="endsAt">
              Berakhir Pada
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              value={form.endsAt}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="quota">
              Kuota Klaim
            </label>
            <input
              id="quota"
              name="quota"
              type="number"
              min="1"
              value={form.quota}
              onChange={handleChange}
              placeholder="Tanpa batas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
          Aktif dan bisa diklaim
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Voucher'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      <section className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Voucher &amp; Evaluasi Performa</h2>
          <span className="text-xs text-gray-500 font-medium">
            {vouchers.length} voucher terdaftar
          </span>
        </div>

        {isLoading ? (
          <p className="px-6 py-8 text-gray-500 text-center">Memuat data promo &amp; voucher...</p>
        ) : vouchers.length === 0 ? (
          <p className="px-6 py-8 text-gray-500 text-center">Belum ada voucher yang dibuat.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {vouchers.map((voucher) => (
              <li key={voucher.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                        {voucher.code}
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          voucher.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {voucher.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {describeValue(voucher)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mt-2">{voucher.name}</h3>
                    {voucher.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{voucher.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                      {voucher.minPurchase && (
                        <span>Min. Belanja: {formatIDR(voucher.minPurchase)}</span>
                      )}
                      {voucher.startsAt && (
                        <span>Mulai: {new Date(voucher.startsAt).toLocaleDateString('id-ID')}</span>
                      )}
                      {voucher.endsAt ? (
                        <span>Berakhir: {new Date(voucher.endsAt).toLocaleDateString('id-ID')}</span>
                      ) : (
                        <span>Masa Berlaku: Selamanya</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(voucher)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(voucher)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        voucher.isActive
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-green-700 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {voucher.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(voucher)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                {/* Metrics evaluation box */}
                <div className="bg-gray-50 rounded-xl p-3.5 grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200/70 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-0.5 font-medium">🎟️ Jumlah Klaim</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {voucher.claimed}
                    </span>
                    <span className="text-gray-400 text-[11px] ml-1">
                      {voucher.quota != null ? `/ ${voucher.quota} kuota` : '(tanpa batas)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block mb-0.5 font-medium">🛒 Pakai Diskon</span>
                    <span className="font-bold text-indigo-700 text-sm">
                      {voucher.used}
                    </span>
                    <span className="text-gray-400 text-[11px] ml-1">
                      transaksi {voucher.claimed > 0 ? `(${Math.round((voucher.used / voucher.claimed) * 100)}%)` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block mb-0.5 font-medium">💰 Total Belanjaan (Omset)</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {formatIDR(voucher.totalSales || 0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block mb-0.5 font-medium">🏷️ Total Potongan Diskon</span>
                    <span className="font-bold text-amber-700 text-sm">
                      {formatIDR(voucher.totalDiscount || 0)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
