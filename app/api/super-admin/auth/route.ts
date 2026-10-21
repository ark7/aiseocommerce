import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isControlPlaneEnabled,
  verifyOwnerCredentials,
  generateSuperAdminToken,
  requireSuperAdminOwner,
} from '@/lib/superAdminAuth';
import { logger } from '@/lib/logger';

const LoginSchema = z.object({
  email: z.string().email('Email Super-Admin tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

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
      { authenticated: false, error: 'Akses ditolak. Hanya akun pemilik utama yang diizinkan.' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    owner,
  });
}

export async function POST(request: Request) {
  if (!isControlPlaneEnabled()) {
    return NextResponse.json(
      { error: 'Portal Super-Admin Control Plane dinonaktifkan pada instance ini.' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input tidak valid' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const isValid = await verifyOwnerCredentials(email, password);

    if (!isValid) {
      logger.warn('Failed Super-Admin Control Plane login attempt', { email });
      return NextResponse.json(
        {
          error:
            'Kredensial tidak valid. Hanya akun tunggal pemilik (Super-Admin) yang dapat mengakses portal duplikasi ini.',
        },
        { status: 401 }
      );
    }

    const token = generateSuperAdminToken(email);
    const response = NextResponse.json({
      success: true,
      token,
      owner: {
        email: email.trim().toLowerCase(),
        role: 'SUPER_ADMIN_OWNER',
      },
    });

    response.cookies.set('super_admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 jam
    });

    return response;
  } catch (error) {
    logger.error('Super-Admin auth error', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('super_admin_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
