import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';
import { requiredTierFor, meetsTier } from '@/lib/tiers';
import { generateGuestToken, verifyGuestToken } from '@/lib/guestSession';
import { TURNSTILE_PASS_COOKIE, verifyTurnstilePassToken } from '@/lib/turnstile';
import { prisma } from '@/lib/prisma';
import {
  isControlPlaneEnabled,
  isAllowedSuperAdminHost,
  extractRequestHost,
} from '@/lib/superAdminGuard';

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
const CATALOG_BURST_WINDOW_MS = 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const GENERAL_RATE_LIMIT = 100;

const MALICIOUS_SCANNER_UA_REGEX =
  /(sqlmap|nikto|masscan|nmap|zgrab|nuclei|dirbuster|gobuster|acunetix|nessus|openvas|havij)/i;
const SENSITIVE_PROBE_PATH_REGEX =
  /^\/(\.env|\.git|wp-config\.php|phpmyadmin|pma|vendor\/phpunit|cgi-bin)/i;

const rateLimitMemory = new Map<string, { count: number; resetTime: number }>();

/**
 * Detects automated vulnerability scanner signatures and common secret/config path probes
 * so they are rejected immediately before touching database queries.
 */
export function isMaliciousScannerRequest(path: string, userAgent: string): boolean {
  if (userAgent && MALICIOUS_SCANNER_UA_REGEX.test(userAgent)) {
    return true;
  }
  if (path && SENSITIVE_PROBE_PATH_REGEX.test(path)) {
    return true;
  }
  return false;
}

/**
 * Adaptive 1-minute burst limiter for catalog browsing and product searches.
 * Shoppers with a valid Cloudflare Turnstile session cookie receive generous limits,
 * while unverified IPs are capped tightly to block ILIKE query flooding and scrapers.
 */
export function checkCatalogAndSearchRateLimit(
  ip: string,
  path: string,
  searchQuery: string,
  hasTurnstilePass: boolean,
  now: number = Date.now()
): { allowed: boolean; retryAfterSec: number } {
  const isSearch = path === '/products' && searchQuery.trim().length > 0;
  const isCatalog =
    path === '/products' ||
    path.startsWith('/product/') ||
    path.startsWith('/category/');

  if (!isSearch && !isCatalog) {
    return { allowed: true, retryAfterSec: 0 };
  }

  const key = isSearch ? `search_burst:${ip}` : `catalog_burst:${ip}`;
  const limit = isSearch
    ? hasTurnstilePass
      ? 60
      : 15
    : hasTurnstilePass
      ? 180
      : 45;

  const existing = rateLimitMemory.get(key);
  if (!existing || now > existing.resetTime) {
    rateLimitMemory.set(key, { count: 1, resetTime: now + CATALOG_BURST_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  existing.count++;
  return { allowed: true, retryAfterSec: 0 };
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

  if (isMaliciousScannerRequest(path, userAgent)) {
    logger.warn('Blocked malicious scanner or sensitive path probe', logContext);
    return addCorsHeaders(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );
  }

  const turnstilePassCookie = request.cookies?.get(TURNSTILE_PASS_COOKIE)?.value;
  const hasTurnstilePass = verifyTurnstilePassToken(turnstilePassCookie, ip);
  const searchQuery = request.nextUrl.searchParams.get('search') || '';
  const burstCheck = checkCatalogAndSearchRateLimit(ip, path, searchQuery, hasTurnstilePass);
  if (!burstCheck.allowed) {
    logger.warn('Catalog/search burst rate limit exceeded', {
      ...logContext,
      hasTurnstilePass,
      retryAfterSec: burstCheck.retryAfterSec,
    });
    const res429 = NextResponse.json(
      { error: 'Too many requests. Please complete security verification or wait a moment.' },
      { status: 429 }
    );
    res429.headers.set('Retry-After', String(burstCheck.retryAfterSec));
    return addCorsHeaders(res429);
  }

  if (!(await checkRateLimit(ip, path))) {
    logger.warn('Rate limit exceeded', logContext);
    const res429 = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    res429.headers.set('Retry-After', '60');
    return addCorsHeaders(res429);
  }

  if (path === '/api/auth/login' && request.method === 'POST') {
    if (!(await checkLoginBruteForce(ip))) {
      logger.warn('Too many login attempts', logContext);
      return addCorsHeaders(
        NextResponse.json({ error: 'Too many login attempts' }, { status: 429 })
    );
    }
  }

  // Super-Admin Control Plane Isolation (Localhost & Whitelist Lockdown)
  if (path.startsWith('/super-admin') || path.startsWith('/api/super-admin')) {
    const host = extractRequestHost(request);
    const allowed = isControlPlaneEnabled(request) && (!host || isAllowedSuperAdminHost(host));

    if (!allowed) {
      logger.warn('Blocked attempt to access Super-Admin Control Plane on unallowed host/deployment', {
        ...logContext,
        host,
      });

      if (path.startsWith('/api/')) {
        return addCorsHeaders(
          NextResponse.json({ error: 'Not Found' }, { status: 404 })
        );
      }

      // Return a clean 404 rewrite so client stores appear to have no /super-admin page at all
      return addCorsHeaders(
        NextResponse.rewrite(new URL('/404', request.url), { status: 404 })
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
