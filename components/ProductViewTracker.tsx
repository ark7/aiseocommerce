'use client';

import { useEffect } from 'react';
import { trackFunnelEvent } from '@/lib/funnelEvents';

interface ProductViewTrackerProps {
  productId: string;
  storeDomain: string;
}

/**
 * Records the top of the funnel for one product page. Mounted by the server
 * component, which cannot report a view itself: only the browser knows that
 * someone actually looked rather than that a crawler prerendered the page.
 *
 * Renders nothing. The emitter dedupes per session, so a re-render — including
 * React's double-effect in development — still reports one view.
 */
export default function ProductViewTracker({ productId, storeDomain }: ProductViewTrackerProps) {
  useEffect(() => {
    trackFunnelEvent('VIEW', { productId, storeDomain });
  }, [productId, storeDomain]);

  return null;
}
