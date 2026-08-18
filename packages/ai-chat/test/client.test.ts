import { describe, expect, it, vi } from 'vitest';

import {
  ChatCompletionError,
  DEFAULT_BASE_URL,
  isOpenRouterBaseUrl,
  requestChatCompletionStream,
} from '../core/client.js';
import { createSseResponse } from './helpers/sse-fixture.js';

describe('isOpenRouterBaseUrl', () => {
  it('recognizes the default OpenRouter baseURL', () => {
    expect(isOpenRouterBaseUrl(DEFAULT_BASE_URL)).toBe(true);
  });

  it('rejects other hosts and malformed URLs', () => {
    expect(isOpenRouterBaseUrl('https://api.openai.com/v1')).toBe(false);
    expect(isOpenRouterBaseUrl('not a url')).toBe(false);
  });
});

describe('requestChatCompletionStream', () => {
  it('sends the model/messages/stream body and Bearer auth header, no stream_options for OpenRouter', async () => {
    const fetchImpl = vi.fn(async () => createSseResponse(['DONE']));
    await requestChatCompletionStream(
      { apiKey: 'sk-test', model: 'openrouter/auto' },
      { messages: [{ role: 'user', content: 'hi' }], fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${DEFAULT_BASE_URL}/chat/completions`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: 'openrouter/auto', stream: true });
    expect(body.stream_options).toBeUndefined();
  });

  it('injects stream_options.include_usage for a non-OpenRouter baseURL (AD4)', async () => {
    const fetchImpl = vi.fn(async () => createSseResponse(['DONE']));
    await requestChatCompletionStream(
      { baseURL: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' },
      { messages: [{ role: 'user', content: 'hi' }], fetchImpl },
    );

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it('throws ChatCompletionError with the status/body on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => new Response('rate limited', { status: 429 }));
    await expect(
      requestChatCompletionStream({ apiKey: 'sk-test', model: 'm' }, { messages: [], fetchImpl }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('rejects an ok response with no body', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    await expect(
      requestChatCompletionStream({ apiKey: 'sk-test', model: 'm' }, { messages: [], fetchImpl }),
    ).rejects.toThrow(/no readable body/);
  });

  it('surfaces ChatCompletionError as an Error instance', () => {
    const error = new ChatCompletionError(500, 'boom');
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(500);
  });
});
