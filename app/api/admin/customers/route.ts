import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser, type UserPayload } from '@/lib/auth';
import { logger } from '@/lib/logger';

const QuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const STAFF_ROLES = ['ADMIN', 'STAFF'];

/** Never select passwordHash — this response reaches the browser. */
const CUSTOMER_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
} as const;

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { search, page, limit } = QuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    const where = {
      storeId: user.storeId,
      role: 'CUSTOMER' as const,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: CUSTOMER_FIELDS,
      }),
      prisma.user.count({ where }),
    ]);

    // One grouped query for the whole page instead of one per customer.
    const ids = customers.map((customer) => customer.id);
    const aggregates = ids.length
      ? await prisma.order.groupBy({
          by: ['userId'],
          where: { storeId: user.storeId, userId: { in: ids } },
          _count: { _all: true },
          _sum: { totalAmount: true },
          _max: { createdAt: true },
        })
      : [];

    const byUser = new Map(aggregates.map((row) => [row.userId, row]));

    const summarized: CustomerSummary[] = customers.map((customer) => {
      const stats = byUser.get(customer.id);
      return {
        id: customer.id,
        name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email,
        email: customer.email,
        phone: customer.phone,
        isActive: customer.isActive,
        emailVerified: customer.emailVerified,
        createdAt: customer.createdAt,
        orderCount: stats?._count._all ?? 0,
        totalSpent: stats?._sum.totalAmount ?? 0,
        lastOrderAt: stats?._max.createdAt ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      customers: summarized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    logger.error('Failed to list customers', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to list customers' }, { status: 500 });
  }
}
