import { NextResponse } from 'next/server'
import { createOrder } from '@/services/transactionService'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod'
import { AttributionSchema } from '@/lib/attribution'

// Define schema for order creation
// Prisma ids are cuids, and seeded rows use plain strings like demo-store-001,
// so uuid() rejected every real id.
const OrderSchema = z.object({
  storeId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  customerId: z.string().min(1).optional(),
  // Campaign source captured on the storefront; validated and length-capped
  // before it reaches the Order.attribution JSON column.
  attribution: AttributionSchema.optional(),
})

// List orders for the caller's store. Customers only see their own.
export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

    const where: { storeId: string; status?: OrderStatus; userId?: string } = { storeId: user.storeId }
    if (status) where.status = status as OrderStatus
    if (user.role === 'CUSTOMER') where.userId = user.id

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        orderItems: { include: { product: { select: { id: true, name: true, slug: true } } } },
        payments: { select: { id: true, method: true, status: true, amount: true } },
      },
    })

    return NextResponse.json({ success: true, orders })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = OrderSchema.parse(body)

    // Create order
    const order = await createOrder(
      validatedData.storeId,
      validatedData.items,
      validatedData.customerId,
      validatedData.attribution
    )

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}