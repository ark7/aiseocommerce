import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

/**
 * Guards every storefront route.
 *
 * The store lookup has to happen on the server: a client component calling
 * notFound() only swaps the rendered UI, the response has already gone out as
 * HTTP 200. Checking here makes an unknown domain a real 404 for every page
 * under /[storeDomain], and renders that segment's not-found.tsx.
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeDomain: string };
}) {
  const store = await prisma.store.findUnique({
    where: { domain: params.storeDomain },
    select: { id: true },
  });

  if (!store) notFound();

  return <>{children}</>;
}
