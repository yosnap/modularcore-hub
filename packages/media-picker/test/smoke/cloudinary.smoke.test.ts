import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createCloudinaryProvider } from '../../core/providers/cloudinary.js';

/**
 * S1: real smoke against a live Cloudinary account. Requires CLOUDINARY_CLOUD_NAME/
 * CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET — without them this suite skips cleanly instead
 * of failing `test:smoke`. Signs the upload the same way `docs/cloudinary-signing-endpoint-
 * example.md` does, so the smoke exercises the "signed by default" (SA6) code path.
 */
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
const hasCloudinaryEnv = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET,
);

describe.skipIf(!hasCloudinaryEnv)('cloudinary provider — real Cloudinary smoke', () => {
  it('uploads a real image using signed params', async () => {
    const provider = createCloudinaryProvider({
      mode: 'signed',
      cloudName: CLOUDINARY_CLOUD_NAME!,
      getSignedParams: async () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = 'modularcore-media-picker-smoke';
        const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const signature = createHash('sha1').update(toSign).digest('hex');
        return { apiKey: CLOUDINARY_API_KEY!, timestamp, signature, folder };
      },
    });

    // 1x1 transparent PNG.
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const file = new File([Buffer.from(pngBase64, 'base64')], 'smoke.png', { type: 'image/png' });

    const result = await provider.upload(file);
    expect(result.key).toContain('modularcore-media-picker-smoke');
    expect(result.url).toMatch(/^https:\/\/res\.cloudinary\.com\//);

    const readback = await fetch(result.url);
    expect(readback.ok).toBe(true);
  });
});

if (!hasCloudinaryEnv) {
  it.skip('cloudinary smoke skipped: CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET not set', () => {});
}
