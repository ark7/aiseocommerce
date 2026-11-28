'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { formatRupiah } from '@/lib/licenseBilling';

interface BillingSummaryResponse {
  entityType: 'STORE' | 'ORDER';
  brandName: string;
  customerName: string;
  domain: string;
  orderCode: string | null;
  orderStatus: string | null;
  licensePlan: string;
  infraTier: 'SHARED' | 'DEDICATED';
  licensePriceAmount: number;
  monthlyFeeAmount: number;
  initialPaymentAmount: number;
  serviceStatus: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  subscriptionExpiresAt: string | null;
  licenseRedeemedAt: string | null;
  licenseRedemptionDeadlineAt: string | null;
  daysUntilLicenseDeadline: number | null;
  daysUntilSubscriptionExpiry: number | null;
  platformBank: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    note: string;
  };
  payments: Array<{
    id: string;
    paymentType: string;
    billingMonths: number;
    amount: number;
    status: string;
    transferSenderName: string | null;
    transferBank: string | null;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
}

export default function ClientBillingPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';

  const [data, setData] = useState<BillingSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment upload form state
  const [paymentType, setPaymentType] = useState<'INITIAL_ORDER' | 'MONTHLY_RENEWAL' | 'LICENSE_REDEMPTION'>('MONTHLY_RENEWAL');
  const [billingMonths, setBillingMonths] = useState(1);
  const [transferSenderName, setTransferSenderName] = useState('');
  const [transferBank, setTransferBank] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/billing/${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Portal billing tidak ditemukan');
      setData(json);
      if (json.entityType === 'ORDER') {
        setPaymentType('INITIAL_ORDER');
      } else if (json.serviceStatus === 'LICENSE_OVERDUE') {
        setPaymentType('LICENSE_REDEMPTION');
      } else {
        setPaymentType('MONTHLY_RENEWAL');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const computedAmount = (() => {
    if (!data) return 0;
    if (paymentType === 'INITIAL_ORDER') return data.initialPaymentAmount;
    if (paymentType === 'LICENSE_REDEMPTION') return data.licensePriceAmount;
    return data.monthlyFeeAmount * billingMonths;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setSubmitError('Pilih file bukti transfer (JPG/PNG/WebP/PDF) terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const form = new FormData();
      form.set('paymentType', paymentType);
      form.set('billingMonths', String(paymentType === 'MONTHLY_RENEWAL' ? billingMonths : 1));
      form.set('amount', String(computedAmount));
      form.set('transferSenderName', transferSenderName);
      form.set('transferBank', transferBank);
      form.set('clientNotes', clientNotes);
      form.set('proof', proofFile);

      const res = await fetch(`/api/billing/${encodeURIComponent(token)}`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengunggah bukti transfer');

      setSubmitSuccess(json.message || 'Bukti transfer berhasil dikirim.');
      setTransferSenderName('');
      setTransferBank('');
      setClientNotes('');
      setProofFile(null);
      loadBilling();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-600 text-sm">
        Memuat Portal Billing LarisDari.web.id...
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Portal Billing Tidak Ditemukan</h1>
          <p className="text-sm text-slate-600">{errorMsg || 'Tautan tidak valid atau sudah kedaluwarsa.'}</p>
        </div>
      </div>
    );
  }

  const isDeferred = data.licensePlan === 'DEFERRED_6M';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Summary */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Portal Tagihan &amp; Lisensi LarisDari.web.id
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{data.brandName}</h1>
              <p className="text-sm text-slate-300 mt-1">
                {data.domain ? `Domain: ${data.domain}` : 'Custom Domain sedang dalam persiapan'}
                {data.orderCode ? ` • Kode Order: ${data.orderCode}` : ''}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                data.isSuspended
                  ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
              }`}
            >
              {data.entityType === 'ORDER'
                ? `Order: ${data.orderStatus}`
                : data.isSuspended
                  ? data.serviceStatus
                  : 'LAYANAN AKTIF'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-800 text-sm">
            <div>
              <div className="text-xs text-slate-400">Skema &amp; Infrastruktur</div>
              <div className="font-semibold text-white mt-0.5">
                {data.licensePlan === 'OWNED' ? 'Lisensi Dimiliki (OWNED)' : 'Tanpa Lisensi Awal (Tebus ≤6 Bln)'} • {data.infraTier}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Biaya Operasional Bulanan</div>
              <div className="font-bold text-emerald-300 mt-0.5">{formatRupiah(data.monthlyFeeAmount)} / bulan</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Masa Aktif Layanan</div>
              <div className="font-semibold text-white mt-0.5">
                {data.subscriptionExpiresAt
                  ? new Date(data.subscriptionExpiresAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Menunggu Aktivasi Awal'}
              </div>
            </div>
          </div>
        </div>

        {/* Deferred 6-Month Alert Banner */}
        {isDeferred && data.licenseRedemptionDeadlineAt && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-amber-900">
                ⏳ Kewajiban Penebusan Lisensi Maksimal Bulan ke-6 ({formatRupiah(data.licensePriceAmount)})
              </div>
              <p className="text-xs text-amber-800">
                Batas akhir tebus lisensi:{' '}
                <strong>
                  {new Date(data.licenseRedemptionDeadlineAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
                {data.daysUntilLicenseDeadline !== null && (
                  <> ({data.daysUntilLicenseDeadline >= 0 ? `sisa ${data.daysUntilLicenseDeadline} hari` : 'sudah melewati tenggat'})</>
                )}
                . Setelah ditebus, biaya bulanan otomatis turun ke {data.infraTier === 'DEDICATED' ? 'Rp 350.000' : 'Rp 150.000'}/bln. Jika melewati bulan ke-6 belum ditebus, layanan otomatis dinonaktifkan.
              </p>
            </div>
          </div>
        )}

        {data.isSuspended && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-5 text-sm text-rose-900">
            <strong>Perhatian:</strong> {data.suspensionReason}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload Payment Form */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Unggah Bukti Pembayaran</h2>

            {submitSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm">
                ✅ {submitSuccess}
              </div>
            )}
            {submitError && (
              <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-xl text-sm">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Pembayaran</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900"
                >
                  {data.entityType === 'ORDER' && (
                    <option value="INITIAL_ORDER">
                      Pembayaran Awal Order ({formatRupiah(data.initialPaymentAmount)})
                    </option>
                  )}
                  <option value="MONTHLY_RENEWAL">
                    Perpanjangan Operasional Bulanan ({formatRupiah(data.monthlyFeeAmount)}/bln)
                  </option>
                  {isDeferred && (
                    <option value="LICENSE_REDEMPTION">
                      Tebus Lisensi Penuh 1 Website ({formatRupiah(data.licensePriceAmount)})
                    </option>
                  )}
                </select>
              </div>

              {paymentType === 'MONTHLY_RENEWAL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi Perpanjangan</label>
                  <select
                    value={billingMonths}
                    onChange={(e) => setBillingMonths(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900"
                  >
                    <option value={1}>1 Bulan — {formatRupiah(data.monthlyFeeAmount)}</option>
                    <option value={3}>3 Bulan — {formatRupiah(data.monthlyFeeAmount * 3)}</option>
                    <option value={6}>6 Bulan — {formatRupiah(data.monthlyFeeAmount * 6)}</option>
                  </select>
                </div>
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900">Total Transfer Diharapkan:</span>
                <span className="text-lg font-extrabold text-indigo-700">{formatRupiah(computedAmount)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pengirim *</label>
                  <input
                    required
                    type="text"
                    value={transferSenderName}
                    onChange={(e) => setTransferSenderName(e.target.value)}
                    placeholder="Nama sesuai rekening"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank / E-Wallet</label>
                  <input
                    type="text"
                    value={transferBank}
                    onChange={(e) => setTransferBank(e.target.value)}
                    placeholder="Misal: BCA / Mandiri / QRIS"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Bukti Transfer (JPG, PNG, WebP, atau PDF maks. 5MB) *
                </label>
                <input
                  required
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
                <textarea
                  rows={2}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Info tambahan untuk admin..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm transition"
              >
                {submitting ? 'Mengunggah Bukti...' : 'Kirim Bukti Pembayaran'}
              </button>
            </form>
          </div>

          {/* Bank Details & History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-2">
              <h3 className="text-base font-bold text-slate-900">Rekening Tujuan Resmi</h3>
              <div className="text-sm space-y-1 text-slate-700">
                <div>Bank: <strong>{data.platformBank.bankName}</strong></div>
                <div>No. Rekening: <strong className="font-mono text-indigo-700">{data.platformBank.accountNumber}</strong></div>
                <div>Atas Nama: <strong>{data.platformBank.accountHolder}</strong></div>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                {data.platformBank.note}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-3">Riwayat Pembayaran</h3>
              {data.payments.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada riwayat unggahan bukti pembayaran.</p>
              ) : (
                <div className="space-y-3">
                  {data.payments.map((p) => (
                    <div key={p.id} className="border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-slate-900">{formatRupiah(p.amount)}</strong>
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status === 'APPROVED'
                            ? 'Disetujui'
                            : p.status === 'REJECTED'
                              ? 'Ditolak'
                              : 'Menunggu Review'}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        {p.paymentType === 'LICENSE_REDEMPTION'
                          ? 'Tebus Lisensi'
                          : p.paymentType === 'INITIAL_ORDER'
                            ? 'Order Awal'
                            : `Perpanjangan ${p.billingMonths} Bln`} • {new Date(p.createdAt).toLocaleDateString('id-ID')}
                      </div>
                      {p.rejectionReason && (
                        <div className="text-rose-700">Alasan: {p.rejectionReason}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
