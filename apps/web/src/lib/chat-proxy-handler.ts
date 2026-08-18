/**
 * Framework-agnostic proxy logic for `/api/chat`, kept free of SvelteKit-specific imports
 * (`$env`, `$lib` aliases, request events) so it is directly unit-testable with plain relative
 * imports and dependency injection — `+server.ts` is a thin SvelteKit adapter around this.
 */
import { requestChatCompletionStream } from '@modularcore/ai-chat/client';

import { ChatRequestError, parseChatRequestBody } from './chat-proxy-request';

import type { RateLimiter } from './chat-rate-limiter';

export interface ChatProxyDeps {
  /** `undefined`/empty when the server has no key configured — never logged or echoed back. */
  apiKey: string | undefined;
  clientIp: string;
  rateLimiter: RateLimiter;
  signal?: AbortSignal;
  /** Injectable for tests; defaults to the real `@modularcore/ai-chat` client call. */
  requestUpstream?: typeof requestChatCompletionStream;
}

export interface ChatProxyErrorResult {
  status: number;
  upstream?: undefined;
  errorBody: { error: string };
}

export interface ChatProxySuccessResult {
  status: 200;
  upstream: Response;
  errorBody?: undefined;
}

export type ChatProxyResult = ChatProxyErrorResult | ChatProxySuccessResult;

export async function handleChatProxyRequest(
  rawBody: unknown,
  deps: ChatProxyDeps,
): Promise<ChatProxyResult> {
  if (deps.rateLimiter.isRateLimited(deps.clientIp)) {
    return {
      status: 429,
      errorBody: { error: 'Too many requests. Please wait a moment before retrying.' },
    };
  }

  if (!deps.apiKey) {
    return {
      status: 503,
      errorBody: { error: 'The AI chat playground is not configured on this server.' },
    };
  }

  let parsed;
  try {
    parsed = parseChatRequestBody(rawBody);
  } catch (err) {
    if (err instanceof ChatRequestError) {
      return { status: err.status, errorBody: { error: err.message } };
    }
    return { status: 400, errorBody: { error: 'Request body must be valid JSON.' } };
  }

  const requestUpstream = deps.requestUpstream ?? requestChatCompletionStream;

  try {
    // Real streaming passthrough: callers return `upstream.body` (a `ReadableStream`) straight
    // to the client as bytes arrive — nothing here buffers the full completion first.
    //
    // `tools`/`tool_choice` are never read from `rawBody` (see `parseChatRequestBody`) and are
    // therefore never part of the options below, so this public proxy can never trigger
    // server-side function-calling authorized (and billed) as the owner.
    const upstream = await requestUpstream(
      { apiKey: deps.apiKey, model: parsed.model, extraBody: { max_tokens: parsed.maxTokens } },
      { messages: parsed.messages, signal: deps.signal },
    );
    return { status: 200, upstream };
  } catch (err) {
    // Log only a short message for operators — never the API key (never part of this error to
    // begin with) and never the raw upstream error body verbatim back to the client.
    console.error(
      'api/chat proxy: upstream request failed:',
      err instanceof Error ? err.message : 'unknown error',
    );
    return {
      status: 502,
      errorBody: { error: 'Failed to reach the AI provider. Please try again later.' },
    };
  }
}
