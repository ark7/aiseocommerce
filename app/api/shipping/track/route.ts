import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getBiteshipTracking } from '@/lib/biteship';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId parameter is required' }, { status: 400 });
    }

    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          include: { settings: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Tenant boundary check
    if (order.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Unauthorized: Toko tidak sesuai' }, { status: 403 });
    }

    // Customer ownership check
    if (user.role === 'CUSTOMER' && order.userId && order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: Pesanan bukan milik akun Anda' }, { status: 403 });
    }

    const settings = order.store.settings;

    const tracking = await getBiteshipTracking({
      apiKey: settings?.biteshipApiKey,
      trackingId: order.biteshipTrackingId,
      waybillNumber: order.waybillNumber,
      courierCode: order.courierCode || 'jne',
      courierServiceName: order.courierServiceName,
      orderCreatedAt: order.createdAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      tracking,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data tracking pengiriman' }, { status: 500 });
  }
}

