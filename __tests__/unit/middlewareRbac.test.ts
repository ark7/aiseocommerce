/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-jwt-secret-for-middleware-rbac';

import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { jwtVerify } from 'jose';
import { generateGuestToken, verifyGuestToken } from '@/lib/guestSession';

jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/guestSession', () => ({
  generateGuestToken: jest.fn().mockResolvedValue('mock-guest-token'),
  verifyGuestToken: jest.fn().mockResolvedValue(null),
}));
jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

describe('Middleware RBAC & First-Hit Guest Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateGuestToken as jest.Mock).mockResolvedValue('mock-guest-token');
    (verifyGuestToken as jest.Mock).mockResolvedValue(null);
  });

  it('redirects first-hit unauthenticated visits to /admin, /cart, /orders to /login?from=... while setting guest cookie', async () => {
    for (const target of ['/admin', '/cart', '/orders']) {
      const req = new NextRequest(`https://demo.larisdari.web.id${target}`, {
        headers: { host: 'demo.larisdari.web.id' },
      });

      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toBe(`https://demo.larisdari.web.id/login?from=${encodeURIComponent(target)}`);
      expect(res.cookies.get('token')?.value).toBe('mock-guest-token');
    }
  });

  it('allows STAFF tokens through middleware to /admin pages and /api/admin endpoints', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { id: 'staff-1', storeId: 'store-1', role: 'STAFF', email: 'staff@demo.id' },
    });

    const pageReq = new NextRequest('https://demo.larisdari.web.id/admin/products', {
      headers: {
        host: 'demo.larisdari.web.id',
        cookie: 'token=valid-staff-jwt',
      },
    });
    const pageRes = await middleware(pageReq);
    expect(pageRes.status).toBe(200);
    expect(pageRes.headers.get('location')).toBeNull();

    const apiReq = new NextRequest('https://demo.larisdari.web.id/api/admin/stats', {
      headers: {
        host: 'demo.larisdari.web.id',
        authorization: 'Bearer valid-staff-jwt',
      },
    });
    const apiRes = await middleware(apiReq);
    expect(apiRes.status).toBe(200);
  });

  it('allows ADMIN tokens through middleware to /admin', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { id: 'admin-1', storeId: 'store-1', role: 'ADMIN', email: 'admin@demo.id' },
    });

    const req = new NextRequest('https://demo.larisdari.web.id/admin', {
      headers: {
        host: 'demo.larisdari.web.id',
        cookie: 'token=valid-admin-jwt',
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('blocks CUSTOMER tokens from /admin pages and /api/admin endpoints', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { id: 'cust-1', storeId: 'store-1', role: 'CUSTOMER', email: 'cust@demo.id' },
    });

    const pageReq = new NextRequest('https://demo.larisdari.web.id/admin', {
      headers: {
        host: 'demo.larisdari.web.id',
        cookie: 'token=valid-cust-jwt',
      },
    });
    const pageRes = await middleware(pageReq);
    expect(pageRes.status).toBe(307);
    expect(pageRes.headers.get('location')).toBe('https://demo.larisdari.web.id/login?from=%2Fadmin');

    const apiReq = new NextRequest('https://demo.larisdari.web.id/api/admin/stats', {
      headers: {
        host: 'demo.larisdari.web.id',
        authorization: 'Bearer valid-cust-jwt',
      },
    });
    const apiRes = await middleware(apiReq);
    expect([401, 403]).toContain(apiRes.status);
  });
});
