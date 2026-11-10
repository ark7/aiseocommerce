import { notFound } from 'next/navigation';
import { getActiveStore } from '@/lib/store';
import CartPage from '@/components/CartPage';

export default async function CartRoute() {
  const store = await getActiveStore();
  if (!store) return notFound();

  const shippingConfig = {
    originCity: store.settings?.shippingOriginCity || null,
    flatRateInner: store.settings?.shippingFlatRateInner ?? 0,
    flatRateOuter: store.settings?.shippingFlatRateOuter ?? 0,
    freeThreshold: store.settings?.shippingFreeThreshold ?? null,
    biteshipEnabled: Boolean(store.settings?.biteshipEnabled),
    originPostalCode: store.settings?.biteshipOriginPostalCode || null,
  };

  return (
    <CartPage
      storeId={store.id}
      storeDomain={store.domain}
      shippingConfig={shippingConfig}
    />
  );
}

