import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CartPage from '@/components/CartPage';

interface CartRouteProps {
  params: { storeDomain: string };
}

export default async function CartRoute({ params }: CartRouteProps) {
  const store = await prisma.store.findUnique({
    where: { domain: params.storeDomain },
    select: { id: true, domain: true },
  });

  if (!store) return notFound();

  return <CartPage storeId={store.id} storeDomain={store.domain} />;
}
