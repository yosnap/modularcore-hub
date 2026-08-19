import type {
  ListedObject,
  ListPage,
  StorageFolder,
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
 *
 * Folders here are just a `key` prefix (`{folderId}/{rest}`) plus a plain in-memory list of
 * known folder ids/names — demonstrates the `listFolders`/`createFolder` hooks without any
 * real backend, matching the "flat list, no nesting" contract of `StorageFolder`.
 */
export function createDemoStorageProvider(): StorageProvider {
  const store = new Map<
    string,
    { blob: Blob; url: string; contentType: string; lastModified: Date; folderId?: string }
  >();
  const folders = new Map<string, StorageFolder>();

  function generateKey(folderId?: string): string {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return folderId ? `${folderId}/demo-${suffix}` : `demo-${suffix}`;
  }

  return {
    async upload(file, options) {
      // `options.key` is a namespace HINT (the `folderId` prefix the caller wants this stored
      // under), never the final key: `StorageProvider.upload`'s own contract says providers
      // may ignore/namespace it. Always minting a fresh unique key here — instead of using a
      // caller-supplied literal key as-is — avoids the playground's "one fixed key per folder"
      // pattern silently overwriting the previous upload to that folder in the demo `Map`.
      const folderId = options?.key?.includes('/') ? options.key.split('/')[0] : undefined;
      const key = generateKey(folderId);
      const url = URL.createObjectURL(file);
      const contentType = options?.contentType ?? file.type ?? 'application/octet-stream';
      store.set(key, { blob: file, url, contentType, lastModified: new Date(), folderId });
      options?.onProgress?.(file.size, file.size);
      const result: UploadResult = { key, url, size: file.size, contentType };
      return result;
    },
    async list(options): Promise<ListPage> {
      const entries: ListedObject[] = [];
      for (const [key, entry] of store) {
        if (options?.folder && entry.folderId !== options.folder) continue;
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
    async listFolders() {
      return [...folders.values()];
    },
    async createFolder(name) {
      const folder: StorageFolder = { id: generateKey(), name };
      folders.set(folder.id, folder);
      return folder;
    },
  };
}
