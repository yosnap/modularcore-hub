const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface FocusTrap {
  activate(): void;
  deactivate(): void;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Pure DOM focus trap for modal/fullscreen overlays: cycles Tab/Shift+Tab within `el`, and
 * restores the previously focused element on `deactivate()`. No framework dependency — a thin
 * React/Svelte wrapper calls `activate()` on mount and `deactivate()` on unmount.
 */
export function createFocusTrap(el: HTMLElement): FocusTrap {
  let previouslyFocused: HTMLElement | null = null;

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = focusableElements(el);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = el.ownerDocument.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previouslyFocused = (el.ownerDocument.activeElement as HTMLElement) ?? null;
      el.addEventListener('keydown', onKeydown);
      const [first] = focusableElements(el);
      first?.focus();
    },
    deactivate() {
      el.removeEventListener('keydown', onKeydown);
      previouslyFocused?.focus();
      previouslyFocused = null;
    },
  };
}
