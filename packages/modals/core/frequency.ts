import { browserStorage } from './storage.js';

import type { KeyValueStorage } from './storage.js';
import type { ModalConfig } from './types.js';

export interface FrequencyStore {
  isBlocked(config: ModalConfig, now: Date): boolean;
  record(config: ModalConfig, now: Date): void;
}

const ONCE_PER_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

function shownKey(id: string): string {
  return `modals:shown:${id}`;
}

/**
 * Assembles session+local storage (browser, probe-detected) or memory-only when `deps` are
 * supplied for tests. Rules mirror codeia's Popup frequency semantics, evaluated client-side
 * instead of server-side (this package has no DB) — see phase-02 plan for the rationale.
 */
export function createFrequencyStore(deps?: {
  session?: KeyValueStorage;
  local?: KeyValueStorage;
}): FrequencyStore {
  const session = deps?.session ?? browserStorage('session');
  const local = deps?.local ?? browserStorage('local');

  return {
    isBlocked(config, now) {
      const frequency = config.frequency ?? 'always';
      const key = shownKey(config.id);

      switch (frequency) {
        case 'always':
          return false;
        case 'once-per-session':
          return session.get(key) !== null;
        case 'once-per-day': {
          const stored = local.get(key);
          if (stored === null) return false;
          const shownAt = Number(stored);
          if (Number.isNaN(shownAt)) return false;
          return now.getTime() - shownAt < ONCE_PER_DAY_WINDOW_MS;
        }
        case 'once-ever':
          return local.get(key) !== null;
        default:
          return false;
      }
    },

    record(config, now) {
      const frequency = config.frequency ?? 'always';
      const key = shownKey(config.id);

      switch (frequency) {
        case 'always':
          return;
        case 'once-per-session':
          session.set(key, String(now.getTime()));
          return;
        case 'once-per-day':
        case 'once-ever':
          local.set(key, String(now.getTime()));
          return;
        default:
          return;
      }
    },
  };
}
