import { afterEach, describe, expect, it, vi } from 'vitest';

import { fromLibrary, fromLocalFile, fromRemoteUrl, pinnedLookup } from '../core/sources.js';

import type { StorageProvider } from '../core/provider.js';

// `fromRemoteUrl` dynamically imports 'undici' (Node-only) to pin the connection to the
// already-validated address — see `pinnedFetch` in `core/sources.ts` for why it can't reuse
// Node's global `fetch` here (version-mismatch between undici copies). Mocking 'undici'
// itself (not `global.fetch`) is what actually exercises that code path in these unit tests;
// the real, unmocked integration is covered separately in
// `sources.pinned-fetch.integration.test.ts`.
const undiciMock = vi.hoisted(() => ({
  fetchImpl: vi.fn<(...args: unknown[]) => Promise<Response>>(),
}));

vi.mock('undici', () => ({
  Agent: class FakeAgent {
    close = vi.fn(async () => undefined);
  },
  fetch: (...args: unknown[]) => undiciMock.fetchImpl(...args),
}));

describe('fromLocalFile', () => {
  it('returns the File unchanged (no network/validation involved)', () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    expect(fromLocalFile(file)).toBe(file);
  });
});

describe('fromRemoteUrl (SSRF guard integration)', () => {
  afterEach(() => {
    undiciMock.fetchImpl.mockReset();
  });

  it('rejects http:// without calling fetch', async () => {
    await expect(fromRemoteUrl('http://example.com/a.png')).rejects.toThrow(/only https/);
    expect(undiciMock.fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a private-IP URL without calling fetch', async () => {
    await expect(fromRemoteUrl('https://169.254.169.254/latest/meta-data')).rejects.toThrow(
      /private\/local address/,
    );
    expect(undiciMock.fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches a validated https URL and returns its body as a Blob (fetch mocked for the success path)', async () => {
    const body = new Uint8Array([1, 2, 3, 4]);
    undiciMock.fetchImpl.mockImplementation(
      async () =>
        new Response(body, {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': String(body.length) },
        }),
    );

    const blob = await fromRemoteUrl('https://example.com/a.png');
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(4);
    expect(undiciMock.fetchImpl).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: 'manual', dispatcher: expect.anything() }),
    );
  });

  it('pinnedLookup formats the callback correctly for both the Happy-Eyeballs (all) and legacy shapes', () => {
    const lookup = pinnedLookup({ address: '93.184.216.34', family: 4 });

    const allCallback = vi.fn();
    lookup('example.com', { all: true }, allCallback);
    expect(allCallback).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);

    const legacyCallback = vi.fn();
    lookup('example.com', {}, legacyCallback);
    expect(legacyCallback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
  });

  it('rejects when Content-Length exceeds maxBytes', async () => {
    undiciMock.fetchImpl.mockImplementation(
      async () =>
        new Response(new Uint8Array(10), {
          status: 200,
          headers: { 'content-length': '10000000' },
        }),
    );

    await expect(fromRemoteUrl('https://example.com/big.png', { maxBytes: 1000 })).rejects.toThrow(
      /exceeds maxBytes/,
    );
  });

  it('rejects a redirect response instead of following it automatically', async () => {
    undiciMock.fetchImpl.mockImplementation(
      async () =>
        new Response(null, { status: 302, headers: { location: 'https://evil.example/' } }),
    );

    await expect(fromRemoteUrl('https://example.com/redirect')).rejects.toThrow(
      /redirects are not followed/,
    );
  });

  it('closes the pinned dispatcher after a successful fetch', async () => {
    undiciMock.fetchImpl.mockImplementation(async () => new Response(new Uint8Array([1])));

    await fromRemoteUrl('https://example.com/a.png');

    const [, requestInit] = undiciMock.fetchImpl.mock.calls[0] as [
      URL,
      RequestInit & { dispatcher: { close: ReturnType<typeof vi.fn> } },
    ];
    expect(requestInit.dispatcher.close).toHaveBeenCalledTimes(1);
  });

  it('closes the pinned dispatcher even when the fetch fails', async () => {
    undiciMock.fetchImpl.mockImplementation(async () => new Response(null, { status: 500 }));

    await expect(fromRemoteUrl('https://example.com/a.png')).rejects.toThrow(/status 500/);

    const [, requestInit] = undiciMock.fetchImpl.mock.calls[0] as [
      URL,
      RequestInit & { dispatcher: { close: ReturnType<typeof vi.fn> } },
    ];
    expect(requestInit.dispatcher.close).toHaveBeenCalledTimes(1);
  });
});

describe('fromLibrary', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('resolves the object URL via the provider and fetches it', async () => {
    const body = new Uint8Array([9, 9]);
    const fetchSpy = vi.fn(async () => new Response(body, { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    const provider: StorageProvider = {
      upload: vi.fn(),
      list: vi.fn(),
      remove: vi.fn(),
      getUrl: (key) => `https://cdn.example.com/${key}`,
    };

    const blob = await fromLibrary(provider, 'assets/logo.png');
    expect(blob.size).toBe(2);
    expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example.com/assets/logo.png');
  });
});
