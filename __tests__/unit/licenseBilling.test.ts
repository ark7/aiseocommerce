import {
  LICENSE_PRICE_IDR,
  calculatePlanPricing,
  generateLicenseOrderCode,
  addMonthsSafe,
  computeRenewalExtension,
  evaluateStoreSuspensionState,
  buildWhatsAppLiveMessage,
} from '@/lib/licenseBilling';

describe('licenseBilling 2x2 Matrix & Lifecycle Logic', () => {
  it('computes exact 2x2 pricing matrix for OWNED and DEFERRED_6M across SHARED and DEDICATED', () => {
    const ownedShared = calculatePlanPricing('OWNED', 'SHARED');
    expect(ownedShared.licenseFeeAmount).toBe(3_000_000);
    expect(ownedShared.monthlyFeeAmount).toBe(150_000);
    expect(ownedShared.initialPaymentAmount).toBe(3_150_000);
    expect(ownedShared.redemptionDeadlineMonths).toBeNull();

    const ownedDedicated = calculatePlanPricing('OWNED', 'DEDICATED');
    expect(ownedDedicated.licenseFeeAmount).toBe(3_000_000);
    expect(ownedDedicated.monthlyFeeAmount).toBe(350_000);
    expect(ownedDedicated.initialPaymentAmount).toBe(3_350_000);
    expect(ownedDedicated.redemptionDeadlineMonths).toBeNull();

    const deferredShared = calculatePlanPricing('DEFERRED_6M', 'SHARED');
    expect(deferredShared.licenseFeeAmount).toBe(3_000_000);
    expect(deferredShared.monthlyFeeAmount).toBe(200_000);
    expect(deferredShared.postRedemptionMonthlyFee).toBe(150_000);
    expect(deferredShared.initialPaymentAmount).toBe(200_000);
    expect(deferredShared.redemptionDeadlineMonths).toBe(6);

    const deferredDedicated = calculatePlanPricing('DEFERRED_6M', 'DEDICATED');
    expect(deferredDedicated.licenseFeeAmount).toBe(3_000_000);
    expect(deferredDedicated.monthlyFeeAmount).toBe(450_000);
    expect(deferredDedicated.postRedemptionMonthlyFee).toBe(350_000);
    expect(deferredDedicated.initialPaymentAmount).toBe(450_000);
    expect(deferredDedicated.redemptionDeadlineMonths).toBe(6);
    expect(LICENSE_PRICE_IDR).toBe(3_000_000);
  });

  it('generates formatted LDW order codes and clamps month rollover safely', () => {
    const code = generateLicenseOrderCode(new Date('2026-11-28T05:00:00.000Z'));
    expect(code).toMatch(/^LDW-20261128-[A-F0-9]{4}$/);

    // Jan 31 + 1 month should clamp to Feb 28 (non-leap year)
    const jan31 = new Date('2026-01-31T00:00:00.000Z');
    const nextMonth = addMonthsSafe(jan31, 1);
    expect(nextMonth.getUTCMonth()).toBe(1);
    expect(nextMonth.getUTCDate()).toBe(28);
  });

  it('extends subscription from active future expiry or from now when already expired', () => {
    const now = new Date('2026-11-28T00:00:00.000Z');
    const futureExpiry = new Date('2026-12-15T00:00:00.000Z');
    const extended = computeRenewalExtension(futureExpiry, 3, now);
    expect(extended.periodStartAt.toISOString()).toBe('2026-12-15T00:00:00.000Z');
    expect(extended.periodEndAt.getUTCFullYear()).toBe(2027);
    expect(extended.periodEndAt.getUTCMonth()).toBe(2); // March

    const pastExpiry = new Date('2026-10-01T00:00:00.000Z');
    const renewedFromNow = computeRenewalExtension(pastExpiry, 1, now);
    expect(renewedFromNow.periodStartAt.toISOString()).toBe('2026-11-28T00:00:00.000Z');
    expect(renewedFromNow.periodEndAt.getUTCMonth()).toBe(11); // December
  });

  it('evaluates suspension gates accurately and never suspends demo stores', () => {
    const now = new Date('2026-11-28T00:00:00.000Z');

    // Demo store is never suspended
    const demoEval = evaluateStoreSuspensionState(
      { isDemo: true, serviceStatus: 'SUSPENDED', licenseStatus: 'OVERDUE' },
      now
    );
    expect(demoEval.isSuspended).toBe(false);
    expect(demoEval.effectiveStatus).toBe('ACTIVE');

    // Explicit SUSPENDED
    const manualSuspended = evaluateStoreSuspensionState(
      { isDemo: false, serviceStatus: 'SUSPENDED', suspendedReason: 'Menunggu pembayaran bulan Des' },
      now
    );
    expect(manualSuspended.isSuspended).toBe(true);
    expect(manualSuspended.effectiveStatus).toBe('SUSPENDED');
    expect(manualSuspended.reason).toContain('Menunggu pembayaran');

    // Auto LICENSE_OVERDUE when DEFERRED_6M passes 6-month deadline
    const overdueEval = evaluateStoreSuspensionState(
      {
        isDemo: false,
        serviceStatus: 'ACTIVE',
        licenseStatus: 'DEFERRED_6M',
        licenseRedemptionDeadlineAt: new Date('2026-11-20T00:00:00.000Z'),
      },
      now
    );
    expect(overdueEval.isSuspended).toBe(true);
    expect(overdueEval.effectiveStatus).toBe('LICENSE_OVERDUE');
    expect(overdueEval.daysUntilLicenseDeadline).toBeLessThan(0);

    // Active DEFERRED_6M before deadline
    const activeDeferred = evaluateStoreSuspensionState(
      {
        isDemo: false,
        serviceStatus: 'ACTIVE',
        licenseStatus: 'DEFERRED_6M',
        licenseRedemptionDeadlineAt: new Date('2027-05-01T00:00:00.000Z'),
      },
      now
    );
    expect(activeDeferred.isSuspended).toBe(false);
    expect(activeDeferred.effectiveStatus).toBe('ACTIVE');
    expect(activeDeferred.daysUntilLicenseDeadline).toBeGreaterThan(100);
  });

  it('builds clear WhatsApp Go-Live handover messages', () => {
    const msg = buildWhatsAppLiveMessage({
      customerName: 'Budi',
      brandName: 'Batik Jaya',
      domain: 'batikjaya.id',
      adminEmail: 'admin@batikjaya.id',
      initialPassword: 'Secret#123',
      licensePlan: 'DEFERRED_6M',
      infraTier: 'SHARED',
      monthlyFeeAmount: 200_000,
      billingUrl: 'https://demo.larisdari.web.id/billing/tok123',
      licenseRedemptionDeadlineAt: new Date('2027-05-28T00:00:00.000Z'),
    });
    expect(msg).toContain('https://batikjaya.id');
    expect(msg).toContain('Rp 200.000');
    expect(msg).toContain('Batas Tebus Lisensi (Rp 3.000.000)');
    expect(msg).toContain('https://demo.larisdari.web.id/billing/tok123');
  });
});
