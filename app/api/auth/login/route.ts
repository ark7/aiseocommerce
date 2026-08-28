import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loginUser } from '@/lib/auth';
import { getIPAddress, incrementLoginAttempts } from '@/middleware';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }
    
    const { email, password } = validation.data;
    const ip = getIPAddress(request);
    
    const host = request.headers.get('host');
    const domain = host?.split(':')[0];
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    
    const result = await loginUser(store.id, email, password, request);
    if (!result) {
      await incrementLoginAttempts(ip);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    if (!result.user.isActive) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }
    
    return NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, role: result.user.role, storeId: result.user.storeId, firstName: result.user.firstName, lastName: result.user.lastName },
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
