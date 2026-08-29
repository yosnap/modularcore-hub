// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  focusInitialElement,
  restoreFocus,
  shouldCloseMobileDrawer,
  trapFocus,
} from './focus-management';

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

  it('keeps focus on the only control in a dialog', () => {
    const dialog = document.createElement('div');
    dialog.tabIndex = -1;
    dialog.innerHTML = '<button>Único</button>';
    document.body.append(dialog);
    const control = dialog.querySelector<HTMLButtonElement>('button');
    if (!control) throw new Error('El diálogo de prueba debe tener un botón');

    control.focus();
    expect(pressTab(dialog).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(control);
  });

  it('focuses the dialog itself when it has no controls', () => {
    const dialog = document.createElement('div');
    dialog.tabIndex = -1;
    const external = document.createElement('button');
    document.body.append(external, dialog);
    external.focus();

    expect(pressTab(dialog).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog);
  });

  it('brings external focus into the dialog at the appropriate edge', () => {
    const dialog = document.createElement('div');
    dialog.tabIndex = -1;
    dialog.innerHTML = '<button>Primero</button><button>Último</button>';
    const external = document.createElement('button');
    document.body.append(external, dialog);
    const first = dialog.querySelector<HTMLButtonElement>('button:first-child');
    const last = dialog.querySelector<HTMLButtonElement>('button:last-child');
    if (!first || !last) throw new Error('El diálogo de prueba debe tener dos botones');

    external.focus();
    pressTab(dialog);
    expect(document.activeElement).toBe(first);

    external.focus();
    pressTab(dialog, { shiftKey: true });
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

  it('does not move focus to a disconnected trigger', () => {
    const trigger = document.createElement('button');
    const fallback = document.createElement('button');
    document.body.append(trigger, fallback);
    fallback.focus();
    trigger.remove();

    restoreFocus(trigger);

    expect(document.activeElement).toBe(fallback);
  });

  it('only closes and restores drawer focus on an open mobile drawer', () => {
    expect(shouldCloseMobileDrawer(true, true)).toBe(true);
    expect(shouldCloseMobileDrawer(false, true)).toBe(false);
    expect(shouldCloseMobileDrawer(true, false)).toBe(false);
  });
});
