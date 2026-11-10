import { dispatchAlert, resetAlertThrottle } from '@/lib/alertDispatcher';

describe('alertDispatcher', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetAlertThrottle();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as any;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('suppresses alerts if severity is lower than ALERT_MIN_SEVERITY', async () => {
    process.env.ALERT_MIN_SEVERITY = 'CRITICAL';
    process.env.ALERT_TELEGRAM_BOT_TOKEN = 'mock-bot';
    process.env.ALERT_TELEGRAM_CHAT_ID = '12345';

    const dispatched = await dispatchAlert({
      severity: 'WARN',
      source: 'SERVER_API',
      message: 'Just a warning',
    });

    expect(dispatched).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('dispatches critical alert to configured telegram and throttles consecutive identical errors', async () => {
    process.env.ALERT_MIN_SEVERITY = 'CRITICAL';
    process.env.ALERT_TELEGRAM_BOT_TOKEN = 'mock-bot';
    process.env.ALERT_TELEGRAM_CHAT_ID = '12345';

    const first = await dispatchAlert({
      severity: 'CRITICAL',
      source: 'PAYMENT_WEBHOOK',
      message: 'Failed to verify webhook signature',
      path: '/api/payment/webhook',
    });

    expect(first).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const second = await dispatchAlert({
      severity: 'CRITICAL',
      source: 'PAYMENT_WEBHOOK',
      message: 'Failed to verify webhook signature',
      path: '/api/payment/webhook',
    });

    expect(second).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('resets throttle map properly', async () => {
    process.env.ALERT_MIN_SEVERITY = 'CRITICAL';
    process.env.ALERT_TELEGRAM_BOT_TOKEN = 'mock-bot';
    process.env.ALERT_TELEGRAM_CHAT_ID = '12345';

    await dispatchAlert({
      severity: 'CRITICAL',
      source: 'SERVER_API',
      message: 'Database connection failed',
    });

    resetAlertThrottle();

    const dispatchedAfterReset = await dispatchAlert({
      severity: 'CRITICAL',
      source: 'SERVER_API',
      message: 'Database connection failed',
    });

    expect(dispatchedAfterReset).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

