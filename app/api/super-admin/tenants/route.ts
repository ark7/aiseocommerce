import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import {
  TenantDuplicationInputSchema,
  provisionTenantStore,
} from '@/lib/tenantProvisioner';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  if (!isControlPlaneEnabled()) {
    return NextResponse.json(
      { error: 'Portal Super-Admin Control Plane dinonaktifkan pada instance ini.' },
      { status: 404 }
    );
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json(
      {
        error:
          'Akses Ditolak (403): Hanya akun tunggal pemilik (Super-Admin) yang diizinkan melihat daftar duplikasi website pelanggan.',
      },
      { status: 403 }
    );
  }

  try {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        settings: {
          select: {
            primaryColor: true,
            fontFamily: true,
            tagline: true,
            defaultPageSize: true,
          },
        },
        users: {
          where: { role: 'ADMIN' },
          take: 1,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
            users: true,
            categories: true,
            landingPages: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      ownerEmail: owner.email,
      tenants: stores.map((store) => ({
        id: store.id,
        name: store.name,
        domain: store.domain,
        email: store.email,
        phone: store.phone,
        address: store.address,
        createdAt: store.createdAt,
        primaryColor: store.settings?.primaryColor || '#4F46E5',
        fontFamily: store.settings?.fontFamily || 'inter',
        tagline: store.settings?.tagline || '',
        defaultPageSize: store.settings?.defaultPageSize || 10,
        adminUser: store.users[0] || null,
        counts: store._count,
      })),
    });
  } catch (error) {
    logger.error(
      'Failed to list tenants in Super-Admin Control Plane',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Gagal memuat daftar website pelanggan' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isControlPlaneEnabled()) {
    return NextResponse.json(
      { error: 'Portal Super-Admin Control Plane dinonaktifkan pada instance ini.' },
      { status: 404 }
    );
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json(
      {
        error:
          'Akses Ditolak (403): Hanya akun tunggal pemilik (Super-Admin) yang diizinkan melakukan proses duplikasi website pelanggan.',
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = TenantDuplicationInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Data form duplikasi tidak valid',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const result = await provisionTenantStore(parsed.data);

    // Log audit entry for store duplication
    if (typeof (prisma as any).auditLog?.create === 'function') {
      await prisma.auditLog
        .create({
          data: {
            storeId: result.store.id,
            action: 'SUPER_ADMIN_DUPLICATE_STORE',
            entityType: 'STORE',
            entityId: result.store.id,
            newValue: JSON.stringify({
              duplicatedByOwner: owner.email,
              domain: result.store.domain,
              adminEmail: result.adminUser.email,
              seedPreset: parsed.data.seedPreset,
              subscriptionPlan: parsed.data.subscriptionPlan,
              expiresAt: parsed.data.expiresAt || null,
            }),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        message: `Website pelanggan "${result.store.name}" (${result.store.domain}) berhasil diduplikasi dan diinisialisasi!`,
        result,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      'Failed to duplicate tenant store',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat memproses duplikasi website pelanggan',
      },
      { status: 500 }
    );
  }
}

