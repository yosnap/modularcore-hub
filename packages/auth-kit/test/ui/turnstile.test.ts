import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete window.turnstile;
});

describe('TurnstileController', () => {
  it('starts ready when no siteKey is configured', () => {
    const controller = new TurnstileController();
    expect(controller.getState()).toEqual({ token: null, ready: true, resetSignal: 0 });
  });

  it('is not ready until a token arrives when a siteKey is configured', () => {
    const controller = new TurnstileController({ siteKey: 'test-key' });
    expect(controller.getState().ready).toBe(false);
    controller.setToken('tok');
    expect(controller.getState().ready).toBe(true);
  });

  it('reset() clears the token and bumps resetSignal', () => {
    const controller = new TurnstileController({ siteKey: 'test-key' });
    controller.setToken('tok');
    controller.reset();
    expect(controller.getState()).toEqual({ token: null, ready: false, resetSignal: 1 });
  });
});

describe('mountTurnstileWidget', () => {
  it('no-ops and marks the controller ready when siteKey is unset', () => {
    const controller = new TurnstileController();
    const container = document.createElement('div');
    const unmount = mountTurnstileWidget(container, controller);

    expect(controller.getState().token).toBe('');
    expect(document.head.querySelector('script')).toBeNull();
    expect(() => unmount()).not.toThrow();
  });

  it('renders the widget once window.turnstile is available and forwards its token', () => {
    const render = vi.fn().mockReturnValue('widget-1');
    const reset = vi.fn();
    const remove = vi.fn();
    window.turnstile = { render, reset, remove };

    const controller = new TurnstileController({ siteKey: 'site-key' });
    const container = document.createElement('div');
    const unmount = mountTurnstileWidget(container, controller);

    expect(render).toHaveBeenCalledTimes(1);
    const opts = render.mock.calls[0]![1] as { callback: (t: string) => void; sitekey: string };
    expect(opts.sitekey).toBe('site-key');

    opts.callback('server-token');
    expect(controller.getState()).toEqual({ token: 'server-token', ready: true, resetSignal: 0 });

    controller.reset();
    expect(reset).toHaveBeenCalledWith('widget-1');

    unmount();
    expect(remove).toHaveBeenCalledWith('widget-1');
  });
});
