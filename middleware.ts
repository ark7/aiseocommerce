import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

// Lazy load Node.js-specific modules
let jwtVerifyCache: any = null;
let randomUUIDCache: (() => string) | null = null;

async function getJwtVerify() {
  if (!jwtVerifyCache) {
    const jose = await import('jose');
    jwtVerifyCache = jose.jwtVerify;
  }
  return jwtVerifyCache;
}

async function getRandomUUID() {
  if (!randomUUIDCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    randomUUIDCache = crypto.randomUUID;
  }
  return randomUUIDCache;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

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
    const jwtVerify = await getJwtVerify();
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

const ALLOWED_ORIGINS = [
  'https://localhost:3000',
  'http://localhost:3000',
];

function addCorsHeaders(response: NextResponse): NextResponse {
  const origin = response.headers.get('origin') || ALLOWED_ORIGINS[0];
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip = getIPAddress(request);
  const requestId = (await getRandomUUID())();
  const userAgent = request.headers.get('user-agent') || '';
  const startTime = Date.now();
  
  const logContext = {
    requestId,
    ip,
    method: request.method,
    path,
    userAgent: userAgent.substring(0, 100),
  };
  
  logger.info(`Request started`, logContext);
  
  if (request.method === 'OPTIONS') {
    logger.info(`CORS preflight`, logContext);
    return addCorsHeaders(
      NextResponse.json({}, { status: 200 })
    );
  }
  
  if (!(await checkRateLimit(ip, path))) {
    logger.warn('Rate limit exceeded', logContext);
    return addCorsHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    );
  }
  
  if (path === '/api/auth/login' && request.method === 'POST') {
    if (!(await checkLoginBruteForce(ip))) {
      logger.warn('Too many login attempts', logContext);
      return addCorsHeaders(
        NextResponse.json({ error: 'Too many login attempts' }, { status: 429 })
      );
    }
  }
  
  if (isProtectedPath(path)) {
    const token = extractToken(request);
    if (!token) {
      logger.warn('Unauthorized: No token', logContext);
      if (path.startsWith('/api/')) {
        return addCorsHeaders(
          NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
    
    const user = await verifyJWT(token);
    if (!user) {
      logger.warn('Invalid token', { ...logContext, tokenPreview: token.substring(0, 8) });
      if (path.startsWith('/api/')) {
        return addCorsHeaders(
          NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
    
    logger.info('Authentication successful', { ...logContext, userId: user.id, role: user.role });
    
    if ((path.startsWith('/admin') || path.startsWith('/api/admin')) && user.role !== 'ADMIN') {
      logger.warn('Forbidden: Insufficient permissions', { ...logContext, userId: user.id, role: user.role });
      if (path.startsWith('/api/')) {
        return addCorsHeaders(
          NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-store', user.storeId);
    requestHeaders.set('x-request-id', requestId);
    
    const duration = Date.now() - startTime;
    logger.info(`Request completed`, { ...logContext, userId: user.id, duration });
    
    return addCorsHeaders(
      NextResponse.next({ request: { headers: requestHeaders } })
    );
  }
  
  const duration = Date.now() - startTime;
  logger.info(`Request completed`, { ...logContext, duration });
  return addCorsHeaders(NextResponse.next());
}

export const config = {
  matcher: '/:path*',
  runtime: 'nodejs', // Use Node.js runtime instead of Edge Runtime
};

export { getIPAddress, checkLoginBruteForce, incrementLoginAttempts, verifyJWT as verifyToken, isProtectedPath, extractToken };
