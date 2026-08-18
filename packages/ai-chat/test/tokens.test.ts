import { describe, expect, it } from 'vitest';

import { estimateMessagesTokens, estimateTokens, parseUsage } from '../core/tokens.js';

describe('estimateTokens (char/token heuristic, no BPE tokenizer)', () => {
  it('returns 0 for empty text', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates roughly length/4, rounded up, minimum 1', () => {
    expect(estimateTokens('a')).toBe(1);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('estimateMessagesTokens', () => {
  it('sums the estimate across messages, treating null content as empty', () => {
    const total = estimateMessagesTokens([
      { content: 'abcd' },
      { content: null },
      { content: 'a'.repeat(40) },
    ]);
    expect(total).toBe(1 + 0 + 10);
  });
});

describe('parseUsage (real provider `usage` payload, source of truth post-send)', () => {
  it('parses a well-formed OpenAI-shaped usage object', () => {
    const usage = parseUsage({ prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 });
    expect(usage).toEqual({ promptTokens: 12, completionTokens: 8, totalTokens: 20 });
  });

  it('derives totalTokens when the provider omits it', () => {
    const usage = parseUsage({ prompt_tokens: 5, completion_tokens: 3 });
    expect(usage).toEqual({ promptTokens: 5, completionTokens: 3, totalTokens: 8 });
  });

  it('returns null for a missing or malformed usage object', () => {
    expect(parseUsage(null)).toBeNull();
    expect(parseUsage(undefined)).toBeNull();
    expect(parseUsage({ prompt_tokens: 'not-a-number' })).toBeNull();
  });
});
