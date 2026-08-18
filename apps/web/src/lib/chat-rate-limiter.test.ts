import { describe, expect, it } from 'vitest';

import { createRateLimiter } from './chat-rate-limiter';

describe('createRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 3, now: () => 0 });
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
  });

  it('rejects once the count exceeds maxRequests within the window', () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 2, now: () => 0 });
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('1.1.1.1')).toBe(true);
  });

  it('tracks each key independently', () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1, now: () => 0 });
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('2.2.2.2')).toBe(false);
  });

  it('resets once the window has elapsed', () => {
    let currentTime = 0;
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1, now: () => currentTime });
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('1.1.1.1')).toBe(true);
    currentTime = 2000;
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
  });
});
