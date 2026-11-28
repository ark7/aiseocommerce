import crypto from 'crypto';

export const LICENSE_PRICE_IDR = 3_000_000;
export const LICENSE_REDEMPTION_DEADLINE_MONTHS = 6;

export type LicensePlan = 'OWNED' | 'DEFERRED_6M';
export type InfraTier = 'SHARED' | 'DEDICATED';
export type StoreLicenseStatus = 'OWNED' | 'DEFERRED_6M' | 'OVERDUE';
export type ServiceStatus = 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'LICENSE_OVERDUE';
export type LicenseOrderStatus =
  | 'NEW'
  | 'WAITING_PAYMENT'
  | 'PAYMENT_SUBMITTED'
  | 'PAID_READY_SETUP'
  | 'IN_SETUP'
  | 'LIVE'
  | 'CANCELLED';
export type SubscriptionPaymentType = 'INITIAL_ORDER' | 'MONTHLY_RENEWAL' | 'LICENSE_REDEMPTION';
export type SubscriptionPaymentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface PlanPricingBreakdown {
  licensePlan: LicensePlan;
  infraTier: InfraTier;
  licenseFeeAmount: number;
  monthlyFeeAmount: number;
  postRedemptionMonthlyFee: number;
  initialPaymentAmount: number;
  setupSupportFeeAmount: number;
  redemptionDeadlineMonths: number | null;
}

export const MONTHLY_PRICING_MATRIX: Record<LicensePlan, Record<InfraTier, number>> = {
  OWNED: {
    SHARED: 150_000,
    DEDICATED: 350_000,
  },
  DEFERRED_6M: {
    SHARED: 200_000,
    DEDICATED: 450_000,
  },
};

export function normalizeLicensePlan(value?: string | null): LicensePlan {
  const upper = String(value || '').trim().toUpperCase();
  return upper === 'DEFERRED_6M' ? 'DEFERRED_6M' : 'OWNED';
}

export function normalizeInfraTier(value?: string | null): InfraTier {
  const upper = String(value || '').trim().toUpperCase();
  return upper === 'DEDICATED' ? 'DEDICATED' : 'SHARED';
}

/**
 * Menghitung rincian biaya berdasarkan skema 2x2:
 * - OWNED + SHARED: Lisensi 3jt + 150rb/bln (Bayar awal 3.150.000)
 * - OWNED + DEDICATED: Lisensi 3jt + 350rb/bln (Bayar awal 3.350.000)
 * - DEFERRED_6M + SHARED: 200rb/bln (turun ke 150rb/bln setelah tebus 3jt maks bln ke-6)
 * - DEFERRED_6M + DEDICATED: 450rb/bln (turun ke 350rb/bln setelah tebus 3jt maks bln ke-6)
 */
export function calculatePlanPricing(
  licensePlanInput?: string | null,
  infraTierInput?: string | null
): PlanPricingBreakdown {
  const licensePlan = normalizeLicensePlan(licensePlanInput);
  const infraTier = normalizeInfraTier(infraTierInput);
  const monthlyFeeAmount = MONTHLY_PRICING_MATRIX[licensePlan][infraTier];
  const postRedemptionMonthlyFee = MONTHLY_PRICING_MATRIX.OWNED[infraTier];
  const initialPaymentAmount =
    licensePlan === 'OWNED' ? LICENSE_PRICE_IDR + monthlyFeeAmount : monthlyFeeAmount;

  return {
    licensePlan,
    infraTier,
    licenseFeeAmount: LICENSE_PRICE_IDR,
    monthlyFeeAmount,
    postRedemptionMonthlyFee,
    initialPaymentAmount,
    setupSupportFeeAmount: 0,
    redemptionDeadlineMonths: licensePlan === 'DEFERRED_6M' ? LICENSE_REDEMPTION_DEADLINE_MONTHS : null,
  };
}

export function generateLicenseOrderCode(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `LDW-${yyyy}${mm}${dd}-${rand}`;
}

