/// <reference types="svelte" />
import { OverlayManager } from '../../core/modals.js';

import type { OverlayManagerDeps, OverlaysState } from '../../core/modals.js';
import type { ModalsProvider } from '../../core/provider.js';
import type { InteractionAction, ModalsContext } from '../../core/types.js';

export interface ModalsRune {
  readonly state: OverlaysState;
  show: (id: string) => void;
  dismiss: (id: string, action?: InteractionAction) => void;
  fireClick: (id: string) => void;
  reload: (ctx: ModalsContext) => Promise<void>;
}

/**
 * Svelte 5 rune binding to `OverlayManager` (headless core). Unlike media-picker's rune (which
 * never destroys — it has no listeners to leak), `createModals` registers `$effect` cleanup so
 * `destroy()` runs on unmount and clears any pending scroll/mouseout/timeout listener (RT-FM2).
 *
 * MUST be called during component initialization (top-level of a `.svelte` component's `<script>`
 * block) — `$effect` requires an active component context; calling this outside one throws.
 */
export function createModals(
  provider: ModalsProvider,
  ctx: ModalsContext,
  deps?: OverlayManagerDeps,
): ModalsRune {
  const manager = new OverlayManager(deps);
  let state = $state<OverlaysState>(manager.getState());

  const unsubscribe = manager.subscribe((next) => {
    state = next;
  });

  $effect(() => {
    void manager.load(provider, ctx);
    return () => {
      unsubscribe();
      manager.destroy();
    };
  });

  return {
    get state() {
      return state;
    },
    show: (id) => manager.show(id),
    dismiss: (id, action) => manager.dismiss(id, action),
    fireClick: (id) => manager.fireClick(id),
    reload: (nextCtx) => manager.load(provider, nextCtx),
  };
}
