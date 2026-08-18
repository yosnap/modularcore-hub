import type {
  ListedObject,
  ListPage,
  StorageProvider,
  UploadResult,
} from '@modularcore/media-picker/provider';

/**
 * DEMO-ONLY `StorageProvider` for the public Media Picker playground: blobs are kept in an
 * in-memory `Map` for the lifetime of the browser tab and served back via
 * `URL.createObjectURL`. No network call, no credentials of any kind — this is intentionally
 * not wired to S3/Cloudinary so the playground never needs (and can never leak) real storage
 * credentials. Swap this for `providers/s3-compatible` or `providers/cloudinary` (backed by
 * your own signing endpoint) in a real application.
 */
export function createDemoStorageProvider(): StorageProvider {
  const store = new Map<
    string,
    { blob: Blob; url: string; contentType: string; lastModified: Date }
  >();

  function generateKey(): string {
    return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return {
    async upload(file, options) {
      const key = options?.key ?? generateKey();
      const url = URL.createObjectURL(file);
      const contentType = options?.contentType ?? file.type ?? 'application/octet-stream';
      store.set(key, { blob: file, url, contentType, lastModified: new Date() });
      options?.onProgress?.(file.size, file.size);
      const result: UploadResult = { key, url, size: file.size, contentType };
      return result;
    },
    async list(options): Promise<ListPage> {
      const entries: ListedObject[] = [];
      for (const [key, entry] of store) {
        if (options?.folder && !key.startsWith(options.folder)) continue;
        if (options?.mimeTypes && !options.mimeTypes.includes(entry.contentType)) continue;
        entries.push({
          key,
          url: entry.url,
          size: entry.blob.size,
          lastModified: entry.lastModified,
          mimeType: entry.contentType,
        });
      }
      // In-memory demo store never grows large enough to warrant real pagination.
      return { items: entries };
    },
    async remove(key) {
      const entry = store.get(key);
      if (entry) URL.revokeObjectURL(entry.url);
      store.delete(key);
    },
    getUrl(key) {
      return store.get(key)?.url ?? '';
    },
  };
}
