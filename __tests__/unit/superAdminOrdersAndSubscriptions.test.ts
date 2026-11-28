/** @jest-environment node */

jest.mock('@/lib/prisma', () => {
  const mockTx: any = {
    licenseOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscriptionPayment: {
      update: jest.fn(),
    },
  };
  return {
    prisma: {
      licenseOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      subscriptionPayment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn(async (cb: any) => cb(mockTx)),
      __mockTx: mockTx,
    },
  };
});

jest.mock('@/lib/superAdminAuth', () => ({
  isControlPlaneEnabled: jest.fn().mockReturnValue(true),
  requireSuperAdminOwner: jest.fn().mockReturnValue({
    role: 'SUPER_ADMIN_OWNER',
    email: 'owner@master-control.local',
    type: 'super_admin_control_plane',
  }),
}));

jest.mock('@/lib/tenantProvisioner', () => ({
  provisionTenantStore: jest.fn(),
}));

jest.mock('@/lib/paymentStorage', () => ({
  savePaymentProofFile: jest.fn().mockResolvedValue({
    filename: 'proof-1.jpg',
    relativePath: 'storage/proofs/store-1/proof-1.jpg',
    absolutePath: '/tmp/proof-1.jpg',
    size: 1200,
    mimeType: 'image/jpeg',
  }),
  readPaymentProofFile: jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}));

import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { provisionTenantStore } from '@/lib/tenantProvisioner';
import { POST as webhookPost } from '@/app/api/webhook/license-order/route';
import { GET as listOrdersGet, POST as createOrderPost } from '@/app/api/super-admin/license-orders/route';
import { POST as provisionOrderPost } from '@/app/api/super-admin/license-orders/[id]/provision/route';
import { POST as reviewPaymentPost } from '@/app/api/super-admin/subscription-payments/[id]/review/route';
import { PATCH as updateSubscriptionPatch } from '@/app/api/super-admin/tenants/[id]/subscription/route';

const mockedPrisma = prisma as any;

