/**
 * S1: intentionally NOT a BPE tokenizer (no `tiktoken`/`gpt-tokenizer` dependency). The
 * char/token heuristic below is a pre-send *estimate* for UI purposes (e.g. "approaching the
 * model's context window"); `parseUsage` below extracts the provider's real, authoritative
 * count from the response `usage` object once the request completes.
 */

/** ~4 chars/token is the commonly cited average for English text across GPT-family tokenizers. */
const CHARS_PER_TOKEN_ESTIMATE = 4;

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE));
}

export function estimateMessagesTokens(messages: readonly { content: string | null }[]): number {
  return messages.reduce((total, message) => total + estimateTokens(message.content ?? ''), 0);
}

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Parses the OpenAI-shaped `usage` object (`prompt_tokens`/`completion_tokens`/`total_tokens`).
 * Returns `null` for a missing/malformed object instead of throwing — usage is a best-effort
 * enrichment, not something that should fail an otherwise-successful chat turn (see AD4: not
 * every OpenAI-compatible endpoint reliably emits it in streaming mode).
 */
export function parseUsage(raw: unknown): UsageInfo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const promptTokens = obj.prompt_tokens;
  const completionTokens = obj.completion_tokens;
  const totalTokens = obj.total_tokens;
  if (typeof promptTokens !== 'number' || typeof completionTokens !== 'number') return null;
  return {
    promptTokens,
    completionTokens,
    totalTokens: typeof totalTokens === 'number' ? totalTokens : promptTokens + completionTokens,
  };
}
