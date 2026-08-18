import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Chat } from '../core/chat.js';
import { createSseResponse } from './helpers/sse-fixture.js';

import type { ToolDefinition } from '../core/tools.js';

describe('Chat — streaming happy path', () => {
  it('assembles incremental content deltas into the final assistant message and ends idle', async () => {
    const fetchImpl = vi.fn(async () =>
      createSseResponse([
        { choices: [{ delta: { role: 'assistant' } }] },
        { choices: [{ delta: { content: 'Hel' } }] },
        { choices: [{ delta: { content: 'lo!' } }] },
        {
          choices: [{ delta: {} }],
          usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
        },
        'DONE',
      ]),
    );
    const chat = new Chat({ apiKey: 'sk-test', models: ['model-a'], fetchImpl });

    const seenContents: (string | null)[] = [];
    chat.subscribe((state) => {
      const assistant = state.messages.find((m) => m.role === 'assistant');
      if (assistant) seenContents.push(assistant.content);
    });

    await chat.send('hi there');

    expect(chat.getState().status).toBe('idle');
    expect(chat.getState().error).toBeNull();
    const messages = chat.getState().messages;
    expect(messages[0]).toMatchObject({ role: 'user', content: 'hi there' });
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'Hello!' });
    expect(chat.getState().usage).toEqual({ promptTokens: 3, completionTokens: 2, totalTokens: 5 });
    // incremental deltas were actually observed, not just the final value
    expect(seenContents).toEqual(expect.arrayContaining(['', 'Hel', 'Hello!']));
  });

  it('surfaces a request failure as a chat error state', async () => {
    const fetchImpl = vi.fn(async () => new Response('server error', { status: 500 }));
    const chat = new Chat({ apiKey: 'sk-test', models: ['model-a'], fetchImpl });

    await chat.send('hi');

    expect(chat.getState().status).toBe('error');
    expect(chat.getState().error).toBeInstanceOf(Error);
  });

  it('falls back to the second model when the first fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(
        createSseResponse([{ choices: [{ delta: { content: 'ok' } }] }, 'DONE']),
      );
    const chat = new Chat({ apiKey: 'sk-test', models: ['model-a', 'model-b'], fetchImpl });

    await chat.send('hi');

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(chat.getState().status).toBe('idle');
    expect(chat.getState().messages.at(-1)).toMatchObject({ role: 'assistant', content: 'ok' });
  });
});

describe('Chat — generation guard (media-picker pattern: stale async result must not clobber newer state)', () => {
  it('a slow stream chunk that resolves after reset() does not resurrect the reset conversation', async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchImpl = vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve)));
    const chat = new Chat({ apiKey: 'sk-test', models: ['model-a'], fetchImpl });

    const pending = chat.send('hello');
    await Promise.resolve(); // let send() reach the pending fetch call synchronously

    chat.reset();
    resolveFetch(
      createSseResponse([{ choices: [{ delta: { content: 'late, must be dropped' } }] }, 'DONE']),
    );
    await pending;

    expect(chat.getState()).toEqual({ status: 'idle', messages: [], error: null, usage: null });
  });

  it('a slow first send() superseded by a second send() does not clobber the second conversation', async () => {
    let resolveFirstFetch!: (response: Response) => void;
    let callCount = 0;
    const fetchImpl = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) return new Promise<Response>((resolve) => (resolveFirstFetch = resolve));
      return Promise.resolve(
        createSseResponse([{ choices: [{ delta: { content: 'second' } }] }, 'DONE']),
      );
    });
    const chat = new Chat({ apiKey: 'sk-test', models: ['model-a'], fetchImpl });

    const firstPending = chat.send('first');
    await Promise.resolve();

    const secondPending = chat.send('second-input');
    await secondPending;
    resolveFirstFetch(createSseResponse([{ choices: [{ delta: { content: 'stale' } }] }, 'DONE']));
    await firstPending;

    // send() appends a new turn onto the same conversation (unlike media-picker's single-resource
    // reset semantics) — the first turn's messages stay, but its late-arriving chunk must never
    // land, and the second turn must complete normally and independently.
    const messages = chat.getState().messages;
    expect(messages.some((m) => m.content === 'stale')).toBe(false);
    expect(messages.find((m) => m.role === 'user' && m.content === 'first')).toBeDefined();
    const secondUserIndex = messages.findIndex((m) => m.content === 'second-input');
    expect(secondUserIndex).toBeGreaterThan(-1);
    expect(messages[secondUserIndex + 1]).toMatchObject({ role: 'assistant', content: 'second' });
  });
});

describe('Chat — tool calling (SA4 loop: tool_calls -> dispatch -> feed result back -> final answer)', () => {
  it('executes a registered tool and feeds the result back for the final completion', async () => {
    const handler = vi.fn((args: { city: string }) => `sunny in ${args.city}`);
    const weatherTool: ToolDefinition<{ city: string }> = {
      name: 'get_weather',
      parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
      schema: z.object({ city: z.string() }),
      handler,
    };

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createSseResponse([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_1',
                      type: 'function',
                      function: { name: 'get_weather', arguments: '' },
                    },
                  ],
                },
              },
            ],
          },
          {
            choices: [
              {
                delta: { tool_calls: [{ index: 0, function: { arguments: '{"city":"Paris"}' } }] },
              },
            ],
          },
          { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
          'DONE',
        ]),
      )
      .mockResolvedValueOnce(
        createSseResponse([{ choices: [{ delta: { content: 'It is sunny in Paris.' } }] }, 'DONE']),
      );

    const chat = new Chat({
      apiKey: 'sk-test',
      models: ['model-a'],
      tools: [weatherTool],
      fetchImpl,
    });

    await chat.send('What is the weather in Paris?');

    expect(handler).toHaveBeenCalledWith(
      { city: 'Paris' },
      expect.objectContaining({ id: 'call_1' }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const messages = chat.getState().messages;
    expect(messages.some((m) => m.role === 'tool' && m.content === 'sunny in Paris')).toBe(true);
    expect(messages.at(-1)).toMatchObject({ role: 'assistant', content: 'It is sunny in Paris.' });
    expect(chat.getState().status).toBe('idle');
  });

  it('does not execute the tool when confirmTool resolves false, and still finalizes the turn', async () => {
    const handler = vi.fn();
    const tool: ToolDefinition<{ text: string }> = {
      name: 'echo',
      parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      schema: z.object({ text: z.string() }),
      handler,
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createSseResponse([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_1',
                      type: 'function',
                      function: { name: 'echo', arguments: '{"text":"hi"}' },
                    },
                  ],
                },
              },
            ],
          },
          'DONE',
        ]),
      )
      .mockResolvedValueOnce(
        createSseResponse([{ choices: [{ delta: { content: 'done' } }] }, 'DONE']),
      );

    const chat = new Chat({
      apiKey: 'sk-test',
      models: ['model-a'],
      tools: [tool],
      confirmTool: async () => false,
      fetchImpl,
    });

    await chat.send('use echo');

    expect(handler).not.toHaveBeenCalled();
    const toolMessage = chat.getState().messages.find((m) => m.role === 'tool');
    expect(toolMessage?.content).toMatch(/not confirmed/);
  });
});

describe('Chat — stop()', () => {
  it('aborts the in-flight request and returns to idle without an error', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );
    const chat = new Chat({ apiKey: 'sk-test', models: ['model-a'], fetchImpl });

    const pending = chat.send('hi');
    await Promise.resolve();
    chat.stop();
    await pending;

    expect(chat.getState().status).toBe('idle');
    expect(chat.getState().error).toBeNull();
  });
});
