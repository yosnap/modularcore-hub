import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createToolRegistry, dispatchToolCalls, ToolCallAccumulator } from '../core/tools.js';

import type { AccumulatedToolCall, ToolDefinition } from '../core/tools.js';

describe('ToolCallAccumulator (fragmented tool_calls deltas keyed by index)', () => {
  it('accumulates arguments streamed character-by-character across many deltas', () => {
    const accumulator = new ToolCallAccumulator();
    accumulator.ingest([
      {
        index: 0,
        id: 'call_1',
        type: 'function',
        function: { name: 'get_weather', arguments: '' },
      },
    ]);
    accumulator.ingest([{ index: 0, function: { arguments: '{"ci' } }]);
    accumulator.ingest([{ index: 0, function: { arguments: 'ty":"P' } }]);
    accumulator.ingest([{ index: 0, function: { arguments: 'aris"}' } }]);

    const calls = accumulator.list();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      id: 'call_1',
      function: { name: 'get_weather', arguments: '{"city":"Paris"}' },
    });
  });

  it('keeps multiple parallel tool calls separate by index, in index order', () => {
    const accumulator = new ToolCallAccumulator();
    accumulator.ingest([
      { index: 1, id: 'call_b', type: 'function', function: { name: 'tool_b', arguments: '{}' } },
      { index: 0, id: 'call_a', type: 'function', function: { name: 'tool_a', arguments: '{}' } },
    ]);

    const calls = accumulator.list();
    expect(calls.map((c) => c.id)).toEqual(['call_a', 'call_b']);
  });
});

const echoSchema = z.object({ text: z.string() });

function makeEchoTool(
  handler = vi.fn((args: { text: string }) => `echo:${args.text}`),
): ToolDefinition<{ text: string }> {
  return {
    name: 'echo',
    parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    schema: echoSchema,
    handler,
  };
}

function makeCall(
  overrides: Partial<AccumulatedToolCall['function']> = {},
  id = 'call_1',
): AccumulatedToolCall {
  return {
    index: 0,
    id,
    type: 'function',
    function: { name: 'echo', arguments: '{"text":"hi"}', ...overrides },
  };
}

describe('dispatchToolCalls (SA4: validate before executing, human-in-the-loop gate)', () => {
  it('dispatches a valid call to its registered handler', async () => {
    const handler = vi.fn((args: { text: string }) => `echo:${args.text}`);
    const registry = createToolRegistry([makeEchoTool(handler)]);

    const [result] = await dispatchToolCalls([makeCall()], registry);

    expect(handler).toHaveBeenCalledWith({ text: 'hi' }, expect.objectContaining({ id: 'call_1' }));
    expect(result).toMatchObject({ toolCallId: 'call_1', name: 'echo', content: 'echo:hi' });
    expect(result?.error).toBeUndefined();
  });

  it('rejects arguments that fail schema validation without calling the handler', async () => {
    const handler = vi.fn();
    const registry = createToolRegistry([makeEchoTool(handler)]);

    const [result] = await dispatchToolCalls([makeCall({ arguments: '{"text":123}' })], registry);

    expect(handler).not.toHaveBeenCalled();
    expect(result?.error).toMatch(/schema validation/);
  });

  it('rejects an unknown (unregistered) tool without calling any handler', async () => {
    const handler = vi.fn();
    const registry = createToolRegistry([makeEchoTool(handler)]);
    const call = makeCall({ name: 'not_registered' });

    const [result] = await dispatchToolCalls([call], registry);

    expect(handler).not.toHaveBeenCalled();
    expect(result?.error).toMatch(/Unknown tool/);
  });

  it('rejects malformed (non-JSON) arguments without calling the handler', async () => {
    const handler = vi.fn();
    const registry = createToolRegistry([makeEchoTool(handler)]);

    const [result] = await dispatchToolCalls([makeCall({ arguments: 'not json' })], registry);

    expect(handler).not.toHaveBeenCalled();
    expect(result?.error).toMatch(/not valid JSON/);
  });

  it('does not execute the handler when the confirm hook resolves false', async () => {
    const handler = vi.fn();
    const registry = createToolRegistry([makeEchoTool(handler)]);
    const confirm = vi.fn(async () => false);

    const [result] = await dispatchToolCalls([makeCall()], registry, { confirm });

    expect(confirm).toHaveBeenCalledOnce();
    expect(handler).not.toHaveBeenCalled();
    expect(result?.error).toMatch(/not confirmed/);
  });

  it('executes the handler when the confirm hook resolves true', async () => {
    const handler = vi.fn((args: { text: string }) => `echo:${args.text}`);
    const registry = createToolRegistry([makeEchoTool(handler)]);
    const confirm = vi.fn(async () => true);

    const [result] = await dispatchToolCalls([makeCall()], registry, { confirm });

    expect(handler).toHaveBeenCalledOnce();
    expect(result?.content).toBe('echo:hi');
  });

  it('catches a throwing handler and reports it as a dispatch error instead of rejecting', async () => {
    const registry = createToolRegistry([
      makeEchoTool(() => {
        throw new Error('boom');
      }),
    ]);

    const [result] = await dispatchToolCalls([makeCall()], registry);

    expect(result?.error).toBe('boom');
  });
});

describe('createToolRegistry', () => {
  it('rejects duplicate tool names', () => {
    expect(() => createToolRegistry([makeEchoTool(), makeEchoTool()])).toThrow(
      /duplicate tool name/,
    );
  });
});