export function generateBillingPortalToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function addMonthsSafe(baseDate: Date, months: number): Date {
  const d = new Date(baseDate.getTime());
  const targetDay = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Clamp month rollover (e.g., Jan 31 + 1 month -> Feb 28/29 instead of Mar 3)
  if (d.getUTCDate() < targetDay) {
    d.setUTCDate(0);
  }
  return d;
}

export function computeRenewalExtension(
  currentExpiresAt: Date | string | null | undefined,
  billingMonths: number,
  now: Date = new Date()
): { periodStartAt: Date; periodEndAt: Date } {
  const safeMonths = Math.max(1, Math.min(24, Math.floor(billingMonths || 1)));
  let existingExpiry: Date | null = null;
  if (currentExpiresAt instanceof Date) {
    existingExpiry = currentExpiresAt;
  } else if (typeof currentExpiresAt === 'string' && currentExpiresAt.trim()) {
    const parsed = new Date(currentExpiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      existingExpiry = parsed;
    }
  }

  const periodStartAt =
    existingExpiry && existingExpiry.getTime() > now.getTime() ? existingExpiry : now;
  const periodEndAt = addMonthsSafe(periodStartAt, safeMonths);

  return { periodStartAt, periodEndAt };
}

export interface StoreSuspensionInput {
  isDemo?: boolean | null;
  serviceStatus?: string | null;
  licenseStatus?: string | null;
  licenseRedemptionDeadlineAt?: Date | string | null;
  subscriptionExpiresAt?: Date | string | null;
  suspendedReason?: string | null;
}

export interface StoreSuspensionEvaluation {
  isSuspended: boolean;
  effectiveStatus: ServiceStatus;
  reason: string | null;
  daysUntilLicenseDeadline: number | null;
  daysUntilSubscriptionExpiry: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Mengevaluasi apakah website storefront harus dinonaktifkan sementara:
 * - Store demo (`isDemo === true`) selalu aman & tidak pernah terkunci.
 * - `SUSPENDED` atau `LICENSE_OVERDUE` mengunci storefront.
 * - Klien `DEFERRED_6M` yang melewati `licenseRedemptionDeadlineAt` otomatis dianggap `LICENSE_OVERDUE`.
 */
export function evaluateStoreSuspensionState(
  store: StoreSuspensionInput | null | undefined,
  now: Date = new Date()
): StoreSuspensionEvaluation {
  if (!store || store.isDemo) {
    return {
      isSuspended: false,
      effectiveStatus: 'ACTIVE',
      reason: null,
      daysUntilLicenseDeadline: null,
      daysUntilSubscriptionExpiry: null,
    };
  }

  const deadlineDate = toValidDate(store.licenseRedemptionDeadlineAt);
  const expiryDate = toValidDate(store.subscriptionExpiresAt);

  const daysUntilLicenseDeadline = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - now.getTime()) / MS_PER_DAY)
    : null;
  const daysUntilSubscriptionExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - now.getTime()) / MS_PER_DAY)
    : null;

  const rawService = String(store.serviceStatus || 'ACTIVE').toUpperCase();
  const rawLicense = String(store.licenseStatus || 'OWNED').toUpperCase();

  if (
    rawService === 'LICENSE_OVERDUE' ||
    rawLicense === 'OVERDUE' ||
    (rawLicense === 'DEFERRED_6M' && deadlineDate !== null && deadlineDate.getTime() < now.getTime())
  ) {
    return {
      isSuspended: true,
      effectiveStatus: 'LICENSE_OVERDUE',
      reason:
        store.suspendedReason ||
        'Batas waktu penebusan lisensi 6 bulan (Rp 3.000.000) telah terlewati. Silakan selesaikan pembayaran penebusan lisensi di Portal Billing untuk mengaktifkan kembali website.',
      daysUntilLicenseDeadline,
      daysUntilSubscriptionExpiry,
    };
  }

  if (rawService === 'SUSPENDED') {
    return {
      isSuspended: true,
      effectiveStatus: 'SUSPENDED',
      reason:
        store.suspendedReason ||
        'Layanan operasional bulanan sedang dinonaktifkan sementara oleh pengelola. Silakan unggah bukti pembayaran perpanjangan melalui Portal Billing.',
      daysUntilLicenseDeadline,
      daysUntilSubscriptionExpiry,
    };
  }

  const effectiveStatus: ServiceStatus = rawService === 'GRACE_PERIOD' ? 'GRACE_PERIOD' : 'ACTIVE';
  return {
    isSuspended: false,
    effectiveStatus,
    reason: null,
    daysUntilLicenseDeadline,
    daysUntilSubscriptionExpiry,
  };
}

