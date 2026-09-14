import { NextResponse } from 'next/server'
import { createOrder } from '@/services/transactionService'
import { z } from 'zod'

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
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = OrderSchema.parse(body)

    // Create order
    const order = await createOrder(
      validatedData.storeId,
      validatedData.items,
      validatedData.customerId
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