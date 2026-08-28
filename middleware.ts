import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const PROTECTED_PATHS = [
  /^\/admin/,
  /^\/api\/admin/,
  /^\/dashboard/,
  /^\/account/,
];

const EXCLUDED_FROM_RATE_LIMIT = [
  /^\/api\/webhook/,
  /^\/favicon\.ico/,
  /^\/_next/,
  /^\/static/,
];

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const GENERAL_RATE_LIMIT = 100;

const rateLimitMemory = new Map<string, { count: number; resetTime: number }>();

function getIPAddress(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  return request.ip || 'unknown';
}

async function checkRateLimit(ip: string, path: string): Promise<boolean> {
  if (EXCLUDED_FROM_RATE_LIMIT.some(regex => regex.test(path))) return true;
  
  const key = `rate_limit:${ip}`;
  const existing = rateLimitMemory.get(key);
  const now = Date.now();
  
  if (existing) {
    if (now > existing.resetTime) {
      rateLimitMemory.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return true;
    }
    if (existing.count >= GENERAL_RATE_LIMIT) return false;
    existing.count++;
    return true;
  }
  
  rateLimitMemory.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  return true;
}

async function checkLoginBruteForce(ip: string): Promise<boolean> {
  const key = `login_attempts:${ip}`;
  const existing = rateLimitMemory.get(key);
  const now = Date.now();
  
  if (existing) {
    if (now > existing.resetTime) {
      rateLimitMemory.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return true;
    }
    return existing.count < MAX_LOGIN_ATTEMPTS;
  }
  
  rateLimitMemory.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  return true;
}

async function incrementLoginAttempts(ip: string): Promise<void> {
  const key = `login_attempts:${ip}`;
  const existing = rateLimitMemory.get(key);
  if (existing && Date.now() < existing.resetTime) {
    existing.count++;
  }
}

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return payload as { id: string; storeId: string; role: string; email: string };
  } catch {
    return null;
  }
}

function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some(regex => regex.test(path));
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);
  return request.cookies.get('token')?.value || null;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip = getIPAddress(request);
  
  if (!(await checkRateLimit(ip, path))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  
  if (path === '/api/auth/login' && request.method === 'POST') {
    if (!(await checkLoginBruteForce(ip))) {
      return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
    }
  }
  
  if (isProtectedPath(path)) {
    const token = extractToken(request);
    if (!token) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
    
    const user = await verifyJWT(token);
    if (!user) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
    
    if ((path.startsWith('/admin') || path.startsWith('/api/admin')) && user.role !== 'ADMIN') {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-store', user.storeId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};

export { getIPAddress, checkLoginBruteForce, incrementLoginAttempts, verifyJWT as verifyToken, isProtectedPath, extractToken };
