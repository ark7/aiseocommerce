import { NextResponse } from 'next/server'
import { PriceChangedError, VoucherError, ProductUnavailableError, createOrder } from '@/services/transactionService'
import { dispatchOrderCreatedNotification } from '@/lib/orderNotificationService'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod'
import { AttributionSchema } from '@/lib/attribution'
import { getIPAddress } from '@/lib/ip'
import { allow } from '@/lib/rateLimit'
import { MixedCartSandboxError, SandboxModeDisabledError } from '@/lib/paymentGateway'
import { logger } from '@/lib/logger'

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
      name: z.string().optional(),
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sandboxParam = searchParams.get('sandbox')
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100)
    const page = Math.max(Number(searchParams.get('page')) || 1, 1)

    const where: { storeId: string; status?: OrderStatus; userId?: string; createdAt?: any; isSandbox?: boolean } = { storeId: user.storeId }
    if (status) where.status = status as OrderStatus
    if (user.role === 'CUSTOMER') where.userId = user.id
    // Staff see real orders unless they ask otherwise (`true` = sandbox only,
    // `all` = both), so test orders never pollute the working list. A customer
    // always sees every order they placed, including their own sandbox ones.
    if (user.role !== 'CUSTOMER') {
      if (sandboxParam === 'true') where.isSandbox = true
      else if (sandboxParam !== 'all') where.isSandbox = false
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        const start = new Date(startDate)
        if (!isNaN(start.getTime())) where.createdAt.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999)
          where.createdAt.lte = end
        }
      }
    }

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

    dispatchOrderCreatedNotification(order.id)

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

    // Sandbox rules, also well formed but not allowed. `message` is already
    // customer-readable.
    if (error instanceof MixedCartSandboxError) {
      return NextResponse.json(
        { error: error.message, code: 'SANDBOX_MIXED_CART' },
        { status: 409 }
      )
    }
    if (error instanceof SandboxModeDisabledError) {
      return NextResponse.json(
        { error: error.message, code: 'SANDBOX_DISABLED' },
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

    // Product unavailable: missing from store, insufficient stock, unpublished, or store mismatch.
    // Return 409 Conflict with structured metadata for client-side resolution.
    if (error instanceof ProductUnavailableError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'PRODUCT_UNAVAILABLE',
          productId: error.productId,
          productName: error.productName,
          reason: error.reason,
          availableStock: error.availableStock,
        },
        { status: 409 }
      )
    }

    logger.error('Failed to create order', {
      error,
      path: '/api/orders',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    const isClientFriendly =
      error instanceof Error &&
      (error.message.startsWith('Product') ||
        error.message.startsWith('Insufficient stock') ||
        error.message.includes('stock') ||
        error.message.includes('stok') ||
        error.message.includes('tidak ditemukan'));

    const errorMsg = isClientFriendly
      ? (error as Error).message
      : (error instanceof Error ? error.message : 'Failed to create order');

    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}