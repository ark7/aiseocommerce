/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/products'),
}));

jest.mock('@/lib/cart', () => ({
  getCartCount: jest.fn(() => 2),
  CART_UPDATED_EVENT: 'cart-updated',
}));

describe('StoreHeader & StoreFooter Layout Behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('does not render storeAddress in StoreHeader even when storeAddress prop is provided', () => {
    const { container } = render(
      <StoreHeader
        storeDomain="demo.larismanis.online"
        storeName="LarisManis Demo Store"
        storeAddress="Jl. Jend. Sudirman No. 123, Jakarta Selatan"
      />
    );

    expect(screen.getByText('LarisManis Demo Store')).toBeInTheDocument();
    expect(container.querySelector('header')).not.toHaveTextContent(
      'Jl. Jend. Sudirman No. 123, Jakarta Selatan'
    );
  });

  it('renders desktop nav links and toggles mobile navlist with navigation and auth links', () => {
    render(
      <StoreHeader
        storeDomain="demo.larismanis.online"
        storeName="LarisManis Demo Store"
      />
    );

    const toggleButton = screen.getByTestId('mobile-menu-toggle');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('mobile-navlist')).not.toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    const mobileNav = screen.getByTestId('mobile-navlist');
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav).toHaveTextContent('Beranda');
    expect(mobileNav).toHaveTextContent('Produk');
    expect(mobileNav).toHaveTextContent('Kategori');
    expect(mobileNav).toHaveTextContent('Artikel');
    expect(mobileNav).toHaveTextContent('Penawaran');
    expect(mobileNav).toHaveTextContent('Pesanan Saya');
    expect(mobileNav).toHaveTextContent('Masuk');
    expect(mobileNav).toHaveTextContent('Daftar');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-navlist')).not.toBeInTheDocument();
  });

  it('displays logged-in admin/staff link and logout inside mobile navlist', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'u1', email: 'admin@toko.id', role: 'ADMIN', firstName: 'Rina' })
    );

    render(
      <StoreHeader
        storeDomain="demo.larismanis.online"
        storeName="LarisManis Demo Store"
      />
    );

    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    const mobileNav = screen.getByTestId('mobile-navlist');
    expect(mobileNav).toHaveTextContent('Rina');
    expect(mobileNav).toHaveTextContent('Panel Admin');
    expect(mobileNav).toHaveTextContent('Keluar');
  });

  it('renders the store address cleanly inside StoreFooter', () => {
    render(
      <StoreFooter
        storeName="LarisManis Demo Store"
        address="Jl. Jend. Sudirman No. 123, Jakarta Selatan"
        phone="081234567890"
        email="halo@larismanis.online"
      />
    );

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('Alamat:');
    expect(footer).toHaveTextContent('Jl. Jend. Sudirman No. 123, Jakarta Selatan');
    expect(footer).toHaveTextContent('081234567890');
    expect(footer).toHaveTextContent('halo@larismanis.online');
  });
});
