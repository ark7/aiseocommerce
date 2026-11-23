/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalClickDebounceGuard from '@/components/GlobalClickDebounceGuard';
import AddToCartButton from '@/components/AddToCartButton';
import { addToCart } from '@/lib/cart';
import {
  DEFAULT_CLICK_DEBOUNCE_MS,
  DEFAULT_SUBMIT_DEBOUNCE_MS,
  STEPPER_CLICK_DEBOUNCE_MS,
} from '@/lib/clickDebounce';

jest.mock('@/lib/cart', () => ({
  addToCart: jest.fn(),
}));

jest.mock('@/lib/tracking', () => ({
  buildAddToCartCalls: jest.fn(() => []),
  getTrackingConfig: jest.fn(() => ({})),
  sendTrackingCalls: jest.fn(),
}));

jest.mock('@/lib/funnelEvents', () => ({
  trackFunnelEvent: jest.fn(),
}));

describe('GlobalClickDebounceGuard & Interactive Lock Protection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-16T12:00:00Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('GlobalClickDebounceGuard (Lapis 1)', () => {
    it('blocks rapid duplicate clicks on a standard button within 450ms and recovers afterwards', () => {
      const handleClick = jest.fn();

      render(
        <>
          <GlobalClickDebounceGuard />
          <button type="button" onClick={handleClick}>
            <span>Simpan Perubahan</span>
          </button>
        </>
      );

      const button = screen.getByRole('button', { name: /Simpan Perubahan/i });
      const nestedSpan = screen.getByText('Simpan Perubahan');

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(nestedSpan);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(button).toHaveAttribute('data-click-debounced', 'true');

      act(() => {
        jest.advanceTimersByTime(DEFAULT_CLICK_DEBOUNCE_MS);
      });

      expect(button).not.toHaveAttribute('data-click-debounced');

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('tracks separate buttons and links independently per DOM element', () => {
      const onActionA = jest.fn();
      const onActionB = jest.fn();
      const onLinkClick = jest.fn((e: React.MouseEvent) => e.preventDefault());

      render(
        <>
          <GlobalClickDebounceGuard />
          <button type="button" onClick={onActionA}>
            Aksi A
          </button>
          <button type="button" onClick={onActionB}>
            Aksi B
          </button>
          <a href="/products" onClick={onLinkClick}>
            Lihat Produk
          </a>
        </>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Aksi A' }));
      fireEvent.click(screen.getByRole('button', { name: 'Aksi B' }));

      expect(onActionA).toHaveBeenCalledTimes(1);
      expect(onActionB).toHaveBeenCalledTimes(1);

      const link = screen.getByRole('link', { name: 'Lihat Produk' });
      fireEvent.click(link);
      fireEvent.click(link);
      expect(onLinkClick).toHaveBeenCalledTimes(1);
    });

    it('blocks rapid duplicate form submissions within 800ms cooldown', () => {
      const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());

      render(
        <>
          <GlobalClickDebounceGuard />
          <form aria-label="Checkout Form" onSubmit={onSubmit}>
            <input type="text" aria-label="Nama" />
            <button type="submit">Kirim</button>
          </form>
        </>
      );

      const form = screen.getByRole('form', { name: 'Checkout Form' });

      fireEvent.submit(form);
      act(() => {
        jest.advanceTimersByTime(DEFAULT_SUBMIT_DEBOUNCE_MS - 100);
      });
      fireEvent.submit(form);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(form).toHaveAttribute('data-click-debounced', 'true');

      act(() => {
        jest.advanceTimersByTime(DEFAULT_SUBMIT_DEBOUNCE_MS);
      });

      fireEvent.submit(form);
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it('applies 80ms micro-debounce to quantity steppers and tabs for rapid clicking', () => {
      const onIncrement = jest.fn();
      const onTab = jest.fn();

      render(
        <>
          <GlobalClickDebounceGuard />
          <div data-quantity-stepper>
            <button type="button" onClick={onIncrement}>
              +
            </button>
          </div>
          <button type="button" role="tab" onClick={onTab}>
            Semua
          </button>
        </>
      );

      const plusBtn = screen.getByRole('button', { name: '+' });
      const tabBtn = screen.getByRole('tab', { name: 'Semua' });

      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      expect(onIncrement).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(STEPPER_CLICK_DEBOUNCE_MS + 10);
      });

      fireEvent.click(plusBtn);
      expect(onIncrement).toHaveBeenCalledTimes(2);

      fireEvent.click(tabBtn);
      act(() => {
        jest.advanceTimersByTime(STEPPER_CLICK_DEBOUNCE_MS + 10);
      });
      fireEvent.click(tabBtn);
      expect(onTab).toHaveBeenCalledTimes(2);
    });

    it('skips debouncing for data-no-debounce="true" and non-button text inputs', () => {
      const onOptOutClick = jest.fn();
      const onInputClick = jest.fn();

      render(
        <>
          <GlobalClickDebounceGuard />
          <button type="button" data-no-debounce="true" onClick={onOptOutClick}>
            Bypass
          </button>
          <input type="text" aria-label="Cari" onClick={onInputClick} />
        </>
      );

      const bypassBtn = screen.getByRole('button', { name: 'Bypass' });
      const textInput = screen.getByLabelText('Cari');

      fireEvent.click(bypassBtn);
      fireEvent.click(bypassBtn);
      fireEvent.click(bypassBtn);
      expect(onOptOutClick).toHaveBeenCalledTimes(3);

      fireEvent.click(textInput);
      fireEvent.click(textInput);
      expect(onInputClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('AddToCartButton (Lapis 2 ref lock + timer cleanup)', () => {
    it('prevents duplicate addToCart calls when clicked 3x rapidly without global guard', () => {
      render(
        <AddToCartButton
          productId="prod-1"
          storeDomain="demo.larisdari.web.id"
          price={50000}
          name="Produk Uji"
          stock={20}
        />
      );

      const getAddButton = () =>
        screen.getByRole('button', { name: /Tambah ke Keranjang|Berhasil Ditambahkan/i });

      fireEvent.click(getAddButton());
      fireEvent.click(getAddButton());
      fireEvent.click(getAddButton());

      expect(addToCart).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(DEFAULT_CLICK_DEBOUNCE_MS + 10);
      });

      fireEvent.click(getAddButton());
      expect(addToCart).toHaveBeenCalledTimes(2);
    });

    it('cleans up pending feedback timers cleanly on unmount', () => {
      const { unmount } = render(
        <AddToCartButton
          productId="prod-2"
          storeDomain="demo.larisdari.web.id"
          price={25000}
          name="Produk Cleanup"
          stock={10}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Tambah ke Keranjang/i }));
      expect(addToCart).toHaveBeenCalledTimes(1);

      unmount();

      expect(() => {
        act(() => {
          jest.advanceTimersByTime(6000);
        });
      }).not.toThrow();
    });
  });
});
