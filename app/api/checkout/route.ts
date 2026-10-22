import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolvePaymentRedirectUrl } from '@/lib/paymentGateway'

// Prisma ids are cuids, and seeded rows use plain strings like demo-store-001,
// so uuid() rejected every real id.
const CheckoutSchema = z.object({
  storeId: z.string().min(1),
  orderId: z.string().min(1),
  paymentMethod: z.enum(['MANUAL', 'MIDTRANS', 'FLIP', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = CheckoutSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: { store: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.storeId !== validatedData.storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const isSandbox = Boolean(order.isSandbox)

    // Create a payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: validatedData.paymentMethod,
        amount: order.totalAmount,
        status: 'PENDING',
        isSandbox,
      },
    })

    // Generate redirect URL based on payment method and sandbox status
    const redirectUrl = resolvePaymentRedirectUrl({
      paymentMethod: validatedData.paymentMethod,
      paymentId: payment.id,
      orderId: order.id,
      isSandbox,
    })

    return NextResponse.json({
      success: true,
      payment,
      isSandbox,
      paymentGatewayResponse: {
        redirectUrl,
        transactionId: payment.id,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Checkout initialization failed' }, { status: 500 })
  }
}
