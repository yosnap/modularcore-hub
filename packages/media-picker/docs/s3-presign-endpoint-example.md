# S3-compatible presigned upload endpoint (reference)

`core/providers/s3-compatible.ts` never receives `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` —
it only calls the `getUploadUrl(file, options)` hook you provide, which should call an
endpoint like the one below. This file is documentation only; it is not part of the
copy-code component and is not installed by the CLI.

```ts
// server/routes/media-presign.ts (Node/Express-style; adapt to your framework)
import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function presignMediaUpload(req, res) {
  // AUTHENTICATE/AUTHORIZE req before signing — this endpoint hands out write access.
  const key = `uploads/${req.user.id}/${randomUUID()}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: req.body.contentType,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 60 });
  res.json({ url, method: 'PUT', key });
}
```

Client-side wiring:

```ts
import { createS3CompatibleProvider } from '@modularcore/media-picker/providers/s3-compatible';

const provider = createS3CompatibleProvider({
  publicUrlBase: 'https://cdn.example.com',
  async getUploadUrl(file, options) {
    const res = await fetch('/api/media-presign', {
      method: 'POST',
      body: JSON.stringify({ contentType: options?.contentType ?? file.type }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to get a presigned upload URL');
    return res.json();
  },
});
```
