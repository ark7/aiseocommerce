import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbacServer';
import { sendOwnershipChallengeCode } from '@/lib/emailService';
import { z } from 'zod';

const VerifyRequestSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  host: z.string().optional(),
  port: z.coerce.number().optional(),
  secure: z.boolean().optional(),
  user: z.string().optional().nullable(),
  pass: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, 'settings');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

    const body = await request.json();
    const parsed = VerifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, ...configOverrides } = parsed.data;
    const result = await sendOwnershipChallengeCode(user.storeId, email, configOverrides);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memproses verifikasi email' },
      { status: 500 }
    );
  }
}
