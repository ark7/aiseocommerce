import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  isControlPlaneEnabled,
  isAllowedSuperAdminHost,
  extractRequestHost,
} from '@/lib/superAdminGuard';

export const metadata = {
  title: 'Super-Admin Control Plane | Multi-Tenant Duplication',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = headers();
  const host = extractRequestHost(headerList);

  // If control plane is disabled or accessed through an unallowed host (e.g. client store domain),
  // immediately trigger pure 404 Not Found so the page appears completely nonexistent.
  if (!isControlPlaneEnabled() || (host && !isAllowedSuperAdminHost(host))) {
    notFound();
  }

  return <>{children}</>;
}
