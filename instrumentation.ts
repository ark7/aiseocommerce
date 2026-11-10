import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';

/**
 * Next.js Server Lifecycle Instrumentation Hook.
 * Automatically runs on Node.js runtime boot and registers the PostHog OTLP Log Exporter.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const apiKey =
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
      process.env.NEXT_PUBLIC_POSTHOG_KEY ||
      'phc_up4iRw8TpeXfJFUhkbGcxgU98vnhqqJjvjCEeYUHLrFR';
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    try {
      const exporter = new OTLPLogExporter({
        url: `${host}/i/v1/logs`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const loggerProvider = new LoggerProvider({
        resource: resourceFromAttributes({
          'service.name': 'ai-seo-ecommerce',
        }),
        processors: [new SimpleLogRecordProcessor({ exporter })],
      });

      // Make the logger available globally across all API routes and server handlers
      (globalThis as any).__posthogLogger = loggerProvider.getLogger('ai-seo-ecommerce');
    } catch (err) {
      console.error('[OpenTelemetry] Failed to initialize PostHog log exporter:', err);
    }
  }
}

