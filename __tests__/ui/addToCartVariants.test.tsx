/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToCartButton, { ProductVariantItem } from '@/components/AddToCartButton';
import { addToCart } from '@/lib/cart';

jest.mock('@/lib/cart', () => ({
  addToCart: jest.fn(),
}));

jest.mock('@/lib/tracking', () => ({
  buildAddToCartCalls: jest.fn().mockReturnValue([]),
  getTrackingConfig: jest.fn().mockReturnValue({}),
  sendTrackingCalls: jest.fn(),
}));

jest.mock('@/lib/funnelEvents', () => ({
  trackFunnelEvent: jest.fn(),
}));

describe('UI Test Automation: AddToCartButton with Product Variants', () => {
  const storeDomain = 'demo-store.local';
  const productId = 'prod-test-01';

  const mockVariants: ProductVariantItem[] = [
    {
      id: 'var-s',
      name: 'Ukuran: S',
      optionType: 'SIZE',
      optionValue: 'S',
      price: null, // same as base price 100.000
      stock: 10,
    },
    {
      id: 'var-xl',
      name: 'Ukuran: XL',
      optionType: 'SIZE',
      optionValue: 'XL',
      price: 125000, // custom price override
      stock: 5,
    },
    {
      id: 'var-xxl',
      name: 'Ukuran: XXL',
      optionType: 'SIZE',
      optionValue: 'XXL',
      price: 135000,
      stock: 0, // out of stock
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all variant chips and auto-selects the first in-stock variant', () => {
    render(
      <AddToCartButton
        productId={productId}
        storeDomain={storeDomain}
        price={100000}
        name="Kemeja Flanel Casual"
        stock={15}
        variants={mockVariants}
      />
    );

    expect(screen.getByText('Pilihan Varian:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ukuran: S/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ukuran: XL/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ukuran: XXL/i })).toBeInTheDocument();

    // Default selected variant is S (in stock)
    expect(screen.getByText('Sisa 10 stok')).toBeInTheDocument();
    expect(screen.getByText(/Rp 100\.000/)).toBeInTheDocument();
  });

  it('updates dynamic price and stock indicator when a different variant chip is clicked', () => {
    render(
      <AddToCartButton
        productId={productId}
        storeDomain={storeDomain}
        price={100000}
        name="Kemeja Flanel Casual"
        stock={15}
        variants={mockVariants}
      />
    );

    // Click variant XL
    const xlButton = screen.getByRole('button', { name: /Ukuran: XL/i });
    fireEvent.click(xlButton);

    // Stock indicator should update to Sisa 5 stok
    expect(screen.getByText('Sisa 5 stok')).toBeInTheDocument();

    // Price should update to Rp 125.000
    expect(screen.getByText('Rp 125.000')).toBeInTheDocument();
  });

  it('disables variant chip when variant stock is 0', () => {
    render(
      <AddToCartButton
        productId={productId}
        storeDomain={storeDomain}
        price={100000}
        name="Kemeja Flanel Casual"
        stock={15}
        variants={mockVariants}
      />
    );

    const xxlButton = screen.getByRole('button', { name: /Ukuran: XXL/i });
    expect(xxlButton).toBeDisabled();
  });

  it('calls addToCart with selected variantId and variation label when clicked', async () => {
    render(
      <AddToCartButton
        productId={productId}
        storeDomain={storeDomain}
        price={100000}
        name="Kemeja Flanel Casual"
        stock={15}
        imageUrl="/images/flanel.jpg"
        variants={mockVariants}
      />
    );

    // Click variant XL
    const xlButton = screen.getByRole('button', { name: /Ukuran: XL/i });
    fireEvent.click(xlButton);

    // Click Add to Cart button
    const submitBtn = screen.getByRole('button', { name: /Tambah ke Keranjang/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addToCart).toHaveBeenCalledWith(
        storeDomain,
        expect.objectContaining({
          productId,
          name: 'Kemeja Flanel Casual',
          price: 125000,
          quantity: 1,
          variantId: 'var-xl',
          variation: 'Ukuran: XL',
        })
      );
    });
  });
});
