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
}

export interface StorageProvider {
  upload(file: Blob, options?: UploadOptions): Promise<UploadResult>;
  list(prefix?: string): Promise<ListedObject[]>;
  remove(key: string): Promise<void>;
  getUrl(key: string): string;
}
