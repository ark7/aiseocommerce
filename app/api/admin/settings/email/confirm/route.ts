import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbacServer';
import { confirmOwnershipChallengeCode } from '@/lib/emailService';
import { z } from 'zod';

const ConfirmRequestSchema = z.object({
  code: z.string().min(4, 'Kode verifikasi minimal 4 karakter'),
});

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, 'settings');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

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
