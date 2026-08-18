/**
 * OpenAI-compatible chat/completions client. `baseURL`/`apiKey`/`model` are always supplied by
 * the caller (BYOK) — this module never hardcodes a key, and the default `baseURL` only picks
 * a *provider*, never a credential.
 */

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export interface ApiToolFunctionDefinition {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface ApiToolDefinition {
  type: 'function';
  function: ApiToolFunctionDefinition;
}

export interface ApiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ApiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ApiToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatClientConfig {
  /** Defaults to OpenRouter. Point at any OpenAI-compatible `/chat/completions` endpoint. */
  baseURL?: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
  /** Merged into the request body — e.g. `temperature`, `max_tokens`, provider-specific flags. */
  extraBody?: Record<string, unknown>;
}

export interface ChatCompletionRequestOptions {
  messages: ApiMessage[];
  tools?: ApiToolDefinition[];
  signal?: AbortSignal;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export class ChatCompletionError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`ai-chat: chat completion request failed with status ${status}: ${body.slice(0, 500)}`);
    this.name = 'ChatCompletionError';
  }
}

/**
 * AD4: only OpenRouter is verified to emit `usage` in a streamed response by default. Every
 * other OpenAI-compatible endpoint (OpenAI itself, LiteLLM, self-hosted gateways) requires the
 * request to opt in via `stream_options: { include_usage: true }`, or the final SSE chunk never
 * carries `usage` and `tokens.ts` has nothing to parse post-stream. Sending the flag to
 * OpenRouter too is harmless (documented, ignored-if-redundant), but we skip it there so the
 * "OpenRouter is the proven path" claim in the phase's AD4 hardening isn't quietly depending on
 * undocumented behavior of a flag we never needed for it.
 */
export function isOpenRouterBaseUrl(baseURL: string): boolean {
  try {
    return new URL(baseURL).hostname.endsWith('openrouter.ai');
  } catch {
    return false;
  }
}

export async function requestChatCompletionStream(
  config: ChatClientConfig,
  options: ChatCompletionRequestOptions,
): Promise<Response> {
  const baseURL = config.baseURL ?? DEFAULT_BASE_URL;
  const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`;
  const doFetch = options.fetchImpl ?? fetch;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
    stream: true,
    ...(config.extraBody ?? {}),
  };
  if (options.tools && options.tools.length > 0) body.tools = options.tools;
  if (!isOpenRouterBaseUrl(baseURL)) {
    body.stream_options = { include_usage: true, ...(body.stream_options as object | undefined) };
  }

  const response = await doFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.headers ?? {}),
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ChatCompletionError(response.status, text);
  }
  if (!response.body) {
    throw new Error('ai-chat: chat completion response has no readable body to stream');
  }
  return response;
}
