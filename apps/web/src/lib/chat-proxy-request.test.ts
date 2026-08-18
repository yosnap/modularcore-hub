import { describe, expect, it } from 'vitest';

import { ALLOWED_MODELS, DEFAULT_MODEL, MAX_TOKENS_CAP } from './chat-config';
import { ChatRequestError, parseChatRequestBody } from './chat-proxy-request';

describe('parseChatRequestBody', () => {
  it('accepts a minimal valid body and fills in defaults', () => {
    const result = parseChatRequestBody({ messages: [{ role: 'user', content: 'hi' }] });
    expect(result.model).toBe(DEFAULT_MODEL);
    expect(result.maxTokens).toBe(MAX_TOKENS_CAP);
    expect(result.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('rejects a non-object body', () => {
    expect(() => parseChatRequestBody(null)).toThrow(ChatRequestError);
    expect(() => parseChatRequestBody('nope')).toThrow(ChatRequestError);
  });

  it('rejects an empty or missing messages array', () => {
    expect(() => parseChatRequestBody({})).toThrow(ChatRequestError);
    expect(() => parseChatRequestBody({ messages: [] })).toThrow(ChatRequestError);
  });

  it('rejects a message with an invalid role', () => {
    expect(() => parseChatRequestBody({ messages: [{ role: 'admin', content: 'hi' }] })).toThrow(
      ChatRequestError,
    );
  });

  it('rejects a model outside the allowlist', () => {
    expect(() =>
      parseChatRequestBody({
        messages: [{ role: 'user', content: 'hi' }],
        model: 'some-unlisted/model',
      }),
    ).toThrow(/not allowed/);
  });

  it('accepts every model in the allowlist', () => {
    for (const model of ALLOWED_MODELS) {
      const result = parseChatRequestBody({
        messages: [{ role: 'user', content: 'hi' }],
        model,
      });
      expect(result.model).toBe(model);
    }
  });

  it('caps max_tokens at MAX_TOKENS_CAP without rejecting the request', () => {
    const result = parseChatRequestBody({
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: MAX_TOKENS_CAP * 10,
    });
    expect(result.maxTokens).toBe(MAX_TOKENS_CAP);
  });

  it('respects a max_tokens value under the cap', () => {
    const result = parseChatRequestBody({
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 16,
    });
    expect(result.maxTokens).toBe(16);
  });

  it('never surfaces tools/tool_choice fields sent by the client', () => {
    const result = parseChatRequestBody({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [{ type: 'function', function: { name: 'evil', parameters: {} } }],
      tool_choice: 'auto',
    });
    expect(result).not.toHaveProperty('tools');
    expect(result).not.toHaveProperty('tool_choice');
  });
});
