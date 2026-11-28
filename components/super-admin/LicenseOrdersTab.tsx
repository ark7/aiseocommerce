'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '@/lib/licenseBilling';

export interface LicenseOrderRecord {
  id: string;
  orderCode: string;
  source: string;
  customerName: string;
  whatsapp: string;
  email: string | null;
  brandName: string;
  customDomain: string;
  businessCategory: string | null;
  notes: string | null;
  licensePlan: 'OWNED' | 'DEFERRED_6M';
  infraTier: 'SHARED' | 'DEDICATED';
  licenseFeeAmount: number;
  monthlyFeeAmount: number;
  initialPaymentAmount: number;
  status: string;
  portalToken: string;
  storeId: string | null;
  liveNotifiedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  store?: {
    id: string;
    name: string;
    domain: string;
    serviceStatus: string;
    licenseStatus: string;
  } | null;
}

interface LicenseOrdersTabProps {
  token: string;
  onPrefillDuplicate: (order: LicenseOrderRecord) => void;
  onProvisioned: () => void;
}

const ORDER_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  NEW: { label: 'Baru Masuk', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  WAITING_PAYMENT: { label: 'Menunggu Bayar', badgeClass: 'bg-slate-700 text-slate-200 border-slate-600' },
  PAYMENT_SUBMITTED: { label: 'Bukti Bayar Masuk', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  PAID_READY_SETUP: { label: 'Siap Setup', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  IN_SETUP: { label: 'Sedang Setup', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  LIVE: { label: 'Website Live', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  CANCELLED: { label: 'Dibatalkan', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
};

export default function LicenseOrdersTab({
  token,
  onPrefillDuplicate,
  onProvisioned,
}: LicenseOrdersTabProps) {
  const [orders, setOrders] = useState<LicenseOrderRecord[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    newCount: 0,
    paymentSubmittedCount: 0,
    setupQueueCount: 0,
    liveCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual order modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualForm, setManualForm] = useState({
    customerName: '',
    whatsapp: '',
    email: '',
    brandName: '',
    customDomain: '',
    licensePlan: 'OWNED' as 'OWNED' | 'DEFERRED_6M',
    infraTier: 'SHARED' as 'SHARED' | 'DEDICATED',
    notes: '',
  });

  // Provision result modal state
  const [provisionResult, setProvisionResult] = useState<{
    domain: string;
    billingUrl: string;
    liveWhatsAppMessage: string;
    adminEmail: string;
    initialPassword: string;
  } | null>(null);
  const [provisioningId, setProvisioningId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      if (planFilter !== 'ALL') qs.set('licensePlan', planFilter);
      if (search.trim()) qs.set('search', search.trim());

      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/super-admin/license-orders?${qs.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat order');
      setOrders(data.orders || []);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, planFilter, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/super-admin/license-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal update status');
      setFeedback(`Status order berhasil diperbarui ke ${ORDER_STATUS_META[nextStatus]?.label || nextStatus}.`);
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleNotifyLive = async (order: LicenseOrderRecord) => {
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/super-admin/license-orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ markLiveNotified: true, sendLiveEmail: Boolean(order.email) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencatat notifikasi live');
      setFeedback(
        data.emailResult?.sent
          ? `Info Web Live berhasil dikirim via email ke ${order.email} & ditandai terkirim.`
          : `Status order ${order.orderCode} ditandai sudah diinfokan Live ke pelanggan.`
      );
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleQuickProvision = async (order: LicenseOrderRecord) => {
    setProvisioningId(order.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/super-admin/license-orders/${order.id}/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal melakukan setup toko otomatis');

      setProvisionResult({
        domain: data.store?.domain || order.customDomain,
        billingUrl: data.billingUrl,
        liveWhatsAppMessage: data.liveWhatsAppMessage,
        adminEmail: data.result?.adminUser?.email || '',
        initialPassword: data.result?.adminUser?.initialPassword || '',
      });
      loadOrders();
      onProvisioned();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setProvisioningId(null);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/super-admin/license-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(manualForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat order manual');
      setShowCreateModal(false);
      setManualForm({
        customerName: '',
        whatsapp: '',
        email: '',
        brandName: '',
        customDomain: '',
        licensePlan: 'OWNED',
        infraTier: 'SHARED',
        notes: '',
      });
      setFeedback(`Order ${data.order?.orderCode} berhasil dibuat.`);
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    setFeedback(`${label} berhasil disalin ke clipboard.`);
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Total Pesanan</div>
          <div className="text-2xl font-bold text-white mt-1">{summary.total}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Baru / Tunggu Bayar</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{summary.newCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Bukti Bayar Masuk</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{summary.paymentSubmittedCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Antrean Setup</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">{summary.setupQueueCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-400">Sudah Live</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.liveCount}</div>
        </div>
      </div>

      {/* Filters & Action Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode order, brand, nama, domain, WA..."
            className="flex-1 min-w-[220px] px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
          >
            <option value="ALL">Semua Status</option>
            {Object.entries(ORDER_STATUS_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
          >
            <option value="ALL">Semua Skema</option>
            <option value="OWNED">Beli Lisensi Awal (OWNED)</option>
            <option value="DEFERRED_6M">Tanpa Lisensi Awal (DEFERRED 6M)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadOrders}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
          >
            + Buat Order Manual
          </button>
        </div>
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

      {/* Orders List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Memuat daftar pesanan lisensi...</div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center bg-slate-900/70 border border-slate-800 rounded-2xl text-slate-400 text-sm">
          Belum ada pesanan lisensi yang cocok dengan filter.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const meta = ORDER_STATUS_META[order.status] || {
              label: order.status,
              badgeClass: 'bg-slate-700 text-slate-200 border-slate-600',
            };
            const portalUrl =
              typeof window !== 'undefined'
                ? `${window.location.origin}/billing/${order.portalToken}`
                : `/billing/${order.portalToken}`;

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {order.orderCode}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {order.licensePlan === 'OWNED' ? 'Beli Lisensi Awal' : 'Tanpa Lisensi (Tebus ≤6 Bln)'} • {order.infraTier}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(order.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">
                      {order.brandName}{' '}
                      <span className="text-sm font-normal text-slate-400">
                        — {order.customerName} ({order.whatsapp})
                      </span>
                    </h3>

                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Custom Domain:{' '}
                        <strong className="text-slate-200 font-mono">
                          {order.customDomain || '(belum diisi)'}
                        </strong>
                      </span>
                      <span>
                        Tagihan Awal:{' '}
                        <strong className="text-emerald-400">
                          {formatRupiah(order.initialPaymentAmount)}
                        </strong>
                      </span>
                      <span>
                        Bulanan: <strong className="text-slate-200">{formatRupiah(order.monthlyFeeAmount)}/bln</strong>
                      </span>
                      {order.email && <span>Email: {order.email}</span>}
                    </div>
                    {order.notes && (
                      <p className="text-xs text-slate-400 italic">Catatan klien: {order.notes}</p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Ubah status ${order.orderCode}`}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      {Object.entries(ORDER_STATUS_META).map(([key, m]) => (
                        <option key={key} value={key}>{m.label}</option>
                      ))}
                    </select>

                    {!order.storeId && order.status !== 'CANCELLED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickProvision(order)}
                          disabled={provisioningId === order.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
                        >
                          {provisioningId === order.id ? 'Menyiapkan...' : '1-Klik Setup & Live'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrefillDuplicate(order)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold"
                        >
                          Prefill Wizard 7-Grup
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => copyText(portalUrl, 'Link Portal Billing')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium"
                    >
                      Salin Link Billing
                    </button>

                    {order.store && (
                      <button
                        type="button"
                        onClick={() => handleNotifyLive(order)}
                        className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold"
                      >
                        {order.liveNotifiedAt ? 'Kirim Ulang Info Live' : 'Tandai/Kirim Info Live'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Buat Pesanan Lisensi Manual</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateManual} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Nama Lengkap *"
                  value={manualForm.customerName}
                  onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
                <input
                  required
                  placeholder="WhatsApp Aktif *"
                  value={manualForm.whatsapp}
                  onChange={(e) => setManualForm({ ...manualForm, whatsapp: e.target.value })}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Nama Brand / Toko *"
                  value={manualForm.brandName}
                  onChange={(e) => setManualForm({ ...manualForm, brandName: e.target.value })}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
                <input
                  placeholder="Custom Domain (contoh: toko.com)"
                  value={manualForm.customDomain}
                  onChange={(e) => setManualForm({ ...manualForm, customDomain: e.target.value })}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <input
                type="email"
                placeholder="Email Klien (opsional)"
                value={manualForm.email}
                onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={manualForm.licensePlan}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, licensePlan: e.target.value as 'OWNED' | 'DEFERRED_6M' })
                  }
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                >
                  <option value="OWNED">Beli Lisensi Awal (Rp 3 Jt)</option>
                  <option value="DEFERRED_6M">Tanpa Lisensi (Tebus ≤ 6 Bln)</option>
                </select>
                <select
                  value={manualForm.infraTier}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, infraTier: e.target.value as 'SHARED' | 'DEDICATED' })
                  }
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                >
                  <option value="SHARED">Shared Infrastructure</option>
                  <option value="DEDICATED">Dedicated Infrastructure</option>
                </select>
              </div>
              <textarea
                rows={2}
                placeholder="Catatan setup / permintaan khusus..."
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
                >
                  {creating ? 'Menyimpan...' : 'Simpan Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Success Modal */}
      {provisionResult && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-700/60 rounded-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-emerald-400">Website Pelanggan Resmi Live!</h3>
              <button
                type="button"
                onClick={() => setProvisionResult(null)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-1 bg-slate-800/80 p-3 rounded-xl">
              <div>Domain: <strong className="text-white">{provisionResult.domain}</strong></div>
              <div>Email Admin: <strong className="text-white">{provisionResult.adminEmail}</strong></div>
              <div>Password Awal: <strong className="text-amber-300 font-mono">{provisionResult.initialPassword}</strong></div>
              <div>Portal Billing: <strong className="text-indigo-300 break-all">{provisionResult.billingUrl}</strong></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Template Pesan WhatsApp Go-Live untuk Dikirim ke Klien:
              </label>
              <textarea
                readOnly
                rows={7}
                value={provisionResult.liveWhatsAppMessage}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => copyText(provisionResult.liveWhatsAppMessage, 'Pesan Go-Live WA')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
              >
                Salin Pesan WA
              </button>
              <button
                type="button"
                onClick={() => setProvisionResult(null)}
                className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
