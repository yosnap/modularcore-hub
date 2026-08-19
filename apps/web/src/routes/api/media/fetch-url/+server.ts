import { json } from '@sveltejs/kit';

import { createRateLimiter } from '$lib/chat-rate-limiter';
import { handleMediaFetchUrlRequest } from '$lib/media-fetch-url-handler';

import type { RequestHandler } from './$types';

// Fetches a caller-supplied URL server-side at request time — nothing to prerender.
export const prerender = false;

// Module-level singleton: one limiter per server process/instance (same accepted MVP
// limitation as `$lib/chat-rate-limiter.ts`). Separate instance from the chat proxy's limiter
// so a burst of media loads doesn't also throttle the chat playground.
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

export const GET: RequestHandler = async ({ url, getClientAddress, request }) => {
  const result = await handleMediaFetchUrlRequest(url.searchParams.get('url'), {
    clientIp: getClientAddress(),
    rateLimiter,
    signal: request.signal,
  });

  if (result.blob) {
    return new Response(result.blob, {
      status: result.status,
      headers: { 'Content-Type': result.blob.type || 'application/octet-stream' },
    });
  }

  return json(result.errorBody, { status: result.status });
};
