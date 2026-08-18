import { messageSchema } from './types.js';

import type { ChatHistory, Message } from './types.js';

export interface BackendHistoryOptions {
  /** Base URL of the user's own history backend, e.g. `https://api.example.com/chat`. */
  baseUrl: string;
  headers?: Record<string, string>;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export class BackendHistoryError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'BackendHistoryError';
  }
}

/**
 * AD5: HTTP contract this adapter expects from the user's own backend. This is a trust boundary
 * — the backend is code the *user* wrote/deployed, but it is not this package, so every message
 * it returns is validated against `messageSchema` before it can enter chat state.
 *
 *   GET    {baseUrl}/messages   -> 200 `{ messages: Message[] }`
 *   POST   {baseUrl}/messages   body: `Message` (JSON) -> any 2xx; response body ignored
 *   DELETE {baseUrl}/messages   -> any 2xx
 *
 * Any non-2xx response throws `BackendHistoryError` with `status` set. A 2xx GET response whose
 * body is not `{ messages: Message[] }`, or whose `messages` contains an entry that fails
 * `messageSchema`, also throws `BackendHistoryError` — `load()` never returns a partially
 * validated array.
 */
export function createBackendHistory(options: BackendHistoryOptions): ChatHistory {
  const doFetch = options.fetchImpl ?? fetch;
  const headers = options.headers ?? {};
  const url = `${options.baseUrl.replace(/\/+$/, '')}/messages`;

  return {
    async load(): Promise<Message[]> {
      const response = await doFetch(url, { method: 'GET', headers });
      if (!response.ok) {
        throw new BackendHistoryError(
          `ai-chat: backend history GET failed (${response.status})`,
          response.status,
        );
      }
      const json: unknown = await response.json();
      if (
        typeof json !== 'object' ||
        json === null ||
        !('messages' in json) ||
        !Array.isArray((json as Record<string, unknown>).messages)
      ) {
        throw new BackendHistoryError(
          'ai-chat: backend history GET returned an unexpected shape (expected { messages: Message[] })',
        );
      }
      const rawMessages = (json as { messages: unknown[] }).messages;
      return rawMessages.map((raw, index) => {
        const parsed = messageSchema.safeParse(raw);
        if (!parsed.success) {
          throw new BackendHistoryError(
            `ai-chat: backend history message at index ${index} failed schema validation: ${parsed.error.message}`,
          );
        }
        return parsed.data;
      });
    },

    async append(message: Message): Promise<void> {
      const validated = messageSchema.parse(message);
      const response = await doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(validated),
      });
      if (!response.ok) {
        throw new BackendHistoryError(
          `ai-chat: backend history POST failed (${response.status})`,
          response.status,
        );
      }
    },

    async clear(): Promise<void> {
      const response = await doFetch(url, { method: 'DELETE', headers });
      if (!response.ok) {
        throw new BackendHistoryError(
          `ai-chat: backend history DELETE failed (${response.status})`,
          response.status,
        );
      }
    },
  };
}
