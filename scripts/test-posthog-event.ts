import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { SeverityNumber } from '@opentelemetry/api-logs';

async function run() {
  console.log('🚀 Memulai pengujian pengiriman error event ke PostHog OpenTelemetry...');

  const apiKey =
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    'phc_up4iRw8TpeXfJFUhkbGcxgU98vnhqqJjvjCEeYUHLrFR';
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  const endpoint = `${host}/i/v1/logs`;

  console.log(`📡 PostHog Endpoint: ${endpoint}`);
  console.log(`🔑 PostHog API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

  // 1. Direct OTLP Exporter Test
  const exporter = new OTLPLogExporter({
    url: endpoint,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': 'ai-seo-ecommerce',
      'environment': 'live-production-test',
    }),
    processors: [new SimpleLogRecordProcessor({ exporter })],
  });

  const logger = loggerProvider.getLogger('ai-seo-ecommerce');

  const now = new Date();
  const testMessage = `[TEST ERROR SIMULATION] Uncaught RuntimeError: Simulating live production crash at ${now.toISOString()}`;

  console.log('📤 Mengirim log record severity ERROR ke PostHog...');
  logger.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: testMessage,
    attributes: {
      'store_domain': 'demo-store.aiseocommerce.id',
      'store_name': 'Demo Toko AI-SEO',
      'error.type': 'PaymentGatewayTimeout',
      'error.message': 'Simulated timeout communicating with payment provider',
      'error.stack': `Error: Simulated timeout\n    at checkout (/app/api/checkout/route.ts:88:12)\n    at async handlePayment (services/paymentGateway.ts:45:9)`,
      'http.method': 'POST',
      'http.status_code': 500,
      'http.target': '/api/checkout',
      'user.id': 'test-customer-889',
    },
  });

  console.log('📤 Mengirim log record severity INFO (Order Event)...');
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: `[TEST INFO EVENT] Checkout initiated for order ORD-${Date.now()}`,
    attributes: {
      'store_domain': 'demo-store.aiseocommerce.id',
      'store_name': 'Demo Toko AI-SEO',
      'order.total_amount': 250000,
      'order.items_count': 2,
    },
  });

  console.log('⏳ Mem-flush OTLP exporter buffer ke PostHog server...');
  await loggerProvider.forceFlush();
  await loggerProvider.shutdown();

  console.log('✅ Log record berhasil di-flush ke PostHog OTLP exporter!');

  // 2. Direct HTTP Verification Check to PostHog Capture Endpoint
  console.log('\n🔍 Memverifikasi juga via PostHog Event Capture API (/capture/)...');
  const capturePayload = {
    api_key: apiKey,
    event: 'test_runtime_error_event',
    properties: {
      $current_url: 'https://demo-store.aiseocommerce.id/checkout',
      store_domain: 'demo-store.aiseocommerce.id',
      store_name: 'Demo Toko AI-SEO',
      severity: 'ERROR',
      error_message: testMessage,
      timestamp: now.toISOString(),
      distinct_id: 'test-admin-distinct-id',
    },
  };

  const response = await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(capturePayload),
  });

  const responseText = await response.text();
  console.log(`🌐 PostHog /capture/ HTTP Status: ${response.status} ${response.statusText}`);
  console.log(`📦 PostHog Response: ${responseText}`);

  if (response.ok) {
    console.log('\n🎉 SUKSES BESAR! Event error berhasil diterima oleh server PostHog!');
    console.log('👉 Anda dapat langsung mengecek di dashboard PostHog Anda pada menu:');
    console.log('   - Activity / Live Events');
    console.log('   - Logs (OpenTelemetry)');
  }
}

run().catch((err) => {
  console.error('❌ Gagal mengirim event:', err);
  process.exit(1);
});

