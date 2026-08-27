# @modularcore/media-picker

Headless media picker — local file / remote URL / library sources, canvas crop + compress, and
S3-compatible, Cloudinary + Azure Blob storage providers — with React, Svelte, Vue 3 and Angular
standalone adapters.

**Credentials never live in this component.** `StorageProvider` (see `core/provider.ts`) is the
only seam to a storage backend, and its interface has no place to pass a long-lived secret
(access key, API secret). Any real provider (`core/providers/s3-compatible.ts`,
`core/providers/cloudinary.ts`) obtains short-lived, scoped credentials (a presigned URL, a
signed upload payload) from a backend endpoint that *you* control and implement — see
[`docs/s3-presign-endpoint-example.md`](./docs/s3-presign-endpoint-example.md) and
[`docs/cloudinary-signing-endpoint-example.md`](./docs/cloudinary-signing-endpoint-example.md).

## What's in this package

- `core/media-picker.ts` — `MediaPicker`, the headless orchestrator (load → crop → compress →
  upload), with generation-guarded state so stale async results never clobber newer ones.
- `core/provider.ts` — the `StorageProvider` interface every backend implements against.
- `core/sources.ts` — load a `Blob` from a local `File`, a remote URL (SSRF-guarded), or a
  provider-backed library key.
- `core/canvas/crop.ts`, `core/canvas/compress.ts` — canvas-based image transforms.
- `core/net/ssrf-guard.ts` — blocks private/loopback/link-local targets before any remote fetch.
- `core/providers/s3-compatible.ts`, `core/providers/cloudinary.ts` — real provider
  implementations that call into your signing backend.
- `adapters/react`, `adapters/svelte` — thin bindings over `MediaPicker` (Svelte adapter uses
  Svelte 5 runes).
- `adapters/vue`, `adapters/angular` — per-component bindings over the same core. Vue uses refs;
  Angular uses signals plus `DestroyRef`.
- `core/providers/azure-blob.ts` — browser upload through a short-lived, blob-scoped SAS target
  issued by your own backend.

## Azure Blob and Laravel

Use `createAzureBlobProvider` only with a SAS target endpoint you own. The endpoint authenticates,
authorizes, validates the file and generates the key before returning a short-lived URL. See
[`docs/azure-blob-sas-endpoint-example.md`](./docs/azure-blob-sas-endpoint-example.md) and the
Laravel snippets under `snippets/laravel/`; neither sends account credentials to the browser.

## Basic usage (Svelte 5)

```ts
import { createMediaPicker } from '@modularcore/media-picker/svelte';
import { createS3CompatibleProvider } from '@modularcore/media-picker/providers/s3-compatible';

const picker = createMediaPicker();
const provider = createS3CompatibleProvider({ getUploadUrl: /* your signing endpoint call */ });

picker.loadLocalFile(file);
await picker.crop({ x: 0, y: 0, width: 512, height: 512 });
await picker.upload(provider);
```

For a demo/playground with no real backend, implement a minimal in-memory `StorageProvider` (see
`apps/web/src/lib/demo-storage-provider.ts` in this monorepo) that keeps blobs in a `Map` and
serves them via `URL.createObjectURL` — never wire a real provider to unauthenticated demo pages.

## UI style variants

Each of the 6 UI components (`MediaLibraryGrid`, `FolderSelect`, `MimeTypeFilter`, `ImageEditor`,
`BulkActionsBar`, `RemoteUrlLoader`) ships in 4 presentations, all with identical props/behavior —
only markup/CSS differs:

- `ui/react/*.tsx`, `ui/svelte/*.svelte` — headless, unstyled reference UI (the original default).
- `ui/{react,svelte}/tailwind/` — Tailwind CSS utility classes only.
- `ui/{react,svelte}/shadcn/` — Shadcn/ui theme, using real `@radix-ui/react-toggle` +
  `@radix-ui/react-slider` (React) or `bits-ui` (Svelte) as optional peer dependencies. Requires
  Tailwind CSS v4 — copy `ui/shadcn-theme.css` into your own Tailwind entry CSS (see its header
  comment for a bundler gotcha some setups hit when `@import`ing it instead).
- `ui/{react,svelte}/vanilla/` — plain CSS (`ui/vanilla-styles.css`, `mc-*` class prefix), no
  framework dependency, works with or without a bundler.
