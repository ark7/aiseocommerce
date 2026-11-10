import {
  recordSystemError,
  recordPageView,
  getStoreUsageMetrics,
  getStoreErrors,
  markErrorResolved,
} from '@/services/telemetryService';
import { prisma } from '@/lib/prisma';
import * as alertDispatcher from '@/lib/alertDispatcher';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    systemErrorLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    pageViewLog: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    dailyStoreMetric: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/alertDispatcher', () => ({
  dispatchAlert: jest.fn().mockResolvedValue(true),
}));

describe('telemetryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSystemError', () => {
    it('redacts sensitive fields from context and masks IPv4 address', async () => {
      (prisma.systemErrorLog.create as jest.Mock).mockResolvedValue({ id: 'err-1' });

      await recordSystemError({
        severity: 'CRITICAL',
        source: 'SERVER_API',
        message: 'Auth failure with sensitive data',
        ipAddress: '192.168.1.55',
        context: {
          password: 'supersecretpassword',
          serverKey: 'sb-midtrans-secret',
          username: 'johndoe',
          nested: {
            token: 'jwt.token.here',
            publicInfo: 'visible',
          },
        },
      });

      expect(prisma.systemErrorLog.create).toHaveBeenCalledTimes(1);
      const callData = (prisma.systemErrorLog.create as jest.Mock).mock.calls[0][0].data;

      expect(callData.ipAddress).toBe('192.168.1.0');
      expect(callData.context.password).toBe('[REDACTED]');
      expect(callData.context.serverKey).toBe('[REDACTED]');
      expect(callData.context.username).toBe('johndoe');
      expect(callData.context.nested.token).toBe('[REDACTED]');
      expect(callData.context.nested.publicInfo).toBe('visible');

      expect(alertDispatcher.dispatchAlert).toHaveBeenCalled();
    });
  });

  describe('recordPageView', () => {
    it('inserts raw pageview log and creates daily metric if not exists', async () => {
      (prisma.pageViewLog.create as jest.Mock).mockResolvedValue({ id: 'pv-1' });
      (prisma.dailyStoreMetric.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.dailyStoreMetric.create as jest.Mock).mockResolvedValue({ id: 'metric-1' });

      const success = await recordPageView({
        storeId: 'store-1',
        path: '/product/baju-keren',
        referrer: 'https://instagram.com',
        deviceType: 'mobile',
        browser: 'Safari',
        sessionId: 'session-xyz',
      });

      expect(success).toBe(true);
      expect(prisma.pageViewLog.create).toHaveBeenCalledTimes(1);
      expect(prisma.dailyStoreMetric.create).toHaveBeenCalledTimes(1);
    });

    it('updates existing daily metric when already present', async () => {
      (prisma.pageViewLog.create as jest.Mock).mockResolvedValue({ id: 'pv-2' });
      (prisma.dailyStoreMetric.findUnique as jest.Mock).mockResolvedValue({
        id: 'metric-1',
        topPaths: [{ path: '/product/baju-keren', count: 2 }],
        referrers: [],
        devices: { mobile: 2 },
      });
      (prisma.dailyStoreMetric.update as jest.Mock).mockResolvedValue({});

      const success = await recordPageView({
        storeId: 'store-1',
        path: '/product/baju-keren',
        referrer: null,
        deviceType: 'mobile',
        browser: 'Chrome',
        sessionId: 'session-xyz',
      });

      expect(success).toBe(true);
      expect(prisma.dailyStoreMetric.update).toHaveBeenCalledTimes(1);
      const updateData = (prisma.dailyStoreMetric.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.totalViews).toEqual({ increment: 1 });
      expect(updateData.topPaths[0].count).toBe(3);
    });
  });

  describe('getStoreUsageMetrics', () => {
    it('aggregates daily metrics and top paths accurately', async () => {
      const now = new Date();
      (prisma.dailyStoreMetric.findMany as jest.Mock).mockResolvedValue([
        {
          date: now,
          totalViews: 15,
          uniqueVisitors: 10,
          topPaths: [{ path: '/products', count: 10 }, { path: '/cart', count: 5 }],
          referrers: [{ referrer: 'google.com', count: 8 }],
          devices: { mobile: 12, desktop: 3 },
        },
      ]);
      (prisma.pageViewLog.groupBy as jest.Mock).mockResolvedValue([{ sessionId: 's1' }, { sessionId: 's2' }]);

      const result = await getStoreUsageMetrics('store-1', 7);

      expect(result.totalViews).toBe(15);
      expect(result.uniqueVisitors).toBe(2);
      expect(result.topPaths).toEqual([
        { path: '/products', count: 10 },
        { path: '/cart', count: 5 },
      ]);
      expect(result.topReferrers).toEqual([{ referrer: 'google.com', count: 8 }]);
      expect(result.deviceTotals.mobile).toBe(12);
    });
  });

  describe('getStoreErrors and markErrorResolved', () => {
    it('retrieves filtered error logs with pagination', async () => {
      (prisma.systemErrorLog.findMany as jest.Mock).mockResolvedValue([{ id: 'err-1' }]);
      (prisma.systemErrorLog.count as jest.Mock).mockResolvedValue(1);

      const result = await getStoreErrors({
        storeId: 'store-1',
        severity: 'CRITICAL',
        page: 1,
        limit: 10,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('marks error as resolved', async () => {
      (prisma.systemErrorLog.update as jest.Mock).mockResolvedValue({ id: 'err-1', isResolved: true });

      await markErrorResolved('err-1', 'admin@store.com');

      expect(prisma.systemErrorLog.update).toHaveBeenCalledWith({
        where: { id: 'err-1' },
        data: {
          isResolved: true,
          resolvedAt: expect.any(Date),
          resolvedBy: 'admin@store.com',
        },
      });
    });
  });
});

