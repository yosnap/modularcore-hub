import type { InteractionEvent, ModalConfig, ModalsContext, ViewEvent } from './types.js';

/**
 * `ModalsProvider` is the single seam between the headless core and any backend. Two things
 * must hold for any implementation:
 *
 * 1. No secrets: this runs in the browser, so it must never hold long-lived credentials.
 * 2. Untrusted output: `getActiveModals()` results are content rendered into the DOM
 *    (`message`, `imageUrl`, button `url`) that may originate from a database or CMS with
 *    lower trust than the code calling this package. The core (ui/react, ui/svelte) treats
 *    that output as untrusted and applies sanitization/allowlisting as the actual security
 *    boundary — a provider is never assumed to be a trusted source.
 *
 * Real tracking persistence (e.g. writing to a Prisma-backed table) belongs behind
 * `trackView`/`trackInteraction`, in the consumer's own backend — this package ships none.
 * See `docs/prisma-tracking-endpoint-example.md` for a documented (non-runtime) example.
 */
export interface ModalsProvider {
  /** Returns raw candidates; the core (eligibility.ts) filters by date/targeting/frequency. */
  getActiveModals(ctx: ModalsContext): Promise<ModalConfig[]>;
  trackView?(evt: ViewEvent): void | Promise<void>;
  trackInteraction?(evt: InteractionEvent): void | Promise<void>;
}
