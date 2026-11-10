import {
  searchBiteshipAreas,
  getBiteshipRates,
  createBiteshipShipmentOrder,
  getBiteshipTracking,
  mapStatusToIndonesian,
} from '@/lib/biteship';
import { POST as shippingRatesRoute } from '@/app/api/shipping/rates/route';
import { POST as dispatchBiteshipRoute } from '@/app/api/admin/orders/[id]/dispatch-biteship/route';
import { POST as biteshipWebhookRoute } from '@/app/api/webhooks/biteship/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
    },
    storeSettings: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

describe('Biteship API Integration — Shipping & Tracking End-to-End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lib/biteship — Core Service Logic', () => {
    it('searches areas returning matching Indonesian cities/districts', async () => {
      const results = await searchBiteshipAreas({ query: 'Bandung' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.toLowerCase().includes('bandung'))).toBe(true);
    });

    it('calculates simulated courier rates based on package weight and distance', async () => {
      const items = [
        { name: 'Kaos Polos', value: 75000, quantity: 2, weight: 250 },
      ];

      const rates = await getBiteshipRates({
        items,
        couriers: 'jne,sicepat,jnt',
        originPostalCode: '40132',
        destinationPostalCode: '10110',
      });

      expect(rates.length).toBeGreaterThan(0);
      const jne = rates.find((r) => r.courierCode === 'jne');
      const sicepat = rates.find((r) => r.courierCode === 'sicepat');

      expect(jne).toBeDefined();
      expect(sicepat).toBeDefined();
      expect(jne!.cost).toBeGreaterThan(0);
      expect(jne!.etd).toBeDefined();
    });

    it('filters couriers according to store active courier settings', async () => {
      const rates = await getBiteshipRates({
        items: [{ name: 'Item', value: 10000, quantity: 1, weight: 500 }],
        couriers: 'pos',
      });

      expect(rates.every((r) => r.courierCode === 'pos')).toBe(true);
    });

    it('creates simulated shipment order returning waybill number and tracking ID', async () => {
      const shipment = await createBiteshipShipmentOrder({
        orderNumber: 'DEMO-ORD-123',
        courierCompany: 'jne',
        courierType: 'reg',
        originContactName: 'Gudang Utama',
        originContactPhone: '081234567890',
        originAddress: 'Jl. Merdeka No. 1',
        destinationContactName: 'Pembeli Setia',
        destinationContactPhone: '089876543210',
        destinationAddress: 'Jl. Thamrin No. 2',
        items: [{ name: 'Buku', value: 50000, quantity: 1, weight: 300 }],
      });

      expect(shipment.success).toBe(true);
      expect(shipment.waybillNumber).toContain('JNE');
      expect(shipment.biteshipOrderId).toBeDefined();
      expect(shipment.biteshipTrackingId).toBeDefined();
    });

    it('returns progressive tracking events with accurate Indonesian notes', async () => {
      const tracking = await getBiteshipTracking({
        waybillNumber: 'JNE-999888777',
        courierCode: 'jne',
        shippedAt: new Date(Date.now() - 3600 * 1000),
      });

      expect(tracking.waybillNumber).toBe('JNE-999888777');
      expect(tracking.history.length).toBeGreaterThan(2);
      expect(tracking.statusLabel).toBeDefined();
    });

    it('translates Biteship status codes to clear Indonesian labels', () => {
      expect(mapStatusToIndonesian('delivered')).toBe('Paket Telah Tiba di Tujuan');
      expect(mapStatusToIndonesian('allocated')).toBe('Menunggu Penjemputan Kurir');
      expect(mapStatusToIndonesian('picked')).toBe('Paket Berhasil Di-pickup');
    });
  });

  describe('POST /api/shipping/rates — Customer Shipping Calculation', () => {
    it('returns instant free shipping for digital items', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-1',
        settings: { biteshipEnabled: true },
      });

      const req = new Request('http://localhost/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-1',
          items: [{ name: 'E-Book PDF', quantity: 1, price: 50000, productType: 'DIGITAL' }],
        }),
      });

      const res = await shippingRatesRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.mode).toBe('DIGITAL');
      expect(json.rates[0].cost).toBe(0);
      expect(json.rates[0].etd).toBe('Instan');
    });

    it('returns multi-courier rates when Biteship is enabled', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-1',
        settings: {
          biteshipEnabled: true,
          biteshipApiKey: null, // use sandbox simulation
          biteshipEnabledCouriers: 'jne,sicepat',
        },
      });

      const req = new Request('http://localhost/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-1',
          destinationPostalCode: '10110',
          items: [{ name: 'Sepatu', quantity: 1, price: 250000, weight: 800, productType: 'PHYSICAL' }],
        }),
      });

      const res = await shippingRatesRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.mode).toBe('BITESHIP');
      expect(json.rates.length).toBeGreaterThan(0);
      expect(json.rates.some((r: any) => r.courierCode === 'jne')).toBe(true);
    });

    it('falls back to manual flat rates when Biteship is disabled', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-1',
        settings: {
          biteshipEnabled: false,
          shippingFlatRateInner: 12000,
          shippingFlatRateOuter: 28000,
          shippingOriginCity: 'Bandung',
        },
      });

      const req = new Request('http://localhost/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-1',
          items: [{ name: 'Baju', quantity: 1, price: 100000, productType: 'PHYSICAL' }],
        }),
      });

      const res = await shippingRatesRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.mode).toBe('FLAT_MANUAL');
      expect(json.rates.find((r: any) => r.serviceCode === 'inner').cost).toBe(12000);
      expect(json.rates.find((r: any) => r.serviceCode === 'outer').cost).toBe(28000);
    });
  });

  describe('POST /api/admin/orders/[id]/dispatch-biteship — Admin Dispatch', () => {
    it('rejects unauthorized or customer callers', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        storeId: 'store-1',
        role: 'CUSTOMER',
      });

      const req = new Request('http://localhost/api/admin/orders/ord-1/dispatch-biteship', {
        method: 'POST',
      });

      const res = await dispatchBiteshipRoute(req, { params: { id: 'ord-1' } });
      expect(res.status).toBe(403);
    });

    it('books Biteship shipment and updates order status to SHIPPED', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'ORD-001',
        storeId: 'store-1',
        status: 'PROCESSING',
        customerName: 'Budi Santoso',
        customerPhone: '08123456789',
        shippingAddress: 'Jl. Sudirman 10, Jakarta',
        courierCode: 'jne',
        courierService: 'reg',
        store: {
          name: 'Toko Keren',
          settings: { biteshipEnabled: true },
        },
        orderItems: [{ product: { name: 'Kaos' }, unitPrice: 50000, totalPrice: 50000, quantity: 1 }],
      });

      const updatedOrder = {
        id: 'ord-1',
        status: 'SHIPPED',
        waybillNumber: 'JNE-12345678',
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue([updatedOrder, {}]);

      const req = new Request('http://localhost/api/admin/orders/ord-1/dispatch-biteship', {
        method: 'POST',
      });

      const res = await dispatchBiteshipRoute(req, { params: { id: 'ord-1' } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.shipment.waybillNumber).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('prevents accidental duplicate dispatch if already shipped with waybill', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        storeId: 'store-1',
        role: 'ADMIN',
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord-shipped',
        orderNumber: 'ORD-SHIPPED-001',
        storeId: 'store-1',
        status: 'SHIPPED',
        waybillNumber: 'JNE-EXISTING-123',
        customerName: 'Budi Santoso',
        shippingAddress: 'Jl. Sudirman 10, Jakarta 10220',
        store: { name: 'Toko Keren', settings: {} },
        orderItems: [],
      });

      const req = new Request('http://localhost/api/admin/orders/ord-shipped/dispatch-biteship', {
        method: 'POST',
      });

      const res = await dispatchBiteshipRoute(req, { params: { id: 'ord-shipped' } });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('sudah dikirimkan dengan nomor resi');
    });
  });

  describe('POST /api/webhooks/biteship — Webhook Status Updates', () => {
    it('updates order status to DELIVERED when Biteship sends delivered event', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({
        id: 'ord-biteship-1',
        status: 'SHIPPED',
        biteshipOrderId: 'bt_123',
        shippingTrackingHistory: [],
      });

      const req = new Request('http://localhost/api/webhooks/biteship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.status',
          order_id: 'bt_123',
          status: 'delivered',
          note: 'Paket telah diterima oleh penerima.',
        }),
      });

      const res = await biteshipWebhookRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.updatedStatus).toBe('DELIVERED');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-biteship-1' },
          data: expect.objectContaining({ status: 'DELIVERED' }),
        })
      );
    });
  });
});

