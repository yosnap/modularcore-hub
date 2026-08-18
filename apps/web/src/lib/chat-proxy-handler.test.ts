import { describe, expect, it, vi } from 'vitest';

import { ALLOWED_MODELS, DEFAULT_MODEL, MAX_TOKENS_CAP } from './chat-config';
import { handleChatProxyRequest } from './chat-proxy-handler';
import { createRateLimiter } from './chat-rate-limiter';

const REAL_API_KEY = 'sk-owner-secret-do-not-leak';

function validBody(overrides: Record<string, unknown> = {}) {
  return { messages: [{ role: 'user', content: 'hello' }], ...overrides };
}

function alwaysAllowedLimiter() {
  return createRateLimiter({ windowMs: 1000, maxRequests: 1000 });
}

describe('handleChatProxyRequest', () => {
  it('activates the rate limit and never calls upstream once exceeded', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });
    const requestUpstream = vi.fn();
    const deps = {
      apiKey: REAL_API_KEY,
      clientIp: '1.2.3.4',
      rateLimiter: limiter,
      requestUpstream,
    };

    const first = await handleChatProxyRequest(validBody(), deps);
    const second = await handleChatProxyRequest(validBody(), deps);

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.errorBody?.error).toMatch(/too many requests/i);
    expect(requestUpstream).toHaveBeenCalledTimes(1);
  });

  it('applies the max_tokens cap: a request asking for more is capped, not rejected', async () => {
    const requestUpstream = vi.fn().mockResolvedValue(new Response(null));
    await handleChatProxyRequest(validBody({ max_tokens: MAX_TOKENS_CAP * 100 }), {
      apiKey: REAL_API_KEY,
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      requestUpstream,
    });

    expect(requestUpstream).toHaveBeenCalledTimes(1);
    const [config] = requestUpstream.mock.calls[0] as [{ extraBody?: { max_tokens?: number } }];
    expect(config.extraBody?.max_tokens).toBe(MAX_TOKENS_CAP);
  });

  it('rejects a model outside the allowlist without calling upstream', async () => {
    const requestUpstream = vi.fn();
    const result = await handleChatProxyRequest(validBody({ model: 'not-allowed/model' }), {
      apiKey: REAL_API_KEY,
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      requestUpstream,
    });

    expect(result.status).toBe(400);
    expect(result.errorBody?.error).toMatch(/not allowed/i);
    expect(requestUpstream).not.toHaveBeenCalled();
  });

  it('uses the default allowed model when the client omits one', async () => {
    const requestUpstream = vi.fn().mockResolvedValue(new Response(null));
    await handleChatProxyRequest(validBody(), {
      apiKey: REAL_API_KEY,
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      requestUpstream,
    });

    const [config] = requestUpstream.mock.calls[0] as [{ model: string }];
    expect(config.model).toBe(DEFAULT_MODEL);
    expect(ALLOWED_MODELS).toContain(config.model);
  });

  it('ignores tools/tool_choice sent by the client: they never reach the upstream call', async () => {
    const requestUpstream = vi.fn().mockResolvedValue(new Response(null));
    await handleChatProxyRequest(
      validBody({
        tools: [{ type: 'function', function: { name: 'evil', parameters: {} } }],
        tool_choice: 'auto',
      }),
      {
        apiKey: REAL_API_KEY,
        clientIp: '1.2.3.4',
        rateLimiter: alwaysAllowedLimiter(),
        requestUpstream,
      },
    );

    expect(requestUpstream).toHaveBeenCalledTimes(1);
    const [config, options] = requestUpstream.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(config).not.toHaveProperty('tools');
    expect(options).not.toHaveProperty('tools');
    expect(options).not.toHaveProperty('tool_choice');
  });

  it('never leaks the API key in a success result', async () => {
    const requestUpstream = vi.fn().mockResolvedValue(new Response(null));
    const result = await handleChatProxyRequest(validBody(), {
      apiKey: REAL_API_KEY,
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      requestUpstream,
    });

    expect(JSON.stringify(result)).not.toContain(REAL_API_KEY);
  });

  it('never leaks the API key when the server has none configured', async () => {
    const result = await handleChatProxyRequest(validBody(), {
      apiKey: undefined,
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
    });

    expect(result.status).toBe(503);
    expect(JSON.stringify(result)).not.toContain(REAL_API_KEY);
  });

  it('never leaks the API key when the upstream call fails', async () => {
    const requestUpstream = vi
      .fn()
      .mockRejectedValue(new Error(`upstream said no, key=${REAL_API_KEY}`));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await handleChatProxyRequest(validBody(), {
      apiKey: REAL_API_KEY,
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      requestUpstream,
    });

    expect(result.status).toBe(502);
    expect(JSON.stringify(result)).not.toContain(REAL_API_KEY);
    consoleErrorSpy.mockRestore();
  });

  it('streams the upstream response passthrough (same body reference, no buffering)', async () => {
    const upstreamResponse = new Response(new ReadableStream());
    const requestUpstream = vi.fn().mockResolvedValue(upstreamResponse);

    const result = await handleChatProxyRequest(validBody(), {
      apiKey: REAL_API_KEY,
      clientIp: '1.2.3.4',
      rateLimiter: alwaysAllowedLimiter(),
      requestUpstream,
    });

    expect(result.status).toBe(200);
    expect(result.upstream).toBe(upstreamResponse);
  });
});
