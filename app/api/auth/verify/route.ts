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
    const store = (user as any).store;
    const isDemo = Boolean(
      store?.isDemo ||
      store?.domain === 'demo.larismanis.online' ||
      store?.domain === 'demo-store.local' ||
      user.storeId === 'demo-store-001' ||
      user.email.endsWith('@demo-store.local')
    );

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
        isDemo,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
