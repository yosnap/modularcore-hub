import type { ModalConfig } from './types.js';

export interface TriggerEnvironment {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  addEventListener(
    type: 'scroll' | 'mouseout',
    fn: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void;
  removeEventListener(type: 'scroll' | 'mouseout', fn: (event: Event) => void): void;
  scrollPercent(): number;
}

const DEFAULT_SCROLL_THRESHOLD = 50;

function computeScrollPercent(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;
  if (scrollable <= 0) return 100;
  return (window.scrollY / scrollable) * 100;
}

/** Real browser environment (window/document). Injected everywhere else for testability. */
export function defaultTriggerEnvironment(): TriggerEnvironment {
  return {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms) as unknown as number,
    clearTimeout: (id) => window.clearTimeout(id),
    addEventListener: (type, fn, options) => {
      const target: EventTarget = type === 'scroll' ? window : document;
      target.addEventListener(type, fn, options);
    },
    removeEventListener: (type, fn) => {
      const target: EventTarget = type === 'scroll' ? window : document;
      target.removeEventListener(type, fn);
    },
    scrollPercent: computeScrollPercent,
  };
}

/**
 * Registers the single trigger mechanism for `config.trigger.type` and returns a disposer that
 * clears its timeout/listener. `fire` is invoked at most once — callers own de-duplication after
 * that (the manager treats show/dismiss as idempotent).
 *
 * `page-load` is intentionally not a separate branch: it is `delay` with an implicit `value` of
 * 0, so both share the same setTimeout path (kept as a distinct enum member only for naming
 * parity with the reference product).
 */
export function scheduleTrigger(
  config: ModalConfig,
  env: TriggerEnvironment,
  fire: () => void,
): () => void {
  const { type, value } = config.trigger;

  switch (type) {
    case 'page-load':
    case 'delay': {
      const id = env.setTimeout(fire, value ?? 0);
      return () => env.clearTimeout(id);
    }

    case 'scroll': {
      const threshold = value ?? DEFAULT_SCROLL_THRESHOLD;
      const onScroll = () => {
        if (env.scrollPercent() >= threshold) {
          env.removeEventListener('scroll', onScroll); // fire at most once, per contract
          fire();
        }
      };
      env.addEventListener('scroll', onScroll, { passive: true });
      return () => env.removeEventListener('scroll', onScroll);
    }

    case 'exit-intent': {
      // Desktop-only signal (no reliable mobile equivalent): use `delay`/`scroll` as a fallback
      // for mobile-targeted overlays.
      const onMouseOut = (event: Event) => {
        if ((event as MouseEvent).clientY <= 0) {
          env.removeEventListener('mouseout', onMouseOut); // fire at most once, per contract
          fire();
        }
      };
      env.addEventListener('mouseout', onMouseOut);
      return () => env.removeEventListener('mouseout', onMouseOut);
    }

    case 'click':
    case 'manual':
      // No auto-trigger: `click` is fired imperatively via `OverlayManager.fireClick`, `manual`
      // only via `OverlayManager.show`. Nothing to schedule or dispose here.
      return () => {};

    default:
      return () => {};
  }
}
