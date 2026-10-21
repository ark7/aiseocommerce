import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';
import { requiredTierFor, meetsTier } from '@/lib/tiers';
import { generateGuestToken, verifyGuestToken } from '@/lib/guestSession';
import { prisma } from '@/lib/prisma';

// Lazy load jose for JWT verification (Node.js only)
let jwtVerifyCache: any = null;

async function getJwtVerify() {
  if (!jwtVerifyCache) {
    const jose = await import('jose');
    jwtVerifyCache = jose.jwtVerify;
  }
  return jwtVerifyCache;
}

// Simple UUID v4 generator (Edge-compatible)
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${timestamp}-${random}`;
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
  return request.cookies?.get('token')?.value || null;
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
  const requestId = generateRequestId();
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

  // Redirect legacy multi-tenant paths (/:storeDomain/*) to clean standalone paths (/*)
  const segments = path.split('/').filter(Boolean);
  const standaloneFirstSegments = [
    'products', 'product', 'categories', 'category', 'articles', 'penawaran', 'lp',
    'cart', 'orders', 'admin', 'super-admin', 'login', 'register', 'terms', 'privacy',
    'syarat-ketentuan', 'kebijakan-privasi', 'unauthorized', 'api',
    '_next', 'static'
  ];

  if (
    segments.length >= 2 &&
    !standaloneFirstSegments.includes(segments[0]) &&
    ['products', 'product', 'categories', 'category', 'articles', 'penawaran', 'cart', 'orders', 'lp'].includes(segments[1])
  ) {
    const targetPath = '/' + segments.slice(1).join('/');
    const redirectUrl = new URL(targetPath, request.url);
    redirectUrl.search = request.nextUrl.search;
    logger.info(`Redirecting legacy storeDomain route to clean route: ${path} -> ${targetPath}`, logContext);
    return NextResponse.redirect(redirectUrl, 301);
  } else if (segments.length === 1 && !standaloneFirstSegments.includes(segments[0]) && !segments[0].includes('.')) {
    const redirectUrl = new URL('/', request.url);
    redirectUrl.search = request.nextUrl.search;
    logger.info(`Redirecting legacy storeDomain storefront route: ${path} -> /`, logContext);
    return NextResponse.redirect(redirectUrl, 301);
  }

  // 1. Resolve identity (User or Guest)
  const token = extractToken(request);
  let currentRole: string | null = null;
  let userId: string | null = null;
  let storeId: string | null = null;

  if (token) {
    const user = await verifyJWT(token);
    if (user) {
      currentRole = user.role;
      userId = user.id;
      storeId = user.storeId;
    } else {
      const guest = await verifyGuestToken(token);
      if (guest) {
        currentRole = guest.role;
        userId = guest.sub;
        storeId = guest.storeId;
      }
    }
  }

  // 2. Handle Guest Session Issuance
  const isDocumentRequest = !path.startsWith('_next') &&
                            !path.startsWith('/static') &&
                            !path.startsWith('/api') &&
                            !path.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js)$/);

  if (!currentRole && isDocumentRequest) {
    const host = request.headers.get('host') || '';
    let domain = host.split(':')[0];
    if (domain === 'localhost' || domain === '127.0.0.1') {
      const segment = path.split('/')[1];
      const standaloneRoutes = ['products', 'product', 'categories', 'category', 'articles', 'penawaran', 'cart', 'orders', 'admin', 'super-admin', 'login', 'register', 'terms', 'privacy', 'syarat-ketentuan', 'kebijakan-privasi', 'lp'];
      if (!segment || standaloneRoutes.includes(segment)) {
        domain = process.env.DEFAULT_STORE_DOMAIN || process.env.LANDING_STORE_DOMAIN || 'demo-store';
      } else {
        domain = segment;
      }
    }

    if (domain) {
      const guestToken = await generateGuestToken(domain);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', 'guest-' + Math.random().toString(36).substring(7));
      requestHeaders.set('x-user-role', 'GUEST');

      logger.info(`Issued guest session`, { ...logContext, domain });
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      res.cookies.set('token', guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return addCorsHeaders(res);
    }
  }

  // 3. Enforce Tiers
  const required = requiredTierFor(path);
  if (currentRole && !meetsTier(currentRole as any, required)) {
    logger.warn('Forbidden: Insufficient tier', { ...logContext, role: currentRole, required });
    if (path.startsWith('/api/')) {
      return addCorsHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 401 }));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Legacy Protected Paths (Staff/Admin check)
  if (isProtectedPath(path)) {
    if (!currentRole) {
      logger.warn('Unauthorized: No token', logContext);
      if (path.startsWith('/api/')) {
        return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
    if ((path.startsWith('/admin') || path.startsWith('/api/admin')) && currentRole !== 'ADMIN') {
      logger.warn('Forbidden: Insufficient permissions', { ...logContext, userId: userId || undefined, role: currentRole });
      if (path.startsWith('/api/')) {
        return addCorsHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (userId) {
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-role', currentRole!);
    requestHeaders.set('x-user-store', storeId || '');
  }
  requestHeaders.set('x-request-id', requestId);

  const duration = Date.now() - startTime;
  logger.info(`Request completed`, { ...logContext, duration });
  return addCorsHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: '/:path*',
  runtime: 'nodejs',
};

export { getIPAddress, checkLoginBruteForce, incrementLoginAttempts, verifyJWT as verifyToken, isProtectedPath, extractToken };
