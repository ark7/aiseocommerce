import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { parseCustomFeesConfig } from '@/lib/invoiceService'

interface RouteContext {
  params: { id: string }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            domain: true,
            logo: true,
            address: true,
            phone: true,
            email: true,
            settings: {
              select: {
                invoiceNotes: true,
                taxEnabled: true,
                taxLabel: true,
                taxRate: true,
                invoiceShowTax: true,
                invoiceShowCustomFees: true,
                customFeesConfig: true,
                smtpEnabled: true,
                smtpHost: true,
              },
            },
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                productType: true,
                digitalFileUrl: true,
                digitalInstructions: true,
                eventStartDate: true,
                eventEndDate: true,
                eventLocationType: true,
                eventVenueName: true,
                eventLocationAddress: true,
                eventBenefits: true,
                images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
              },
            },
          },
        },
        // proofData is deliberately excluded - it is the raw uploaded image.
        payments: {
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            proofFile: true,
            proofUrl: true,
            verifiedAt: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'CUSTOMER' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { store: storeRel, ...orderWithoutStore } = order
    const storeSettings = storeRel?.settings

    const storeInfo = storeRel
      ? {
          id: storeRel.id,
          name: storeRel.name,
          domain: storeRel.domain,
          logo: storeRel.logo,
          address: storeRel.address,
          phone: storeRel.phone,
          email: storeRel.email,
          invoiceNotes: storeSettings?.invoiceNotes ?? null,
        }
      : null

    const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'STAFF'
    const smtpReady = isStaffOrAdmin
      ? Boolean(storeSettings?.smtpEnabled && storeSettings?.smtpHost)
      : false

    const invoiceDefaults = isStaffOrAdmin
      ? {
          taxEnabled: Boolean(storeSettings?.taxEnabled),
          taxLabel: storeSettings?.taxLabel || 'PPN',
          taxRate: storeSettings?.taxRate ?? 0,
          invoiceShowTax: storeSettings?.invoiceShowTax ?? true,
          invoiceShowCustomFees: storeSettings?.invoiceShowCustomFees ?? true,
          customFeesConfig: parseCustomFeesConfig(storeSettings?.customFeesConfig),
        }
      : undefined

    return NextResponse.json({
      success: true,
      order: orderWithoutStore,
      storeInfo,
      smtpReady,
      ...(invoiceDefaults ? { invoiceDefaults } : {}),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}
