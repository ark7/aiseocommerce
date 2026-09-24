import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

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

    // Create a payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: validatedData.paymentMethod,
        amount: order.totalAmount,
        status: 'PENDING',
      },
    })

    // Generate redirect URL based on payment method (Mocked for gateway integration)
    let redirectUrl = `/checkout/success?orderId=${order.id}`
    if (validatedData.paymentMethod === 'MIDTRANS' || validatedData.paymentMethod === 'FLIP') {
      redirectUrl = `https://simulator.payment-gateway.example.com/pay/${payment.id}`
    }

    return NextResponse.json({
      success: true,
      payment,
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
