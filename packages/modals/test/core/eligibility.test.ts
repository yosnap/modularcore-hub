import { describe, expect, it } from 'vitest';

import { createFrequencyStore } from '../../core/frequency.js';
import { filterEligible, isWithinDateWindow, matchesTargeting } from '../../core/eligibility.js';
import { memoryStorage } from '../../core/storage.js';

import type { ModalConfig } from '../../core/types.js';

function baseConfig(overrides: Partial<ModalConfig> = {}): ModalConfig {
  return {
    id: 'promo-1',
    type: 'top-banner',
    message: 'hello',
    trigger: { type: 'page-load' },
    ...overrides,
  };
}

describe('matchesTargeting', () => {
  it('matches every path when pages is empty/undefined', () => {
    expect(matchesTargeting('/anything')).toBe(true);
    expect(matchesTargeting('/anything', { pages: [] })).toBe(true);
  });

  it('matches "/" only at the exact root', () => {
    expect(matchesTargeting('/', { pages: ['/'] })).toBe(true);
    expect(matchesTargeting('/blog', { pages: ['/'] })).toBe(false);
  });

  it('matches other entries via startsWith', () => {
    expect(matchesTargeting('/blog/x', { pages: ['/blog'] })).toBe(true);
    expect(matchesTargeting('/other', { pages: ['/blog'] })).toBe(false);
  });

  it('excludePages wins over an include match', () => {
    expect(matchesTargeting('/blog/x', { pages: ['/blog'], excludePages: ['/blog/x'] })).toBe(
      false,
    );
  });
});

describe('isWithinDateWindow', () => {
  it('rejects before startDate and after endDate', () => {
    const config = baseConfig({
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
    });
    expect(isWithinDateWindow(config, new Date('2025-12-31T00:00:00.000Z'))).toBe(false);
    expect(isWithinDateWindow(config, new Date('2026-01-15T00:00:00.000Z'))).toBe(true);
    expect(isWithinDateWindow(config, new Date('2026-02-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('once-per-day frequency boundary', () => {
  it('blocks under 24h and un-blocks at/after 24h from an injected now', () => {
    const store = createFrequencyStore({ session: memoryStorage(), local: memoryStorage() });
    const config = baseConfig({ frequency: 'once-per-day' });
    const shownAt = new Date('2026-01-01T00:00:00.000Z');
    store.record(config, shownAt);

    expect(store.isBlocked(config, new Date('2026-01-01T23:59:59.999Z'))).toBe(true);
    expect(store.isBlocked(config, new Date('2026-01-02T00:00:00.000Z'))).toBe(false);
  });
});

describe('filterEligible', () => {
  it('runs isActive -> date window -> targeting -> frequency', () => {
    const store = createFrequencyStore({ session: memoryStorage(), local: memoryStorage() });
    const now = new Date('2026-01-15T00:00:00.000Z');
    const configs = [
      baseConfig({ id: 'inactive', isActive: false }),
      baseConfig({ id: 'out-of-window', startDate: '2027-01-01T00:00:00.000Z' }),
      baseConfig({ id: 'wrong-page', targeting: { pages: ['/blog'] } }),
      baseConfig({ id: 'ok' }),
    ];

    expect(filterEligible(configs, '/', store, now).map((c) => c.id)).toEqual(['ok']);
  });

  it('does not call store.record — the manager records only on actual show', () => {
    const store = createFrequencyStore({ session: memoryStorage(), local: memoryStorage() });
    const now = new Date('2026-01-15T00:00:00.000Z');
    const config = baseConfig({ frequency: 'once-ever' });

    filterEligible([config], '/', store, now);
    expect(store.isBlocked(config, now)).toBe(false);
  });
});
