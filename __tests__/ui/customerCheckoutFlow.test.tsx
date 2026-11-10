/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartPage from '@/components/CartPage';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

// Mock AddressLocationSelector
jest.mock('@/components/AddressLocationSelector', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <div data-testid="mock-location-selector">
      <button
        type="button"
        data-testid="select-inner-city-btn"
        onClick={() =>
          onChange &&
          onChange({
            provinceId: '31',
            provinceName: 'DKI Jakarta',
            regencyId: '3174',
            regencyName: 'Jakarta Selatan',
            districtId: '317404',
            districtName: 'Tebet',
            villageId: '3174041001',
            villageName: 'Tebet Barat',
            postalCode: '12810',
            fullFormattedAddress: 'Jl. Tebet Barat Dalam No. 12',
          })
        }
      >
        Pilih Tebet Jakarta
      </button>
    </div>
  ),
}));

// Mock StoreHeader & StoreFooter
jest.mock('@/components/StoreHeader', () => ({
  __esModule: true,
  default: () => <header data-testid="store-header">Header</header>,
}));

jest.mock('@/components/StoreFooter', () => ({
  __esModule: true,
  default: () => <footer data-testid="store-footer">Footer</footer>,
}));

describe('UI Test Automation: Customer Cart & Checkout Flow (components/CartPage)', () => {
  const storeDomain = 'demo-store.local';
  const storeId = 'demo-store-001';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders empty cart state when no items exist in localStorage', () => {
    render(<CartPage storeId={storeId} storeDomain={storeDomain} />);

    expect(screen.getByText(/Keranjang Anda masih kosong/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mulai Belanja/i })).toBeInTheDocument();
  });

  it('renders cart items and calculates subtotal correctly from localStorage', () => {
    const mockCart = [
      {
        productId: 'prod-001',
        name: 'Kemeja Batik Pria Slim Fit Solo',
        price: 250000,
        quantity: 2,
        imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf',
        productType: 'PHYSICAL',
        storeDomain,
      },
    ];

    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(mockCart));

    render(
      <CartPage
        storeId={storeId}
        storeDomain={storeDomain}
        shippingConfig={{
          originCity: 'Jakarta',
          flatRateInner: 10000,
          flatRateOuter: 25000,
          freeThreshold: 500000,
        }}
      />
    );

    // Verify item is displayed
    expect(screen.getByText('Kemeja Batik Pria Slim Fit Solo')).toBeInTheDocument();
    // Subtotal: 2 * 250.000 = 500.000 (appears in item row and summary)
    const priceElements = screen.getAllByText(/Rp\s*500\.000/);
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('supports quantity increment and updates subtotal', async () => {
    const mockCart = [
      {
        productId: 'prod-001',
        name: 'Kaos Polos Cotton Combed',
        price: 100000,
        quantity: 1,
        productType: 'PHYSICAL',
        storeDomain,
      },
    ];

    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(mockCart));

    render(
      <CartPage
        storeId={storeId}
        storeDomain={storeDomain}
        shippingConfig={{
          originCity: 'Jakarta',
          flatRateInner: 10000,
          flatRateOuter: 20000,
        }}
      />
    );

    const initialPrices = screen.getAllByText(/Rp\s*100\.000/);
    expect(initialPrices.length).toBeGreaterThanOrEqual(1);

    // Click increment button (+)
    const incrementBtn = screen.getByRole('button', { name: 'Tambah jumlah item' });
    fireEvent.click(incrementBtn);

    // Quantity should become 2 and subtotal Rp 200.000
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      const updatedPrices = screen.getAllByText(/Rp\s*200\.000/);
      expect(updatedPrices.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays digital/event instant delivery badge when digital products are in cart', () => {
    const mockDigitalCart = [
      {
        productId: 'prod-digital-001',
        name: 'E-Book Panduan SEO E-Commerce 2026',
        price: 150000,
        quantity: 1,
        productType: 'DIGITAL',
        storeDomain,
      },
    ];

    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(mockDigitalCart));

    render(<CartPage storeId={storeId} storeDomain={storeDomain} />);

    expect(screen.getByText(/Pengiriman Instan Elektronik:/i)).toBeInTheDocument();
    expect(screen.getByText(/Bebas Ongkir/i)).toBeInTheDocument();
  });

  it('integrates address location selector and renders location component', () => {
    const mockCart = [
      {
        productId: 'prod-001',
        name: 'Produk Uji',
        price: 100000,
        quantity: 1,
        productType: 'PHYSICAL',
        storeDomain,
      },
    ];

    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(mockCart));

    render(<CartPage storeId={storeId} storeDomain={storeDomain} />);

    expect(screen.getByTestId('mock-location-selector')).toBeInTheDocument();
    expect(screen.getByTestId('select-inner-city-btn')).toBeInTheDocument();

    // Trigger address change
    fireEvent.click(screen.getByTestId('select-inner-city-btn'));
  });
});
