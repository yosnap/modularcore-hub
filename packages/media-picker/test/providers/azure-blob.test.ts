import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAzureBlobProvider } from '../../core/providers/azure-blob.js';

class FakeXmlHttpRequest {
  static instances: FakeXmlHttpRequest[] = [];
  static autoComplete = true;
  status = 201;
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  readonly headers = new Map<string, string>();
  aborted = false;

  constructor() {
    FakeXmlHttpRequest.instances.push(this);
  }

  open = vi.fn();
  setRequestHeader = vi.fn((name: string, value: string) => this.headers.set(name, value));
  send = vi.fn(() => {
    if (FakeXmlHttpRequest.autoComplete) this.onload?.();
  });
  abort = vi.fn(() => {
    this.aborted = true;
    this.onabort?.();
  });
}

function sasUrl(extra = ''): string {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  return `https://account.blob.core.windows.net/media/a.png?sv=2025-01-05&sr=b&sp=cw&se=${encodeURIComponent(expiresAt)}&sig=secret${extra}`;
}

describe('createAzureBlobProvider', () => {
  afterEach(() => {
    FakeXmlHttpRequest.instances = [];
    FakeXmlHttpRequest.autoComplete = true;
    vi.unstubAllGlobals();
  });

  it('uses a backend-issued HTTPS SAS target without accepting credentials in config', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXmlHttpRequest);
    const targetUrl = sasUrl();
    const provider = createAzureBlobProvider({
      containerUrl: 'https://account.blob.core.windows.net/media',
      getUploadTarget: async () => ({
        url: targetUrl,
        key: 'a.png',
        headers: { 'x-ms-meta-owner': 'user-1' },
      }),
      getUrl: (key) => `https://cdn.example.com/${key}`,
    });

    const result = await provider.upload(new File(['x'], 'a.png', { type: 'image/png' }));
    const request = FakeXmlHttpRequest.instances[0];
    expect(request.open).toHaveBeenCalledWith('PUT', targetUrl);
    expect(request.headers).toEqual(
      new Map([
        ['x-ms-blob-type', 'BlockBlob'],
        ['x-ms-meta-owner', 'user-1'],
      ]),
    );
    expect(result).toMatchObject({
      key: 'a.png',
      url: 'https://cdn.example.com/a.png',
    });
  });

  it('reports upload progress and supports AbortSignal', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXmlHttpRequest);
    FakeXmlHttpRequest.autoComplete = false;
    const controller = new AbortController();
    const onProgress = vi.fn();
    const provider = createAzureBlobProvider({
      containerUrl: 'https://account.blob.core.windows.net/media',
      getUploadTarget: async () => ({ url: sasUrl(), key: 'a.png' }),
      getUrl: (key) => key,
    });
    const upload = provider.upload(new File(['x'], 'a.png'), {
      signal: controller.signal,
      onProgress,
    });
    await Promise.resolve();
    const request = FakeXmlHttpRequest.instances[0];
    request.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 4 } as ProgressEvent);
    controller.abort();
    await expect(upload).rejects.toMatchObject({ name: 'AbortError' });
    expect(onProgress).toHaveBeenCalledWith(2, 4);
    expect(request.abort).toHaveBeenCalledOnce();
  });

  it('rejects insecure targets and keeps list/remove server-owned', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXmlHttpRequest);
    const provider = createAzureBlobProvider({
      containerUrl: 'https://account.blob.core.windows.net/media',
      getUploadTarget: async () => ({ url: 'http://storage.example/a', key: 'a.png' }),
      getUrl: (key) => key,
    });
    await expect(provider.upload(new File(['x'], 'a.png'))).rejects.toThrow(/HTTPS/);
    await expect(provider.list()).rejects.toThrow(/requires a hook/);
    await expect(provider.remove('a')).rejects.toThrow(/requires a hook/);
  });

  it('rejects container-wide, over-privileged, expired, and header-overridden SAS targets', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXmlHttpRequest);
    const provider = createAzureBlobProvider({
      containerUrl: 'https://account.blob.core.windows.net/media',
      getUploadTarget: async () => ({ url: sasUrl().replace('sp=cw', 'sp=cwd'), key: 'a.png' }),
      getUrl: (key) => key,
    });
    await expect(provider.upload(new File(['x'], 'a.png'))).rejects.toThrow(/only create\/write/);

    const secureProvider = createAzureBlobProvider({
      containerUrl: 'https://account.blob.core.windows.net/media',
      getUploadTarget: async () => ({
        url: sasUrl(),
        key: 'a.png',
        headers: { 'x-ms-blob-type': 'PageBlob' },
      }),
      getUrl: (key) => key,
    });
    await expect(secureProvider.upload(new File(['x'], 'a.png'))).rejects.toThrow(
      /reserved upload header/,
    );
  });
});
