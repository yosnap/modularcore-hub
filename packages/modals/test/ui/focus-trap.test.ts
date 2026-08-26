import { describe, expect, it } from 'vitest';

import { createFocusTrap } from '../../ui/a11y/focus-trap.js';

function buildTrapHost(): { container: HTMLElement; outside: HTMLButtonElement } {
  const outside = document.createElement('button');
  outside.textContent = 'outside';
  document.body.appendChild(outside);

  const container = document.createElement('div');
  container.innerHTML = '<button id="first">first</button><button id="last">last</button>';
  document.body.appendChild(container);

  return { container, outside };
}

describe('createFocusTrap', () => {
  it('focuses the first element on activate and restores the previous focus on deactivate', () => {
    const { container, outside } = buildTrapHost();
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const trap = createFocusTrap(container);
    trap.activate();
    expect(document.activeElement).toBe(container.querySelector('#first'));

    trap.deactivate();
    expect(document.activeElement).toBe(outside);
  });

  it('cycles Tab forward from last to first and Shift+Tab backward from first to last', () => {
    const { container } = buildTrapHost();
    const first = container.querySelector<HTMLButtonElement>('#first')!;
    const last = container.querySelector<HTMLButtonElement>('#last')!;

    const trap = createFocusTrap(container);
    trap.activate();

    last.focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    container.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(first);

    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    container.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(last);

    trap.deactivate();
  });
});
