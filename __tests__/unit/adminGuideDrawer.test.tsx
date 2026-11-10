/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminGuideDrawer from '@/components/AdminGuideDrawer';
import {
  ADMIN_GUIDE_CHAPTERS,
  getGuideChapterForPath,
} from '@/lib/adminGuideContent';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/admin/products'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe('Admin Guide Content & Mapping (lib/adminGuideContent)', () => {
  it('contains comprehensive guide chapters for all core admin modules', () => {
    const chapterIds = ADMIN_GUIDE_CHAPTERS.map((ch) => ch.id);
    expect(chapterIds).toContain('dashboard');
    expect(chapterIds).toContain('products');
    expect(chapterIds).toContain('categories');
    expect(chapterIds).toContain('orders');
    expect(chapterIds).toContain('customers');
    expect(chapterIds).toContain('finance');
    expect(chapterIds).toContain('promo');
    expect(chapterIds).toContain('cms');
    expect(chapterIds).toContain('articles');
    expect(chapterIds).toContain('analytics');
    expect(chapterIds).toContain('settings');
    expect(chapterIds).toContain('staff');
    expect(chapterIds).toContain('ai-studio');
  });

  it('validates each chapter contains required fields: steps, tips, warnings, and faqs', () => {
    ADMIN_GUIDE_CHAPTERS.forEach((ch) => {
      expect(ch.title).toBeTruthy();
      expect(ch.menuName).toBeTruthy();
      expect(ch.icon).toBeTruthy();
      expect(ch.summary).toBeTruthy();
      expect(ch.steps.length).toBeGreaterThan(0);
      expect(ch.tips.length).toBeGreaterThan(0);
      expect(ch.faqs.length).toBeGreaterThan(0);
    });
  });

  it('resolves contextual chapter accurately based on active URL pathname', () => {
    expect(getGuideChapterForPath('/admin').id).toBe('dashboard');
    expect(getGuideChapterForPath('/admin/products').id).toBe('products');
    expect(getGuideChapterForPath('/admin/products/add').id).toBe('products');
    expect(getGuideChapterForPath('/admin/products/edit/prod_123').id).toBe('products');
    expect(getGuideChapterForPath('/admin/categories').id).toBe('categories');
    expect(getGuideChapterForPath('/admin/orders').id).toBe('orders');
    expect(getGuideChapterForPath('/admin/orders/ord_abc').id).toBe('orders');
    expect(getGuideChapterForPath('/admin/customers').id).toBe('customers');
    expect(getGuideChapterForPath('/admin/finance').id).toBe('finance');
    expect(getGuideChapterForPath('/admin/promo').id).toBe('promo');
    expect(getGuideChapterForPath('/admin/cms').id).toBe('cms');
    expect(getGuideChapterForPath('/admin/articles').id).toBe('articles');
    expect(getGuideChapterForPath('/admin/analytics').id).toBe('analytics');
    expect(getGuideChapterForPath('/admin/funnel').id).toBe('analytics');
    expect(getGuideChapterForPath('/admin/settings').id).toBe('settings');
    expect(getGuideChapterForPath('/admin/staff').id).toBe('staff');
    expect(getGuideChapterForPath('/admin/ai').id).toBe('ai-studio');
  });

  it('falls back gracefully to dashboard for unrecognized paths', () => {
    expect(getGuideChapterForPath('/admin/unknown-page').id).toBe('dashboard');
  });
});

describe('AdminGuideDrawer Component (components/AdminGuideDrawer)', () => {
  it('renders the floating right-edge trigger button when closed', () => {
    const handleOpen = jest.fn();
    const handleClose = jest.fn();

    render(
      <AdminGuideDrawer
        isOpen={false}
        onOpen={handleOpen}
        onClose={handleClose}
      />
    );

    const triggerBtn = screen.getByRole('button', { name: /Buka Panduan Menu Ini/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('renders right-side drawer content when open and allows closing', () => {
    const handleOpen = jest.fn();
    const handleClose = jest.fn();

    render(
      <AdminGuideDrawer
        isOpen={true}
        onOpen={handleOpen}
        onClose={handleClose}
      />
    );

    // Title should be visible
    expect(screen.getByText('Panduan Pengguna Admin')).toBeInTheDocument();
    expect(screen.getAllByText(/Katalog Produk, PO & Omnichannel/i).length).toBeGreaterThanOrEqual(1);

    // Close button should trigger onClose
    const closeBtn = screen.getByRole('button', { name: /Tutup Panduan/i });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows switching between Steps, Tips, and FAQ tabs', () => {
    render(
      <AdminGuideDrawer
        isOpen={true}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Click Tips tab
    const tipsTab = screen.getByText(/💡 Tips & Peringatan/i);
    fireEvent.click(tipsTab);
    expect(screen.getByText(/Tips Praktis Mempercepat Kerja/i)).toBeInTheDocument();

    // Click FAQ tab
    const faqTab = screen.getByText(/❓ FAQ/i);
    fireEvent.click(faqTab);
    expect(screen.getByText(/Bagaimana cara menampilkan tombol/i)).toBeInTheDocument();
  });

  it('filters guide steps dynamically via quick search input', () => {
    render(
      <AdminGuideDrawer
        isOpen={true}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Cari topik panduan ini/i);
    fireEvent.change(searchInput, { target: { value: 'Marketplace' } });

    expect(screen.getByText(/Hubungkan Link Marketplace/i)).toBeInTheDocument();
  });

  it('renders LarisManis.online brand in the drawer footer', () => {
    render(
      <AdminGuideDrawer
        isOpen={true}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/LarisManis\.online/i)).toBeInTheDocument();
  });
});
