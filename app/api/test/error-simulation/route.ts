import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { SeverityNumber } from '@opentelemetry/api-logs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const simulateType = url.searchParams.get('type') || 'runtime_error';

  const simulatedError = new Error(`Simulated Error: ${simulateType} at ${new Date().toISOString()}`);

  // 1. Emit through our structured logger (which automatically forwards to PostHog and internal DB)
  logger.error(
    `[SIMULATED LIVE ERROR] Exception triggered on ${url.pathname}`,
    {
      storeDomain: 'toko-demo.aiseocommerce.id',
      storeName: 'Toko Demo Simulasi',
      path: url.pathname,
      method: 'GET',
      statusCode: 500,
      simulatedType: simulateType,
    },
    simulatedError
  );

  // 2. Direct emit to global PostHog logger if present
  const posthogLogger = (globalThis as any).__posthogLogger;
  let otelEmitted = false;
  if (posthogLogger && typeof posthogLogger.emit === 'function') {
    posthogLogger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: `[DIRECT OTLP] Simulated failure: ${simulateType}`,
      attributes: {
        'service.name': 'ai-seo-ecommerce',
        'store_domain': 'toko-demo.aiseocommerce.id',
        'store_name': 'Toko Demo Simulasi',
        'error.message': simulatedError.message,
        'error.stack': simulatedError.stack || '',
      },
    });
    otelEmitted = true;
  }

  return NextResponse.json({
    success: true,
    message: 'Error event successfully generated and broadcasted to PostHog!',
    details: {
      posthogKeyPresent: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
      otelLoggerActive: otelEmitted,
      timestamp: new Date().toISOString(),
      simulatedError: {
        name: simulatedError.name,
        message: simulatedError.message,
      },
    },
  });
}

