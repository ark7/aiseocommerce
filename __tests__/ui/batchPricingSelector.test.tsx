/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToCartButton, { ProductVariantItem } from '@/components/AddToCartButton';
import CartPage from '@/components/CartPage';
import { clearCart, getCart } from '@/lib/cart';
import type { PriceTierInput } from '@/lib/pricing';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

jest.mock('@/lib/tracking', () => ({
  buildAddToCartCalls: jest.fn(() => []),
  getTrackingConfig: jest.fn(() => ({})),
  sendTrackingCalls: jest.fn(),
}));

jest.mock('@/lib/attribution', () => ({
  readStoredAttribution: jest.fn(() => null),
}));

jest.mock('@/lib/funnelEvents', () => ({
  trackFunnelEvent: jest.fn(),
}));

jest.mock('@/components/StoreHeader', () => () => <header data-testid="store-header" />);
jest.mock('@/components/StoreFooter', () => () => <footer data-testid="store-footer" />);
jest.mock('@/components/AddressLocationSelector', () => () => <div data-testid="address-selector" />);

const STORE_DOMAIN = 'demo.larismanis.online';

const EKONOMIS_TIERS: PriceTierInput[] = [
  { minQty: 1, maxQty: 10, unitPrice: 5250 },
  { minQty: 11, maxQty: 20, unitPrice: 4750 },
  { minQty: 50, maxQty: 99, unitPrice: 2750 },
  { minQty: 100, maxQty: 499, unitPrice: 2250 },
  { minQty: 1000, maxQty: null, unitPrice: 1800 },
];

const PREMIUM_TIERS: PriceTierInput[] = [
  { minQty: 11, maxQty: 20, unitPrice: 6000 },
  { minQty: 50, maxQty: 99, unitPrice: 3500 },
  { minQty: 100, maxQty: 499, unitPrice: 3000 },
  { minQty: 1000, maxQty: null, unitPrice: 2550 },
];

const ID_CARD_VARIANTS: ProductVariantItem[] = [
  {
    id: 'var-eco',
    name: 'Ekonomis (Pigmen)',
    optionType: 'CUSTOM',
    optionValue: 'Ekonomis (Pigmen)',
    sku: 'ID-ECO',
    price: 5250,
    stock: 5000,
    minOrderQty: 1,
    priceTiers: EKONOMIS_TIERS,
  },
  {
    id: 'var-prem',
    name: 'Premium (Laser)',
    optionType: 'CUSTOM',
    optionValue: 'Premium (Laser)',
    sku: 'ID-PREM',
    price: 6000,
    stock: 5000,
    minOrderQty: 11,
    priceTiers: PREMIUM_TIERS,
  },
];

describe('UI Test: Batch / Tiered Pricing Matrix (AddToCartButton + CartPage)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCart(STORE_DOMAIN);
    jest.clearAllMocks();
  });

  it('renders responsive matrix table with dash for unavailable Premium 1-10 band and enforces MOQ 11', () => {
    const { container } = render(
      <AddToCartButton
        productId="prod-idcard"
        storeDomain={STORE_DOMAIN}
        price={1800}
        name="Cetak ID Card PVC Custom"
        stock={10000}
        hasBatchPricing={true}
        minOrderQty={1}
        variants={ID_CARD_VARIANTS}
      />
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();

    const qtyInput = container.querySelector('[data-quantity-counter]') as HTMLInputElement;
    expect(qtyInput).toHaveValue(1);
    expect(screen.getByText(/Rp 5\.250 \/ pcs/i)).toBeInTheDocument();

    // Switch to Premium (Laser) -> quantity automatically advances to MOQ 11
    fireEvent.click(screen.getByRole('button', { name: /Premium \(Laser\)/i }));
    expect(qtyInput).toHaveValue(11);
    expect(screen.getByText(/Rp 6\.000 \/ pcs/i)).toBeInTheDocument();
    expect(screen.getByText(/Min\. order 11 pcs/i)).toBeInTheDocument();

    // Direct typing 50 updates tier unit price to Rp 3.500 and subtotal Rp 175.000
    fireEvent.change(qtyInput, { target: { value: '50' } });
    expect(qtyInput).toHaveValue(50);
    expect(screen.getByText(/Rp 3\.500 \/ pcs/i)).toBeInTheDocument();
    expect(screen.getByText(/Rp 175\.000/)).toBeInTheDocument();

    // Direct typing below MOQ (5 pcs) shows error on AddToCart click
    fireEvent.change(qtyInput, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Tambah ke Keranjang/i }));
    expect(screen.getByText(/Minimal pemesanan untuk pilihan ini adalah 11 pcs/i)).toBeInTheDocument();
    expect(qtyInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('adds Ekonomis 20 pcs and Premium 20 pcs as separate cart items and reprices dynamically in CartPage', async () => {
    const { container } = render(
      <AddToCartButton
        productId="prod-idcard"
        storeDomain={STORE_DOMAIN}
        price={1800}
        name="Cetak ID Card PVC Custom"
        stock={10000}
        hasBatchPricing={true}
        minOrderQty={1}
        variants={ID_CARD_VARIANTS}
      />
    );

    const qtyInput = container.querySelector('[data-quantity-counter]') as HTMLInputElement;

    // 1. Add 20 pcs Ekonomis
    fireEvent.change(qtyInput, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Tambah ke Keranjang/i }));

    // 2. Switch to Premium & add 20 pcs
    fireEvent.click(screen.getByRole('button', { name: /Premium \(Laser\)/i }));
    fireEvent.change(qtyInput, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Tambah ke Keranjang/i }));

    const cart = getCart(STORE_DOMAIN);
    expect(cart).toHaveLength(2);
    expect(cart[0]).toMatchObject({
      productId: 'prod-idcard',
      variantId: 'var-eco',
      quantity: 20,
      price: 4750,
    });
    expect(cart[1]).toMatchObject({
      productId: 'prod-idcard',
      variantId: 'var-prem',
      quantity: 20,
      price: 6000,
    });

    // Render CartPage and verify both lines render independently and reprice dynamically
    render(<CartPage storeId="demo-store-001" storeDomain={STORE_DOMAIN} />);

    expect(screen.getByText(/🏷️ Ekonomis \(Pigmen\)/)).toBeInTheDocument();
    expect(screen.getByText(/🏷️ Premium \(Laser\)/)).toBeInTheDocument();

    // Update Ekonomis cart qty from 20 -> 50 directly via numeric input -> price drops from 4.750 to 2.750
    const ecoInput = screen.getByLabelText(/Jumlah Cetak ID Card PVC Custom Ekonomis \(Pigmen\)/i);
    fireEvent.change(ecoInput, { target: { value: '50' } });

    await waitFor(() => {
      const updated = getCart(STORE_DOMAIN);
      expect(updated[0].price).toBe(2750);
      expect(updated[1].price).toBe(6000);
      expect(screen.getByText(/Grosir: 50 – 99 pcs/)).toBeInTheDocument();
    });
  });
});
