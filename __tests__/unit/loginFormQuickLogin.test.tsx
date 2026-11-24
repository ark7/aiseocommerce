/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginForm } from '@/components/LoginForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('LoginForm Quick Login Visibility Guard', () => {
  it('hides all Quick Login demo buttons and demo credentials when isDemo is false (duplicated client stores)', () => {
    const { queryByTestId, container } = render(
      <LoginForm
        storeId="store-client-1"
        storeDomain="tokoklien.com"
        fromPath="/admin"
        isDemo={false}
      />
    );

    expect(queryByTestId('demo-credentials-card')).toBeNull();
    expect(queryByTestId('demo-admin-btn')).toBeNull();
    expect(queryByTestId('demo-staff-btn')).toBeNull();
    expect(queryByTestId('demo-customer-btn')).toBeNull();
    expect(container.textContent).not.toContain('admin@demo-store.local');
    expect(container.textContent).not.toContain('staff@demo-store.local');
    expect(container.textContent).not.toContain('customer1@demo-store.local');
    expect(container.textContent).not.toContain('Akses Cepat Demo Toko');
  });

  it('renders Quick Login demo buttons when isDemo is true (public demo storefront)', () => {
    const { getByTestId } = render(
      <LoginForm
        storeId="demo-store-001"
        storeDomain="demo.larisdari.web.id"
        fromPath="/admin"
        isDemo={true}
      />
    );

    expect(getByTestId('demo-credentials-card')).toBeInTheDocument();
    expect(getByTestId('demo-admin-btn')).toBeInTheDocument();
    expect(getByTestId('demo-staff-btn')).toBeInTheDocument();
    expect(getByTestId('demo-customer-btn')).toBeInTheDocument();
  });
});
