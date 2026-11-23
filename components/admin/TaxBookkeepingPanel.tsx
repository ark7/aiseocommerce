'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, type OrderStatus } from '@/lib/orderStatus';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

interface TaxSummary {
  taxableOrderCount: number;
  totalDpp: number;
  totalTaxCollected: number;
  totalTaxPaid: number;
  taxPayable: number;
  taxOverpaid: number;
  totalCustomFees: number;
  totalShippingCollected: number;
}

interface TaxOrderRow {
  id: string;
  orderNumber: string;
  invoiceRevision: number;
  createdAt: string;
  customerName: string | null;
  status: string;
  dpp: number;
  taxLabel: string;
  taxRate: number;
  taxAmount: number;
  customFeesAmount: number;
  shippingCost: number;
  totalAmount: number;
}

interface TaxPaymentRow {
  id: string;
  amount: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
}

interface TaxBookkeepingPanelProps {
  onTaxPaymentRecorded?: () => Promise<void> | void;
}

const TAX_PERIODS = [
  { value: 'month', label: 'Bulan Ini' },
  { value: 'last_month', label: 'Bulan Lalu' },
  { value: 'quarter', label: 'Kuartal Ini' },
  { value: 'year', label: 'Tahun Ini' },
  { value: 'custom', label: 'Rentang Tanggal Kustom' },
];

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Displays periodic PPN Keluaran (VAT output), DPP, already remitted VAT,
 * remaining payable VAT, CSV export, and PPN remittance recording in Finance.
 */
