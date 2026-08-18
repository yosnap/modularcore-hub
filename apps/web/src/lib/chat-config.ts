/**
 * Shared, non-secret chat proxy configuration. Imported by both the server route
 * (`routes/api/chat/+server.ts`, to enforce the allowlist/cap) and the playground UI (to render
 * the same list/default) so the two never drift — this file holds no credentials, so it is safe
 * to end up in the client bundle.
 */

/** Fixed allowlist of OpenRouter models the public playground proxy may call. */
export const ALLOWED_MODELS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3.1-8b-instruct',
] as const;

export type AllowedModel = (typeof ALLOWED_MODELS)[number];

export const DEFAULT_MODEL: AllowedModel = ALLOWED_MODELS[0];

/** Hard cap on `max_tokens` per request, enforced server-side regardless of what the client asks for. */
export const MAX_TOKENS_CAP = 1024;

export function isAllowedModel(model: string): model is AllowedModel {
  return (ALLOWED_MODELS as readonly string[]).includes(model);
}
