'use client';

import React, { useState } from 'react';
import { calculatePlanPricing, formatRupiah } from '@/lib/licenseBilling';

export interface TenantSubscriptionEditable {
  id: string;
  name: string;
  domain: string;
  isDemo?: boolean;
  infraTier?: string;
  licenseStatus?: string;
  monthlyFeeAmount?: number;
  serviceStatus?: string;
  subscriptionExpiresAt?: string | null;
  licenseRedemptionDeadlineAt?: string | null;
  suspendedReason?: string | null;
}

interface TenantSubscriptionModalProps {
  tenant: TenantSubscriptionEditable;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function TenantSubscriptionModal({
  tenant,
  token,
  onClose,
  onSaved,
}: TenantSubscriptionModalProps) {
  const [serviceStatus, setServiceStatus] = useState(tenant.serviceStatus || 'ACTIVE');
  const [infraTier, setInfraTier] = useState<'SHARED' | 'DEDICATED'>(
    tenant.infraTier === 'DEDICATED' ? 'DEDICATED' : 'SHARED'
  );
  const [licenseStatus, setLicenseStatus] = useState<'OWNED' | 'DEFERRED_6M' | 'OVERDUE'>(
    tenant.licenseStatus === 'DEFERRED_6M'
      ? 'DEFERRED_6M'
      : tenant.licenseStatus === 'OVERDUE'
        ? 'OVERDUE'
        : 'OWNED'
  );
  const [monthlyFeeAmount, setMonthlyFeeAmount] = useState<number>(
    Number(tenant.monthlyFeeAmount ?? 150000)
  );
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState(
    toDateInputValue(tenant.subscriptionExpiresAt)
  );
  const [licenseRedemptionDeadlineAt, setLicenseRedemptionDeadlineAt] = useState(
    toDateInputValue(tenant.licenseRedemptionDeadlineAt)
  );
  const [suspendedReason, setSuspendedReason] = useState(tenant.suspendedReason || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const syncMatrixRate = (nextLic: 'OWNED' | 'DEFERRED_6M' | 'OVERDUE', nextTier: 'SHARED' | 'DEDICATED') => {
    const plan = nextLic === 'OWNED' ? 'OWNED' : 'DEFERRED_6M';
    setMonthlyFeeAmount(calculatePlanPricing(plan, nextTier).monthlyFeeAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/subscription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serviceStatus,
          infraTier,
          licenseStatus,
          monthlyFeeAmount,
          subscriptionExpiresAt: subscriptionExpiresAt ? `${subscriptionExpiresAt}T23:59:59.000Z` : null,
          licenseRedemptionDeadlineAt: licenseRedemptionDeadlineAt
            ? `${licenseRedemptionDeadlineAt}T23:59:59.000Z`
            : null,
          suspendedReason: suspendedReason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan langganan');
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Kelola Layanan &amp; Langganan</h3>
            <p className="text-xs text-slate-400">
              {tenant.name} (<span className="font-mono">{tenant.domain}</span>)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-700/60 text-rose-200 px-3 py-2 rounded-lg text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Status Layanan Toko
            </label>
            <select
              value={serviceStatus}
              onChange={(e) => setServiceStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            >
              <option value="ACTIVE">ACTIVE (Website Online Normal)</option>
              <option value="GRACE_PERIOD">GRACE_PERIOD (Masa Tenggang)</option>
              <option value="SUSPENDED">SUSPENDED (Layanan Nonaktif - Tunggakan Bulanan)</option>
              <option value="LICENSE_OVERDUE">LICENSE_OVERDUE (Nonaktif - Lewat Batas Tebus 6 Bln)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Skema Lisensi
              </label>
              <select
                value={licenseStatus}
                onChange={(e) => {
                  const val = e.target.value as 'OWNED' | 'DEFERRED_6M' | 'OVERDUE';
                  setLicenseStatus(val);
                  syncMatrixRate(val, infraTier);
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                <option value="OWNED">OWNED (Sudah Tebus / Beli Awal)</option>
                <option value="DEFERRED_6M">DEFERRED_6M (Wajib Tebus ≤ 6 Bln)</option>
                <option value="OVERDUE">OVERDUE (Lewat 6 Bulan)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tier Infrastruktur
              </label>
              <select
                value={infraTier}
                onChange={(e) => {
                  const val = e.target.value as 'SHARED' | 'DEDICATED';
                  setInfraTier(val);
                  syncMatrixRate(licenseStatus, val);
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                <option value="SHARED">SHARED</option>
                <option value="DEDICATED">DEDICATED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tarif Operasional Bulanan (IDR) — saat ini {formatRupiah(monthlyFeeAmount)}
            </label>
            <input
              type="number"
              min={0}
              step={10000}
              value={monthlyFeeAmount}
              onChange={(e) => setMonthlyFeeAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Masa Aktif Sampai Tanggal
              </label>
              <input
                type="date"
                value={subscriptionExpiresAt}
                onChange={(e) => setSubscriptionExpiresAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deadline Tebus Lisensi (6 Bln)
              </label>
              <input
                type="date"
                value={licenseRedemptionDeadlineAt}
                onChange={(e) => setLicenseRedemptionDeadlineAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
          </div>

          {(serviceStatus === 'SUSPENDED' || serviceStatus === 'LICENSE_OVERDUE') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alasan / Pesan yang Ditampilkan ke Pemilik Toko
              </label>
              <textarea
                rows={2}
                value={suspendedReason}
                onChange={(e) => setSuspendedReason(e.target.value)}
                placeholder="Misal: Tagihan operasional bulan berjalan belum diterima..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
