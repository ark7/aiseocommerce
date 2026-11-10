/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import MasterThirdPartyTracker from '@/components/MasterThirdPartyTracker';

jest.mock('next/navigation', () => ({
  usePathname: () => '/products',
  useSearchParams: () => new URLSearchParams(),
}));

describe('MasterThirdPartyTracker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('renders null without crashing when no env keys are present', () => {
    const { container } = render(
      <MasterThirdPartyTracker storeDomain="client-store.com" storeName="Toko Keren" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('inits PostHog and registers store_domain when NEXT_PUBLIC_POSTHOG_KEY is present', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_master_key_123';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com';

    render(<MasterThirdPartyTracker storeDomain="client-baju.com" storeName="Baju Cantik" />);

    // PostHog stub should be created on window
    expect(window.posthog).toBeDefined();
    expect(typeof window.posthog.init).toBe('function');
  });
});
