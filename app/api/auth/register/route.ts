import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { registerUser } from '@/lib/auth';
import { z } from 'zod';
import { verifyTurnstile, isTurnstileRequired } from '@/lib/turnstile';
import { getIPAddress } from '@/lib/ip';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  turnstileToken: z.string().optional(),
  storeId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { email, password, firstName, lastName, phone, turnstileToken, storeId: bodyStoreId } = validation.data;
    const ip = getIPAddress(request);
    const host = request.headers.get('host');
    const domain = host?.split(':')[0];

    let store = await prisma.store.findUnique({
      where: { domain },
      include: { settings: true }
    });
    if (!store && bodyStoreId) {
      store = await prisma.store.findUnique({
        where: { id: bodyStoreId },
        include: { settings: true }
      });
    }
    if (!store) {
      store = await getActiveStore(domain);
      if (!store) {
        return NextResponse.json({ error: 'No store configured' }, { status: 500 });
      }
    }

    // Turnstile verification
    const { required, error: configError } = isTurnstileRequired(
      store.settings?.turnstileEnabled ?? false,
      store.settings?.turnstileSecretKey
    );

    if (required) {
      if (configError) {
        return NextResponse.json({ error: configError }, { status: 500 });
      }
      if (!turnstileToken) {
        return NextResponse.json({ error: 'Turnstile verification required' }, { status: 400 });
      }
      const verified = await verifyTurnstile(
        store.settings?.turnstileSecretKey || '',
        turnstileToken,
        ip
      );
      if (!verified) {
        return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 400 });
      }
    }

    const existingUser = await prisma.user.findFirst({ where: { storeId: store.id, email } });
    if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    const result = await registerUser(store.id, email, password, firstName, lastName, 'CUSTOMER');
    if (!result) return NextResponse.json({ error: 'Registration failed' }, { status: 500 });

    const response = NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, role: result.user.role, storeId: result.user.storeId, firstName: result.user.firstName, lastName: result.user.lastName },
      token: result.token,
      refreshToken: result.refreshToken,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set('active_store_domain', store.domain, {
      httpOnly: false,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
