import { LedgerType } from '@prisma/client';
import {
  buildOrderInvoiceHtml,
  calculateOrderPricing,
  parseCustomFeesConfig,
  parseOrderCustomFees,
} from '@/lib/invoiceService';
import { PATCH as reviseOrderPricing } from '@/app/api/admin/orders/[id]/pricing/route';
import { POST as sendInvoiceRoute } from '@/app/api/admin/orders/[id]/invoice/send/route';
import {
  GET as getTaxReport,
  POST as recordTaxPayment,
} from '@/app/api/admin/finance/tax-report/route';
import { prisma } from '@/lib/prisma';
import { requireStoreRole, verifyToken } from '@/lib/auth';
import { sendEmail } from '@/lib/emailService';
import { auditLedgerCreated, auditOrderUpdated } from '@/services/auditService';
import { TAX_PAYMENT_CATEGORY } from '@/lib/ledgerCategory';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    ledger: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    ledgerCategory: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireStoreRole: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/services/auditService', () => ({
  auditOrderUpdated: jest.fn(),
  auditLedgerCreated: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/ip', () => ({
  getIPAddress: jest.fn(() => '127.0.0.1'),
}));

describe('PPN, Custom Additional Fees, Invoice Rendering & Manual Order Revisions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateOrderPricing & snapshot parsers', () => {
    it('calculates PPN on (subtotal - discount), FIXED & PERCENT custom fees, and manual shipping', () => {
      const pricing = calculateOrderPricing({
        subtotal: 500_000,
        discount: 50_000,
        shippingCost: 35_000,
        taxEnabled: true,
        taxLabel: 'PPN 11%',
        taxRate: 11,
        customFees: [
          { id: 'f1', name: 'Packing Kayu', type: 'FIXED', amount: 25_000, enabled: true, showOnInvoice: true },
          { id: 'f2', name: 'Biaya Penanganan', type: 'PERCENT', amount: 2, enabled: true, showOnInvoice: false },
          { id: 'f3', name: 'Biaya Nonaktif', type: 'FIXED', amount: 99_000, enabled: false, showOnInvoice: true },
        ],
      });

      // DPP = 500.000 - 50.000 = 450.000
      // PPN 11% = 49.500
      // Custom fees = 25.000 + (2% * 450.000 = 9.000) = 34.000
      // Total = 450.000 + 35.000 + 49.500 + 34.000 = 568.500
      expect(pricing.dpp).toBe(450_000);
      expect(pricing.taxLabel).toBe('PPN 11%');
      expect(pricing.taxAmount).toBe(49_500);
      expect(pricing.customFees).toHaveLength(2);
      expect(pricing.customFeesAmount).toBe(34_000);
      expect(pricing.customFees[1].showOnInvoice).toBe(false);
      expect(pricing.totalAmount).toBe(568_500);
    });

    it('normalizes invalid raw JSON cleanly via parseCustomFeesConfig and parseOrderCustomFees', () => {
      expect(parseCustomFeesConfig(null)).toEqual([]);
      expect(parseOrderCustomFees('not-an-array')).toEqual([]);
      expect(
        parseCustomFeesConfig([{ name: ' Asuransi ', type: 'percent', amount: 1.5, showOnInvoice: false }])
      ).toEqual([
        {
          id: 'fee-1',
          name: 'Asuransi',
          type: 'PERCENT',
          amount: 1.5,
          enabled: true,
          showOnInvoice: false,
        },
      ]);
    });
  });

  describe('buildOrderInvoiceHtml visibility toggles', () => {
    const baseOrder = {
      id: 'ord-1',
      orderNumber: 'ORD-1001',
      status: 'PENDING',
      createdAt: new Date('2026-11-23T08:00:00Z'),
      customerName: 'Budi Santoso',
      customerEmail: 'budi@example.com',
      shippingAddress: 'Jl. Sudirman No. 10, Jakarta',
      shippingZone: 'MANUAL',
      courierServiceName: 'Kargo Toko Manual',
      subtotal: 200_000,
      discount: 0,
      shippingCost: 40_000,
      taxAmount: 22_000,
      taxLabel: 'PPN 11%',
      taxRate: 11,
      customFeesAmount: 15_000,
      customFeesSnapshot: [
        { id: 'f1', name: 'Packing Kayu', type: 'FIXED', rateOrAmount: 10_000, computedAmount: 10_000, showOnInvoice: true },
        { id: 'f2', name: 'Biaya Tersembunyi', type: 'FIXED', rateOrAmount: 5_000, computedAmount: 5_000, showOnInvoice: false },
      ],
      invoiceShowTax: true,
      invoiceShowCustomFees: true,
      invoiceRevision: 2,
      totalAmount: 277_000,
    };

    it('renders PPN and visible custom fees while hiding per-item showOnInvoice=false fees', () => {
      const html = buildOrderInvoiceHtml({
        store: { name: 'Toko Maju', address: 'Jakarta', phone: '08111', email: 'toko@maju.id' },
        order: baseOrder,
        items: [{ name: 'Produk A', quantity: 2, unitPrice: 100_000, totalPrice: 200_000 }],
        adjustmentNote: 'Tambah ongkir kargo manual',
      });

      expect(html).toContain('INV-ORD-1001');
      expect(html).toContain('Revisi #2');
      expect(html).toContain('Tambah ongkir kargo manual');
      expect(html).toContain('PPN 11%');
      expect(html).toContain('Packing Kayu');
      expect(html).not.toContain('Biaya Tersembunyi');
    });

    it('hides PPN and all custom fee lines when invoiceShowTax and invoiceShowCustomFees are false', () => {
      const html = buildOrderInvoiceHtml({
        store: { name: 'Toko Maju' },
        order: { ...baseOrder, invoiceShowTax: false, invoiceShowCustomFees: false },
        items: [{ name: 'Produk A', quantity: 2, unitPrice: 100_000, totalPrice: 200_000 }],
      });

      expect(html).not.toContain('PPN 11%');
      expect(html).not.toContain('Packing Kayu');
      expect(html).toContain('Total Tagihan');
    });
  });

  describe('PATCH /api/admin/orders/[id]/pricing & POST /invoice/send', () => {
    function makeExistingOrder(overrides: Record<string, any> = {}) {
      return {
        id: 'ord-1',
        storeId: 'store-1',
        orderNumber: 'ORD-2001',
        status: 'MANUAL_VERIFICATION',
        subtotal: 300_000,
        discount: 0,
        shippingCost: 0,
        shippingZone: 'INNER',
        courierServiceName: null,
        taxAmount: 0,
        taxLabel: 'PPN',
        taxRate: 0,
        customFeesAmount: 0,
        customFeesSnapshot: [],
        invoiceShowTax: true,
        invoiceShowCustomFees: true,
        totalAmount: 300_000,
        invoiceRevision: 1,
        notes: null,
        isSandbox: false,
        ...overrides,
      };
    }

    it('revises manual shipping, PPN, custom fees, reopens status to PENDING, and sends SMTP invoice email', async () => {
      const existing = makeExistingOrder();
      const txOrderUpdate = jest.fn().mockImplementation(({ data }) => ({
        ...existing,
        ...data,
        customerEmail: 'buyer@example.com',
        orderItems: [],
        payments: [],
      }));
      const txPaymentUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const txLedgerFindFirst = jest.fn().mockResolvedValue(null);

      (prisma.order.findUnique as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          id: 'ord-1',
          customerName: 'Ani',
          customerEmail: 'buyer@example.com',
          subtotal: 300_000,
          discount: 0,
          shippingCost: 50_000,
          taxAmount: 33_000,
          taxLabel: 'PPN 11%',
          taxRate: 11,
          customFeesAmount: 10_000,
          customFeesSnapshot: [
            { id: 'f1', name: 'Packing Kayu', type: 'FIXED', rateOrAmount: 10_000, computedAmount: 10_000, showOnInvoice: true },
          ],
          invoiceShowTax: true,
          invoiceShowCustomFees: true,
          invoiceRevision: 2,
          totalAmount: 393_000,
          status: 'PENDING',
          createdAt: new Date(),
          user: null,
          orderItems: [{ product: { name: 'Jaket' }, variation: null, quantity: 1, unitPrice: 300_000, totalPrice: 300_000 }],
          store: {
            id: 'store-1',
            name: 'Toko Jaya',
            domain: 'tokojaya.id',
            address: 'Bandung',
            phone: '0812',
            email: 'admin@tokojaya.id',
            settings: {
              smtpEnabled: true,
              smtpHost: 'smtp.example.com',
              invoiceNotes: 'Transfer ke BCA 123',
            },
          },
        });

      (requireStoreRole as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'ADMIN', storeId: 'store-1' });
      (prisma.$transaction as jest.Mock).mockImplementation((cb) =>
        cb({
          order: { update: txOrderUpdate },
          payment: { updateMany: txPaymentUpdateMany },
          ledger: { findFirst: txLedgerFindFirst },
        })
      );
      (sendEmail as jest.Mock).mockResolvedValue({ success: true, messageId: 'msg-123' });
      (prisma.order.update as jest.Mock).mockResolvedValue({});

      const req = new Request('http://localhost/api/admin/orders/ord-1/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingCost: 50_000,
          shippingZone: 'MANUAL',
          courierServiceName: 'Kurir Kargo Toko',
          taxEnabled: true,
          taxLabel: 'PPN 11%',
          taxRate: 11,
          invoiceShowTax: true,
          invoiceShowCustomFees: true,
          customFees: [{ name: 'Packing Kayu', type: 'FIXED', amount: 10_000, enabled: true, showOnInvoice: true }],
          newStatus: 'PENDING',
          adjustmentNote: 'Tambahan ongkir manual luar pulau',
          resendInvoiceEmail: true,
        }),
      });

      const res = await reviseOrderPricing(req, { params: { id: 'ord-1' } });
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.priceDiff).toBe(93_000);
      expect(json.emailResult.sent).toBe(true);
      expect(txOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shippingCost: 50_000,
            taxAmount: 33_000,
            customFeesAmount: 10_000,
            totalAmount: 393_000,
            status: 'PENDING',
            invoiceRevision: 2,
          }),
        })
      );
      expect(txPaymentUpdateMany).toHaveBeenCalledWith({
        where: { orderId: 'ord-1', status: 'PENDING' },
        data: { amount: 393_000 },
      });
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(auditOrderUpdated).toHaveBeenCalledTimes(1);
    });

    it('completes price adjustment cleanly even when SMTP is not configured', async () => {
      const existing = makeExistingOrder({ status: 'PENDING' });
      (prisma.order.findUnique as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          customerEmail: 'buyer@example.com',
          orderItems: [],
          store: {
            id: 'store-1',
            name: 'Toko Jaya',
            domain: 'tokojaya.id',
            settings: { smtpEnabled: false, smtpHost: null },
          },
        });
      (requireStoreRole as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'ADMIN', storeId: 'store-1' });
      (prisma.$transaction as jest.Mock).mockImplementation((cb) =>
        cb({
          order: { update: jest.fn().mockImplementation(({ data }) => ({ ...existing, ...data })) },
          payment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          ledger: { findFirst: jest.fn().mockResolvedValue(null) },
        })
      );

      const req = new Request('http://localhost/api/admin/orders/ord-1/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingCost: 25_000,
          resendInvoiceEmail: true,
        }),
      });

      const res = await reviseOrderPricing(req, { params: { id: 'ord-1' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.emailResult.sent).toBe(false);
      expect(json.emailResult.reason).toBe('SMTP_NOT_CONFIGURED');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('returns 400 on direct invoice send route when SMTP is disconnected', async () => {
      (prisma.order.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'ord-1', storeId: 'store-1' })
        .mockResolvedValueOnce({
          id: 'ord-1',
          storeId: 'store-1',
          customerEmail: 'buyer@example.com',
          orderItems: [],
          store: { id: 'store-1', name: 'Toko Jaya', settings: { smtpEnabled: false, smtpHost: null } },
        });
      (requireStoreRole as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'ADMIN', storeId: 'store-1' });

      const req = new Request('http://localhost/api/admin/orders/ord-1/invoice/send', { method: 'POST' });
      const res = await sendInvoiceRoute(req, { params: { id: 'ord-1' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.reason).toBe('SMTP_NOT_CONFIGURED');
    });
  });

  describe('Periodic PPN Tax Bookkeeping (/api/admin/finance/tax-report)', () => {
    it('computes total DPP, collected PPN, remitted PPN, and payable PPN for the period', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'ADMIN', storeId: 'store-1' });
      (prisma.order.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'o1',
          orderNumber: 'ORD-1',
          invoiceRevision: 1,
          createdAt: new Date('2026-11-10T05:00:00Z'),
          customerName: 'Andi',
          status: 'PAID',
          subtotal: 1_000_000,
          discount: 0,
          shippingCost: 20_000,
          taxLabel: 'PPN 11%',
          taxRate: 11,
          taxAmount: 110_000,
          customFeesAmount: 5_000,
          totalAmount: 1_135_000,
        },
        {
          id: 'o2',
          orderNumber: 'ORD-2',
          invoiceRevision: 2,
          createdAt: new Date('2026-11-12T05:00:00Z'),
          customerName: 'Rina',
          status: 'COMPLETED',
          subtotal: 500_000,
          discount: 100_000,
          shippingCost: 15_000,
          taxLabel: 'PPN 11%',
          taxRate: 11,
          taxAmount: 44_000,
          customFeesAmount: 0,
          totalAmount: 459_000,
        },
      ]);
      (prisma.ledger.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'l1',
          amount: -50_000,
          description: 'Setoran PPN (November 2026)',
          referenceId: 'NTPN-001',
          createdAt: new Date('2026-11-15T05:00:00Z'),
        },
      ]);

      const req = new Request('http://localhost/api/admin/finance/tax-report?period=month', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      const res = await getTaxReport(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Total DPP = 1.000.000 + (500.000 - 100.000) = 1.400.000
      // Collected PPN = 110.000 + 44.000 = 154.000
      // Paid PPN = 50.000 => Payable = 104.000
      expect(data.summary.taxableOrderCount).toBe(2);
      expect(data.summary.totalDpp).toBe(1_400_000);
      expect(data.summary.totalTaxCollected).toBe(154_000);
      expect(data.summary.totalTaxPaid).toBe(50_000);
      expect(data.summary.taxPayable).toBe(104_000);
      expect(data.summary.totalCustomFees).toBe(5_000);
      expect(data.summary.totalShippingCollected).toBe(35_000);
    });

    it('records a Setoran PPN remittance into EXPENSE ledger and activates category', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'ADMIN', storeId: 'store-1' });
      (prisma.ledgerCategory.upsert as jest.Mock).mockResolvedValue({});
      (prisma.ledger.create as jest.Mock).mockResolvedValue({
        id: 'led-tax-1',
        type: LedgerType.EXPENSE,
        amount: -104_000,
        category: TAX_PAYMENT_CATEGORY,
        description: 'Setoran PPN (November 2026) • NTPN/Ref: NTPN-9988',
      });

      const req = new Request('http://localhost/api/admin/finance/tax-report', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 104_000,
          taxPeriodLabel: 'November 2026',
          referenceNumber: 'NTPN-9988',
        }),
      });

      const res = await recordTaxPayment(req);
      expect(res.status).toBe(200);
      expect(prisma.ledgerCategory.upsert).toHaveBeenCalled();
      expect(prisma.ledger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            storeId: 'store-1',
            type: LedgerType.EXPENSE,
            amount: -104_000,
            category: TAX_PAYMENT_CATEGORY,
            referenceType: 'TAX_PAYMENT',
          }),
        })
      );
      expect(auditLedgerCreated).toHaveBeenCalledTimes(1);
    });
  });
});
