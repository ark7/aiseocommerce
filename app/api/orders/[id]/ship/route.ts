import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireStoreRole } from '@/lib/auth'
import { auditOrderStatusChanged } from '@/services/auditService'

const ShipSchema = z.object({
  trackingUrl: z.string().url().max(2000),
})

interface RouteContext {
  params: { id: string }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const user = await requireStoreRole(request, order.storeId, ['ADMIN', 'STAFF'])
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: 'Order must be PROCESSING before it can be shipped' },
        { status: 400 }
      )
    }

    const { trackingUrl } = ShipSchema.parse(await request.json())

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'SHIPPED', trackingUrl, shippedAt: new Date() },
    })

    await auditOrderStatusChanged(order.id, user.id, order.storeId, order.status, 'SHIPPED')

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to ship order' }, { status: 500 })
  }
}
