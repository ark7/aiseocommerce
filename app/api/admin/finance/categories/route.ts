import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LedgerType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';
import { logAuditAction } from '@/services/auditService';

const STAFF_ROLES = ['ADMIN', 'STAFF'];

const QuerySchema = z.object({
  type: z.nativeEnum(LedgerType).optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const CreateSchema = z.object({
  type: z.nativeEnum(LedgerType),
  name: z.string().trim().min(1).max(80),
});

// `type` is deliberately absent: a category that changes type would strand the
// ledger rows already filed under the old one, and there is no cascade for it.
// Delete and re-create instead.
const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
});

const DeleteSchema = z.object({ id: z.string().min(1) });

// Reads the Authorization header via requireUser, so it can never be served
// statically. Without this Next attempts a static pass at build time, the
// handler's own try/catch swallows Next's bail-out error, and the route logs a
// "Dynamic server usage" error during every build.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Staff record transactions, so they need the picklist even though they
    // cannot change it.
    if (!STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Admin/Staff access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { type, includeInactive } = QuerySchema.parse({
      type: searchParams.get('type') ?? undefined,
      includeInactive: searchParams.get('includeInactive') ?? undefined,
    });

    // Scope comes from the token only. A `?storeId=` param would let any admin
    // read another store's configuration.
    const categories = await prisma.ledgerCategory.findMany({
      where: {
        storeId: user.storeId,
        ...(type ? { type } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    logger.error(
      'Failed to list ledger categories',
      undefined,
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { type, name } = CreateSchema.parse(await request.json());

    const duplicate = await prisma.ledgerCategory.findFirst({
      where: { storeId: user.storeId, type, name },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'Kategori sudah ada' }, { status: 400 });
    }

    const category = await prisma.ledgerCategory.create({
      data: { storeId: user.storeId, type, name },
    });

    await logAuditAction(
      'CREATE',
      'LEDGER_CATEGORY',
      category.id,
      user.id,
      user.storeId,
      null,
      { type, name, isActive: true },
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Kategori sudah ada' }, { status: 400 });
    }
    logger.error(
      'Failed to create ledger category',
      undefined,
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, name, isActive } = UpdateSchema.parse(await request.json());

    const existing = await prisma.ledgerCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    if (existing.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const renaming = name !== undefined && name !== existing.name;

    const [category] = renaming
      ? await prisma.$transaction([
          prisma.ledgerCategory.update({ where: { id }, data: { name } }),
          // The rename has to follow the rows already filed under the old name,
          // or the reports split in two. `type` is load-bearing: the same name
          // may exist under another type, and that type's rows must not move.
          prisma.ledger.updateMany({
            where: { storeId: user.storeId, type: existing.type, category: existing.name },
            data: { category: name },
          }),
        ])
      : [await prisma.ledgerCategory.update({ where: { id }, data: { name, isActive } })];

    await logAuditAction(
      'UPDATE',
      'LEDGER_CATEGORY',
      id,
      user.id,
      user.storeId,
      { name: existing.name, isActive: existing.isActive },
      { name: category.name, isActive: category.isActive },
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Kategori sudah ada' }, { status: 400 });
    }
    logger.error(
      'Failed to update ledger category',
      undefined,
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = DeleteSchema.parse(await request.json());

    const existing = await prisma.ledgerCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    if (existing.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Deleting would orphan the rows already filed under this name, so the
    // escape hatch is deactivating it instead.
    const inUse = await prisma.ledger.count({
      where: { storeId: user.storeId, type: existing.type, category: existing.name },
    });
    if (inUse > 0) {
      return NextResponse.json(
        { error: 'Kategori masih dipakai transaksi; nonaktifkan saja' },
        { status: 400 }
      );
    }

    await prisma.ledgerCategory.delete({ where: { id } });

    // The row is gone, so this snapshot is the only record of what it was.
    await logAuditAction(
      'DELETE',
      'LEDGER_CATEGORY',
      id,
      user.id,
      user.storeId,
      { type: existing.type, name: existing.name, isActive: existing.isActive },
      null,
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, message: 'Kategori dihapus' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    logger.error(
      'Failed to delete ledger category',
      undefined,
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
