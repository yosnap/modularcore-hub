import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { describe, expect, it, vi, afterEach } from 'vitest';

import ModalsRenderer from '../../ui/svelte/ModalsRenderer.svelte';

import type { OverlaysState } from '../../core/modals.js';
import type { ModalConfig } from '../../core/types.js';

afterEach(() => cleanup());

function stateWithModal(config: Partial<ModalConfig> = {}): OverlaysState {
  return {
    active: {
      modal: {
        id: 'm1',
        type: 'modal',
        message: 'hello',
        trigger: { type: 'manual' },
        ...config,
      },
    },
    toasts: [],
    loading: false,
    error: null,
  };
}

describe('ModalsRenderer.svelte security boundary', () => {
  it('renders message as text and never executes it, even when it looks like HTML', () => {
    const ondismiss = vi.fn();
    render(ModalsRenderer, { state: stateWithModal({ message: '<img src=x onerror=alert(1)>' }), ondismiss });

    const messageEl = screen.getByText('<img src=x onerror=alert(1)>');
    expect(messageEl.innerHTML).not.toContain('<img');
  });

  it('renders message as sanitized HTML only when allowHtml is set', () => {
    const ondismiss = vi.fn();
    render(ModalsRenderer, {
      state: stateWithModal({ message: '**bold** <script>alert(1)</script>', allowHtml: true }),
      ondismiss,
    });

    const container = document.querySelector('.modals-message')!;
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('bold');
  });

  it('drops a javascript: button url instead of rendering it as href', () => {
    const ondismiss = vi.fn();
    render(ModalsRenderer, {
      state: stateWithModal({ primaryButton: { text: 'Go', url: 'javascript:alert(1)' } }),
      ondismiss,
    });

    const button = screen.getByText('Go');
    expect(button.tagName).toBe('BUTTON');
  });

  it('renders an allowed https button url with rel="noopener noreferrer"', () => {
    const ondismiss = vi.fn();
    render(ModalsRenderer, {
      state: stateWithModal({ primaryButton: { text: 'Go', url: 'https://example.com' } }),
      ondismiss,
    });

    const link = screen.getByText('Go');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('ModalOverlay.svelte accessibility', () => {
  it('closes on Escape', async () => {
    const ondismiss = vi.fn();
    render(ModalsRenderer, { state: stateWithModal(), ondismiss });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(ondismiss).toHaveBeenCalledWith('m1', 'close-button');
  });
});

describe('Toast.svelte auto-dismiss', () => {
  it('auto-dismisses after autoDismissMs', async () => {
    vi.useFakeTimers();
    const ondismiss = vi.fn();
    const state: OverlaysState = {
      active: {},
      toasts: [{ id: 't1', type: 'toast', message: 'hi', trigger: { type: 'manual' }, autoDismissMs: 1000 }],
      loading: false,
      error: null,
    };

    render(ModalsRenderer, { state, ondismiss });
    await vi.advanceTimersByTimeAsync(1000);

    expect(ondismiss).toHaveBeenCalledWith('t1', 'close-button');
    vi.useRealTimers();
  });
});
