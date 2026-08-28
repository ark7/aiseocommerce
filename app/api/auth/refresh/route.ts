import { NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth';
import { z } from 'zod';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = refreshSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }
    
    const result = await refreshAccessToken(validation.data.refreshToken);
    if (!result) return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    
    return NextResponse.json({ success: true, token: result.token, refreshToken: result.refreshToken });
  } catch (error) {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
