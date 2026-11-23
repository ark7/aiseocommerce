'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  calculateOrderPricing,
  formatInvoiceRupiah,
  parseCustomFeesConfig,
  type CustomFeeConfigItem,
  type CustomFeeType,
} from '@/lib/invoicePricing';

interface TaxAndInvoiceSettingsPanelProps {
  onSaved?: () => void;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function TaxAndInvoiceSettingsPanel({
  onSaved,
  onNotice,
  onError,
}: TaxAndInvoiceSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxLabel, setTaxLabel] = useState('PPN');
  const [taxRate, setTaxRate] = useState<string>('11');
  const [taxApplyOnCheckout, setTaxApplyOnCheckout] = useState(true);
  const [invoiceShowTax, setInvoiceShowTax] = useState(true);
  const [invoiceShowCustomFees, setInvoiceShowCustomFees] = useState(true);
  const [customFeesConfig, setCustomFeesConfig] = useState<CustomFeeConfigItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setLocalError(null);
      const res = await fetch('/api/admin/settings/general', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memuat pengaturan PPN & Invoice');
      }
      const data = await res.json();
      const s = data.settings || {};
      setTaxEnabled(Boolean(s.taxEnabled));
      setTaxLabel(s.taxLabel || 'PPN');
      setTaxRate(s.taxRate !== undefined && s.taxRate !== null ? String(s.taxRate) : '0');
      setTaxApplyOnCheckout(s.taxApplyOnCheckout ?? true);
      setInvoiceShowTax(s.invoiceShowTax ?? true);
      setInvoiceShowCustomFees(s.invoiceShowCustomFees ?? true);
      setCustomFeesConfig(parseCustomFeesConfig(s.customFeesConfig));
      setInvoiceNotes(s.invoiceNotes || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat pengaturan PPN & Invoice';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, onError]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleAddFee = () => {
    setCustomFeesConfig((prev) => [
      ...prev,
      {
        id: `fee-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: '',
        type: 'FIXED',
        amount: 0,
        enabled: true,
        showOnInvoice: true,
      },
    ]);
  };

  const handleUpdateFee = (
    id: string,
    patch: Partial<CustomFeeConfigItem>
  ) => {
    setCustomFeesConfig((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveFee = (id: string) => {
    setCustomFeesConfig((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setLocalError(null);
    setLocalNotice(null);

    try {
      const parsedRate = Number(taxRate);
      if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
        throw new Error('Tarif PPN harus di antara 0% sampai 100%.');
      }

      const cleanedFees = customFeesConfig
        .map((fee, idx) => ({
          id: fee.id || `fee-${idx + 1}`,
          name: fee.name.trim(),
          type: fee.type,
          amount: Math.max(0, Number(fee.amount) || 0),
          enabled: fee.enabled,
          showOnInvoice: fee.showOnInvoice,
        }))
        .filter((fee) => fee.name.length > 0);

      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taxEnabled,
          taxLabel: taxLabel.trim() || 'PPN',
          taxRate: parsedRate,
          taxApplyOnCheckout,
          invoiceShowTax,
          invoiceShowCustomFees,
          customFeesConfig: cleanedFees,
          invoiceNotes: invoiceNotes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan PPN & Biaya Tambahan.');
      }

      setCustomFeesConfig(cleanedFees);
      const msg = 'Pengaturan PPN, biaya tambahan kustom, dan opsi tampilan invoice berhasil disimpan!';
      setLocalNotice(msg);
      onNotice?.(msg);
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  const previewPricing = calculateOrderPricing({
    subtotal: 500000,
    discount: 0,
    shippingCost: 20000,
    taxEnabled,
    taxLabel,
    taxRate: Number(taxRate) || 0,
    customFees: customFeesConfig.filter((f) => f.enabled && f.name.trim().length > 0),
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-8 text-center text-sm text-gray-500">
        Memuat konfigurasi PPN &amp; Biaya Tambahan Kustom...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {localNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <span>✅ {localNotice}</span>
          <button
            type="button"
            onClick={() => setLocalNotice(null)}
            className="text-xs font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {localError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800 text-red-700 dark:text-rose-200 text-sm flex items-center justify-between">
          <span>⚠️ {localError}</span>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="text-xs font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* 1. PPN Configuration */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>🏛️</span>
                  <span>Pengaturan Pajak Pertambahan Nilai (PPN)</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  PPN dihitung dari Dasar Pengenaan Pajak (Subtotal Produk dikurangi Diskon Voucher).
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shrink-0">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  Aktifkan PPN
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Label Pajak di Checkout &amp; Invoice
                </label>
                <input
                  type="text"
                  value={taxLabel}
                  onChange={(e) => setTaxLabel(e.target.value)}
                  placeholder="Contoh: PPN 11%"
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Tarif Persentase PPN (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="11"
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxApplyOnCheckout}
                  onChange={(e) => setTaxApplyOnCheckout(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                  <strong className="block text-gray-900 dark:text-white">Terapkan Otomatis saat Checkout</strong>
                  Pembeli langsung melihat &amp; membayar PPN saat membuat pesanan di keranjang.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoiceShowTax}
                  onChange={(e) => setInvoiceShowTax(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                  <strong className="block text-gray-900 dark:text-white">Tampilkan Baris PPN pada Invoice</strong>
                  Menampilkan baris rincian PPN pada tampilan faktur cetak &amp; email SMTP.
                </span>
              </label>
            </div>
          </div>

          {/* 2. Custom Additional Fees */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>➕</span>
                  <span>Biaya Tambahan Kustom</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Tambahkan biaya seperti Packing Kayu, Biaya Penanganan, Layanan Aplikasi, atau Asuransi.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddFee}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100 transition shrink-0"
              >
                + Tambah Biaya Kustom
              </button>
            </div>

            {customFeesConfig.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
                Belum ada biaya tambahan kustom. Klik <strong>&quot;+ Tambah Biaya Kustom&quot;</strong> bila toko memerlukan biaya tambahan di luar harga produk &amp; ongkir.
              </div>
            ) : (
              <div className="space-y-3">
                {customFeesConfig.map((fee) => (
                  <div
                    key={fee.id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1">
                          Nama Biaya
                        </label>
                        <input
                          type="text"
                          value={fee.name}
                          onChange={(e) => handleUpdateFee(fee.id, { name: e.target.value })}
                          placeholder="Contoh: Packing Kayu / Admin"
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1">
                          Tipe Hitung
                        </label>
                        <select
                          value={fee.type}
                          onChange={(e) =>
                            handleUpdateFee(fee.id, { type: e.target.value as CustomFeeType })
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                          <option value="FIXED">Nominal (Rp)</option>
                          <option value="PERCENT">Persen Subtotal (%)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1">
                          {fee.type === 'PERCENT' ? 'Persentase (%)' : 'Nominal (Rp)'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={fee.type === 'PERCENT' ? '0.1' : '100'}
                          value={fee.amount}
                          onChange={(e) =>
                            handleUpdateFee(fee.id, { amount: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveFee(fee.id)}
                          title="Hapus biaya"
                          className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-gray-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={fee.enabled}
                          onChange={(e) => handleUpdateFee(fee.id, { enabled: e.target.checked })}
                          className="rounded text-indigo-600"
                        />
                        <span>Aktif pada pesanan</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-gray-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={fee.showOnInvoice}
                          onChange={(e) => handleUpdateFee(fee.id, { showOnInvoice: e.target.checked })}
                          className="rounded text-indigo-600"
                        />
                        <span>Tampilkan item ini pada Invoice</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={invoiceShowCustomFees}
                  onChange={(e) => setInvoiceShowCustomFees(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Tampilkan Rincian Biaya Tambahan Kustom di Invoice (Master Toggle)</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Catatan Kaki Invoice / NPWP / Info Transfer Resmi (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Contoh: NPWP 01.234.567.8-901.000 • Mohon cantumkan nomor order saat melakukan transfer."
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50 transition"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan PPN, Biaya & Invoice'}
            </button>
          </div>
        </div>

        {/* 3. Live Invoice Preview Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-5 h-fit space-y-4">
          <div className="border-b border-gray-100 dark:border-slate-800 pb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Simulasi Pratinjau Invoice
            </span>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              Contoh Pesanan Rp 500.000
            </h4>
          </div>

          <div className="space-y-2 text-xs text-gray-700 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Subtotal Produk</span>
              <span className="font-semibold">{formatInvoiceRupiah(500000)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ongkos Kirim (Contoh)</span>
              <span className="font-semibold">{formatInvoiceRupiah(20000)}</span>
            </div>

            {previewPricing.taxAmount > 0 && (
              <div className="flex justify-between items-center">
                <span>
                  {previewPricing.taxLabel} ({previewPricing.taxRate}%)
                  {!invoiceShowTax && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                      Disembunyikan di Invoice
                    </span>
                  )}
                </span>
                <span className="font-semibold">{formatInvoiceRupiah(previewPricing.taxAmount)}</span>
              </div>
            )}

            {previewPricing.customFees.map((fee) => (
              <div key={fee.id} className="flex justify-between items-center">
                <span>
                  {fee.name}
                  {fee.type === 'PERCENT' ? ` (${fee.rateOrAmount}%)` : ''}
                  {(!invoiceShowCustomFees || !fee.showOnInvoice) && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                      Tersembunyi di Invoice
                    </span>
                  )}
                </span>
                <span className="font-semibold">{formatInvoiceRupiah(fee.computedAmount)}</span>
              </div>
            ))}

            <div className="pt-3 border-t border-gray-200 dark:border-slate-700 flex justify-between text-sm font-bold text-gray-900 dark:text-white">
              <span>Total Tagihan</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {formatInvoiceRupiah(previewPricing.totalAmount)}
              </span>
            </div>
          </div>

          {invoiceNotes.trim() && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-600 dark:text-slate-300 whitespace-pre-line">
              {invoiceNotes}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
