'use client';

import { useEffect } from 'react';
import {
  createClickDebounceTracker,
  getClickCooldownMs,
  resolveClickableTarget,
} from '@/lib/clickDebounce';

/**
 * Global capture-phase click and submit debounce guard mounted once at RootLayout.
 * Prevents accidental rapid double-clicks, double-navigations, and duplicate form
 * submissions across storefront and admin pages without breaking rapid stepper taps.
 */
export default function GlobalClickDebounceGuard() {
  useEffect(() => {
    const tracker = createClickDebounceTracker();
    const elementTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
    const activeTimers = new Set<ReturnType<typeof setTimeout>>();

    const markDebounced = (element: HTMLElement, cooldownMs: number) => {
      const existingTimer = elementTimers.get(element);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        activeTimers.delete(existingTimer);
      }

      element.setAttribute('data-click-debounced', 'true');
      const timer = setTimeout(() => {
        element.removeAttribute('data-click-debounced');
        elementTimers.delete(element);
        activeTimers.delete(timer);
      }, cooldownMs);

      elementTimers.set(element, timer);
      activeTimers.add(timer);
    };

    const handleClickCapture = (event: MouseEvent) => {
      const clickable = resolveClickableTarget(event.target);
      if (!clickable) {
        return;
      }

      const cooldownMs = getClickCooldownMs(clickable, 'click');
      if (tracker.shouldBlock(clickable, cooldownMs, 'click')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        markDebounced(clickable, cooldownMs);
      }
    };

    const handleSubmitCapture = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const cooldownMs = getClickCooldownMs(form, 'submit');
      if (tracker.shouldBlock(form, cooldownMs, 'submit')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        markDebounced(form, cooldownMs);
      }
    };

    document.addEventListener('click', handleClickCapture, true);
    document.addEventListener('submit', handleSubmitCapture, true);

    return () => {
      document.removeEventListener('click', handleClickCapture, true);
      document.removeEventListener('submit', handleSubmitCapture, true);
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return null;
}
