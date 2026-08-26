import type { ModalsProvider } from '../provider.js';
import type { InteractionEvent, ModalConfig, ViewEvent } from '../types.js';

export interface InMemoryProviderOptions {
  modals: ModalConfig[];
  onView?(evt: ViewEvent): void;
  onInteraction?(evt: InteractionEvent): void;
}

/**
 * Reference `ModalsProvider`: serves a static in-memory/JSON list of `ModalConfig` and forwards
 * tracking events to the caller's callbacks (no-op by default). Meant as a copy-code starting
 * point — a real deployment swaps this for a provider that fetches from its own backend.
 */
export function createInMemoryProvider(opts: InMemoryProviderOptions): ModalsProvider {
  return {
    async getActiveModals() {
      return opts.modals;
    },
    trackView(evt) {
      opts.onView?.(evt);
    },
    trackInteraction(evt) {
      opts.onInteraction?.(evt);
    },
  };
}
