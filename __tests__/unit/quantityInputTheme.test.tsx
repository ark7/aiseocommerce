/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToCartButton from '@/components/AddToCartButton';
import CartPage from '@/components/CartPage';

// Mock tracking and attribution
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

// Mock subcomponents of CartPage
jest.mock('@/components/StoreHeader', () => () => <header data-testid="store-header" />);
jest.mock('@/components/StoreFooter', () => () => <footer data-testid="store-footer" />);
jest.mock('@/components/AddressLocationSelector', () => () => <div data-testid="address-selector" />);

describe('Quantity Input Theme & Dark Mode Visibility', () => {
  const defaultProps = {
    productId: 'test-prod-1',
    storeDomain: 'test-store.local',
    price: 150000,
    name: 'Kemeja Katun Premium',
    stock: 10,
    isPreOrder: false,
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('AddToCartButton Quantity Stepper', () => {
    it('renders quantity stepper container with dark mode background and border classes', () => {
      const { container } = render(<AddToCartButton {...defaultProps} />);
      const stepper = container.querySelector('[data-quantity-stepper]');

      expect(stepper).toBeInTheDocument();
      expect(stepper).toHaveClass('bg-white');
      expect(stepper).toHaveClass('dark:bg-slate-800');
      expect(stepper).toHaveClass('border-gray-300');
      expect(stepper).toHaveClass('dark:border-slate-700');
    });

    it('renders quantity counter text with explicit high-contrast classes in light and dark mode', () => {
      const { container } = render(<AddToCartButton {...defaultProps} />);
      const counter = container.querySelector('[data-quantity-counter]');

      expect(counter).toBeInTheDocument();
      expect(counter).toHaveTextContent('1');
      // High contrast text classes ensuring visibility
      expect(counter).toHaveClass('text-slate-900');
      expect(counter).toHaveClass('dark:text-slate-100');
      // Explicit background classes preventing inherited transparency / white bleed
      expect(counter).toHaveClass('bg-white');
      expect(counter).toHaveClass('dark:bg-slate-800');
      expect(counter).toHaveClass('dark:border-slate-700');
    });

    it('renders stepper buttons with proper aria-labels and dark mode styling', () => {
      render(<AddToCartButton {...defaultProps} />);
      const decBtn = screen.getByRole('button', { name: /kurangi jumlah/i });
      const incBtn = screen.getByRole('button', { name: /tambah jumlah/i });

      expect(decBtn).toBeInTheDocument();
      expect(incBtn).toBeInTheDocument();

      // Check contrast classes
      expect(decBtn).toHaveClass('text-gray-700');
      expect(decBtn).toHaveClass('dark:text-slate-200');
      expect(decBtn).toHaveClass('dark:hover:bg-slate-700');

      expect(incBtn).toHaveClass('text-gray-700');
      expect(incBtn).toHaveClass('dark:text-slate-200');
      expect(incBtn).toHaveClass('dark:hover:bg-slate-700');
    });

    it('updates quantity number visibly upon increment and decrement', () => {
      const { container } = render(<AddToCartButton {...defaultProps} />);
      const counter = container.querySelector('[data-quantity-counter]');
      const decBtn = screen.getByRole('button', { name: /kurangi jumlah/i });
      const incBtn = screen.getByRole('button', { name: /tambah jumlah/i });

      expect(counter).toHaveTextContent('1');
      expect(decBtn).toBeDisabled();

      // Increment
      fireEvent.click(incBtn);
      expect(counter).toHaveTextContent('2');
      expect(decBtn).not.toBeDisabled();

      // Increment again
      fireEvent.click(incBtn);
      expect(counter).toHaveTextContent('3');

      // Decrement back
      fireEvent.click(decBtn);
      expect(counter).toHaveTextContent('2');

      fireEvent.click(decBtn);
      expect(counter).toHaveTextContent('1');
      expect(decBtn).toBeDisabled();
    });

    it('respects maximum stock limit when not pre-order', () => {
      const { container } = render(<AddToCartButton {...defaultProps} stock={2} />);
      const counter = container.querySelector('[data-quantity-counter]');
      const incBtn = screen.getByRole('button', { name: /tambah jumlah/i });

      expect(counter).toHaveTextContent('1');
      fireEvent.click(incBtn);
      expect(counter).toHaveTextContent('2');
      expect(incBtn).toBeDisabled();

      // Clicking further does not exceed stock
      fireEvent.click(incBtn);
      expect(counter).toHaveTextContent('2');
    });
  });

  describe('CartPage Quantity Stepper & Theme', () => {
    it('renders cart item stepper with dark mode background and high-contrast counter', () => {
      const mockCart = [
        {
          productId: 'prod-cart-1',
          name: 'Jaket Denim Vintage',
          price: 350000,
          quantity: 2,
        },
      ];
      localStorage.setItem('cart_test-store.local', JSON.stringify(mockCart));

      const { container } = render(
        <CartPage storeId="store-1" storeDomain="test-store.local" />
      );

      const stepper = container.querySelector('[data-quantity-stepper]');
      expect(stepper).toBeInTheDocument();
      expect(stepper).toHaveClass('bg-white');
      expect(stepper).toHaveClass('dark:bg-slate-800');
      expect(stepper).toHaveClass('border-gray-300');
      expect(stepper).toHaveClass('dark:border-slate-700');

      const counter = container.querySelector('[data-quantity-counter]');
      expect(counter).toBeInTheDocument();
      expect(counter).toHaveTextContent('2');
      expect(counter).toHaveClass('text-slate-900');
      expect(counter).toHaveClass('dark:text-slate-100');

      const decBtn = screen.getByRole('button', { name: /kurangi jumlah item/i });
      const incBtn = screen.getByRole('button', { name: /tambah jumlah item/i });
      expect(decBtn).toHaveClass('dark:text-slate-200');
      expect(incBtn).toHaveClass('dark:text-slate-200');
    });
  });
});
