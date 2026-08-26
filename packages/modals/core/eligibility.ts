import type { FrequencyStore } from './frequency.js';
import type { ModalConfig } from './types.js';

/**
 * Targeting semantics (inlined; not read from any external source at runtime):
 * - `pages` empty/undefined → matches every path.
 * - `'/'` matches only the exact root path.
 * - Any other `pages` entry matches via `startsWith` (e.g. `/blog` matches `/blog/x`).
 * - `excludePages` is evaluated with the same rules and wins over an include match.
 */
export function matchesTargeting(path: string, targeting?: ModalConfig['targeting']): boolean {
  const pages = targeting?.pages;
  const excludePages = targeting?.excludePages;

  const matchesEntry = (entry: string): boolean =>
    entry === '/' ? path === '/' : path.startsWith(entry);

  if (excludePages?.some(matchesEntry)) return false;
  if (!pages || pages.length === 0) return true;
  return pages.some(matchesEntry);
}

export function isWithinDateWindow(config: ModalConfig, now: Date): boolean {
  const nowMs = now.getTime();
  if (config.startDate && nowMs < new Date(config.startDate).getTime()) return false;
  if (config.endDate && nowMs > new Date(config.endDate).getTime()) return false;
  return true;
}

/**
 * Pure filter: isActive → date window → targeting → frequency. Does not resolve slot/priority
 * conflicts (that is the manager's job, since it depends on which slots are occupied at runtime)
 * and does not call `store.record` (the manager does that only when an overlay is actually shown).
 */
export function filterEligible(
  configs: ModalConfig[],
  path: string,
  store: FrequencyStore,
  now: Date,
): ModalConfig[] {
  return configs.filter(
    (config) =>
      config.isActive !== false &&
      isWithinDateWindow(config, now) &&
      matchesTargeting(path, config.targeting) &&
      !store.isBlocked(config, now),
  );
}
