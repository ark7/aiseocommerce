/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('Turnstile Auth Forms (Explicit SPA Rendering & Single-Use Token Reset)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    document.head.innerHTML = '';
    delete window.turnstile;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('explicitly renders LoginForm widget with action=login, sends cf-turnstile-response, resets on failed submit, and removes on unmount', async () => {
    let capturedCallback: ((token: string) => void) | undefined;
    const renderMock = jest.fn((_el: HTMLElement, opts: { callback?: (t: string) => void }) => {
      capturedCallback = opts.callback;
      return 'login-widget-1';
    });
    const resetMock = jest.fn();
    const removeMock = jest.fn();
    window.turnstile = {
      render: renderMock,
      reset: resetMock,
      remove: removeMock,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid email or password' }),
    } as any);

    const { container, unmount } = render(
      <LoginForm
        storeId="demo-store-001"
        storeDomain="demo.larisdari.web.id"
        fromPath={null}
        siteKey="0x4AAAAAAGOyEGvopPqTPLIf"
      />
    );

    expect(renderMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        sitekey: '0x4AAAAAAGOyEGvopPqTPLIf',
        action: 'login',
      })
    );

    act(() => {
      capturedCallback?.('login-token-123');
    });

    const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
    const passInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { name: 'email', value: 'user@demo.id' } });
    fireEvent.change(passInput, { target: { name: 'password', value: 'password123' } });

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    const fetchBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(fetchBody.turnstileToken).toBe('login-token-123');
    expect(fetchBody['cf-turnstile-response']).toBe('login-token-123');

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledWith('login-widget-1');
    });

    unmount();
    expect(removeMock).toHaveBeenCalledWith('login-widget-1');
  });

  it('explicitly renders RegisterForm widget with action=signup even when script tag exists, resets on failure, and removes on unmount', async () => {
    const preloadedScript = document.createElement('script');
    preloadedScript.id = 'cf-turnstile-script';
    document.head.appendChild(preloadedScript);

    let capturedCallback: ((token: string) => void) | undefined;
    const renderMock = jest.fn((_el: HTMLElement, opts: { callback?: (t: string) => void }) => {
      capturedCallback = opts.callback;
      return 'signup-widget-1';
    });
    const resetMock = jest.fn();
    const removeMock = jest.fn();
    window.turnstile = {
      render: renderMock,
      reset: resetMock,
      remove: removeMock,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already registered' }),
    } as any);

    const { container, unmount } = render(
      <RegisterForm
        storeId="demo-store-001"
        storeDomain="demo.larisdari.web.id"
        fromPath={null}
        siteKey="0x4AAAAAAGOyEGvopPqTPLIf"
      />
    );

    expect(renderMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        sitekey: '0x4AAAAAAGOyEGvopPqTPLIf',
        action: 'signup',
      })
    );

    act(() => {
      capturedCallback?.('signup-token-456');
    });

    fireEvent.change(container.querySelector('input[name="firstName"]') as HTMLInputElement, {
      target: { name: 'firstName', value: 'Budi' },
    });
    fireEvent.change(container.querySelector('input[name="lastName"]') as HTMLInputElement, {
      target: { name: 'lastName', value: 'Santoso' },
    });
    fireEvent.change(container.querySelector('input[name="email"]') as HTMLInputElement, {
      target: { name: 'email', value: 'budi@demo.id' },
    });
    fireEvent.change(container.querySelector('input[name="password"]') as HTMLInputElement, {
      target: { name: 'password', value: 'password123' },
    });

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const fetchBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(fetchBody.turnstileToken).toBe('signup-token-456');
    expect(fetchBody['cf-turnstile-response']).toBe('signup-token-456');

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledWith('signup-widget-1');
    });

    unmount();
    expect(removeMock).toHaveBeenCalledWith('signup-widget-1');
  });
});
