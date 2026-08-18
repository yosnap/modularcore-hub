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

## `unsigned-dev-only` mode

`mode: 'unsigned-dev-only'` skips the signing endpoint entirely by posting straight to
Cloudinary with an upload preset. It is convenient for local prototyping but the preset is
public by design — anyone who reads it from your bundle can upload with it. If you use it:

- Restrict the preset's allowed formats, max file size, and destination folder in the
  Cloudinary console.
- Enable moderation on the preset.
- Never ship it to production — switch to `mode: 'signed'` before deploying.
