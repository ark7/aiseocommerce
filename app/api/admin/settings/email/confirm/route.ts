import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { confirmOwnershipChallengeCode } from '@/lib/emailService';
import { z } from 'zod';

const ConfirmRequestSchema = z.object({
  code: z.string().min(4, 'Kode verifikasi minimal 4 karakter'),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ConfirmRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Kode verifikasi tidak valid' },
        { status: 400 }
      );
    }

    const result = await confirmOwnershipChallengeCode(user.storeId, parsed.data.code);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memverifikasi kode' },
      { status: 500 }
    );
  }
}
