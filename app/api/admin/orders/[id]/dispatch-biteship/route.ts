import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { createBiteshipShipmentOrder } from '@/lib/biteship';
import { dispatchOrderShippedNotification } from '@/lib/orderNotificationService';
import { logger } from '@/lib/logger';

/**
 * Type-safe shape for Biteship store settings.
 * Ensures resilient compilation across all IDE and language server cache states.
 */
interface BiteshipStoreSettings {
  biteshipEnabled?: boolean;
  biteshipApiKey?: string | null;
  biteshipSandbox?: boolean;
  biteshipOriginAreaId?: string | null;
  biteshipOriginAddress?: string | null;
  biteshipOriginPostalCode?: string | null;
  biteshipOriginContactName?: string | null;
  biteshipOriginContactPhone?: string | null;
  biteshipEnabledCouriers?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya admin dan staf yang dapat memproses pengiriman.' },
        { status: 403 }
      );
    }

    const orderId = params?.id;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { product: true } },
        store: { include: { settings: true } },
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && order.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Unauthorized: Toko tidak sesuai' }, { status: 403 });
    }

    // Parse optional parameters from request body if available
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    // Guard: Prevent accidental duplicate pickup requests if already shipped with waybill
    if (order.status === 'SHIPPED' && order.waybillNumber && !body.force) {
      return NextResponse.json(
        {
          error: `Pesanan ini sudah dikirimkan dengan nomor resi ${order.waybillNumber}. Gunakan opsi force jika ingin membuat pengiriman ulang.`,
          waybillNumber: order.waybillNumber,
          status: order.status,
        },
        { status: 400 }
      );
    }

    // Validate that order has been paid or is in processing stage
    if (order.status !== 'PROCESSING' && order.status !== 'PAID' && !(body.force && order.status === 'SHIPPED')) {
      return NextResponse.json(
        { error: `Pesanan berstatus ${order.status}. Hanya pesanan yang lunas/diproses yang dapat dikirimkan.` },
        { status: 400 }
      );
    }

    const settings = (order.store.settings || {}) as BiteshipStoreSettings;

    // Origin location & contact details with resilient multi-tier fallbacks
    const originContactName =
      settings.biteshipOriginContactName ||
      settings.businessName ||
      order.store.name ||
      'Admin Toko';
    const originContactPhone =
      settings.biteshipOriginContactPhone ||
      settings.businessPhone ||
      order.store.phone ||
      '081234567890';
    const originAddress =
      settings.biteshipOriginAddress ||
      settings.businessAddress ||
      order.store.address ||
      'Gudang Utama Toko';
    const originPostalCode = settings.biteshipOriginPostalCode || '10110';

    // Destination address & contact details
    const destinationAddress = (body.destinationAddress || order.shippingAddress || 'Alamat Penerima').trim();
    const postalMatch = destinationAddress.match(/\b(\d{5})\b/);
    const destinationPostalCode = body.destinationPostalCode || (postalMatch ? postalMatch[1] : null);
    const destinationAreaId = body.destinationAreaId || null;

    const userName = order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : '';
    const destinationContactName =
      body.destinationContactName ||
      order.customerName ||
      (userName.length > 0 ? userName : 'Pembeli');
    const destinationContactPhone =
      body.destinationContactPhone ||
      order.customerPhone ||
      order.user?.phone ||
      '081234567890';

    const items = order.orderItems.map((item) => ({
      name: item.product?.name || 'Produk Pesanan',
      value: item.unitPrice || item.totalPrice,
      quantity: item.quantity,
      weight: (item.product as any)?.weight || 300,
    }));

    const courierCompany = (body.courierCompany || order.courierCode || 'jne').toLowerCase();
    const courierType = (body.courierType || order.courierService || 'reg').toLowerCase();

    // Request courier shipment booking from Biteship
    const shipmentResult = await createBiteshipShipmentOrder({
      apiKey: settings.biteshipApiKey,
      orderNumber: order.orderNumber,
      courierCompany,
      courierType,
      originContactName,
      originContactPhone,
      originAddress,
      originPostalCode,
      originAreaId: settings.biteshipOriginAreaId,
      destinationContactName,
      destinationContactPhone,
      destinationAddress,
      destinationPostalCode,
      destinationAreaId,
      items,
      isSandbox: settings.biteshipSandbox ?? true,
    });

    const shippedAt = new Date();
    const trackingUrl = `https://biteship.com/tracking/${shipmentResult.waybillNumber}`;

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'SHIPPED',
          shippedAt,
          waybillNumber: shipmentResult.waybillNumber,
          biteshipOrderId: shipmentResult.biteshipOrderId,
          biteshipTrackingId: shipmentResult.biteshipTrackingId,
          biteshipStatus: shipmentResult.status,
          courierCode: courierCompany,
          courierService: courierType,
          trackingUrl,
        },
      }),
      prisma.auditLog.create({
        data: {
          storeId: user.storeId,
          userId: user.id,
          action: 'ORDER_DISPATCH_BITESHIP',
          entityType: 'Order',
          entityId: order.id,
          newValue: JSON.stringify({
            courierCompany,
            courierType,
            waybillNumber: shipmentResult.waybillNumber,
            biteshipOrderId: shipmentResult.biteshipOrderId,
            destinationPostalCode,
          }),
        },
      }),
    ]);

    // Dispatch non-blocking notification to customer
    try {
      dispatchOrderShippedNotification(updatedOrder.id);
    } catch {
      // Ignore notification failures
    }

    return NextResponse.json({
      success: true,
      message: 'Pesanan berhasil di-booking melalui Biteship dan status diubah menjadi DIKIRIM (SHIPPED).',
      order: updatedOrder,
      shipment: shipmentResult,
    });
  } catch (error: any) {
    logger.error('Failed to dispatch Biteship shipment', {
      orderId: params?.id,
      error: error?.message || error,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses pengiriman Biteship' },
      { status: 500 }
    );
  }
}
