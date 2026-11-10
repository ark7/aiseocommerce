import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { getStoreErrors, markErrorResolved, ErrorSeverity, ErrorSource } from '@/services/telemetryService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['ADMIN', 'STAFF', 'OWNER'];

async function resolveUserOrSuperAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const user = await verifyToken(token);
  if (user && STAFF_ROLES.includes(user.role)) {
    return { isSuperAdmin: false, user };
  }

  const superAdmin = requireSuperAdminOwner(request);
  if (superAdmin) {
    return {
      isSuperAdmin: true,
      user: {
        id: 'super-admin-owner',
        email: superAdmin.email,
        name: 'Super Admin Owner',
        role: 'SUPER_ADMIN_OWNER',
        storeId: null as string | null,
      },
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveUserOrSuperAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Admin/Staff or Super-Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const severity = searchParams.get('severity') as ErrorSeverity | undefined;
    const source = searchParams.get('source') as ErrorSource | undefined;
    const resolvedParam = searchParams.get('resolved');
    const isResolved = resolvedParam === 'true' ? true : resolvedParam === 'false' ? false : undefined;
    const queryStoreId = searchParams.get('storeId');

    // Super admin can filter any store or see all; regular staff is restricted to their store
    const storeId = auth.isSuperAdmin
      ? (queryStoreId || undefined)
      : (auth.user.storeId || undefined);

    const result = await getStoreErrors({
      storeId,
      severity,
      source,
      isResolved,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to list system error logs', undefined, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to retrieve error logs' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await resolveUserOrSuperAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Admin/Staff or Super-Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { errorId } = body;

    if (!errorId || typeof errorId !== 'string') {
      return NextResponse.json({ error: 'Missing errorId' }, { status: 400 });
    }

    // Tenant check: error must belong to user.storeId if not super admin
    if (!auth.isSuperAdmin && auth.user.storeId) {
      const existing = await prisma.systemErrorLog.findUnique({
        where: { id: errorId },
        select: { storeId: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Error log not found' }, { status: 404 });
      }

      if (existing.storeId && existing.storeId !== auth.user.storeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updated = await markErrorResolved(errorId, auth.user.email);

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    logger.error('Failed to resolve system error log', undefined, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to update error log' }, { status: 500 });
  }
}