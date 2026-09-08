/**
 * Headless Cloudflare Turnstile controller. Framework adapters/UI mount a widget into a
 * container element via `mountTurnstileWidget` and read `token`/`ready` off the controller's
 * subscribe stream — same split as the rest of auth-kit (state lives in a plain class, UI is a
 * thin binding). No React/Svelte/Vue-specific code here, only standard DOM/`window` access,
 * matching how `media-picker/core/canvas` touches the Canvas API directly from core.
 */

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const RENDER_POLL_MS = 500;

export interface TurnstileOptions {
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  mode?: 'managed' | 'non-interactive' | 'invisible';
}

export interface TurnstileState {
  token: string | null;
  /** True once a token is available, or immediately when no `siteKey` is configured (dev no-op). */
  ready: boolean;
  /** Bumped by `reset()` — a mounted widget watches this to call the real `turnstile.reset()`. */
  resetSignal: number;
}

export type TurnstileListener = (state: TurnstileState) => void;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

export class TurnstileController {
  readonly siteKey?: string;
  readonly theme: NonNullable<TurnstileOptions['theme']>;
  readonly mode: NonNullable<TurnstileOptions['mode']>;
  private state: TurnstileState;
  private readonly listeners = new Set<TurnstileListener>();

  constructor(options: TurnstileOptions = {}) {
    this.siteKey = options.siteKey;
    this.theme = options.theme ?? 'auto';
    this.mode = options.mode ?? 'managed';
    this.state = { token: null, ready: !this.siteKey, resetSignal: 0 };
  }

  getState(): TurnstileState {
    return this.state;
  }

  subscribe(listener: TurnstileListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<TurnstileState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  setToken(token: string | null): void {
    this.setState({ token, ready: token !== null || !this.siteKey });
  }

  /** Clears the current token and bumps `resetSignal` so a mounted widget re-challenges. */
  reset(): void {
    this.setState({ token: null, ready: !this.siteKey, resetSignal: this.state.resetSignal + 1 });
  }
}

/**
 * Loads the Turnstile script once per page and renders a widget into `container`, wiring its
 * callbacks to `controller`. Returns an unmount function. No-ops (and calls `controller.setToken('')`
 * immediately) when `controller.siteKey` is unset, so dev environments without Cloudflare keys
 * still pass the gate — same behavior the reference hand-rolled widget used.
 */
export function mountTurnstileWidget(container: HTMLElement, controller: TurnstileController): () => void {
  if (!controller.siteKey) {
    controller.setToken('');
    return () => {};
  }

  let widgetId: string | null = null;
  let cancelled = false;

  const tryRender = () => {
    if (cancelled || widgetId || !window.turnstile) return;
    widgetId = window.turnstile.render(container, {
      sitekey: controller.siteKey,
      theme: controller.theme,
      appearance: controller.mode === 'invisible' ? 'interaction-only' : 'always',
      callback: (token: string) => controller.setToken(token),
      'expired-callback': () => controller.setToken(null),
      'error-callback': () => controller.setToken(null),
    });
  };

  const script = ensureScriptTag();
  script.addEventListener('load', tryRender);
  const interval = window.setInterval(tryRender, RENDER_POLL_MS);
  tryRender();

  let lastResetSignal = controller.getState().resetSignal;
  const unsubscribeReset = controller.subscribe((state) => {
    if (state.resetSignal === lastResetSignal) return;
    lastResetSignal = state.resetSignal;
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
      } catch {
        /* widget already gone — nothing to reset */
      }
    }
  });

  return () => {
    cancelled = true;
    window.clearInterval(interval);
    script.removeEventListener('load', tryRender);
    unsubscribeReset();
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.remove(widgetId);
      } catch {
        /* already removed */
      }
    }
    widgetId = null;
  };
}

function ensureScriptTag(): HTMLScriptElement {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
  if (existing) return existing;
  const script = document.createElement('script');
  script.src = SCRIPT_URL;
  script.async = true;
  document.head.appendChild(script);
  return script;
}