export default function TaxBookkeepingPanel({ onTaxPaymentRecorded }: TaxBookkeepingPanelProps) {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [periodRange, setPeriodRange] = useState<{ start: string; end: string } | null>(null);
  const [summary, setSummary] = useState<TaxSummary>({
    taxableOrderCount: 0,
    totalDpp: 0,
    totalTaxCollected: 0,
    totalTaxPaid: 0,
    taxPayable: 0,
    taxOverpaid: 0,
    totalCustomFees: 0,
    totalShippingCollected: 0,
  });
  const [taxOrders, setTaxOrders] = useState<TaxOrderRow[]>([]);
  const [taxPayments, setTaxPayments] = useState<TaxPaymentRow[]>([]);

  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payPeriodLabel, setPayPeriodLabel] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [savingPay, setSavingPay] = useState(false);

  const authHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const loadTaxReport = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return;

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }

      const res = await fetch(`/api/admin/finance/tax-report?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat pembukuan PPN');
      }

      setPeriodRange(data.period ? { start: data.period.start, end: data.period.end } : null);
      setSummary(data.summary);
      setTaxOrders(data.taxOrders || []);
      setTaxPayments(data.taxPayments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pembukuan PPN');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, authHeaders]);

  useEffect(() => {
    if (period === 'custom' && !startDate && !endDate) return;
    loadTaxReport();
  }, [period, startDate, endDate, loadTaxReport]);

  const openPayForm = () => {
    const now = new Date();
    const defaultLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    setPayAmount(String(summary.taxPayable > 0 ? summary.taxPayable : ''));
    setPayPeriodLabel(defaultLabel);
    setPayReference('');
    setPayNotes('');
    setShowPayForm((prev) => !prev);
  };

  const handleRecordTaxPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = authHeaders();
    if (!headers) return;

    setSavingPay(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/finance/tax-report', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          taxPeriodLabel: payPeriodLabel.trim(),
          referenceNumber: payReference.trim() || undefined,
          notes: payNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mencatat setoran PPN');
      }

      setNotice('Setoran PPN berhasil dicatat di Buku Besar dan kewajiban PPN diperbarui.');
      setShowPayForm(false);
      await loadTaxReport();
      await onTaxPaymentRecorded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat setoran PPN');
    } finally {
      setSavingPay(false);
    }
  };

  const handleExportCsv = () => {
    const headerCols = [
      'No Invoice',
      'Revisi',
      'Tanggal',
      'Pelanggan',
      'Status',
      'DPP (Rp)',
      'Label Pajak',
      'Tarif (%)',
      'Nominal PPN (Rp)',
      'Biaya Kustom (Rp)',
      'Ongkir (Rp)',
      'Total Tagihan (Rp)',
    ];

    const rows = taxOrders.map((row) =>
      [
        `INV-${row.orderNumber}`,
        `Rev #${row.invoiceRevision}`,
        new Date(row.createdAt).toLocaleString('id-ID'),
        row.customerName || 'Pelanggan',
        STATUS_LABELS[row.status as OrderStatus] || row.status,
        row.dpp,
        row.taxLabel,
        row.taxRate,
        row.taxAmount,
        row.customFeesAmount,
        row.shippingCost,
        row.totalAmount,
      ]
        .map(escapeCsvCell)
        .join(',')
    );

    const footerLines = [
      '',
      ['RINGKASAN MASA PAJAK', '', '', '', '', summary.totalDpp, '', '', summary.totalTaxCollected, summary.totalCustomFees, summary.totalShippingCollected, '']
        .map(escapeCsvCell)
        .join(','),
      ['PPN SUDAH DISETOR', '', '', '', '', '', '', '', summary.totalTaxPaid].map(escapeCsvCell).join(','),
      ['SISA PPN HARUS DIBAYARKAN', '', '', '', '', '', '', '', summary.taxPayable].map(escapeCsvCell).join(','),
    ];

    const csvContent = '\uFEFF' + [headerCols.join(','), ...rows, ...footerLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-ppn-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🏛️ Pembukuan &amp; Kewajiban PPN Periodik</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Rekap otomatis DPP, PPN Keluaran yang dipungut dari transaksi sah, setoran pajak, serta sisa PPN yang harus disetor per masa pajak.
            {periodRange && (
              <span className="ml-1 font-medium text-gray-700">
                ({new Date(periodRange.start).toLocaleDateString('id-ID')} –{' '}
                {new Date(periodRange.end).toLocaleDateString('id-ID')})
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Periode Masa Pajak PPN"
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
          >
            {TAX_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Tanggal mulai masa pajak"
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
              />
              <span className="text-xs text-gray-400">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="Tanggal akhir masa pajak"
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <button
            type="button"
            onClick={openPayForm}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            💳 Catat Setoran PPN
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={taxOrders.length === 0}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            📥 Export CSV PPN
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          ✅ {notice}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* 4 Key Tax Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70">
          <p className="text-xs text-gray-500">Total DPP Kena PPN</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{IDR.format(summary.totalDpp)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{summary.taxableOrderCount} faktur kena PPN</p>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70">
          <p className="text-xs text-gray-500">PPN Keluaran (Dipungut)</p>
          <p className="text-lg font-bold text-indigo-700 mt-1">
            {IDR.format(summary.totalTaxCollected)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Akumulasi PPN transaksi sah</p>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70">
          <p className="text-xs text-gray-500">PPN Sudah Disetor</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">
            {IDR.format(summary.totalTaxPaid)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{taxPayments.length} bukti setor periode ini</p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            summary.taxPayable > 0
              ? 'border-amber-300 bg-amber-50/80'
              : 'border-emerald-200 bg-emerald-50/70'
          }`}
        >
          <p className="text-xs font-semibold text-gray-700">PPN Harus Dibayarkan</p>
          <p
            className={`text-xl font-extrabold mt-1 ${
              summary.taxPayable > 0 ? 'text-amber-800' : 'text-emerald-700'
            }`}
          >
            {IDR.format(summary.taxPayable)}
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {summary.taxPayable > 0
              ? 'Kurang bayar untuk masa pajak ini'
              : summary.taxOverpaid > 0
                ? `Lebih bayar ${IDR.format(summary.taxOverpaid)}`
                : 'Lunas / Tidak ada kurang bayar'}
          </p>
        </div>
      </div>

      {/* Quick Record Setoran PPN Form */}
      {showPayForm && (
        <form
          onSubmit={handleRecordTaxPayment}
          className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3"
        >
          <h3 className="text-sm font-bold text-gray-900">Catat Setoran PPN ke Kas Negara</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Nominal Disetor (Rp)
              </label>
              <input
                type="number"
                min={1}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Masa Pajak
              </label>
              <input
                type="text"
                required
                value={payPeriodLabel}
                onChange={(e) => setPayPeriodLabel(e.target.value)}
                placeholder="Contoh: November 2026"
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                No. NTPN / Referensi BPN (Opsional)
              </label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Contoh: NTPN-839201..."
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Via Bank Mandiri / e-Billing"
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPayForm(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingPay}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingPay ? 'Menyimpan...' : 'Simpan Setoran PPN'}
            </button>
          </div>
        </form>
      )}

      {/* Breakdown info */}
      <div className="text-xs text-gray-600 flex flex-wrap gap-x-6 gap-y-1 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200">
        <span>
          Biaya Tambahan Kustom terkumpul (periode ini):{' '}
          <strong className="text-gray-900">{IDR.format(summary.totalCustomFees)}</strong>
        </span>
        <span>
          Ongkos Kirim terkumpul (periode ini):{' '}
          <strong className="text-gray-900">{IDR.format(summary.totalShippingCollected)}</strong>
        </span>
      </div>

      {/* Invoices with PPN table */}
      {loading ? (
        <p className="text-xs text-gray-500 py-4 text-center">Memuat data faktur PPN...</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[11px]">
              <tr>
                <th className="px-3.5 py-2.5 text-left font-bold">No. Invoice</th>
                <th className="px-3.5 py-2.5 text-left font-bold">Tanggal</th>
                <th className="px-3.5 py-2.5 text-left font-bold">Pelanggan</th>
                <th className="px-3.5 py-2.5 text-left font-bold">Status</th>
                <th className="px-3.5 py-2.5 text-right font-bold">DPP</th>
                <th className="px-3.5 py-2.5 text-right font-bold">PPN</th>
                <th className="px-3.5 py-2.5 text-right font-bold">Total Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {taxOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    Belum ada transaksi ber-PPN yang lunas pada periode ini.
                  </td>
                </tr>
              ) : (
                taxOrders.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 font-mono font-semibold text-indigo-700">
                      <Link href={`/admin/orders/${row.id}`} className="hover:underline">
                        INV-{row.orderNumber}
                      </Link>
                      {row.invoiceRevision > 1 && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Rev#{row.invoiceRevision}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-600 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-800">{row.customerName || 'Pelanggan'}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                        {STATUS_LABELS[row.status as OrderStatus] || row.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-gray-700">{IDR.format(row.dpp)}</td>
                    <td className="px-3.5 py-2.5 text-right font-semibold text-indigo-700">
                      {IDR.format(row.taxAmount)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-semibold text-gray-900">
                      {IDR.format(row.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Recorded Tax Payments list */}
      {taxPayments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Riwayat Setoran PPN Periode Ini
          </h3>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
            {taxPayments.map((pay) => (
              <div
                key={pay.id}
                className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <p className="font-semibold text-gray-800">{pay.description}</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(pay.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
                <span className="font-bold text-emerald-700 shrink-0">
                  {IDR.format(pay.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
