import { describe, expect, it } from 'vitest';

import { createFrequencyStore } from '../../core/frequency.js';
import { memoryStorage } from '../../core/storage.js';

import type { ModalConfig } from '../../core/types.js';

function config(frequency: ModalConfig['frequency']): ModalConfig {
  return { id: 'a', type: 'top-banner', message: 'hi', trigger: { type: 'manual' }, frequency };
}

function store() {
  return createFrequencyStore({ session: memoryStorage(), local: memoryStorage() });
}

describe('FrequencyStore rules', () => {
  it('always never blocks and never persists', () => {
    const s = store();
    const c = config('always');
    const now = new Date();
    s.record(c, now);
    expect(s.isBlocked(c, now)).toBe(false);
  });

  it('once-per-session blocks after record, for the life of the session key', () => {
    const s = store();
    const c = config('once-per-session');
    const now = new Date();
    expect(s.isBlocked(c, now)).toBe(false);
    s.record(c, now);
    expect(s.isBlocked(c, now)).toBe(true);
  });

  it('once-per-day blocks within 24h and un-blocks after', () => {
    const s = store();
    const c = config('once-per-day');
    const t0 = new Date('2026-01-01T00:00:00.000Z');
    s.record(c, t0);
    expect(s.isBlocked(c, new Date('2026-01-01T12:00:00.000Z'))).toBe(true);
    expect(s.isBlocked(c, new Date('2026-01-02T00:00:00.000Z'))).toBe(false);
  });

  it('once-ever blocks permanently after the first record', () => {
    const s = store();
    const c = config('once-ever');
    const t0 = new Date('2026-01-01T00:00:00.000Z');
    s.record(c, t0);
    expect(s.isBlocked(c, new Date('2030-01-01T00:00:00.000Z'))).toBe(true);
  });

  it('defaults to always when frequency is undefined', () => {
    const s = store();
    const c = config(undefined);
    const now = new Date();
    s.record(c, now);
    expect(s.isBlocked(c, now)).toBe(false);
  });
});
