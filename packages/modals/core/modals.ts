import { createFrequencyStore } from './frequency.js';
import { filterEligible } from './eligibility.js';
import { defaultTriggerEnvironment, scheduleTrigger } from './triggers.js';

import type { FrequencyStore } from './frequency.js';
import type { ModalsProvider } from './provider.js';
import type { TriggerEnvironment } from './triggers.js';
import type { InteractionAction, ModalConfig, ModalsContext, SingletonSlot } from './types.js';

export interface OverlaysState {
  active: Partial<Record<SingletonSlot, ModalConfig>>;
  toasts: ModalConfig[];
  loading: boolean;
  error: Error | null;
}

export type OverlaysListener = (state: OverlaysState) => void;

export interface OverlayManagerDeps {
  triggerEnv?: TriggerEnvironment;
  store?: FrequencyStore;
  /** Single clock for the whole manager; defaults to `() => new Date()`. */
  now?: () => Date;
  /** Max concurrent toasts; excess candidates are dropped (documented behavior). */
  toastCap?: number;
}

const DEFAULT_TOAST_CAP = 3;

function slotOf(type: ModalConfig['type']): SingletonSlot | 'toast' {
  if (type === 'modal' || type === 'fullscreen') return 'modal';
  if (type === 'toast') return 'toast';
  return type;
}

function pathnameOf(path: string): string {
  const queryIndex = path.indexOf('?');
  const hashIndex = path.indexOf('#');
  const cut = [queryIndex, hashIndex].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  return cut === undefined ? path : path.slice(0, cut);
}

const initialState: OverlaysState = {
  active: {},
  toasts: [],
  loading: false,
  error: null,
};

/**
 * Headless orchestrator for the overlay lifecycle: resolves eligible configs into 1 winner per
 * singleton slot (by priority) plus a capped toast list, schedules their triggers, and shows/
 * dismisses them while notifying subscribers. No UI, no direct DOM access outside `deps` —
 * `adapters/react` and `adapters/svelte` are thin bindings over this. Pattern mirrors
 * `media-picker/core/media-picker.ts`'s `MediaPicker` (subscribe/setState + generation guard).
 */
export class OverlayManager {
  private state: OverlaysState = { ...initialState };
  private readonly listeners = new Set<OverlaysListener>();
  private readonly triggerEnv: TriggerEnvironment;
  private readonly store: FrequencyStore;
  private readonly now: () => Date;
  private readonly toastCap: number;

  // Bumped on every load()/destroy(): an async getActiveModals() or a late trigger fire tagged
  // with a stale generation is dropped instead of mutating state that a newer load() superseded
  // — same "last-one-wins" guard as MediaPicker.run/commitIfCurrent.
  private generation = 0;
  // Configs eligible from the most recent load(), keyed by id — used by show()/fireClick() to
  // resolve a modalId back to its config without re-running eligibility.
  private pending = new Map<string, ModalConfig>();
  // Disposers for every trigger scheduled by the current load(); cleared at the start of the
  // NEXT load() (not only on destroy()) so a pending `delay` from a previous page never fires
  // after the consumer has navigated and reloaded with a new path.
  private disposers: Array<() => void> = [];
  // Ids already shown or dismissed during the current load — makes show()/dismiss() idempotent
  // per id (a late timer for an already-shown or already-dismissed toast is a no-op).
  private shownIds = new Set<string>();
  private dismissedIds = new Set<string>();
  // Provider/pathname used by the most recent load() — NOT constructor-captured (RT-SC3: a
  // provider re-created every render must never go stale). Retaining the one from the latest
  // `load()` call is safe and lets dismiss()/show() report tracking without threading a provider
  // through every call site.
  private currentProvider: ModalsProvider | undefined;
  private currentPath: string | undefined;

  constructor(deps: OverlayManagerDeps = {}) {
    this.triggerEnv = deps.triggerEnv ?? defaultTriggerEnvironment();
    this.store = deps.store ?? createFrequencyStore();
    this.now = deps.now ?? (() => new Date());
    this.toastCap = deps.toastCap ?? DEFAULT_TOAST_CAP;
  }

  getState(): OverlaysState {
    return this.state;
  }

