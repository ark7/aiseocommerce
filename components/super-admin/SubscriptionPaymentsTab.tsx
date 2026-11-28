'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '@/lib/licenseBilling';

interface SubscriptionPaymentRecord {
  id: string;
  storeId: string | null;
  licenseOrderId: string | null;
  paymentType: 'INITIAL_ORDER' | 'MONTHLY_RENEWAL' | 'LICENSE_REDEMPTION';
  billingMonths: number;
  amount: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  proofRelativePath: string | null;
  proofMimeType: string | null;
  transferSenderName: string | null;
  transferBank: string | null;
  clientNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  store?: {
    id: string;
    name: string;
    domain: string;
    infraTier: string;
    licenseStatus: string;
    monthlyFeeAmount: number;
    serviceStatus: string;
    subscriptionExpiresAt: string | null;
  } | null;
  licenseOrder?: {
    id: string;
    orderCode: string;
    customerName: string;
    brandName: string;
    customDomain: string;
    licensePlan: string;
    infraTier: string;
  } | null;
}

interface SubscriptionPaymentsTabProps {
  token: string;
  onPendingCountChange?: (count: number) => void;
  onPaymentReviewed: () => void;
}

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  INITIAL_ORDER: 'Pembayaran Awal Order Lisensi',
  MONTHLY_RENEWAL: 'Perpanjangan Langganan Bulanan',
  LICENSE_REDEMPTION: 'Penebusan Lisensi (Rp 3.000.000)',
};

export default function SubscriptionPaymentsTab({
  token,
  onPendingCountChange,
  onPaymentReviewed,
}: SubscriptionPaymentsTabProps) {
  const [payments, setPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING_REVIEW');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<{ url: string; mime: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SubscriptionPaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/super-admin/subscription-payments?status=${statusFilter}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat bukti bayar');
      setPayments(data.payments || []);
      onPendingCountChange?.(Number(data.pendingCount || 0));
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, onPendingCountChange]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleOpenProof = async (payment: SubscriptionPaymentRecord) => {
    setErrorMsg(null);
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/super-admin/subscription-payments/${payment.id}/proof`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Gagal membuka berkas bukti transfer');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setPreviewUrl({ url: objUrl, mime: payment.proofMimeType || blob.type });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl.url);
    setPreviewUrl(null);
  };

  const handleApprove = async (payment: SubscriptionPaymentRecord) => {
    setProcessingId(payment.id);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/super-admin/subscription-payments/${payment.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyetujui pembayaran');

      if (payment.paymentType === 'LICENSE_REDEMPTION') {
        setFeedback('Penebusan lisensi disetujui! Status toko menjadi OWNED dan tarif bulanan otomatis turun.');
      } else if (payment.paymentType === 'MONTHLY_RENEWAL') {
        setFeedback(`Perpanjangan ${payment.billingMonths} bulan disetujui! Masa aktif diperpanjang & layanan aktif.`);
      } else {
        setFeedback('Pembayaran awal order disetujui! Status pesanan naik menjadi Siap Setup.');
      }
      loadPayments();
      onPaymentReviewed();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/super-admin/subscription-payments/${rejectTarget.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason: rejectReason.trim() || 'Bukti transfer belum valid atau nominal tidak sesuai.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menolak pembayaran');
      setRejectTarget(null);
      setRejectReason('');
      setFeedback('Bukti pembayaran ditolak dan catatan dikirim ke Portal Billing klien.');
      loadPayments();
      onPaymentReviewed();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                statusFilter === st
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {st === 'PENDING_REVIEW'
                ? 'Menunggu Review'
                : st === 'APPROVED'
                  ? 'Disetujui'
                  : st === 'REJECTED'
                    ? 'Ditolak'
                    : 'Semua'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={loadPayments}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
        >
          Refresh
        </button>
      </div>

      {feedback && (
        <div className="bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 px-4 py-2.5 rounded-lg text-sm">
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-700/60 text-rose-200 px-4 py-2.5 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Memuat bukti pembayaran...</div>
      ) : payments.length === 0 ? (
        <div className="py-12 text-center bg-slate-900/70 border border-slate-800 rounded-2xl text-slate-400 text-sm">
          Tidak ada bukti pembayaran pada filter ini.
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const label = PAYMENT_TYPE_LABEL[p.paymentType] || p.paymentType;
            const title = p.store?.name || p.licenseOrder?.brandName || 'Tanpa Nama Brand';
            const domain = p.store?.domain || p.licenseOrder?.customDomain || '-';

            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {label}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : p.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.licenseOrder?.orderCode && (
                      <span className="font-mono text-xs text-slate-400">{p.licenseOrder.orderCode}</span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white">
                    {title} <span className="text-xs font-mono font-normal text-slate-400">({domain})</span>
                  </h4>

                  <div className="text-xs text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Nominal: <strong className="text-emerald-400">{formatRupiah(p.amount)}</strong></span>
                    {p.paymentType === 'MONTHLY_RENEWAL' && <span>Durasi: <strong>{p.billingMonths} bulan</strong></span>}
                    <span>Pengirim: <strong>{p.transferSenderName || '-'}</strong> ({p.transferBank || '-'})</span>
                    <span>Diunggah: {new Date(p.createdAt).toLocaleString('id-ID')}</span>
                  </div>

                  {p.rejectionReason && (
                    <p className="text-xs text-rose-300">Alasan tolak: {p.rejectionReason}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {p.proofRelativePath && (
                    <button
                      type="button"
                      onClick={() => handleOpenProof(p)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium"
                    >
                      Lihat Bukti Transfer
                    </button>
                  )}

                  {p.status === 'PENDING_REVIEW' && (
                    <>
                      <button
                        type="button"
                        disabled={processingId === p.id}
                        onClick={() => handleApprove(p)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
                      >
                        {processingId === p.id ? 'Memproses...' : 'Approve Pembayaran'}
                      </button>
                      <button
                        type="button"
                        disabled={processingId === p.id}
                        onClick={() => {
                          setRejectTarget(p);
                          setRejectReason('');
                        }}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold"
                      >
                        Tolak
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={closePreview}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">Pratinjau Bukti Pembayaran</h4>
              <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            {previewUrl.mime.includes('pdf') ? (
              <iframe src={previewUrl.url} title="Bukti Transfer PDF" className="w-full h-[70vh] rounded-lg bg-white" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl.url} alt="Bukti transfer klien" className="max-h-[75vh] mx-auto rounded-lg object-contain" />
            )}
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h4 className="text-base font-bold text-white">Tolak Bukti Pembayaran</h4>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Masukkan alasan penolakan agar klien dapat mengunggah ulang bukti yang benar..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectTarget.id}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold"
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
