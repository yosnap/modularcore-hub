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

## Listing: `query`/`sort`

`ListOptions.query` (free-text search) and `ListOptions.sort` (`'newest' | 'oldest' | 'name' | 'size'`)
are forwarded verbatim to whatever `list` hook you configure — same trust boundary as `scope`
today. Two things to get right in your own listing endpoint:

- **Never string-interpolate `query` into a bucket-listing filter/prefix expression.**
  `query` is free text typed by the end user; concatenating it unparameterized into e.g. an S3
  `Prefix`/`Delimiter` query or a database `LIKE` clause risks a filter-injection vector — a
  user's search text could widen the listing beyond the caller's intended `scope`/`folder`.
  Parameterize it (bound query param / prepared statement / an allow-listed match against
  indexed object keys), the same way you would any other untrusted user input.
- **`sort` is a request, not a guarantee.** Real bucket listings are not always sortable
  server-side without an index (S3 itself returns keys in lexicographic order only) — an
  endpoint that ignores `sort` entirely is a valid, if degraded, implementation. Document
  which `sort` values your endpoint actually honors.

```ts
export async function listMedia(req, res) {
  // AUTHENTICATE/AUTHORIZE req before listing.
  const { folder, query, sort, cursor, limit } = req.query;
  // Parameterized — `query` never gets concatenated into a raw filter string.
  const results = await db.mediaObjects.find({
    where: { userId: req.user.id, folder, ...(query ? { key: { contains: String(query) } } : {}) },
    orderBy: sort === 'name' ? 'key' : sort === 'size' ? 'size' : 'lastModified',
    cursor,
    take: limit ?? 24,
  });
  res.json(results);
}
```
