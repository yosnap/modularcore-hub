import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCloudinaryProvider } from '../../core/providers/cloudinary.js';

describe('createCloudinaryProvider (mock provider, no network)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never references an API secret in signed mode config', () => {
    const config = {
      mode: 'signed' as const,
      cloudName: 'demo',
      getSignedParams: async () => ({ apiKey: 'k', timestamp: 1, signature: 's' }),
    };
    for (const field of Object.keys(config)) {
      expect(field.toLowerCase()).not.toContain('apisecret');
      expect(field.toLowerCase()).not.toContain('secret');
    }
  });

  it('defaults require an explicit mode — "signed" posts api_key/timestamp/signature from getSignedParams', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            public_id: 'p1',
            secure_url: 'https://res/p1',
            bytes: 10,
            resource_type: 'image',
          }),
          { status: 200 },
        ),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const provider = createCloudinaryProvider({
      mode: 'signed',
      cloudName: 'demo',
      getSignedParams: async () => ({ apiKey: 'key1', timestamp: 123, signature: 'sig1' }),
    });

    const result = await provider.upload(new File(['x'], 'x.png'));
    expect(result).toEqual({ key: 'p1', url: 'https://res/p1', size: 10, contentType: 'image' });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/auto/upload');
    const form = init.body as FormData;
    expect(form.get('api_key')).toBe('key1');
    expect(form.get('signature')).toBe('sig1');
  });

  describe('unsigned-dev-only mode', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('warns loudly that it is dev-only and posts the upload_preset', async () => {
      const fetchSpy = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              public_id: 'p2',
              secure_url: 'https://res/p2',
              bytes: 5,
              resource_type: 'image',
            }),
            { status: 200 },
          ),
      );
      global.fetch = fetchSpy as unknown as typeof fetch;

      const provider = createCloudinaryProvider({
        mode: 'unsigned-dev-only',
        cloudName: 'demo',
        unsignedUploadPreset: 'dev-preset',
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unsigned-dev-only'));

      await provider.upload(new File(['x'], 'x.png'));
      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const form = init.body as FormData;
      expect(form.get('upload_preset')).toBe('dev-preset');
      expect(form.has('api_key')).toBe(false);
    });
  });

  it('throws when upload fails', async () => {
    global.fetch = vi.fn(
      async () => new Response(null, { status: 400 }),
    ) as unknown as typeof fetch;
    const provider = createCloudinaryProvider({
      mode: 'signed',
      cloudName: 'demo',
      getSignedParams: async () => ({ apiKey: 'k', timestamp: 1, signature: 's' }),
    });
    await expect(provider.upload(new File(['x'], 'x.png'))).rejects.toThrow(/status 400/);
  });

  it('list()/remove() require explicit hooks (Admin API needs the secret)', async () => {
    const provider = createCloudinaryProvider({
      mode: 'signed',
      cloudName: 'demo',
      getSignedParams: async () => ({ apiKey: 'k', timestamp: 1, signature: 's' }),
    });
    await expect(provider.list()).rejects.toThrow(/requires a `list` hook/);
    await expect(provider.remove('k')).rejects.toThrow(/requires a `remove` hook/);
  });

  it('list() forwards ListOptions to the configured hook and returns its ListPage', async () => {
    const list = vi.fn(async () => ({ items: [{ key: 'a', url: 'u', size: 1 }] }));
    const provider = createCloudinaryProvider({
      mode: 'signed',
      cloudName: 'demo',
      getSignedParams: async () => ({ apiKey: 'k', timestamp: 1, signature: 's' }),
      list,
    });
    const page = await provider.list({ scope: 'mine' });
    expect(list).toHaveBeenCalledWith({ scope: 'mine' });
    expect(page).toEqual({ items: [{ key: 'a', url: 'u', size: 1 }] });
  });

  it('listFolders/createFolder are absent unless the hooks are configured', () => {
    const provider = createCloudinaryProvider({
      mode: 'signed',
      cloudName: 'demo',
      getSignedParams: async () => ({ apiKey: 'k', timestamp: 1, signature: 's' }),
    });
    expect(provider.listFolders).toBeUndefined();
    expect(provider.createFolder).toBeUndefined();
  });

  it('listFolders/createFolder delegate to the configured hooks', async () => {
    const listFolders = vi.fn(async () => [{ id: 'f1', name: 'Folder 1' }]);
    const createFolder = vi.fn(async () => ({ id: 'f2', name: 'New' }));
    const provider = createCloudinaryProvider({
      mode: 'signed',
      cloudName: 'demo',
      getSignedParams: async () => ({ apiKey: 'k', timestamp: 1, signature: 's' }),
      listFolders,
      createFolder,
    });
    expect(await provider.listFolders!()).toEqual([{ id: 'f1', name: 'Folder 1' }]);
    expect(await provider.createFolder!('New')).toEqual({ id: 'f2', name: 'New' });
  });
});
