'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';
import { setTrackingConfig } from '@/lib/tracking';
import type { AnalyticsConfig } from '@/lib/analytics';

interface Props {
  config: AnalyticsConfig;
}

/**
 * Publishes the store's tag config to the client and captures the campaign that
 * brought this visitor in. Mounted once by the storefront layout; renders
 * nothing.
 *
 * A component rather than an inline script because the config has to reach the
 * React components that fire conversion events, and first-touch attribution has
 * to be read after hydration while the landing URL is still in the address bar.
 */
export default function StoreTracking({ config }: Props) {
  useEffect(() => {
    setTrackingConfig(config);
    captureAttribution();
  }, [config]);

  return null;
}
