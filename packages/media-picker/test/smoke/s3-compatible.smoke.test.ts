import {
  CreateBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createS3CompatibleProvider } from '../../core/providers/s3-compatible.js';

/**
 * S1: real smoke against a live S3-compatible backend (MinIO in CI, `.env` locally).
 * Requires S3_ENDPOINT/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_BUCKET — without them this
 * suite skips cleanly instead of failing the whole `test:smoke` run, so local `pnpm test`
 * (which never loads this file, see vitest.config.ts) and contributors without MinIO running
 * are unaffected. CI's `smokes` job always sets these against its MinIO container.
 */
const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } = process.env;
const hasS3Env = Boolean(S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_BUCKET);

describe.skipIf(!hasS3Env)('s3-compatible provider — real MinIO smoke', () => {
  it('uploads a real object via a presigned PUT URL and reads it back', async () => {
    const s3 = new S3Client({
      endpoint: S3_ENDPOINT,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID!, secretAccessKey: S3_SECRET_ACCESS_KEY! },
    });

    // CI's smoke job (see .github/workflows/ci.yml) does not pre-create the bucket — each
    // smoke test is responsible for ensuring it exists.
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET })).catch((error: unknown) => {
      const code = (error as { name?: string })?.name;
      if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') throw error;
    });

    const provider = createS3CompatibleProvider({
      publicUrlBase: `${S3_ENDPOINT}/${S3_BUCKET}`,
      getUploadUrl: async (file) => {
        const key = `smoke/${randomUUID()}.txt`;
        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ContentType: file.type,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 60 });
        return { url, method: 'PUT', key };
      },
    });

    const file = new File(['modularcore media-picker smoke'], 'smoke.txt', { type: 'text/plain' });
    const result = await provider.upload(file);

    // Buckets are private by default (no public-read policy is assumed or configured here,
    // matching the production contract: the provider never grants public read on its own).
    // Reading back uses a second presigned URL — the same signing seam a real backend would
    // expose for downloads — rather than an anonymous GET against `result.url`.
    const getCommand = new GetObjectCommand({ Bucket: S3_BUCKET, Key: result.key });
    const getUrl = await getSignedUrl(s3, getCommand, { expiresIn: 60 });
    const readback = await fetch(getUrl);
    expect(readback.ok).toBe(true);
    expect(await readback.text()).toBe('modularcore media-picker smoke');
  });
});

if (!hasS3Env) {
  it.skip('s3-compatible smoke skipped: S3_ENDPOINT/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_BUCKET not set', () => {});
}
