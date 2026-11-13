import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { getBiteshipRates } from '@/lib/biteship';
import { calculateOrderShipping } from '@/lib/shipping';
import { allow } from '@/lib/rateLimit';
import { getIPAddress } from '@/lib/ip';
import { verifyRequestTurnstileOrPass } from '@/lib/turnstile';

const ShippingRatesSchema = z.object({
  storeId: z.string().optional(),
  destinationPostalCode: z.union([z.string(), z.number()]).optional().nullable(),
  destinationAreaId: z.string().optional().nullable(),
  destinationAddress: z.string().optional().nullable(),
  turnstileToken: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      name: z.string(),
      quantity: z.number().int().positive(),
      weight: z.number().nonnegative().optional(), // in grams
      price: z.number().nonnegative().optional(),
      productType: z.string().optional(),
    })
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`shipping_rates:${ip}`, 20)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan cek ongkir. Silakan coba lagi sebentar.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const data = ShippingRatesSchema.parse(body);

    const store = data.storeId
      ? await prisma.store.findUnique({
          where: { id: data.storeId },
          include: { settings: true },
        })
      : await getActiveStore();

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const turnstileCheck = await verifyRequestTurnstileOrPass(
      request,
      store.settings as {
        turnstileEnabled?: boolean | null;
        turnstileSiteKey?: string | null;
        turnstileSecretKey?: string | null;
      } | null,
      data.turnstileToken
    );
    if (!turnstileCheck.allowed) {
      return NextResponse.json({ error: turnstileCheck.error }, { status: turnstileCheck.status });
    }

    const settings = store.settings;
    const hasPhysicalItems = data.items.some((i) => !i.productType || i.productType === 'PHYSICAL');

    // 1. Digital products are always free and instant delivery
    if (!hasPhysicalItems) {
      return NextResponse.json({
        success: true,
        mode: 'DIGITAL',
        rates: [
          {
            courierCode: 'instant',
            courierName: 'Pengiriman Digital',
            serviceCode: 'instant',
            serviceName: 'Akses Instan Otomatis',
            description: 'Produk digital / tiket dikirimkan langsung ke email dan dashboard akun Anda.',
            cost: 0,
            etd: 'Instan',
            type: 'instant',
          },
        ],
      });
    }

    // 2. Check if Biteship automated couriers is enabled
    if (settings?.biteshipEnabled) {
      const biteshipItems = data.items.map((i) => ({
        name: i.name,
        value: i.price || 50000,
        quantity: i.quantity,
        weight: i.weight || 300,
      }));

      const rates = await getBiteshipRates({
        apiKey: settings.biteshipApiKey,
        originPostalCode: settings.biteshipOriginPostalCode,
        originAreaId: settings.biteshipOriginAreaId,
        destinationPostalCode: data.destinationPostalCode,
        destinationAreaId: data.destinationAreaId,
        items: biteshipItems,
        couriers: settings.biteshipEnabledCouriers || 'jne,sicepat,jnt,anteraja,tiki,pos',
        isSandbox: settings.biteshipSandbox,
      });

      // Check if store has free shipping threshold
      const subtotal = data.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
      const freeThreshold = settings.shippingFreeThreshold;
      const isQualifiedFree = typeof freeThreshold === 'number' && freeThreshold > 0 && subtotal >= freeThreshold;

      const finalRates = rates.map((r) => ({
        ...r,
        originalCost: r.cost,
        cost: isQualifiedFree ? 0 : r.cost,
        isFreeShipping: isQualifiedFree,
      }));

      return NextResponse.json({
        success: true,
        mode: 'BITESHIP',
        isFreeShippingQualified: isQualifiedFree,
        rates: finalRates,
      });
    }

    // 3. Fallback: Manual Flat Rates (Dalam Kota vs Luar Kota)
    const subtotal = data.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const innerCalc = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal,
      selectedZone: 'INNER',
      config: {
        originCity: settings?.shippingOriginCity,
        flatRateInner: settings?.shippingFlatRateInner ?? 0,
        flatRateOuter: settings?.shippingFlatRateOuter ?? 0,
        freeThreshold: settings?.shippingFreeThreshold,
      },
    });

    const outerCalc = calculateOrderShipping({
      hasPhysicalItems: true,
      subtotal,
      selectedZone: 'OUTER',
      config: {
        originCity: settings?.shippingOriginCity,
        flatRateInner: settings?.shippingFlatRateInner ?? 0,
        flatRateOuter: settings?.shippingFlatRateOuter ?? 0,
        freeThreshold: settings?.shippingFreeThreshold,
      },
    });

    return NextResponse.json({
      success: true,
      mode: 'FLAT_MANUAL',
      rates: [
        {
          courierCode: 'manual',
          courierName: 'Kurir Lokal Toko',
          serviceCode: 'inner',
          serviceName: `Dalam Kota (${settings?.shippingOriginCity || 'Lokal'})`,
          description: 'Pengiriman lokal di dalam wilayah kota / kabupaten toko',
          cost: innerCalc.cost,
          etd: '1 - 2 hari',
          type: 'standard',
          isFreeShipping: innerCalc.cost === 0,
        },
        {
          courierCode: 'manual',
          courierName: 'Ekspedisi Nasional',
          serviceCode: 'outer',
          serviceName: 'Luar Kota / Antar Provinsi',
          description: 'Pengiriman reguler ke seluruh wilayah luar kota di Indonesia',
          cost: outerCalc.cost,
          etd: '2 - 4 hari',
          type: 'standard',
          isFreeShipping: outerCalc.cost === 0,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal menghitung tarif pengiriman' },
      { status: 500 }
    );
  }
}