  subscribe(listener: OverlaysListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<OverlaysState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  private disposeTriggers(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
  }

  /**
   * Loads candidates from `provider` (passed per call, never captured in the constructor, so a
   * provider re-created on every render — the common React/Svelte pattern — never goes stale)
   * for `ctx`, resolves eligibility, and schedules triggers for the winners. Always disposes the
   * previous load's triggers first, independent of `destroy()`.
   */
  async load(provider: ModalsProvider, ctx: ModalsContext): Promise<void> {
    this.disposeTriggers();
    this.pending.clear();
    this.shownIds.clear();
    this.dismissedIds.clear();
    this.currentProvider = provider;
    this.currentPath = pathnameOf(ctx.path);
    const gen = ++this.generation;

    this.setState({ loading: true, error: null });

    let configs: ModalConfig[];
    try {
      configs = await provider.getActiveModals(ctx);
    } catch (error) {
      if (gen !== this.generation) return; // superseded by a newer load()
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.setState({ loading: false, error: normalized });
      return;
    }
    if (gen !== this.generation) return; // superseded while awaiting the provider

    const now = this.now();
    const eligible = filterEligible(configs, this.currentPath, this.store, now);

    // Pick one winner per singleton slot (highest priority; ties keep provider order — Array.sort
    // is stable). Toasts are not slotted: every eligible toast is a candidate, capped below.
    const bySlot = new Map<SingletonSlot, ModalConfig>();
    const toastCandidates: ModalConfig[] = [];

    for (const config of eligible) {
      const slot = slotOf(config.type);
      if (slot === 'toast') {
        toastCandidates.push(config);
        continue;
      }
      const current = bySlot.get(slot);
      if (!current || (config.priority ?? 0) > (current.priority ?? 0)) {
        bySlot.set(slot, config);
      }
    }

    const winners = [...bySlot.values(), ...toastCandidates.slice(0, this.toastCap)];
    // `pending` indexes EVERY eligible config (not just slot winners): `show(id)`/`fireClick(id)`
    // must be able to explicitly show a manual/click-triggered config even if it lost its slot's
    // priority contest during auto-trigger scheduling below — e.g. a `modal` and a `fullscreen`
    // fixture sharing the 'modal' slot at equal priority must both stay independently triggerable
    // by id; only ONE of them can be auto-scheduled/occupy the slot at a time, not neither.
    for (const config of eligible) this.pending.set(config.id, config);

    this.setState({ loading: false });

    for (const config of winners) {
      if (config.trigger.type === 'click' || config.trigger.type === 'manual') continue; // no auto-fire
      const dispose = scheduleTrigger(config, this.triggerEnv, () => {
        if (gen !== this.generation) return; // load() ran again before this fired
        this.showInternal(config);
      });
      this.disposers.push(dispose);
    }
  }

  /** Imperatively shows a config already known from the last `load()` (used by manual/click triggers and consumer code). */
  show(modalId: string): void {
    const config = this.pending.get(modalId);
    if (!config) return;
    this.showInternal(config);
  }

  /** Fires the `click`-type trigger for a config from the last `load()`. */
  fireClick(modalId: string): void {
    const config = this.pending.get(modalId);
    if (!config || config.trigger.type !== 'click') return;
    this.showInternal(config);
  }

  private showInternal(config: ModalConfig): void {
    if (this.dismissedIds.has(config.id)) return; // idempotent: already dismissed this load
    const slot = slotOf(config.type);
    const alreadyVisible =
      slot === 'toast'
        ? this.state.toasts.some((toast) => toast.id === config.id)
        : this.state.active[slot]?.id === config.id;
    // Also guard against a config still being visible from a PRIOR load() (Code Review Finding,
    // Critical): `shownIds` resets on every load(), but `state.active`/`state.toasts`
    // intentionally don't (a still-open overlay must not flicker away on an unrelated reload) —
    // without this, an `always`-frequency config whose trigger refires after a second load()
    // duplicated itself into `state.toasts` with the same id (duplicate list keys, double
    // `trackView`).
    if (this.shownIds.has(config.id) || alreadyVisible) return;
    this.shownIds.add(config.id);

    const now = this.now();
    if (slot === 'toast') {
      if (this.state.toasts.length >= this.toastCap) return; // over cap: silently dropped
      this.setState({ toasts: [...this.state.toasts, config] });
    } else {
      this.setState({ active: { ...this.state.active, [slot]: config } });
    }

    this.store.record(config, now);
    if (this.currentPath !== undefined) {
      this.currentProvider?.trackView?.({
        modalId: config.id,
        path: this.currentPath,
        at: now.toISOString(),
      });
    }
  }

  dismiss(modalId: string, action: InteractionAction = 'close-button'): void {
    if (this.dismissedIds.has(modalId)) return; // idempotent
    this.dismissedIds.add(modalId);

    // Fall back to state.active/state.toasts when the config fell out of `pending` (Code Review
    // Finding, Critical): `pending` is cleared at the start of every load(), so a still-visible
    // overlay whose id is no longer eligible in the newest load() would otherwise have no way to
    // resolve its slot — the close button would set `dismissedIds` (idempotent-blocking any
    // retry) but never actually remove the overlay from state, leaving it stuck on screen with a
    // now-dead close button.
    const config =
      this.pending.get(modalId) ??
      Object.values(this.state.active).find((active) => active?.id === modalId) ??
      this.state.toasts.find((toast) => toast.id === modalId);
    const slot = config ? slotOf(config.type) : undefined;

    if (!slot) return; // unknown modalId (stale/typo'd) — no-op, no tracking event either

    if (slot === 'toast') {
      this.setState({ toasts: this.state.toasts.filter((toast) => toast.id !== modalId) });
    } else {
      const next = { ...this.state.active };
      if (next[slot]?.id === modalId) delete next[slot];
      this.setState({ active: next });
    }

    if (this.currentPath !== undefined) {
      this.currentProvider?.trackInteraction?.({
        modalId,
        action,
        path: this.currentPath,
        at: this.now().toISOString(),
      });
    }
  }

  destroy(): void {
    this.generation++;
    this.disposeTriggers();
    this.pending.clear();
    this.listeners.clear();
    this.currentProvider = undefined;
    this.currentPath = undefined;
    this.state = { ...initialState };
  }
}
