/**
 * Real SSE parsing over a Web Standards `ReadableStream<Uint8Array>` — the shape returned by
 * `fetch` for a streamed chat/completions response (`data: {...}\n\n` per OpenAI's format,
 * terminated by `data: [DONE]`). No dependency on any provider SDK.
 */

export interface ChoiceDeltaToolCall {
  index: number;
  id?: string;
  type?: 'function';
  function?: { name?: string; arguments?: string };
}

export interface ChoiceDelta {
  role?: string;
  content?: string | null;
  tool_calls?: ChoiceDeltaToolCall[];
}

export interface ChatCompletionChunk {
  id?: string;
  choices: Array<{
    index?: number;
    delta: ChoiceDelta;
    finish_reason?: string | null;
  }>;
  usage?: Record<string, unknown> | null;
}

function parseSseEvent(rawEvent: string): ChatCompletionChunk | 'done' | null {
  const dataLines = rawEvent
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());
  if (dataLines.length === 0) return null;
  const data = dataLines.join('');
  if (data === '[DONE]') return 'done';
  try {
    return JSON.parse(data) as ChatCompletionChunk;
  } catch {
    throw new Error(`ai-chat: malformed SSE JSON payload: ${data.slice(0, 200)}`);
  }
}

/**
 * The raw `ReadableStream` passed in has no built-in notion of `signal` — a synthetic stream
 * (as used in tests) or one produced by a `fetch` whose own abort wiring doesn't propagate to
 * in-flight `reader.read()` the way this module needs stays pending forever otherwise. Racing
 * every `read()` against the abort signal is what makes cancellation immediate rather than
 * "only checked between reads" (which would hang on a read that never resolves).
 */
function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Yields one `ChatCompletionChunk` per SSE event. Cancelable: pass the same `AbortSignal` used
 * for the `fetch` call — aborting mid-stream rejects the generator with `AbortError` instead of
 * hanging on the in-flight read, and the reader is released/cancelled in `finally` regardless
 * of how the loop exits.
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<ChatCompletionChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await raceWithAbort(reader.read(), signal);
      if (done) break;
      // Normalize CRLF: some OpenAI-compatible gateways emit \r\n line endings.
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const chunk = parseSseEvent(rawEvent);
        if (chunk === 'done') return;
        if (chunk) yield chunk;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
