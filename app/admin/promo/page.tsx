'use client';

import { useCallback, useEffect, useState } from 'react';

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

  const authHeaders = useCallback((): Record<string, string> | null => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const load = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) {
      setError('Anda harus login terlebih dahulu');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/admin/vouchers', { headers });
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

    const headers = authHeaders();
    if (!headers) {
      setError('Anda harus login terlebih dahulu');
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
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
    const headers = authHeaders();
    if (!headers) return;

    setError(null);
    try {
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
    const headers = authHeaders();
    if (!headers) return;

    setError(null);
    setNotice(null);
    try {
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
          Voucher yang bisa diklaim pelanggan di halaman Penawaran. Kuota dan masa berlaku
          ditegakkan otomatis.
        </p>
      </header>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {notice && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{notice}</div>
      )}

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

      <section className="bg-white rounded-lg shadow border overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b">Daftar Voucher</h2>

        {isLoading ? (
          <p className="px-6 py-8 text-gray-500">Memuat...</p>
        ) : vouchers.length === 0 ? (
          <p className="px-6 py-8 text-gray-500">Belum ada voucher.</p>
        ) : (
          <ul className="divide-y">
            {vouchers.map((voucher) => (
              <li key={voucher.id} className="px-6 py-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-gray-900">{voucher.code}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        voucher.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {voucher.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{voucher.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {describeValue(voucher)} · diklaim {voucher.claimed}
                    {voucher.quota != null ? `/${voucher.quota}` : ''} · terpakai {voucher.used}
                    {voucher.endsAt
                      ? ` · berakhir ${new Date(voucher.endsAt).toLocaleString('id-ID')}`
                      : ''}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(voucher)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(voucher)}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    {voucher.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(voucher)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
