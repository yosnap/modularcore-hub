import type {
  ListOptions,
  ListPage,
  StorageFolder,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from '../provider.js';

export interface S3PresignedTarget {
  url: string;
  method?: 'PUT' | 'POST';
  /** Extra form fields for a presigned POST policy; ignored for PUT. */
  fields?: Record<string, string>;
  key: string;
}

/**
 * The core runs in the browser and MUST NEVER hold an S3 access/secret key — there is no
 * `accessKey`/`secretKey` field anywhere in this config on purpose. `getUploadUrl` is the
 * seam: the user implements it against their own backend, which signs a short-lived
 * presigned PUT/POST using credentials that never leave the server. See
 * `docs/s3-presign-endpoint-example.md` for a reference signing endpoint.
 */
export interface S3CompatibleConfig {
  getUploadUrl: (file: Blob, options?: UploadOptions) => Promise<S3PresignedTarget>;
  /** Base used to build public URLs, e.g. `https://cdn.example.com` or a bucket endpoint. */
  publicUrlBase: string;
  /**
   * Listing/removal need standing credentials — proxy them through your own backend too.
   * `options.query`/`options.sort` (numbered-pagination search/sort) are forwarded verbatim —
   * see the trust-boundary note on `ListOptions` in `core/provider.ts` and
   * `docs/s3-presign-endpoint-example.md` for the injection/no-guarantee caveats before wiring
   * them into your bucket-listing query.
   */
  list?: (options?: ListOptions) => Promise<ListPage>;
  remove?: (key: string) => Promise<void>;
  /** Folders are a flat list (no nesting) — proxy them through your own backend as well. */
  listFolders?: () => Promise<StorageFolder[]>;
  createFolder?: (name: string) => Promise<StorageFolder>;
}

function buildPublicUrl(publicUrlBase: string, key: string): string {
  return `${publicUrlBase.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

async function putUpload(
  target: S3PresignedTarget,
  file: Blob,
  options?: UploadOptions,
): Promise<Response> {
  return fetch(target.url, {
    method: 'PUT',
    body: file,
    headers: options?.contentType ? { 'Content-Type': options.contentType } : undefined,
    signal: options?.signal,
  });
}

async function postUpload(
  target: S3PresignedTarget,
  file: Blob,
  options?: UploadOptions,
): Promise<Response> {
  const form = new FormData();
  for (const [name, value] of Object.entries(target.fields ?? {})) {
    form.append(name, value);
  }
  form.append('file', file);
  return fetch(target.url, { method: 'POST', body: form, signal: options?.signal });
}

export function createS3CompatibleProvider(config: S3CompatibleConfig): StorageProvider {
  const provider: StorageProvider = {
    async upload(file, options): Promise<UploadResult> {
      const target = await config.getUploadUrl(file, options);
      const response =
        target.method === 'POST'
          ? await postUpload(target, file, options)
          : await putUpload(target, file, options);
      if (!response.ok) {
        throw new Error(
          `media-picker(s3-compatible): upload failed with status ${response.status}`,
        );
      }
      return {
        key: target.key,
        url: buildPublicUrl(config.publicUrlBase, target.key),
        size: file.size,
        contentType: options?.contentType ?? file.type,
      };
    },
    async list(options) {
      if (!config.list) {
        throw new Error(
          'media-picker(s3-compatible): list() requires a `list` hook backed by your server ' +
            '(bucket listing needs standing credentials the browser must never hold)',
        );
      }
      return config.list(options);
    },
    async remove(key) {
      if (!config.remove) {
        throw new Error(
          'media-picker(s3-compatible): remove() requires a `remove` hook backed by your server',
        );
      }
      return config.remove(key);
    },
    getUrl(key) {
      return buildPublicUrl(config.publicUrlBase, key);
    },
  };

  if (config.listFolders) {
    provider.listFolders = () => config.listFolders!();
  }
  if (config.createFolder) {
    provider.createFolder = (name) => config.createFolder!(name);
  }
  return provider;
}
