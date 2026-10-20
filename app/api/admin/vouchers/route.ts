import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';
import { auditVoucherCreated } from '@/services/auditService';

const voucherSchema = z.object({
  code: z.string().min(1, 'Kode voucher harus diisi'),
  name: z.string().min(1, 'Nama voucher harus diisi'),
  description: z.string().optional(),
  type: z.enum(['FIXED', 'PERCENT'], {
    errorMap: () => ({ message: 'Tipe voucher harus FIXED atau PERCENT' }),
  }),
  value: z.coerce.number().min(0, 'Nilai voucher harus positif'),
  maxDiscount: z.coerce.number().min(0).optional().nullable(),
  minPurchase: z.coerce.number().min(0).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  quota: z.coerce.number().min(0).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
});

const UNIQUE_VIOLATION = 'P2002';

function uniqueViolationMessage(error: unknown): string | null {
  if ((error as { code?: string } | null)?.code !== UNIQUE_VIOLATION) return null;

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');

  if (fields.includes('code') || fields === '') return 'Kode voucher sudah dipakai';
  return 'Ada field yang sudah digunakan';
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where: { storeId: user.storeId },
        orderBy: { [orderBy]: orderDirection },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.voucher.count({ where: { storeId: user.storeId } }),
    ]);

    return NextResponse.json({
      success: true,
      vouchers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Failed to fetch vouchers', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validation = voucherSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    // Validate percentage value
    if (validation.data.type === 'PERCENT' && validation.data.value > 100) {
      return NextResponse.json({ error: 'Persentase tidak boleh lebih dari 100' }, { status: 400 });
    }

    // Validate date window
    if (validation.data.startsAt && validation.data.endsAt &&
        new Date(validation.data.startsAt) >= new Date(validation.data.endsAt)) {
      return NextResponse.json({ error: 'Tanggal berakhir harus setelah tanggal mulai' }, { status: 400 });
    }

    // Convert code to uppercase for consistency
    const voucherData = {
      ...validation.data,
      code: validation.data.code.toUpperCase(),
    };

    const voucher = await prisma.voucher.create({
      data: {
        storeId: user.storeId,
        ...voucherData,
      },
    });

    await auditVoucherCreated(
      voucher.id,
      user.id,
      user.storeId,
      {
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        value: voucher.value,
        isActive: voucher.isActive,
      },
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, voucher });
  } catch (error) {
    const duplicate = uniqueViolationMessage(error);
    if (duplicate) {
      return NextResponse.json({ error: duplicate }, { status: 400 });
    }

    logger.error('Failed to create voucher', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to create voucher' }, { status: 500 });
  }
}