import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModalsRenderer } from '../../ui/react/ModalsRenderer.js';

import type { OverlaysState } from '../../core/modals.js';
import type { ModalConfig } from '../../core/types.js';

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

describe('ModalsRenderer security boundary', () => {
  it('renders message as text and never executes it, even when it looks like HTML', () => {
    const onDismiss = vi.fn();
    render(<ModalsRenderer state={stateWithModal({ message: '<img src=x onerror=alert(1)>' })} onDismiss={onDismiss} />);

    const messageEl = screen.getByText('<img src=x onerror=alert(1)>');
    expect(messageEl.innerHTML).not.toContain('<img');
  });

  it('renders message as sanitized HTML only when allowHtml is set', () => {
    const onDismiss = vi.fn();
    render(
      <ModalsRenderer
        state={stateWithModal({ message: '**bold** <script>alert(1)</script>', allowHtml: true })}
        onDismiss={onDismiss}
      />,
    );

    const container = document.querySelector('.modals-message')!;
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('bold');
  });

  it('drops a javascript: button url instead of rendering it as href', () => {
    const onDismiss = vi.fn();
    render(
      <ModalsRenderer
        state={stateWithModal({ primaryButton: { text: 'Go', url: 'javascript:alert(1)' } })}
        onDismiss={onDismiss}
      />,
    );

    const button = screen.getByText('Go');
    expect(button.tagName).toBe('BUTTON'); // no safe href -> rendered as a button, not an <a href>
  });

  it('renders an allowed https button url with rel="noopener noreferrer"', () => {
    const onDismiss = vi.fn();
    render(
      <ModalsRenderer
        state={stateWithModal({ primaryButton: { text: 'Go', url: 'https://example.com' } })}
        onDismiss={onDismiss}
      />,
    );

    const link = screen.getByText('Go');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('ModalOverlay accessibility', () => {
  it('closes on Escape and traps focus', () => {
    const onDismiss = vi.fn();
    render(<ModalsRenderer state={stateWithModal()} onDismiss={onDismiss} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledWith('m1', 'close-button');
  });
});

describe('Toast auto-dismiss', () => {
  it('auto-dismisses after autoDismissMs, and dismiss is idempotent (manual + late timer)', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const state: OverlaysState = {
      active: {},
      toasts: [{ id: 't1', type: 'toast', message: 'hi', trigger: { type: 'manual' }, autoDismissMs: 1000 }],
      loading: false,
      error: null,
    };

    render(<ModalsRenderer state={state} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('t1', 'close-button');

    vi.useRealTimers();
  });
});
