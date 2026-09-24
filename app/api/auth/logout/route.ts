import { NextResponse } from 'next/server';
import { verifyToken, logoutUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    
    await logoutUser(token);

    // Clear the middleware session cookie too, or /admin stays reachable.
    const response = NextResponse.json({ success: true, message: 'Logout successful' });
    response.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
    response.cookies.set('refreshToken', '', { httpOnly: true, path: '/', maxAge: 0 });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