export function formatRupiah(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return 'Rp ' + rounded.toLocaleString('id-ID');
}

export function getPlatformBankInfo(): {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  note: string;
} {
  return {
    bankName: process.env.PLATFORM_BANK_NAME || 'Bank BCA',
    accountNumber: process.env.PLATFORM_BANK_ACCOUNT || 'Hubungi Admin / Lihat Invoice Resmi',
    accountHolder: process.env.PLATFORM_BANK_HOLDER || 'LarisDari.web.id',
    note:
      process.env.PLATFORM_BANK_NOTE ||
      'Cantumkan Kode Pesanan / Nama Brand pada berita transfer lalu unggah bukti bayar di Portal Billing.',
  };
}

export function buildWhatsAppLiveMessage(params: {
  customerName: string;
  brandName: string;
  domain: string;
  adminEmail: string;
  initialPassword?: string;
  licensePlan: LicensePlan;
  infraTier: InfraTier;
  monthlyFeeAmount: number;
  billingUrl: string;
  licenseRedemptionDeadlineAt?: Date | string | null;
}): string {
  const deadline = toValidDate(params.licenseRedemptionDeadlineAt);
  const deadlineLine =
    params.licensePlan === 'DEFERRED_6M' && deadline
      ? `\n• Batas Tebus Lisensi (Rp 3.000.000): ${deadline.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}`
      : '';

  const pwdLine = params.initialPassword
    ? `\n• Password Awal Admin: ${params.initialPassword} (harap segera diganti setelah login)`
    : '';

  return [
    `Halo Kak ${params.customerName}, selamat! 🎉`,
    `Website komersial *${params.brandName}* resmi *LIVE* dan siap menerima pesanan:`,
    ``,
    `• URL Toko Online: https://${params.domain}`,
    `• Panel Admin Toko: https://${params.domain}/login`,
    `• Email Login Admin: ${params.adminEmail}${pwdLine}`,
    `• Skema: ${params.licensePlan === 'OWNED' ? 'Sudah Beli Lisensi' : 'Tanpa Lisensi Awal (Tebus <= 6 Bln)'} • ${params.infraTier} (${formatRupiah(params.monthlyFeeAmount)}/bln)${deadlineLine}`,
    `• Portal Billing & Upload Bukti Bayar: ${params.billingUrl}`,
    ``,
    `Terima kasih telah mempercayakan infrastruktur toko online Kakak bersama LarisDari.web.id!`,
  ].join('\n');
}

export function buildWhatsAppRenewalReminderMessage(params: {
  customerName: string;
  brandName: string;
  domain: string;
  monthlyFeeAmount: number;
  billingUrl: string;
  daysUntilLicenseDeadline?: number | null;
}): string {
  const redemptionNote =
    params.daysUntilLicenseDeadline !== null &&
    params.daysUntilLicenseDeadline !== undefined &&
    params.daysUntilLicenseDeadline <= 30
      ? `\n⚠️ Pengingat: Sisa waktu penebusan lisensi Rp 3.000.000 adalah *${Math.max(0, params.daysUntilLicenseDeadline)} hari* agar layanan tetap aktif setelah bulan ke-6.`
      : '';

  return [
    `Halo Kak ${params.customerName},`,
    `Mengingatkan perpanjangan operasional bulanan website *${params.brandName}* (${params.domain}) sebesar *${formatRupiah(params.monthlyFeeAmount)}/bulan*.${redemptionNote}`,
    ``,
    `Silakan unggah bukti pembayaran langsung melalui Portal Billing resmi Kakak:`,
    params.billingUrl,
    ``,
    `Terima kasih 🙏`,
  ].join('\n');
}
