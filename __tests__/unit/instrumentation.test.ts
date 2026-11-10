import { register } from '@/instrumentation';

describe('instrumentation hook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete (globalThis as any).__posthogLogger;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('initializes global __posthogLogger when running on nodejs runtime', () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key_123';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com';

    register();

    expect((globalThis as any).__posthogLogger).toBeDefined();
    expect(typeof (globalThis as any).__posthogLogger.emit).toBe('function');
  });

  it('initializes global __posthogLogger when running on nodejs runtime with PROJECT_TOKEN', () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'phc_project_token_456';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com';

    register();

    expect((globalThis as any).__posthogLogger).toBeDefined();
    expect(typeof (globalThis as any).__posthogLogger.emit).toBe('function');
  });

  it('skips initialization when running on edge runtime', () => {
    process.env.NEXT_RUNTIME = 'edge';

    register();

    expect((globalThis as any).__posthogLogger).toBeUndefined();
  });
});

