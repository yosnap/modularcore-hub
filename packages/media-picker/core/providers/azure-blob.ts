import type {
  ListOptions,
  ListPage,
  StorageFolder,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from '../provider.js';

/** A write-only, short-lived SAS URL issued by the consumer's backend for one blob. */
export interface AzureBlobUploadTarget {
  url: string;
  key: string;
  /** Required Azure headers (for example `x-ms-blob-type`) approved by the signing endpoint. */
  headers?: Record<string, string>;
}

/**
 * Browser-side Azure integration. It deliberately accepts only a per-upload SAS target; account
 * keys, connection strings and storage credentials must stay in the consumer's backend.
 */
export interface AzureBlobConfig {
  /** Exact HTTPS container URL, e.g. `https://account.blob.core.windows.net/media`. */
  containerUrl: string;
  getUploadTarget: (file: Blob, options?: UploadOptions) => Promise<AzureBlobUploadTarget>;
  /** Public/CDN URL builder. For private containers, return a URL from the caller's own proxy. */
  getUrl: (key: string) => string;
  list?: (options?: ListOptions) => Promise<ListPage>;
  remove?: (key: string) => Promise<void>;
  listFolders?: () => Promise<StorageFolder[]>;
  createFolder?: (name: string) => Promise<StorageFolder>;
}

function safeUploadUrl(rawUrl: string, key: string, containerUrl: string): string {
  const url = new URL(rawUrl);
  const container = new URL(containerUrl);
  if (url.protocol !== 'https:' || container.protocol !== 'https:') {
    throw new Error('media-picker(azure-blob): upload targets must use HTTPS');
  }
  const expectedPath = `${container.pathname.replace(/\/$/, '')}/${key
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  if (url.origin !== container.origin || url.pathname !== expectedPath) {
    throw new Error(
      'media-picker(azure-blob): upload target must match the configured container and key',
    );
  }
  if (!url.searchParams.get('sig') || !url.searchParams.get('sv')) {
    throw new Error('media-picker(azure-blob): upload target must include a signed SAS');
  }
  if (url.searchParams.get('sr') !== 'b') {
    throw new Error('media-picker(azure-blob): upload SAS must be scoped to one blob');
  }
  const permissions = url.searchParams.get('sp') ?? '';
  if (
    !permissions ||
    [...permissions].some((permission) => permission !== 'c' && permission !== 'w')
  ) {
    throw new Error('media-picker(azure-blob): upload SAS may grant only create/write permissions');
  }
  const expiresAt = Date.parse(url.searchParams.get('se') ?? '');
  const maxLifetimeMs = 15 * 60 * 1000;
  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    expiresAt > Date.now() + maxLifetimeMs
  ) {
    throw new Error('media-picker(azure-blob): upload SAS must expire within 15 minutes');
  }
  return url.toString();
}

function uploadWithProgress(
  target: AzureBlobUploadTarget,
  file: Blob,
  containerUrl: string,
  options?: UploadOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => options?.signal?.removeEventListener('abort', abort);

    request.open('PUT', safeUploadUrl(target.url, target.key, containerUrl));
    for (const [name, value] of Object.entries(target.headers ?? {})) {
      if (name.toLowerCase() === 'x-ms-blob-type' || name.toLowerCase() === 'content-type') {
        throw new Error(`media-picker(azure-blob): ${name} is a reserved upload header`);
      }
      request.setRequestHeader(name, value);
    }
    // A caller cannot replace the required Azure blob type through custom headers.
    request.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    if (options?.contentType) request.setRequestHeader('Content-Type', options.contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) options?.onProgress?.(event.loaded, event.total);
    };
    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`media-picker(azure-blob): upload failed with status ${request.status}`));
    };
    request.onerror = () => {
      cleanup();
      reject(new Error('media-picker(azure-blob): upload failed due to a network error'));
    };
    request.onabort = () => {
      cleanup();
      reject(new DOMException('The upload was aborted', 'AbortError'));
    };
    if (options?.signal?.aborted) {
      request.abort();
      return;
    }
    options?.signal?.addEventListener('abort', abort, { once: true });
    request.send(file);
  });
}

export function createAzureBlobProvider(config: AzureBlobConfig): StorageProvider {
  const provider: StorageProvider = {
    async upload(file, options): Promise<UploadResult> {
      const target = await config.getUploadTarget(file, options);
      if (!target.key) throw new Error('media-picker(azure-blob): upload target is missing a key');
      await uploadWithProgress(target, file, config.containerUrl, options);
      return {
        key: target.key,
        url: config.getUrl(target.key),
        size: file.size,
        contentType: options?.contentType ?? file.type,
      };
    },
    async list(options) {
      if (!config.list) {
        throw new Error('media-picker(azure-blob): list() requires a hook backed by your server');
      }
      return config.list(options);
    },
    async remove(key) {
      if (!config.remove) {
        throw new Error('media-picker(azure-blob): remove() requires a hook backed by your server');
      }
      return config.remove(key);
    },
    getUrl: (key) => config.getUrl(key),
  };

  if (config.listFolders) provider.listFolders = () => config.listFolders!();
  if (config.createFolder) provider.createFolder = (name) => config.createFolder!(name);
  return provider;
}
