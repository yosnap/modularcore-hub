import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

import { handleChatProxyRequest } from '$lib/chat-proxy-handler';
import { createRateLimiter } from '$lib/chat-rate-limiter';

import type { RequestHandler } from './$types';

// Injects the OWNER's OpenRouter key at request time and streams a real upstream response — it
// cannot be prerendered (there is nothing to prerender: every request is live).
export const prerender = false;

// Module-level singleton: one limiter per server process/instance. See
// `$lib/chat-rate-limiter.ts` for why in-memory is an accepted MVP limitation.
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const rawBody: unknown = await request.json().catch(() => null);

  const result = await handleChatProxyRequest(rawBody, {
    apiKey: env.OPENROUTER_API_KEY,
    clientIp: getClientAddress(),
    rateLimiter,
    signal: request.signal,
  });

  if (result.upstream) {
    return new Response(result.upstream.body, {
      status: result.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  return json(result.errorBody, { status: result.status });
};
