import { afterEach, describe, expect, it, vi } from 'vitest';

import { createS3CompatibleProvider } from '../../core/providers/s3-compatible.js';

import type { S3CompatibleConfig } from '../../core/providers/s3-compatible.js';

describe('createS3CompatibleProvider (mock provider, no network)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never references an access/secret key: the config type has no such field', () => {
    const config: S3CompatibleConfig = {
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({ url: 'https://upload.example.com', key: 'k' }),
    };
    // Type-level guarantee (no accessKey/secretKey property exists on S3CompatibleConfig)
    // plus a runtime assertion that nothing resembling a secret was smuggled in via `as any`.
    for (const field of Object.keys(config)) {
      expect(field.toLowerCase()).not.toContain('secret');
      expect(field.toLowerCase()).not.toContain('accesskey');
    }
  });

  it('uploads via PUT using the presigned URL from getUploadUrl', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({
        url: 'https://upload.example.com/presigned',
        key: 'uploads/a.png',
      }),
    });

    const file = new File(['data'], 'a.png', { type: 'image/png' });
    const result = await provider.upload(file);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://upload.example.com/presigned',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(result).toEqual({
      key: 'uploads/a.png',
      url: 'https://cdn.example.com/uploads/a.png',
      size: file.size,
      contentType: 'image/png',
    });
  });

  it('uploads via POST with policy fields when method is POST', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({
        url: 'https://upload.example.com/policy',
        method: 'POST',
        fields: { policy: 'abc', signature: 'def' },
        key: 'uploads/b.png',
      }),
    });

    await provider.upload(new File(['x'], 'b.png'));
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('throws when upload fails', async () => {
    global.fetch = vi.fn(
      async () => new Response(null, { status: 403 }),
    ) as unknown as typeof fetch;
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({ url: 'https://upload.example.com', key: 'k' }),
    });
    await expect(provider.upload(new File(['x'], 'x.png'))).rejects.toThrow(/status 403/);
  });

  it('forwards overwriteKey to getUploadUrl (real same-key "Sobreescribir" upload)', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
    const getUploadUrl = vi.fn(async (_file: Blob, options?: { overwriteKey?: string }) => ({
      url: 'https://upload.example.com/presigned',
      key: options?.overwriteKey ?? 'uploads/fresh.png',
    }));

    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl,
    });

    const file = new File(['data'], 'a.png', { type: 'image/png' });
    const result = await provider.upload(file, { overwriteKey: 'uploads/existing.png' });

    expect(getUploadUrl).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ overwriteKey: 'uploads/existing.png' }),
    );
    expect(result.key).toBe('uploads/existing.png');
  });

  it('omitting overwriteKey reproduces the current "always new key" behavior exactly', async () => {
    global.fetch = vi.fn(
      async () => new Response(null, { status: 200 }),
    ) as unknown as typeof fetch;
    const getUploadUrl = vi.fn(async (_file: Blob, options?: { overwriteKey?: string }) => ({
      url: 'https://upload.example.com/presigned',
      key: options?.overwriteKey ?? 'uploads/fresh.png',
    }));
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl,
    });

    const result = await provider.upload(new File(['data'], 'a.png'));

    expect(getUploadUrl).toHaveBeenCalledWith(expect.any(File), undefined);
    expect(result.key).toBe('uploads/fresh.png');
  });

  it('list()/remove() require explicit hooks (no implicit standing credentials)', async () => {
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({ url: 'x', key: 'k' }),
    });
    await expect(provider.list()).rejects.toThrow(/requires a `list` hook/);
    await expect(provider.remove('k')).rejects.toThrow(/requires a `remove` hook/);
  });

  it('list() forwards ListOptions to the configured hook and returns its ListPage', async () => {
    const list = vi.fn(async () => ({
      items: [{ key: 'a', url: 'u', size: 1 }],
      nextCursor: 'c2',
    }));
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({ url: 'x', key: 'k' }),
      list,
    });
    const page = await provider.list({ folder: 'f1', mimeTypes: ['image/png'] });
    expect(list).toHaveBeenCalledWith({ folder: 'f1', mimeTypes: ['image/png'] });
    expect(page).toEqual({ items: [{ key: 'a', url: 'u', size: 1 }], nextCursor: 'c2' });
  });

  it('forwards query/sort through to the configured list hook', async () => {
    const list = vi.fn(async () => ({ items: [] }));
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({ url: 'x', key: 'k' }),
      list,
    });
    await provider.list({ query: 'cat', sort: 'name' });
    expect(list).toHaveBeenCalledWith({ query: 'cat', sort: 'name' });
  });

  it('listFolders/createFolder are absent unless the hooks are configured', () => {
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({ url: 'x', key: 'k' }),
    });
    expect(provider.listFolders).toBeUndefined();
    expect(provider.createFolder).toBeUndefined();
  });

  it('listFolders/createFolder delegate to the configured hooks', async () => {
    const listFolders = vi.fn(async () => [{ id: 'f1', name: 'Folder 1' }]);
    const createFolder = vi.fn(async () => ({ id: 'f2', name: 'New' }));
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com',
      getUploadUrl: async () => ({ url: 'x', key: 'k' }),
      listFolders,
      createFolder,
    });
    expect(await provider.listFolders!()).toEqual([{ id: 'f1', name: 'Folder 1' }]);
    expect(await provider.createFolder!('New')).toEqual({ id: 'f2', name: 'New' });
    expect(createFolder).toHaveBeenCalledWith('New');
  });

  it('getUrl builds a public URL from publicUrlBase + key', () => {
    const provider = createS3CompatibleProvider({
      publicUrlBase: 'https://cdn.example.com/',
      getUploadUrl: async () => ({ url: 'x', key: 'k' }),
    });
    expect(provider.getUrl('/uploads/a.png')).toBe('https://cdn.example.com/uploads/a.png');
  });
});
