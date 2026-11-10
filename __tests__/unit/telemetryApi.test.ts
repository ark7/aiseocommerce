import { POST as postErrors } from '@/app/api/telemetry/errors/route';
import { POST as postPageView } from '@/app/api/telemetry/pageview/route';
import { GET as getUsageAnalytics } from '@/app/api/admin/analytics/usage/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import * as telemetryService from '@/services/telemetryService';
import * as rateLimit from '@/lib/rateLimit';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
    },
    systemErrorLog: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pageViewLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/services/telemetryService', () => {
  const actual = jest.requireActual('@/services/telemetryService');
  return {
    ...actual,
    recordSystemError: jest.fn().mockResolvedValue({ id: 'err-mock' }),
    recordPageView: jest.fn().mockResolvedValue(true),
    getStoreUsageMetrics: jest.fn().mockResolvedValue({ totalViews: 100, uniqueVisitors: 50 }),
  };
});

describe('Telemetry API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.reset();
  });

  describe('POST /api/telemetry/errors', () => {
    it('accepts and records valid error telemetry payload', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({ id: 'store-1' });

      const req = new NextRequest('http://localhost/api/telemetry/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeDomain: 'toko.com',
          message: 'ReferenceError: window is not defined',
          source: 'CLIENT_FRONTEND',
          severity: 'ERROR',
          path: '/products',
        }),
      });

      const res = await postErrors(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(telemetryService.recordSystemError).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'store-1',
          message: 'ReferenceError: window is not defined',
          source: 'CLIENT_FRONTEND',
          severity: 'ERROR',
        })
      );
    });

    it('rejects malformed payloads with 400', async () => {
      const req = new NextRequest('http://localhost/api/telemetry/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{{{',
      });

      const res = await postErrors(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/telemetry/pageview', () => {
    it('records valid pageview with store resolution', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({ id: 'store-1' });

      const req = new NextRequest('http://localhost/api/telemetry/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeDomain: 'toko.com',
          path: '/product/sepatu-lari',
          referrer: 'https://google.com',
          deviceType: 'mobile',
          browser: 'Chrome',
          sessionId: 'session-12345',
        }),
      });

      const res = await postPageView(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(telemetryService.recordPageView).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'store-1',
          path: '/product/sepatu-lari',
          sessionId: 'session-12345',
        })
      );
    });

    it('returns 404 when store domain is not found', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/telemetry/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeDomain: 'unknown-store.com',
          path: '/',
          sessionId: 'sess-1',
        }),
      });

      const res = await postPageView(req);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/analytics/usage', () => {
    it('returns usage metrics for authenticated store admin', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({
        id: 'user-admin',
        role: 'ADMIN',
        storeId: 'store-1',
      });

      const req = new Request('http://localhost/api/admin/analytics/usage?days=30', {
        headers: { Authorization: 'Bearer valid-admin-token' },
      });

      const res = await getUsageAnalytics(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.totalViews).toBe(100);
      expect(telemetryService.getStoreUsageMetrics).toHaveBeenCalledWith('store-1', 30);
    });

    it('blocks unauthorized access with 401', async () => {
      const req = new Request('http://localhost/api/admin/analytics/usage');
      const res = await getUsageAnalytics(req);
      expect(res.status).toBe(401);
    });
  });
});

