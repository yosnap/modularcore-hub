import type { ListedObject, StorageProvider, UploadResult } from '../provider.js';

export interface CloudinarySignedParams {
  apiKey: string;
  timestamp: number;
  signature: string;
  folder?: string;
  publicId?: string;
  uploadPreset?: string;
}

/**
 * SA6 (red-team, Med): Cloudinary's "unsigned" upload mode accepts uploads from anyone who
 * knows the preset name, which is why `mode` has no default and callers must opt into
 * `'unsigned-dev-only'` explicitly. The default posture (`'signed'`) mirrors the S3
 * provider's pattern: a server endpoint computes `timestamp`/`signature` with the API
 * secret, which never reaches this module. See
 * `docs/cloudinary-signing-endpoint-example.md`.
 */
export type CloudinaryConfig =
  | {
      mode: 'signed';
      cloudName: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      getSignedParams: (file: Blob) => Promise<CloudinarySignedParams>;
      list?: (prefix?: string) => Promise<ListedObject[]>;
      remove?: (key: string) => Promise<void>;
    }
  | {
      mode: 'unsigned-dev-only';
      cloudName: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      /**
       * Must be restricted server-side (allowed formats, max size, folder, moderation) —
       * an unsigned preset is public by design. Never use in production.
       */
      unsignedUploadPreset: string;
      list?: (prefix?: string) => Promise<ListedObject[]>;
      remove?: (key: string) => Promise<void>;
    };

function uploadEndpoint(cloudName: string, resourceType: string): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

async function buildUploadForm(config: CloudinaryConfig, file: Blob): Promise<FormData> {
  const form = new FormData();
  form.append('file', file);
  if (config.mode === 'signed') {
    const signed = await config.getSignedParams(file);
    form.append('api_key', signed.apiKey);
    form.append('timestamp', String(signed.timestamp));
    form.append('signature', signed.signature);
    if (signed.folder) form.append('folder', signed.folder);
    if (signed.publicId) form.append('public_id', signed.publicId);
    if (signed.uploadPreset) form.append('upload_preset', signed.uploadPreset);
  } else {
    form.append('upload_preset', config.unsignedUploadPreset);
  }
  return form;
}

export function createCloudinaryProvider(config: CloudinaryConfig): StorageProvider {
  if (config.mode === 'unsigned-dev-only') {
    console.warn(
      '[media-picker] Cloudinary provider is running in "unsigned-dev-only" mode. ' +
        'This accepts uploads from anyone who knows the preset name — restrict the preset ' +
        '(formats, size, folder, moderation) and never ship this mode to production.',
    );
  }

  const resourceType = config.resourceType ?? 'auto';

  return {
    async upload(file, options): Promise<UploadResult> {
      const form = await buildUploadForm(config, file);
      const response = await fetch(uploadEndpoint(config.cloudName, resourceType), {
        method: 'POST',
        body: form,
        signal: options?.signal,
      });
      if (!response.ok) {
        throw new Error(`media-picker(cloudinary): upload failed with status ${response.status}`);
      }
      const body = (await response.json()) as {
        public_id: string;
        secure_url: string;
        bytes: number;
        resource_type: string;
        format?: string;
      };
      return {
        key: body.public_id,
        url: body.secure_url,
        size: body.bytes,
        contentType: options?.contentType ?? body.format ?? body.resource_type,
      };
    },
    async list(prefix) {
      if (!config.list) {
        throw new Error(
          'media-picker(cloudinary): list() requires a `list` hook backed by your server ' +
            '(the Admin API needs the API secret, which the browser must never hold)',
        );
      }
      return config.list(prefix);
    },
    async remove(key) {
      if (!config.remove) {
        throw new Error(
          'media-picker(cloudinary): remove() requires a `remove` hook backed by your server',
        );
      }
      return config.remove(key);
    },
    getUrl(key) {
      return `https://res.cloudinary.com/${config.cloudName}/${resourceType}/upload/${key}`;
    },
  };
}
