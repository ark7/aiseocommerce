import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { processOrderPayment } from '@/services/transactionService'

// Define schema for payment confirmation
const ConfirmationSchema = z.object({
  orderId: z.string().uuid(),
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

// Add manual confirmation option
const ManualConfirmationSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  storeId: z.string().uuid(),
})

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const validatedData = ManualConfirmationSchema.parse(body)

    // Verify user has permission to confirm payments for this store
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    })

    if (!user || user.storeId !== validatedData.storeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: { payments: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'MANUAL_VERIFICATION') {
      return NextResponse.json(
        { error: 'Order is not in manual verification state' },
        { status: 400 }
      )
    }

    // Process the order payment manually
    const result = await processOrderPayment(order.id, validatedData.userId)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to process order', details: result.error },
        { status: 500 }
      )
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    })

    // Update payment status
    if (order.payments.length > 0) {
      await prisma.payment.update({
        where: { id: order.payments[0].id },
        data: { status: 'PAID' },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Order confirmed manually',
    })
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