import { describe, expect, it } from 'vitest';

import { parseSseStream } from '../core/stream.js';

describe('parseSseStream (real ReadableStream/SSE parsing)', () => {
  it('yields one chunk per SSE event, including a [DONE]-terminated stream', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hel"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const chunks = [];
    for await (const chunk of parseSseStream(body)) chunks.push(chunk);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.choices[0]?.delta.content).toBe('hel');
    expect(chunks[1]?.choices[0]?.delta.content).toBe('lo');
  });

  it('reassembles a single SSE event whose bytes are split mid-payload across two reads', async () => {
    const encoder = new TextEncoder();
    const fullEvent = `data: ${JSON.stringify({ choices: [{ delta: { content: 'hello world' } }] })}\n\n`;
    const splitPoint = 12; // arbitrary point inside the JSON payload, not on an event boundary
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(fullEvent.slice(0, splitPoint)));
        controller.enqueue(encoder.encode(fullEvent.slice(splitPoint)));
        controller.close();
      },
    });

    const chunks = [];
    for await (const chunk of parseSseStream(body)) chunks.push(chunk);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.choices[0]?.delta.content).toBe('hello world');
  });

  it('normalizes CRLF line endings', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"x"}}]}\r\n\r\n'));
        controller.close();
      },
    });

    const chunks = [];
    for await (const chunk of parseSseStream(body)) chunks.push(chunk);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.choices[0]?.delta.content).toBe('x');
  });

  it('throws on a malformed (non-JSON) data payload', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {not json\n\n'));
        controller.close();
      },
    });

    const chunks = [];
    await expect(async () => {
      for await (const chunk of parseSseStream(body)) chunks.push(chunk);
    }).rejects.toThrow(/malformed SSE JSON/);
  });

  it('turns a normalized proxy error event into a rejected stream', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: error\ndata: {"message":"upstream rate limited"}\n\n'));
        controller.close();
      },
    });

    await expect(async () => {
      for await (const chunk of parseSseStream(body)) {
        // Consume the generator.
        void chunk;
      }
    }).rejects.toThrow(/proxy stream error: upstream rate limited/);
  });

  it('rejects with AbortError and cancels the reader when the signal aborts mid-stream', async () => {
    const controller = new AbortController();
    let cancelCalled = false;
    const body = new ReadableStream<Uint8Array>({
      // Never enqueues or closes: simulates a stream that would otherwise hang forever.
      start() {},
      cancel() {
        cancelCalled = true;
      },
    });

    const iterator = parseSseStream(body, controller.signal)[Symbol.asyncIterator]();
    const pending = iterator.next();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancelCalled).toBe(true);
  });
});
