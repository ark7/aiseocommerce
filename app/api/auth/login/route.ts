import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loginUser } from '@/lib/auth';
import { getIPAddress } from '@/lib/ip';
import { z } from 'zod';

// Simple rate limit tracking (in-memory, resets on each deploy)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

async function incrementLoginAttempts(ip: string): Promise<void> {
  const key = `login_attempts:${ip}`;
  const existing = loginAttempts.get(key);
  const now = Date.now();
  
  if (existing) {
    if (now > existing.resetTime) {
      loginAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else {
      existing.count++;
    }
  } else {
    loginAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }
}

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
