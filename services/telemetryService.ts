import { prisma } from '@/lib/prisma';
import { dispatchAlert } from '@/lib/alertDispatcher';

export type ErrorSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type ErrorSource =
  | 'CLIENT_FRONTEND'
  | 'SERVER_API'
  | 'PAYMENT_WEBHOOK'
  | 'DATABASE'
  | 'BACKGROUND_JOB';

export interface RecordErrorParams {
  severity?: ErrorSeverity;
  source: ErrorSource;
  message: string;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  storeId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  context?: Record<string, unknown> | null;
}

export interface RecordPageViewParams {
  storeId: string;
  path: string;
  referrer?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  sessionId: string;
}

/** Sanitize sensitive fields from error context objects */
function sanitizeContext(obj: unknown, depth = 0): unknown {
  if (depth > 4) return '[Max Depth]';
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeContext(item, depth + 1));
  }

  const SENSITIVE_KEYS = new Set([
    'password',
    'password_hash',
    'token',
    'secret',
    'authorization',
    'cookie',
    'credit_card',
    'cardnumber',
    'cvv',
    'apikey',
    'api_key',
    'serverkey',
    'server_key',
  ]);

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeContext(val, depth + 1);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/** Anonymize IP address for privacy compliance */
function anonymizeIP(ip?: string | null): string | null {
  if (!ip || ip === 'unknown') return null;
  if (ip.includes('.')) {
    // IPv4: mask last octet (e.g. 192.168.1.xxx)
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  // Fallback hash for IPv6 without requiring Node.js crypto module
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Record a system or runtime error into the telemetry database and notify alerts if critical.
 */
export async function recordSystemError(params: RecordErrorParams) {
  try {
    const severity = params.severity || 'ERROR';
    const cleanContext = params.context ? (sanitizeContext(params.context) as any) : undefined;
    const cleanIP = anonymizeIP(params.ipAddress);

    const errorLog = await prisma.systemErrorLog.create({
      data: {
        storeId: params.storeId || null,
        severity,
        source: params.source,
        message: params.message.slice(0, 5000),
        stack: params.stack ? params.stack.slice(0, 10000) : null,
        path: params.path ? params.path.slice(0, 500) : null,
        method: params.method ? params.method.slice(0, 10) : null,
        statusCode: params.statusCode || null,
        ipAddress: cleanIP,
        userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
        context: cleanContext ?? undefined,
      },
    });

    // Dispatch instant alert if critical
    if (severity === 'CRITICAL' || severity === 'ERROR') {
      dispatchAlert({
        severity,
        source: params.source,
        message: params.message,
        path: params.path,
        statusCode: params.statusCode,
        storeId: params.storeId,
        errorStack: params.stack,
        context: cleanContext,
      }).catch(() => {});
    }

    return errorLog;
  } catch (err) {
    // Fail-safe: recording telemetry should never crash the caller
    console.error('[TelemetryService] Failed to record error log:', err);
    return null;
  }
}

/**
 * Record a pageview and aggregate into daily metrics.
 */
export async function recordPageView(params: RecordPageViewParams) {
  try {
    const cleanPath = params.path.slice(0, 500);
    const cleanReferrer = params.referrer ? params.referrer.slice(0, 500) : null;
    const cleanDevice = params.deviceType ? params.deviceType.slice(0, 50) : null;
    const cleanBrowser = params.browser ? params.browser.slice(0, 50) : null;
    const cleanSession = params.sessionId.slice(0, 100);

    // 1. Insert into raw log
    await prisma.pageViewLog.create({
      data: {
        storeId: params.storeId,
        path: cleanPath,
        referrer: cleanReferrer,
        deviceType: cleanDevice,
        browser: cleanBrowser,
        sessionId: cleanSession,
      },
    });

    // 2. Increment / Update DailyStoreMetric
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Upsert daily metric
    const existingMetric = await prisma.dailyStoreMetric.findUnique({
      where: {
        storeId_date: {
          storeId: params.storeId,
          date: today,
        },
      },
    });

    if (!existingMetric) {
      await prisma.dailyStoreMetric.create({
        data: {
          storeId: params.storeId,
          date: today,
          totalViews: 1,
          uniqueVisitors: 1,
          topPaths: [{ path: cleanPath, count: 1 }],
          referrers: cleanReferrer ? [{ referrer: cleanReferrer, count: 1 }] : [],
          devices: cleanDevice ? { [cleanDevice]: 1 } : {},
        },
      });
    } else {
      // Update existing record
      const topPaths = Array.isArray(existingMetric.topPaths)
        ? (existingMetric.topPaths as Array<{ path: string; count: number }>)
        : [];
      const pathIdx = topPaths.findIndex((p) => p.path === cleanPath);
      if (pathIdx >= 0) {
        topPaths[pathIdx].count += 1;
      } else {
        topPaths.push({ path: cleanPath, count: 1 });
      }
      topPaths.sort((a, b) => b.count - a.count);
      const trimmedPaths = topPaths.slice(0, 20);

      const referrers = Array.isArray(existingMetric.referrers)
        ? (existingMetric.referrers as Array<{ referrer: string; count: number }>)
        : [];
      if (cleanReferrer) {
        const refIdx = referrers.findIndex((r) => r.referrer === cleanReferrer);
        if (refIdx >= 0) {
          referrers[refIdx].count += 1;
        } else {
          referrers.push({ referrer: cleanReferrer, count: 1 });
        }
        referrers.sort((a, b) => b.count - a.count);
      }
      const trimmedReferrers = referrers.slice(0, 20);

      const devices = (existingMetric.devices as Record<string, number>) || {};
      if (cleanDevice) {
        devices[cleanDevice] = (devices[cleanDevice] || 0) + 1;
      }

      await prisma.dailyStoreMetric.update({
        where: { id: existingMetric.id },
        data: {
          totalViews: { increment: 1 },
          topPaths: trimmedPaths,
          referrers: trimmedReferrers,
          devices,
        },
      });
    }

    return true;
  } catch (err) {
    console.error('[TelemetryService] Failed to record pageview:', err);
    return false;
  }
}

/**
 * Fetch usage trend metrics for a store across a date window.
 */
export async function getStoreUsageMetrics(storeId: string, days = 7) {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - days);

  const metrics = await prisma.dailyStoreMetric.findMany({
    where: {
      storeId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate totals and merge path/referrer data
  let totalViews = 0;
  const pathMap: Record<string, number> = {};
  const refMap: Record<string, number> = {};
  const deviceTotals: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };

  const dailyTrend = metrics.map((m) => {
    totalViews += m.totalViews;

    if (Array.isArray(m.topPaths)) {
      for (const p of m.topPaths as Array<{ path: string; count: number }>) {
        pathMap[p.path] = (pathMap[p.path] || 0) + p.count;
      }
    }
    if (Array.isArray(m.referrers)) {
      for (const r of m.referrers as Array<{ referrer: string; count: number }>) {
        refMap[r.referrer] = (refMap[r.referrer] || 0) + r.count;
      }
    }
    if (m.devices && typeof m.devices === 'object') {
      for (const [dev, count] of Object.entries(m.devices as Record<string, number>)) {
        deviceTotals[dev] = (deviceTotals[dev] || 0) + count;
      }
    }

    return {
      date: m.date.toISOString().split('T')[0],
      views: m.totalViews,
      visitors: m.uniqueVisitors,
    };
  });

  // Also count unique sessions from raw log for accuracy
  const uniqueSessions = await prisma.pageViewLog.groupBy({
    by: ['sessionId'],
    where: {
      storeId,
      createdAt: { gte: startDate },
    },
  });

  const topPaths = Object.entries(pathMap)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topReferrers = Object.entries(refMap)
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    windowDays: days,
    totalViews,
    uniqueVisitors: uniqueSessions.length,
    dailyTrend,
    topPaths,
    topReferrers,
    deviceTotals,
  };
}

/**
 * Fetch errors for admin/super-admin dashboard with filtering.
 */
export async function getStoreErrors(options: {
  storeId?: string | null;
  severity?: ErrorSeverity;
  source?: ErrorSource;
  isResolved?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (options.storeId !== undefined) {
    where.storeId = options.storeId;
  }
  if (options.severity) {
    where.severity = options.severity;
  }
  if (options.source) {
    where.source = options.source;
  }
  if (options.isResolved !== undefined) {
    where.isResolved = options.isResolved;
  }

  const [errors, total] = await Promise.all([
    prisma.systemErrorLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        store: {
          select: { id: true, name: true, domain: true },
        },
      },
    }),
    prisma.systemErrorLog.count({ where }),
  ]);

  return {
    errors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Mark an error as resolved.
 */
export async function markErrorResolved(errorId: string, resolvedBy?: string) {
  return prisma.systemErrorLog.update({
    where: { id: errorId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: resolvedBy || 'admin',
    },
  });
}

