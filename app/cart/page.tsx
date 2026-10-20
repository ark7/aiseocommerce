import { notFound } from 'next/navigation';
import { getActiveStore } from '@/lib/store';
import CartPage from '@/components/CartPage';

export default async function CartRoute() {
  const store = await getActiveStore();
  if (!store) return notFound();

  return <CartPage storeId={store.id} storeDomain={store.domain} />;
}

