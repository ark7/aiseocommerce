import { NextResponse } from 'next/server'
import { PriceChangedError, VoucherError, createOrder } from '@/services/transactionService'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod'
import { AttributionSchema } from '@/lib/attribution'
import { getIPAddress } from '@/lib/ip'
import { allow } from '@/lib/rateLimit'

/**
 * Order creation reserves stock and sale quota while the order is still
 * PENDING, and guest checkout is deliberately open, so without a ceiling an
 * anonymous caller can empty a sale by starting orders it never pays for.
 * Well above what a real shopper does; well below what a script wants.
 */
const ORDERS_PER_WINDOW = 20

// Define schema for order creation
// Prisma ids are cuids, and seeded rows use plain strings like demo-store-001,
// so uuid() rejected every real id.
const OrderSchema = z.object({
  // No `storeId` and no `customerId`: both come from the token now. Accepting
  // them here let a caller order as anyone.
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  // Campaign source captured on the storefront; validated and length-capped
  // before it reaches the Order.attribution JSON column.
  attribution: AttributionSchema.optional(),
  // Kode voucher yang diketik pelanggan. Kelayakannya diputus ulang di server.
  voucherCode: z.string().trim().min(1).max(32).optional(),
  // Harga yang ditampilkan keranjang, per productId. Dikirim klien supaya
  // server bisa menolak kalau harga sudah bergeser, bukan menagih diam-diam.
  expectedUnitPrices: z.record(z.string(), z.number().nonnegative()).optional(),
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
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100)
    const page = Math.max(Number(searchParams.get('page')) || 1, 1)

    const where: { storeId: string; status?: OrderStatus; userId?: string } = { storeId: user.storeId }
    if (status) where.status = status as OrderStatus
    if (user.role === 'CUSTOMER') where.userId = user.id

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          orderItems: { include: { product: { select: { id: true, name: true, slug: true } } } },
          payments: { select: { id: true, method: true, status: true, amount: true } },
        },
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      orders,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!allow(`orders:${getIPAddress(request)}`, ORDERS_PER_WINDOW)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
        { status: 429 }
      )
    }

    // An order needs an owner. Letting the caller name one let a guest write
    // into a stranger's order history and spend the voucher that stranger had
    // claimed; the storefront now sends guests to sign in first.
    const user = await requireUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Masuk dulu untuk melanjutkan' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = OrderSchema.parse(body)

    // Create order. Both the store and the customer come from the token, so
    // there is nothing in the body left for a caller to lie about.
    const order = await createOrder(
      user.storeId,
      validatedData.items,
      user.id,
      validatedData.attribution,
      validatedData.voucherCode,
      validatedData.expectedUnitPrices
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

    // The shelf moved since the cart was filled. The order was rolled back, so
    // nothing was charged; the client shows the new prices and asks again.
    if (error instanceof PriceChangedError) {
      return NextResponse.json(
        { error: error.message, code: 'PRICE_CHANGED', changes: error.changes },
        { status: 409 }
      )
    }

    // 409, not 400: the request was well formed, the voucher just is not
    // usable on this order. `message` is already customer-readable.
    if (error instanceof VoucherError) {
      return NextResponse.json(
        { error: error.message, code: 'VOUCHER_REJECTED', reason: error.reason },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}