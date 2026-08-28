import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerUser } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }
    
    const { email, password, firstName, lastName, phone } = validation.data;
    const host = request.headers.get('host');
    const domain = host?.split(':')[0];
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    
    const existingUser = await prisma.user.findFirst({ where: { storeId: store.id, email } });
    if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    
    const result = await registerUser(store.id, email, password, firstName, lastName, 'CUSTOMER');
    if (!result) return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    
    return NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, role: result.user.role, storeId: result.user.storeId, firstName: result.user.firstName, lastName: result.user.lastName },
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
