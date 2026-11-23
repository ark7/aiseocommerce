import { notFound } from 'next/navigation';
import { getActiveStore } from '@/lib/store';
import { parseCustomFeesConfig } from '@/lib/invoiceService';
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

  const billingConfig = {
    taxEnabled: Boolean(store.settings?.taxEnabled),
    taxLabel: store.settings?.taxLabel || 'PPN',
    taxRate: store.settings?.taxRate ?? 0,
    taxApplyOnCheckout: store.settings?.taxApplyOnCheckout ?? true,
    customFeesConfig: parseCustomFeesConfig(store.settings?.customFeesConfig),
  };

  return (
    <CartPage
      storeId={store.id}
      storeDomain={store.domain}
      shippingConfig={shippingConfig}
      billingConfig={billingConfig}
    />
  );
}