describe('Super-Admin License Orders, Payment Approvals & Tenant Subscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LICENSE_WEBHOOK_SECRET = 'test-webhook-secret';
    (isControlPlaneEnabled as jest.Mock).mockReturnValue(true);
    (requireSuperAdminOwner as jest.Mock).mockReturnValue({
      role: 'SUPER_ADMIN_OWNER',
      email: 'owner@master-control.local',
      type: 'super_admin_control_plane',
    });
  });

  it('validates webhook secret and creates DEFERRED_6M DEDICATED order with Rp 450.000 initial payment', async () => {
    const badReq = new Request('http://localhost/api/webhook/license-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-license-webhook-secret': 'wrong' },
      body: JSON.stringify({
        customerName: 'Andi',
        whatsapp: '081234567890',
        brandName: 'Kopi Nusantara',
      }),
    });
    const badRes = await webhookPost(badReq);
    expect(badRes.status).toBe(401);

    mockedPrisma.licenseOrder.create.mockResolvedValue({
      id: 'ord-1',
      orderCode: 'LDW-20261128-AB12',
      portalToken: 'token-123',
      initialPaymentAmount: 450_000,
      monthlyFeeAmount: 450_000,
    });

    const req = new Request('http://localhost/api/webhook/license-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-webhook-secret': 'test-webhook-secret',
        host: 'demo.larisdari.web.id',
      },
      body: JSON.stringify({
        customerName: 'Andi',
        whatsapp: '081234567890',
        brandName: 'Kopi Nusantara',
        customDomain: 'https://kopinusantara.id/',
        licensePlan: 'DEFERRED_6M',
        infraTier: 'DEDICATED',
      }),
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.initialPaymentAmount).toBe(450_000);
    expect(data.billingUrl).toBe('https://demo.larisdari.web.id/billing/token-123');
    expect(mockedPrisma.licenseOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customDomain: 'kopinusantara.id',
          licensePlan: 'DEFERRED_6M',
          infraTier: 'DEDICATED',
          initialPaymentAmount: 450_000,
          monthlyFeeAmount: 450_000,
        }),
      })
    );
  });

  it('rejects non-Super-Admin access to license orders endpoints with 403 / 404', async () => {
    (requireSuperAdminOwner as jest.Mock).mockReturnValueOnce(null);
    const res403 = await listOrdersGet(new Request('http://localhost/api/super-admin/license-orders'));
    expect(res403.status).toBe(403);

    (isControlPlaneEnabled as jest.Mock).mockReturnValueOnce(false);
    const res404 = await createOrderPost(
      new Request('http://localhost/api/super-admin/license-orders', { method: 'POST', body: '{}' })
    );
    expect(res404.status).toBe(404);
  });

  it('provisions 1-click store from DEFERRED_6M order with +6 month deadline and sets LIVE status', async () => {
    mockedPrisma.licenseOrder.findUnique.mockResolvedValue({
      id: 'ord-2',
      orderCode: 'LDW-20261128-FF01',
      customerName: 'Siti',
      whatsapp: '085611223344',
      email: 'siti@batik.id',
      brandName: 'Batik Citi',
      customDomain: 'batikciti.id',
      licensePlan: 'DEFERRED_6M',
      infraTier: 'SHARED',
      licenseFeeAmount: 3_000_000,
      monthlyFeeAmount: 200_000,
      portalToken: 'tok-citi',
    });

    (provisionTenantStore as jest.Mock).mockResolvedValue({
      store: { id: 'store-citi', name: 'Batik Citi', domain: 'batikciti.id' },
      adminUser: { id: 'u-1', email: 'siti@batik.id', initialPassword: 'Pass#123' },
    });

    mockedPrisma.store.update.mockResolvedValue({
      id: 'store-citi',
      domain: 'batikciti.id',
      licenseStatus: 'DEFERRED_6M',
      infraTier: 'SHARED',
      monthlyFeeAmount: 200_000,
      serviceStatus: 'ACTIVE',
    });

    mockedPrisma.licenseOrder.update.mockResolvedValue({
      id: 'ord-2',
      status: 'LIVE',
      storeId: 'store-citi',
    });

    const req = new Request('http://localhost/api/super-admin/license-orders/ord-2/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({}),
    });

    const res = await provisionOrderPost(req, { params: { id: 'ord-2' } });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.order.status).toBe('LIVE');
    expect(mockedPrisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          infraTier: 'SHARED',
          licenseStatus: 'DEFERRED_6M',
          monthlyFeeAmount: 200_000,
          serviceStatus: 'ACTIVE',
          billingPortalToken: 'tok-citi',
          licenseRedemptionDeadlineAt: expect.any(Date),
        }),
      })
    );
  });

  it('approves LICENSE_REDEMPTION payment, downgrades rate 200k -> 150k, and reactivates store', async () => {
    mockedPrisma.subscriptionPayment.findUnique.mockResolvedValue({
      id: 'pay-1',
      storeId: 'store-citi',
      licenseOrderId: null,
      paymentType: 'LICENSE_REDEMPTION',
      billingMonths: 1,
      amount: 3_000_000,
      status: 'PENDING_REVIEW',
    });

    mockedPrisma.__mockTx.store.findUnique.mockResolvedValue({
      id: 'store-citi',
      infraTier: 'SHARED',
      licenseStatus: 'DEFERRED_6M',
      serviceStatus: 'LICENSE_OVERDUE',
    });

    mockedPrisma.__mockTx.store.update.mockResolvedValue({
      id: 'store-citi',
      licenseStatus: 'OWNED',
      monthlyFeeAmount: 150_000,
      serviceStatus: 'ACTIVE',
    });

    mockedPrisma.__mockTx.subscriptionPayment.update.mockResolvedValue({
      id: 'pay-1',
      status: 'APPROVED',
    });

    const req = new Request('http://localhost/api/super-admin/subscription-payments/pay-1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVE' }),
    });

    const res = await reviewPaymentPost(req, { params: { id: 'pay-1' } });
    expect(res.status).toBe(200);
    expect(mockedPrisma.__mockTx.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'store-citi' },
        data: expect.objectContaining({
          licenseStatus: 'OWNED',
          monthlyFeeAmount: 150_000,
          serviceStatus: 'ACTIVE',
          suspendedAt: null,
          suspendedReason: null,
        }),
      })
    );
  });

  it('blocks suspending demo store accidentally and suspends client store cleanly', async () => {
    mockedPrisma.store.findUnique.mockResolvedValueOnce({
      id: 'demo-id',
      isDemo: true,
      infraTier: 'SHARED',
      licenseStatus: 'OWNED',
      serviceStatus: 'ACTIVE',
    });

    const resDemo = await updateSubscriptionPatch(
      new Request('http://localhost/api/super-admin/tenants/demo-id/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceStatus: 'SUSPENDED' }),
      }),
      { params: { id: 'demo-id' } }
    );
    expect(resDemo.status).toBe(400);

    mockedPrisma.store.findUnique.mockResolvedValueOnce({
      id: 'client-1',
      isDemo: false,
      infraTier: 'DEDICATED',
      licenseStatus: 'DEFERRED_6M',
      serviceStatus: 'ACTIVE',
    });
    mockedPrisma.store.update.mockResolvedValueOnce({
      id: 'client-1',
      serviceStatus: 'SUSPENDED',
    });

    const resClient = await updateSubscriptionPatch(
      new Request('http://localhost/api/super-admin/tenants/client-1/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceStatus: 'SUSPENDED',
          suspendedReason: 'Tagihan bulan ke-3 belum masuk',
        }),
      }),
      { params: { id: 'client-1' } }
    );
    expect(resClient.status).toBe(200);
    expect(mockedPrisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceStatus: 'SUSPENDED',
          suspendedReason: 'Tagihan bulan ke-3 belum masuk',
        }),
      })
    );
  });
});
