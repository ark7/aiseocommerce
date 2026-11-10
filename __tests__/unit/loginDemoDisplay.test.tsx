/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginForm } from '@/components/LoginForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('LoginForm - Demo Credentials Display and Client Isolation', () => {
  it('renders the 3 demo role buttons (Admin, Staf, Pembeli) when isDemo is true', () => {
    render(
      <LoginForm
        storeId="demo-store-001"
        storeDomain="demo-store.local"
        fromPath={null}
        isDemo={true}
      />
    );

    // 1. Verify Demo Credentials Card is visible
    expect(screen.getByTestId('demo-credentials-card')).toBeInTheDocument();
    expect(screen.getByText(/Akses Cepat Demo Toko/i)).toBeInTheDocument();

    // 2. Verify all 3 role quick-fill buttons exist
    const adminBtn = screen.getByTestId('demo-admin-btn');
    const staffBtn = screen.getByTestId('demo-staff-btn');
    const customerBtn = screen.getByTestId('demo-customer-btn');

    expect(adminBtn).toBeInTheDocument();
    expect(staffBtn).toBeInTheDocument();
    expect(customerBtn).toBeInTheDocument();

    // 3. Verify labels and emails
    expect(screen.getByText('admin@demo-store.local')).toBeInTheDocument();
    expect(screen.getByText('staff@demo-store.local')).toBeInTheDocument();
    expect(screen.getByText('customer1@demo-store.local')).toBeInTheDocument();
  });

  it('clicking Admin button auto-fills admin credentials into the input fields', () => {
    render(
      <LoginForm
        storeId="demo-store-001"
        storeDomain="demo-store.local"
        fromPath={null}
        isDemo={true}
      />
    );

    const emailInput = screen.getByPlaceholderText('admin@toko.com') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Masukkan password') as HTMLInputElement;

    // Click Admin Quick-Fill
    fireEvent.click(screen.getByTestId('demo-admin-btn'));

    expect(emailInput.value).toBe('admin@demo-store.local');
    expect(passwordInput.value).toBe('password');
  });

  it('clicking Staff button auto-fills staff credentials into the input fields', () => {
    render(
      <LoginForm
        storeId="demo-store-001"
        storeDomain="demo-store.local"
        fromPath={null}
        isDemo={true}
      />
    );

    const emailInput = screen.getByPlaceholderText('admin@toko.com') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Masukkan password') as HTMLInputElement;

    // Click Staff Quick-Fill
    fireEvent.click(screen.getByTestId('demo-staff-btn'));

    expect(emailInput.value).toBe('staff@demo-store.local');
    expect(passwordInput.value).toBe('password');
  });

  it('clicking Customer button auto-fills customer credentials into the input fields', () => {
    render(
      <LoginForm
        storeId="demo-store-001"
        storeDomain="demo-store.local"
        fromPath={null}
        isDemo={true}
      />
    );

    const emailInput = screen.getByPlaceholderText('admin@toko.com') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Masukkan password') as HTMLInputElement;

    // Click Customer Quick-Fill
    fireEvent.click(screen.getByTestId('demo-customer-btn'));

    expect(emailInput.value).toBe('customer1@demo-store.local');
    expect(passwordInput.value).toBe('password');
  });

  it('STRICT CLIENT ISOLATION: completely omits demo credentials when isDemo is false', () => {
    const { container } = render(
      <LoginForm
        storeId="client-store-real-123"
        storeDomain="tokosaya.com"
        fromPath={null}
        isDemo={false}
      />
    );

    // 1. Demo card and buttons must be completely absent
    expect(screen.queryByTestId('demo-credentials-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demo-admin-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demo-staff-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demo-customer-btn')).not.toBeInTheDocument();

    // 2. No demo emails or keywords in the container
    expect(container.textContent).not.toContain('admin@demo-store.local');
    expect(container.textContent).not.toContain('staff@demo-store.local');
    expect(container.textContent).not.toContain('customer1@demo-store.local');
    expect(container.textContent).not.toContain('Akses Cepat Demo Toko');

    // 3. Normal login form inputs are present
    expect(screen.getByPlaceholderText('admin@toko.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Masukkan password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
  });
});
