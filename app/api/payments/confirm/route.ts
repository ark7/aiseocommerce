import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { processOrderPayment, releaseStock } from '@/services/transactionService'
import { requireStoreRole } from '@/lib/auth'
import { auditPaymentVerified } from '@/services/auditService'

// Define schema for payment confirmation
// Prisma ids are cuids (seeded rows use plain strings), so uuid() rejected real ids.
const ConfirmationSchema = z.object({
  orderId: z.string().min(1),
  paymentGatewayId: z.string(),
  status: z.enum(['success', 'failure']),
  gatewayResponse: z.any().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = ConfirmationSchema.parse(body)

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        orderId: validatedData.orderId,
        transactionId: validatedData.paymentGatewayId,
      },
      include: { order: true },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      )
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: validatedData.status === 'success' ? 'PAID' : 'FAILED',
        gatewayResponse: validatedData.gatewayResponse,
      },
    })

    // If payment was successful, process the order
    if (validatedData.status === 'success') {
      const result = await processOrderPayment(payment.orderId)

      if (!result.success) {
        // Rollback payment if order processing failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        })

        return NextResponse.json(
          { error: 'Failed to process order', details: result.error },
          { status: 500 }
        )
      }
    }

    // Update order status
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: validatedData.status === 'success' ? 'PAID' : 'CANCELLED',
      },
    })

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}

// Manual confirmation: an admin approves or rejects an uploaded payment proof.
const ManualConfirmationSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
})

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const validatedData = ManualConfirmationSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: { payments: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // The caller's identity comes from the bearer token, never from the body.
    const user = await requireStoreRole(request, order.storeId, ['ADMIN', 'STAFF'])
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.status !== 'MANUAL_VERIFICATION') {
      return NextResponse.json(
        { error: 'Order is not in manual verification state' },
        { status: 400 }
      )
    }

    const payment = order.payments[0]

    if (validatedData.action === 'reject') {
      // releaseStock returns the reserved units and flips the order to CANCELLED.
      const released = await releaseStock(order.id, user.id)
      if (!released.success) {
        return NextResponse.json({ error: released.error }, { status: 500 })
      }

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', verifiedById: user.id, verifiedAt: new Date() },
        })
        await auditPaymentVerified(payment.id, user.id, order.storeId, 'REJECT', 'PENDING', 'FAILED')
      }

      return NextResponse.json({
        success: true,
        message: 'Payment rejected and stock released',
        released: released.released,
      })
    }

    // Approve. processOrderPayment moves the order to PROCESSING itself; it no
    // longer touches stock because the units were reserved at order creation.
    const result = await processOrderPayment(order.id, user.id)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to process order', details: result.error },
        { status: 500 }
      )
    }

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', verifiedById: user.id, verifiedAt: new Date() },
      })
      await auditPaymentVerified(payment.id, user.id, order.storeId, 'APPROVE', 'PENDING', 'PAID')
    }

    return NextResponse.json({ success: true, message: 'Order confirmed manually' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to confirm payment manually' },
      { status: 500 }
    )
  }
}