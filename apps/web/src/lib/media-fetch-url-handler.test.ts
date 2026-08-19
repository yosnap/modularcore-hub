import { describe, expect, it, vi } from 'vitest';

import { handleMediaFetchUrlRequest } from './media-fetch-url-handler';
import { createRateLimiter } from './chat-rate-limiter';

function alwaysAllowedLimiter() {
  return createRateLimiter({ windowMs: 1000, maxRequests: 1000 });
}

describe('handleMediaFetchUrlRequest', () => {
  it('activates the rate limit and never calls the remote fetch once exceeded', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });
    const fetchRemote = vi.fn().mockResolvedValue(new Blob(['x']));
    const deps = { clientIp: '1.2.3.4', rateLimiter: limiter, fetchRemote };

    const first = await handleMediaFetchUrlRequest('https://example.com/a.png', deps);
    const second = await handleMediaFetchUrlRequest('https://example.com/a.png', deps);

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.errorBody?.error).toMatch(/too many requests/i);
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing url without calling the remote fetch', async () => {
    const fetchRemote = vi.fn();
    const result = await handleMediaFetchUrlRequest(null, {
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      fetchRemote,
    });

    expect(result.status).toBe(400);
    expect(fetchRemote).not.toHaveBeenCalled();
  });

  it('rejects an unparseable url without calling the remote fetch', async () => {
    const fetchRemote = vi.fn();
    const result = await handleMediaFetchUrlRequest('not a url', {
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      fetchRemote,
    });

    expect(result.status).toBe(400);
    expect(fetchRemote).not.toHaveBeenCalled();
  });

  it('forwards the SSRF guard rejection message as a 502 instead of a generic error', async () => {
    const fetchRemote = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'media-picker: refusing to fetch URL resolving to a private/local address (127.0.0.1)',
        ),
      );
    const result = await handleMediaFetchUrlRequest('https://internal.example/', {
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      fetchRemote,
    });

    expect(result.status).toBe(502);
    expect(result.errorBody?.error).toMatch(/private\/local address/);
  });

  it('returns the fetched blob on success', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    const fetchRemote = vi.fn().mockResolvedValue(blob);
    const result = await handleMediaFetchUrlRequest('https://example.com/a.png', {
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      fetchRemote,
    });

    expect(result.status).toBe(200);
    expect(result.blob).toBe(blob);
  });
});
