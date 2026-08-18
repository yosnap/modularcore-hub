import { createServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { BackendHistoryError, createBackendHistory } from '../../core/history/backend.js';

import type { Server } from 'node:http';
import type { Message } from '../../core/history/types.js';

/**
 * Contract test against a real HTTP server (not a mocked `fetch`) so the assertion that a
 * malformed message from the "backend" is rejected by `messageSchema` exercises the actual
 * validation code path end to end, per AD5.
 */
let server: Server;
let baseUrl: string;
let storedMessages: unknown[] = [];
let nextGetResponse: (() => unknown) | null = null;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      if (req.method === 'GET' && req.url === '/messages') {
        const payload = nextGetResponse ? nextGetResponse() : { messages: storedMessages };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
        return;
      }
      if (req.method === 'POST' && req.url === '/messages') {
        storedMessages.push(JSON.parse(body));
        res.writeHead(201);
        res.end();
        return;
      }
      if (req.method === 'DELETE' && req.url === '/messages') {
        storedMessages = [];
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(404);
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (typeof address === 'object' && address !== null) {
    baseUrl = `http://127.0.0.1:${address.port}`;
  } else {
    throw new Error('failed to bind fixture server');
  }
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

beforeEach(() => {
  storedMessages = [];
  nextGetResponse = null;
});

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    role: 'user',
    content: 'hi',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('createBackendHistory — contract test against a real HTTP fixture server', () => {
  it('append() POSTs the message and load() returns it back validated', async () => {
    const history = createBackendHistory({ baseUrl });
    await history.append(makeMessage({ id: 'm1' }));
    await history.append(makeMessage({ id: 'm2', role: 'assistant', content: 'hello' }));

    const loaded = await history.load();
    expect(loaded.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('clear() DELETEs and load() then returns an empty list', async () => {
    const history = createBackendHistory({ baseUrl });
    await history.append(makeMessage());
    await history.clear();
    expect(await history.load()).toEqual([]);
  });

  it('rejects a malformed message returned by the backend instead of admitting it into state', async () => {
    nextGetResponse = () => ({
      messages: [{ id: 'bad', role: 'not-a-real-role', content: 'x', createdAt: 'now' }],
    });
    const history = createBackendHistory({ baseUrl });

    await expect(history.load()).rejects.toBeInstanceOf(BackendHistoryError);
    await expect(history.load()).rejects.toThrow(/schema validation/);
  });

  it('rejects a GET response with an unexpected shape', async () => {
    nextGetResponse = () => ({ notMessages: [] });
    const history = createBackendHistory({ baseUrl });
    await expect(history.load()).rejects.toThrow(/unexpected shape/);
  });

  it('surfaces a non-2xx response as BackendHistoryError with the status code', async () => {
    const history = createBackendHistory({ baseUrl: `${baseUrl}/does-not-exist` });
    await expect(history.load()).rejects.toMatchObject({ status: 404 });
  });
});
