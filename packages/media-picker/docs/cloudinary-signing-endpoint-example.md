# Cloudinary signed-upload endpoint (reference)

`core/providers/cloudinary.ts` defaults to `mode: 'signed'`: `CLOUDINARY_API_SECRET` never
reaches the browser, it only exists in the endpoint below. This file is documentation only;
it is not part of the copy-code component and is not installed by the CLI.

```ts
// server/routes/media-cloudinary-sign.ts (Node/Express-style; adapt to your framework)
import { createHash } from 'node:crypto';

export function signCloudinaryUpload(req, res) {
  // AUTHENTICATE/AUTHORIZE req before signing — this endpoint hands out write access.
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `uploads/${req.user.id}`;
  const toSign = `folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = createHash('sha1').update(toSign).digest('hex');
  res.json({ apiKey: process.env.CLOUDINARY_API_KEY, timestamp, signature, folder });
}
```

Client-side wiring:

```ts
import { createCloudinaryProvider } from '@modularcore/media-picker/providers/cloudinary';

const provider = createCloudinaryProvider({
  mode: 'signed',
  cloudName: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  async getSignedParams(file) {
    const res = await fetch('/api/media-cloudinary-sign');
    if (!res.ok) throw new Error('Failed to get Cloudinary signed params');
    return res.json();
  },
});
```

## `overwriteKey` ("Sobreescribir") is NOT supported for Cloudinary

`UploadOptions.overwriteKey` (`core/provider.ts`) lets "Sobreescribir" in the ImageEditor UI
upload to an exact existing key instead of minting a new one. `core/providers/s3-compatible.ts`
honors it because `getUploadUrl(file, options)` already receives the full `options` object.
`core/providers/cloudinary.ts` does **not** forward it: `CloudinaryConfig.getSignedParams` is
typed `(file: Blob) => Promise<CloudinarySignedParams>` — it only ever receives the file, never
`options`, so there is no seam to pass `overwriteKey` through without changing that public
callback's signature. That would break every existing Cloudinary integration built against
this package, so it is out of scope here (see the plan's Non-Goals).

**Practical effect:** clicking "Sobreescribir" against a Cloudinary-backed `StorageProvider`
behaves identically to "Guardar como nuevo" — Cloudinary always mints a fresh `public_id`. If
you need real same-key overwrite with Cloudinary, you can approximate it today by setting
`publicId` explicitly in your `getSignedParams` response (Cloudinary treats re-uploading to an
existing `public_id` as a replace) computed from context your signing endpoint already has
(e.g. the file being edited) — but that decision lives entirely in your own `getSignedParams`
implementation, this package cannot drive it from the client-supplied `overwriteKey`.

## Listing: `query`/`sort`

`ListOptions.query` (free-text search) and `ListOptions.sort` (`'newest' | 'oldest' | 'name' | 'size'`)
are forwarded verbatim to whatever `list` hook you configure — same trust boundary as `scope`
today. Two things to get right in your own listing endpoint:

- **Never string-interpolate `query` into a Cloudinary Admin API search expression.** The
  [Admin API's search endpoint](https://cloudinary.com/documentation/search_api) accepts a
  Lucene-like `expression` string; concatenating raw user input into it risks a filter-injection
  vector — a user's search text could widen the listing beyond the caller's intended
  `scope`/`folder`. Use the Admin API's structured query builder (`.expression()` with escaped/
  quoted terms) instead of building the expression string by hand.
- **`sort` is a request, not a guarantee.** The Admin API does support `sort_by`, but not every
  value maps cleanly (e.g. `'name'` has no single canonical Cloudinary field) — an endpoint that
  ignores an unsupported `sort` value is a valid, if degraded, implementation.

```ts
// server/routes/media-list.ts
import { v2 as cloudinary } from 'cloudinary';

export async function listMedia(req, res) {
  // AUTHENTICATE/AUTHORIZE req before listing.
  const { folder, query, sort, cursor } = req.query;
  let search = cloudinary.search.expression(
    // Structured builder, not string concatenation — `query` is passed as a quoted term.
    [folder ? `folder=${JSON.stringify(folder)}` : null, query ? `filename:${JSON.stringify(query)}*` : null]
      .filter(Boolean)
      .join(' AND '),
  );
  if (sort === 'name') search = search.sort_by('public_id', 'asc');
  else if (sort === 'size') search = search.sort_by('bytes', 'desc');
  else search = search.sort_by('created_at', sort === 'oldest' ? 'asc' : 'desc');
  if (cursor) search = search.next_cursor(cursor);
  const result = await search.execute();
  res.json(result);
}
```

## `unsigned-dev-only` mode

`mode: 'unsigned-dev-only'` skips the signing endpoint entirely by posting straight to
Cloudinary with an upload preset. It is convenient for local prototyping but the preset is
public by design — anyone who reads it from your bundle can upload with it. If you use it:

- Restrict the preset's allowed formats, max file size, and destination folder in the
  Cloudinary console.
- Enable moderation on the preset.
- Never ship it to production — switch to `mode: 'signed'` before deploying.
