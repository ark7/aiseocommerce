import { NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth';
import { normalizePermissions } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const user = await getUserById(payload.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const permissions = normalizePermissions((user as any).permissions);
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        storeId: user.storeId,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        title: (user as any).title ?? null,
        permissions,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
