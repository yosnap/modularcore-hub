/**
 * Pure request-shape helpers for the `/api/chat` proxy, split out of `+server.ts` so they are
 * directly unit-testable without spinning up a SvelteKit request context.
 */
import { ALLOWED_MODELS, DEFAULT_MODEL, MAX_TOKENS_CAP, isAllowedModel } from './chat-config';

import type { ApiMessage } from '@modularcore/ai-chat/client';
import type { AllowedModel } from './chat-config';

export class ChatRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ChatRequestError';
  }
}

export interface ParsedChatRequest {
  messages: ApiMessage[];
  model: AllowedModel;
  maxTokens: number;
}

const VALID_ROLES = new Set(['system', 'user', 'assistant', 'tool']);

function isValidMessage(value: unknown): value is ApiMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const roleOk = typeof candidate.role === 'string' && VALID_ROLES.has(candidate.role);
  const contentOk = typeof candidate.content === 'string' || candidate.content === null;
  return roleOk && contentOk;
}

/**
 * Validates and normalizes the client's request body. `tools`/`tool_choice` are intentionally
 * never read here — even if a client sends them, they are simply not part of `ParsedChatRequest`
 * and can never reach the upstream call built from it. This is a public playground running with
 * the owner's API key server-side; allowing client-driven function-calling here would let any
 * visitor trigger tool execution authorized (and billed) as the owner.
 */
export function parseChatRequestBody(body: unknown): ParsedChatRequest {
  if (!body || typeof body !== 'object') {
    throw new ChatRequestError(400, 'Request body must be a JSON object.');
  }
  const candidate = body as Record<string, unknown>;

  if (!Array.isArray(candidate.messages) || candidate.messages.length === 0) {
    throw new ChatRequestError(400, '"messages" must be a non-empty array.');
  }
  if (!candidate.messages.every(isValidMessage)) {
    throw new ChatRequestError(
      400,
      'Every message needs a valid "role" (system/user/assistant/tool) and string|null "content".',
    );
  }

  let model: AllowedModel = DEFAULT_MODEL;
  if (candidate.model !== undefined) {
    if (typeof candidate.model !== 'string') {
      throw new ChatRequestError(400, '"model" must be a string.');
    }
    if (!isAllowedModel(candidate.model)) {
      throw new ChatRequestError(
        400,
        `Model "${candidate.model}" is not allowed. Allowed models: ${ALLOWED_MODELS.join(', ')}.`,
      );
    }
    model = candidate.model;
  }

  let maxTokens = MAX_TOKENS_CAP;
  if (candidate.max_tokens !== undefined) {
    if (typeof candidate.max_tokens !== 'number' || !Number.isFinite(candidate.max_tokens)) {
      throw new ChatRequestError(400, '"max_tokens" must be a finite number.');
    }
    // Cap, never extend: a client asking for more than the cap is silently capped, not rejected,
    // so a well-behaved client requesting less than the cap still gets exactly what it asked for.
    maxTokens = Math.min(candidate.max_tokens, MAX_TOKENS_CAP);
  }

  return { messages: candidate.messages as ApiMessage[], model, maxTokens };
}
