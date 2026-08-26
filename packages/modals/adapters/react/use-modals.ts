import { useEffect, useRef, useState } from 'react';

import { OverlayManager } from '../../core/modals.js';

import type { OverlayManagerDeps, OverlaysState } from '../../core/modals.js';
import type { ModalsProvider } from '../../core/provider.js';
import type { InteractionAction, ModalsContext } from '../../core/types.js';

export interface UseModalsResult {
  state: OverlaysState;
  show: (id: string) => void;
  dismiss: (id: string, action?: InteractionAction) => void;
  fireClick: (id: string) => void;
  reload: (ctx: ModalsContext) => Promise<void>;
}

interface ManagerHandle {
  instance: OverlayManager;
  destroyed: boolean;
}

/**
 * Binds `OverlayManager` (headless core) to React state. One manager instance per hook,
 * recreated if a previous instance was destroyed — this is what makes StrictMode's
 * mount→cleanup→remount cycle safe (without it, the second mount would reuse a dead manager
 * whose triggers/listeners were already disposed).
 */
export function useModals(
  provider: ModalsProvider,
  ctx: ModalsContext,
  deps?: OverlayManagerDeps,
): UseModalsResult {
  const handleRef = useRef<ManagerHandle | null>(null);
  if (!handleRef.current || handleRef.current.destroyed) {
    handleRef.current = { instance: new OverlayManager(deps), destroyed: false };
  }
  const manager = handleRef.current.instance;

  const [state, setState] = useState<OverlaysState>(() => manager.getState());

  useEffect(() => manager.subscribe(setState), [manager]);

  // Compares by ctx.path (a fresh ctx object every render is expected) and provider identity
  // (the consumer is responsible for memoizing the provider — an inline object literal reloads
  // on every render).
  useEffect(() => {
    void manager.load(provider, ctx);
    return () => {
      manager.destroy();
      if (handleRef.current?.instance === manager) handleRef.current.destroyed = true;
    };
  }, [manager, ctx.path, provider]);

  return {
    state,
    show: (id) => manager.show(id),
    dismiss: (id, action) => manager.dismiss(id, action),
    fireClick: (id) => manager.fireClick(id),
    reload: (nextCtx) => manager.load(provider, nextCtx),
  };
}
