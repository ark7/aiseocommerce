import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { auditOrderStatusChanged } from '@/services/auditService'

interface RouteContext {
  params: { id: string }
}

// The customer confirms the goods arrived.
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.storeId !== user.storeId || order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'SHIPPED') {
      return NextResponse.json({ error: 'Order has not been shipped yet' }, { status: 400 })
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    })

    await auditOrderStatusChanged(order.id, user.id, order.storeId, order.status, 'DELIVERED')

    return NextResponse.json({ success: true, order: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to confirm receipt' }, { status: 500 })
  }
}
