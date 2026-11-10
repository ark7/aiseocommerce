'use client';

import Link from 'next/link';
import React from 'react';
import { gateFor, Tier } from '@/lib/tiers';

interface GatedLinkProps {
  href: string;
  role: Tier;
  children: React.ReactNode;
  className?: string;
}

/**
 * GatedLink intercepts navigation based on the user's current tier.
 * If the user doesn't meet the required tier for the destination,
 * they are redirected to the login page with a `from` parameter.
 */
export function GatedLink({ href, role, children, className }: GatedLinkProps) {
  const { gated, redirectPath } = gateFor(role, href);

  if (gated && redirectPath) {
    return (
      <Link href={redirectPath} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
