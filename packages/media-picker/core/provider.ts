/**
 * `StorageProvider` is the single seam between the headless core and any storage
 * backend. It intentionally never exposes a place to pass long-lived secrets
 * (`accessKey`/`secretKey`/API secrets): the core runs in the browser, so any
 * implementation that needs a secret must obtain short-lived, scoped credentials
 * (a presigned URL, a signed upload payload) from a backend the *user* controls.
 * See `core/providers/s3-compatible.ts` and `core/providers/cloudinary.ts`.
 */
export interface UploadOptions {
  /** Desired storage key/path. Providers may ignore or namespace this. */
  key?: string;
  contentType?: string;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface ListedObject {
  key: string;
  url: string;
  size: number;
  lastModified?: Date;
  mimeType?: string;
  width?: number;
  height?: number;
}

/**
 * `scope` is UX-only: the client passes `'mine' | 'all'` purely to drive a filter toggle in
 * the UI. The core never decides who may see what — the SAME trust boundary as
 * `getUploadUrl` (see `providers/s3-compatible.ts`/`providers/cloudinary.ts`): a real
 * authorization decision requires the caller's identity, which only the user's own backend
 * (behind the `list` hook) can verify. A provider that ignores `scope` entirely is a valid
 * implementation of this interface.
 */
export interface ListOptions {
  folder?: string;
  scope?: 'mine' | 'all';
  mimeTypes?: string[];
  cursor?: string;
  limit?: number;
}

/** Cursor-based pagination: `nextCursor` is `undefined` once there is nothing more to page. */
export interface ListPage {
  items: ListedObject[];
  nextCursor?: string;
}

export interface StorageFolder {
  id: string;
  name: string;
}

export interface StorageProvider {
  upload(file: Blob, options?: UploadOptions): Promise<UploadResult>;
  list(options?: ListOptions): Promise<ListPage>;
  remove(key: string): Promise<void>;
  getUrl(key: string): string;
  /** Folders are a flat list (no nesting/tree) — matches the reference UX this v2 is based on. */
  listFolders?(): Promise<StorageFolder[]>;
  createFolder?(name: string): Promise<StorageFolder>;
}
