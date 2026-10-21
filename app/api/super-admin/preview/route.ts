import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const redirectPath = searchParams.get('redirect') || '/';
  const clear = searchParams.get('clear') === 'true';

  const redirectUrl = new URL(redirectPath, request.url);
  const response = NextResponse.redirect(redirectUrl);

  if (clear || !domain) {
    response.cookies.set('preview_store_domain', '', {
      path: '/',
      maxAge: 0,
      httpOnly: false,
    });
    return response;
  }

  response.cookies.set('preview_store_domain', domain.trim().toLowerCase(), {
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
    httpOnly: false,
    sameSite: 'lax',
  });

  return response;
}
