import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.info('Received Biteship webhook payload', { event: body.event, orderId: body.order_id });

    const biteshipOrderId = body.order_id;
    const trackingId = body.courier_tracking_id;

    if (!biteshipOrderId && !trackingId) {
      return NextResponse.json({ error: 'Missing order_id or courier_tracking_id' }, { status: 400 });
    }

    // Locate order by biteshipOrderId or biteshipTrackingId
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          biteshipOrderId ? { biteshipOrderId } : undefined,
          trackingId ? { biteshipTrackingId: trackingId } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!order) {
      logger.warn('Order not found for Biteship webhook', { biteshipOrderId, trackingId });
      return NextResponse.json({ success: true, message: 'Order ignored (not found)' });
    }

    const updateData: any = {};

    // 1. Update waybill ID if provided
    if (body.courier_waybill_id && (!order.waybillNumber || order.waybillNumber.startsWith('RESI-'))) {
      updateData.waybillNumber = body.courier_waybill_id;
      updateData.trackingUrl = `https://biteship.com/tracking/${body.courier_waybill_id}`;
    }

    // 2. Update status
    if (body.status) {
      updateData.biteshipStatus = body.status;
      const normalizedStatus = String(body.status).toLowerCase();

      if (normalizedStatus === 'delivered' && order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
        updateData.status = 'DELIVERED';
        updateData.deliveredAt = new Date();
      } else if (
        ['dropping_off', 'in_transit', 'picked', 'allocated', 'picking_up'].includes(normalizedStatus) &&
        order.status !== 'SHIPPED' &&
        order.status !== 'DELIVERED' &&
        order.status !== 'COMPLETED'
      ) {
        updateData.status = 'SHIPPED';
        if (!order.shippedAt) updateData.shippedAt = new Date();
      } else if (['cancelled', 'rejected'].includes(normalizedStatus) && order.status !== 'CANCELLED') {
        updateData.status = 'CANCELLED';
      }
    }

    // 3. Append to tracking history
    const existingHistory = Array.isArray(order.shippingTrackingHistory)
      ? (order.shippingTrackingHistory as any[])
      : [];

    const newHistoryEvent = {
      event: body.event,
      status: body.status,
      note: body.note || body.description || `Status update from Biteship: ${body.status}`,
      updatedAt: new Date().toISOString(),
      location: body.location || '',
    };

    updateData.shippingTrackingHistory = [...existingHistory, newHistoryEvent];

    await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Biteship webhook processed successfully',
      orderId: order.id,
      updatedStatus: updateData.status || order.status,
    });
  } catch (error) {
    logger.error('Error processing Biteship webhook', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

