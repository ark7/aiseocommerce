export const DEFAULT_CLICK_DEBOUNCE_MS = 450;
export const DEFAULT_SUBMIT_DEBOUNCE_MS = 800;
export const STEPPER_CLICK_DEBOUNCE_MS = 80;

export type DebounceEventKind = 'click' | 'submit';

const CLICKABLE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  'summary',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="reset"]',
].join(', ');

function isElementDisabled(element: HTMLElement): boolean {
  if (element.getAttribute('aria-disabled') === 'true') {
    return true;
  }
  try {
    if (element.matches(':disabled')) {
      return true;
    }
  } catch {
    // Fallback for non-standard elements
  }
  return 'disabled' in element && Boolean((element as HTMLButtonElement).disabled);
}

/**
 * Resolves the interactive HTML element targeted by a click event,
 * or returns null when the target should not be debounced (e.g. text inputs,
 * disabled controls, or elements opted out via data-no-debounce="true").
 */
export function resolveClickableTarget(target: EventTarget | null): HTMLElement | null {
  const baseElement =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;

  if (!baseElement) {
    return null;
  }

  const clickable = baseElement.closest(CLICKABLE_SELECTOR);
  if (!(clickable instanceof HTMLElement)) {
    return null;
  }

  if (clickable.closest('[data-no-debounce="true"]')) {
    return null;
  }

  if (isElementDisabled(clickable)) {
    return null;
  }

  return clickable;
}

/**
 * Determines the cooldown duration in milliseconds for a given interactive element.
 */
export function getClickCooldownMs(
  element: HTMLElement,
  kind: DebounceEventKind = 'click'
): number {
  if (element.closest('[data-no-debounce="true"]')) {
    return 0;
  }

  const customCooldown = element.getAttribute('data-debounce-ms');
  if (customCooldown !== null) {
    const parsed = Number(customCooldown);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  if (kind === 'submit') {
    return DEFAULT_SUBMIT_DEBOUNCE_MS;
  }

  if (
    element.matches('[data-allow-rapid-click="true"], [role="tab"]') ||
    Boolean(element.closest('[data-quantity-stepper]'))
  ) {
    return STEPPER_CLICK_DEBOUNCE_MS;
  }

  return DEFAULT_CLICK_DEBOUNCE_MS;
}

/**
 * Tracks leading-edge click/submit timestamps per DOM element without leaking memory.
 */
export function createClickDebounceTracker(nowFn: () => number = () => Date.now()) {
  const lastTimestamps: Record<DebounceEventKind, WeakMap<EventTarget, number>> = {
    click: new WeakMap<EventTarget, number>(),
    submit: new WeakMap<EventTarget, number>(),
  };

  return {
    shouldBlock(
      target: EventTarget,
      cooldownMs: number,
      kind: DebounceEventKind = 'click'
    ): boolean {
      if (cooldownMs <= 0) {
        return false;
      }

      const map = lastTimestamps[kind];
      const now = nowFn();
      const previous = map.get(target);

      if (previous !== undefined && now - previous < cooldownMs) {
        return true;
      }

      map.set(target, now);
      return false;
    },
  };
}
