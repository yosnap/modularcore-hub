import type {
  ListedObject,
  ListOptions,
  ListPage,
  StorageFolder,
  StorageProvider,
  UploadResult,
} from '@modularcore/media-picker/provider';

function sortEntries(entries: ListedObject[], sort: ListOptions['sort']): ListedObject[] {
  const sorted = [...entries];
  switch (sort) {
    case 'oldest':
      sorted.sort((a, b) => (a.lastModified?.getTime() ?? 0) - (b.lastModified?.getTime() ?? 0));
      break;
    case 'name':
      sorted.sort((a, b) => a.key.localeCompare(b.key));
      break;
    case 'size':
      sorted.sort((a, b) => a.size - b.size);
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0));
      break;
  }
  return sorted;
}

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
      //
      // `options.overwriteKey`, in contrast, IS honored as a literal target key — this is the
      // real "Sobreescribir" contract (see `core/provider.ts`), a deliberate exception to the
      // "always mint fresh" rule above. A REAL backend must independently verify the caller is
      // authorized to replace the object at `overwriteKey` before honoring it (e.g. it belongs
      // to the same user/tenant) — this demo provider has no such check because it has no
      // concept of a caller identity at all; do not copy this file's overwrite path as a model
      // for a real provider without adding that authorization check.
      const previous = options?.overwriteKey ? store.get(options.overwriteKey) : undefined;
      // On overwrite, `options.key` is never passed (see "Sobreescribir" call sites) — falling
      // back to the previous entry's own `folderId` instead of `undefined` keeps the item in
      // whatever folder it already lived in (Code Review Finding: overwriting an image used to
      // silently reset its folder, making it vanish from that folder's filtered library view).
      const folderId = options?.key?.includes('/') ? options.key.split('/')[0] : previous?.folderId;
      const key = options?.overwriteKey ?? generateKey(folderId);
      if (previous) {
        // Revoke the previous entry's object URL before replacing it — mirrors `remove()`
        // below; without this every "Sobreescribir" leaked one blob URL for the tab's lifetime.
        URL.revokeObjectURL(previous.url);
      }
      const url = URL.createObjectURL(file);
      const contentType = options?.contentType ?? file.type ?? 'application/octet-stream';
      store.set(key, { blob: file, url, contentType, lastModified: new Date(), folderId });
      options?.onProgress?.(file.size, file.size);
      const result: UploadResult = { key, url, size: file.size, contentType };
      return result;
    },
    async list(options): Promise<ListPage> {
      let entries: ListedObject[] = [];
      for (const [key, entry] of store) {
        if (options?.folder && entry.folderId !== options.folder) continue;
        if (options?.mimeTypes && !options.mimeTypes.includes(entry.contentType)) continue;
        if (options?.query) {
          const needle = options.query.trim().toLowerCase();
          if (needle && !key.toLowerCase().includes(needle)) continue;
        }
        entries.push({
          key,
          url: entry.url,
          size: entry.blob.size,
          lastModified: entry.lastModified,
          mimeType: entry.contentType,
        });
      }
      entries = sortEntries(entries, options?.sort);

      // Synthetic, index-based pagination: `cursor` here is just the offset into `entries`
      // encoded as a string. This is cheap ONLY because the demo store is a plain in-memory
      // array — it does not model a real S3/Cloudinary backend, whose continuation tokens are
      // opaque and cannot be reconstructed from a page index. Walking to an unvisited page N
      // against a real backend costs N-1 sequential round-trips (see
      // `docs/s3-presign-endpoint-example.md`/`docs/cloudinary-signing-endpoint-example.md`).
      // Do not use this shortcut as a model for a real provider's pagination cost.
      const limit = options?.limit ?? 24;
      const rawOffset = options?.cursor ? Number.parseInt(options.cursor, 10) : 0;
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
      const page = entries.slice(offset, offset + limit);
      const nextOffset = offset + limit;
      const nextCursor = nextOffset < entries.length ? String(nextOffset) : undefined;
      return { items: page, nextCursor };
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
