import { describe, expect, it, vi, afterEach } from 'vitest';

import { prefersReducedMotion } from '../../ui/a11y/reduced-motion.js';

describe('prefersReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('reflects matchMedia("(prefers-reduced-motion: reduce)").matches', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(true);

    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns false if matchMedia throws', () => {
    window.matchMedia = vi.fn(() => {
      throw new Error('unsupported');
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});
