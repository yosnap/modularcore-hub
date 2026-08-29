// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { focusInitialElement, restoreFocus, trapFocus } from './focus-management';

function pressTab(container: HTMLElement, options: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, ...options });
  trapFocus(event, container);
  return event;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('focus management', () => {
  it('focuses the first available control when a dialog opens', () => {
    const dialog = document.createElement('div');
    dialog.tabIndex = -1;
    dialog.innerHTML = '<button>Primero</button><button>Último</button>';
    document.body.append(dialog);

    focusInitialElement(dialog);

    expect(document.activeElement?.textContent).toBe('Primero');
  });

  it('cycles Tab and Shift+Tab inside a dialog', () => {
    const dialog = document.createElement('div');
    dialog.tabIndex = -1;
    dialog.innerHTML = '<button>Primero</button><button>Último</button>';
    document.body.append(dialog);
    const first = dialog.querySelector<HTMLButtonElement>('button:first-child');
    const last = dialog.querySelector<HTMLButtonElement>('button:last-child');
    if (!first || !last) throw new Error('El diálogo de prueba debe tener dos botones');

    last.focus();
    expect(pressTab(dialog).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    first.focus();
    expect(pressTab(dialog, { shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('restores focus to the opening control after close', () => {
    const trigger = document.createElement('button');
    const dialog = document.createElement('div');
    dialog.tabIndex = -1;
    dialog.innerHTML = '<button>Dentro</button>';
    document.body.append(trigger, dialog);

    dialog.querySelector('button')?.focus();
    restoreFocus(trigger);

    expect(document.activeElement).toBe(trigger);
  });
});
