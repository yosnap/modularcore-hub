---
phase: 3
title: "ImageEditor modal redesign with metadata panel"
status: done
priority: P1
effort: "3.5-4d"
dependencies: [2]
---

# Phase 3: ImageEditor modal redesign with metadata panel

<!-- Updated: Validation Session 1 - scope expanded: interactive crop handles + real overwrite contract + Svelte zoom test coverage. Effort raised 1.5d -> 2.5-3d. -->
<!-- Updated: Red Team Session 1 - Findings 2+3 (Critical: overwriteKey source undefined, no double-submit guard), 5 (High: Cloudinary can't receive overwriteKey), 7 (High: crop-handle inversion undefined), 8 (High: demo provider URL leak), 10 (Medium: missing ownership-check warning) all applied below. Effort raised 2.5-3d -> 3.5-4d. -->

## Overview

Redesign `ImageEditor` from a stacked control list into a modal ("Editar imagen") with a two-column layout: image + **interactive, draggable** crop handles on the left, a metadata form (UI-only, no persistence) on the right, proportion/rotate/zoom controls under the image, and a Cancelar/Sobreescribir/Guardar como nuevo footer — matching the reference screenshot. Ship in all 4 style variants. This phase also closes a verified test-coverage gap (Svelte's `applyZoom` has zero test coverage today — `test/ui/image-editor-zoom.test.ts` only ever tested the React variants) and extends the core `StorageProvider` contract so "Sobreescribir" is a real same-key upload, not a stub.

## Requirements

- Functional:
  - New props on `ImageEditor` (additive, keep existing `{ picker }` working): `{ picker, open, onClose, sourceKey?, fileName?, onSaveMetadata?, onCancel?, onOverwrite?, onSaveAsNew? }`. **`sourceKey?: string` (Red Team Finding, Critical) is the storage key "Sobreescribir" will target — it is a distinct, non-editable value, sourced ONLY from the `ListedObject.key` the editor was opened with (e.g. Phase 5 passes `sourceKey={selectedItem.key}` when opening the editor from the library, and omits it — leaving `onOverwrite` disabled — when opening from a fresh upload/URL load that has no existing key).** It must never be read from, derived from, or fall back to the editable "Nombre del archivo" field or the `fileName?` prop — those are display/metadata values a user can freely edit, and conflating them with the overwrite target turns a cosmetic rename into a client-controlled "overwrite any object whose key I can guess" primitive (a signing-endpoint that trusts the client-supplied key, the same trust boundary already documented for `scope`/`key` in `core/provider.ts`).
  - Header: title "Editar imagen" + close (X) → `onClose`.
  - Left column: current image preview (existing `previewUrl` logic, unchanged), with **interactive, draggable** crop handles at the 4 corners + 4 edges. <!-- Updated: Validation Session 1 - resolved --> Verified `core/canvas/crop.ts` has no drag/resize helpers today (only `resolveAspectRatio`/`applyAspectRatio`/`cropImage` pure math). Decision: add a new pure helper there (see Architecture) and wire pointer events per Svelte variant.
  - Right column "Metadatos" panel (**UI only, no backend call** — per confirmed scope):
    - "Nombre del archivo" text input, pre-filled from `fileName` prop, with an editable-indicator badge.
    - "Texto alternativo (ALT)" text input.
    - "Título" text input.
    - "Descripción" textarea.
    - "Guardar metadatos" button → calls `onSaveMetadata?.({ fileName, alt, title, description })` if provided; local component state only, no store/persist. Document clearly in the component's header comment that this is UI-only and the callback is where a consumer would wire real persistence later.
  - Below the image: existing aspect-ratio preset row (Libre/1:1/16:9/4:3/3:2 — already implemented) **plus** two new numeric `W`/`H` inputs for a custom ratio (only enabled when no preset is active — i.e., selecting a preset clears custom W/H and vice versa). Verified `AspectRatio = AspectRatioPreset | number` already — feed `width / height` as the numeric `aspect` value, **no core type change needed** for this part.
  - Rotate/flip row: relabel existing `-90°`/`+90°`/flip buttons to match reference iconography/labels (`⟲ -90°`, `⟳ +90°`, flip H, flip V — reuse `picker.rotate`/`picker.flip`, no core changes needed).
  - Zoom slider: extract the existing per-variant `applyZoom` into one shared pure function (new module — see Architecture) reused by all 4 Svelte variants; show the current value styled like the reference (`ZOOM — 1.0×` label above the slider, matches existing text already). <!-- Updated: Validation Session 1 - resolved --> Verified `test/ui/image-editor-zoom.test.ts` only imports from `ui/react/*/ImageEditor.tsx` — Svelte's `applyZoom` has zero test coverage today. This phase closes that gap.
  - Footer: **Cancelar** (`onClose`/`onCancel`, discards in-progress crop), **Sobreescribir** (`onOverwrite?.()` — crops via `picker.crop(...)` then uploads via `picker.upload(provider, { overwriteKey: sourceKey })`; disabled entirely when `sourceKey` is not provided — there is nothing to overwrite; see the new `overwriteKey` contract below — **this is now a real same-key upload, not a stub**), **Guardar como nuevo** (`onSaveAsNew?.()` — current default behavior: crop + upload as a new key, matches today's `applyCrop`/upload flow, `overwriteKey` omitted). **Both Sobreescribir and Guardar como nuevo are disabled while `picker.state.status === 'uploading'` (Red Team Finding, Critical — no double-submit guard existed in the original draft)**: without this, two rapid clicks fire two concurrent real uploads to the same key/a fresh key respectively, racing at the storage layer with no error surfaced to the user. This is a required Success Criterion, not an optional polish item.
- Non-functional: same variant-parity requirement as Phase 2 (headless/tailwind/shadcn/vanilla).

## Architecture

```
ImageEditor (modal)
├── Header (title + close)
├── Body (2 columns)
│   ├── Left: image preview + INTERACTIVE crop handles (existing previewUrl/rect state
│   │         + new pointer-drag wiring calling core's resizeCropRect)
│   └── Right: "Metadatos" panel (local $state only — unchanged, still UI-only)
│       ├── Nombre del archivo (input, pre-filled)
│       ├── Texto alternativo / ALT (input)
│       ├── Título (input)
│       ├── Descripción (textarea)
│       └── Guardar metadatos (button → onSaveMetadata callback)
├── Below image: Proporción row (existing presets + new custom W:H, feeds numeric `aspect`)
├── Below image: Rotar/Voltear row (existing picker.rotate/flip)
├── Below image: Zoom slider (now backed by shared applyZoom module, see below)
└── Footer: Cancelar | Sobreescribir (real overwriteKey upload) | Guardar como nuevo
```

**Metadata panel** stays local component `$state` only — presentational, per confirmed "solo UI" scope, unchanged by validation. **Everything else in this phase now touches `core/`**, per Validation Session 1:

1. **Shared zoom module** (closes the verified Svelte test-coverage gap): new `packages/media-picker/ui/svelte/image-editor-zoom.ts` (or `core/canvas/zoom.ts` if the math belongs closer to `crop.ts` — decide during implementation by checking which module `applyZoom` conceptually pairs with; it operates purely on `CropRect`, so `core/canvas/zoom.ts` is the more consistent home) exporting `applyZoom(rect: CropRect, factor: number): CropRect`, identical math to today's per-variant copies. All 4 Svelte `ImageEditor` variants import it instead of redefining it locally.
2. **Interactive crop handles**: new pure helper in `core/canvas/crop.ts`, e.g.
   ```ts
   export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
   export function resizeCropRect(
     rect: CropRect,
     handle: CropHandle,
     delta: { dx: number; dy: number },
     bounds: { width: number; height: number },
     aspect?: AspectRatio,
   ): CropRect;
   ```
   Pure, clamps to `bounds`, respects a locked `aspect` when one is active (presets or custom W:H) by adjusting the opposite dimension proportionally. **Explicit inversion/degenerate-rect contract (Red Team Finding, High):** `crop.ts`'s existing `assertValidRect` throws when `width <= 0 || height <= 0` — `resizeCropRect` MUST clamp so a handle can never be dragged past its opposite handle (e.g. dragging `e` left never produces `x` >= the rect's own right-minus-1px edge); the contract is "clamp to a minimum 1px width/height in the direction being resized, never invert which handle is which." This is a required unit-test case (Related Code Files), not just a Risk Assessment note. Each Svelte variant wires `pointerdown`/`pointermove`/`pointerup` on 8 handle elements, computing `delta` from pointer movement and calling `resizeCropRect`, then feeding the result into the same `rect` state `applyZoom`/`applyCrop` already use.
3. **`overwriteKey` contract**: `UploadOptions` (`core/provider.ts`) gains `overwriteKey?: string` — when present, the provider uploads to that exact key instead of minting a new one.
   - `s3-compatible.ts` forwards it to `getUploadUrl(file, options)`, which already receives the full `options` object — no signature change needed there.
   - **`cloudinary.ts` is explicitly OUT OF SCOPE for `overwriteKey` in this plan (Red Team Finding, High — corrected from the original draft's incorrect claim of parity):** `CloudinaryConfig.getSignedParams` is typed `(file: Blob) => Promise<CloudinarySignedParams>` — it receives only the file, never `options`, so `overwriteKey` cannot reach it without changing that public callback's signature, which is a breaking change for every existing Cloudinary integration and is out of this plan's scope (see Non-Goals). "Sobreescribir" against a Cloudinary-backed picker instance behaves identically to "Guardar como nuevo" (always mints a new `public_id`) until a follow-up plan scopes the `getSignedParams` signature change. Document this limitation in `docs/cloudinary-signing-endpoint-example.md` and in `ImageEditor`'s footer (e.g. grey out/relabel "Sobreescribir" when the picker's provider is Cloudinary-backed — the plan doesn't currently have a way to detect provider type from the UI; simplest correct option is to let `onOverwrite` fire and clearly document in code comments that whether it actually overwrites depends on the provider, same as the `sort` "not guaranteed" pattern in Phase 1).
   - `apps/web/src/lib/demo-storage-provider.ts`'s `upload()` uses `options?.overwriteKey ?? generateKey(folderId)` instead of always minting fresh. **When `overwriteKey` matches an existing `store` entry (Red Team Finding, High — object URL leak), the previous entry's `url` MUST be revoked via `URL.revokeObjectURL` before `store.set` replaces it** — mirroring `remove()`'s existing revoke, which the original draft's overwrite path did not do, leaking one blob URL per overwrite for the tab's lifetime. **Keep an explicit code comment at this branch warning that a real backend must independently verify the caller is authorized to replace the object at `overwriteKey` before honoring it (Red Team Finding, Medium)** — this reverses the demo provider's previous deliberate "always mint fresh, never silently overwrite" design (see its own existing comment), and that removed safety rationale must not simply vanish from the file.
   - "Sobreescribir" calls `picker.upload(provider, { overwriteKey: sourceKey })` (never the editable filename — see Requirements); "Guardar como nuevo" omits it (today's behavior, unchanged).

## Related Code Files

- Modify: `packages/media-picker/ui/svelte/ImageEditor.svelte` (headless — restructure to modal + metadata panel + draggable handles)
- Modify: `packages/media-picker/ui/svelte/tailwind/ImageEditor.svelte`
- Modify: `packages/media-picker/ui/svelte/shadcn/ImageEditor.svelte`
- Modify: `packages/media-picker/ui/svelte/vanilla/ImageEditor.svelte`
- Modify: `packages/media-picker/ui/vanilla-styles.css`, `packages/media-picker/ui/shadcn-theme.css` (modal/two-column/metadata-panel/handle classes)
- Create: `packages/media-picker/core/canvas/zoom.ts` (extracted shared `applyZoom`, exact filename TBD at implementation — see Architecture note)
- Create: `packages/media-picker/test/canvas/zoom.test.ts` (mirrors `test/ui/image-editor-zoom.test.ts`'s cases, but tests the shared module directly instead of importing from each React variant)
- Modify: `packages/media-picker/core/canvas/crop.ts` (add `resizeCropRect` + `CropHandle`)
- Modify: `packages/media-picker/test/canvas/crop.test.ts` (cover `resizeCropRect`: each handle direction, bounds clamping, aspect-locked resize)
- Modify: `packages/media-picker/core/provider.ts` (add `UploadOptions.overwriteKey?: string`)
- Modify: `packages/media-picker/core/providers/s3-compatible.ts` (forward `overwriteKey` — no signature change, `getUploadUrl` already receives full `options`)
- Modify: `packages/media-picker/docs/cloudinary-signing-endpoint-example.md` (document that `overwriteKey` is NOT supported for Cloudinary in this plan — `getSignedParams(file)` has no `options` parameter; a future signature change is out of scope, see Non-Goals)
- Not modified: `packages/media-picker/core/providers/cloudinary.ts` (Red Team Finding, High — corrected: `overwriteKey` cannot reach `getSignedParams` without a breaking signature change, explicitly out of scope)
- Modify: `apps/web/src/lib/demo-storage-provider.ts` (honor `overwriteKey` in `upload()`; revoke the prior entry's object URL when overwriting; keep an ownership-check warning comment)
- Modify: `packages/media-picker/test/providers/s3-compatible.test.ts` (assert `overwriteKey` forwarded)
- Not modified: `packages/media-picker/test/ui/image-editor-zoom.test.ts` (React-only, out of scope — verified in Validation Session 1; do not touch its assertions or imports)
- Read (confirm before implementing): `packages/media-picker/core/canvas/crop.ts` (full file, for `CropRect`/`AspectRatio` shapes `resizeCropRect` must match)

## Implementation Steps

1. Read `test/ui/image-editor-zoom.test.ts` and `core/canvas/crop.ts` fully before touching anything, to reuse their existing math/test patterns rather than reinventing them.
2. Extract `applyZoom` to the new shared module; write `test/canvas/zoom.test.ts` mirroring the React test's cases; update all 4 Svelte `ImageEditor` variants to import it.
3. Add `resizeCropRect`/`CropHandle` to `core/canvas/crop.ts` with unit tests (each handle, bounds clamping, aspect-locked resize).
4. Add `overwriteKey` to `UploadOptions`; thread through `s3-compatible.ts` and the demo provider (revoke-before-replace + ownership-check comment); document the Cloudinary limitation instead of implementing it; add/extend provider tests.
5. Restructure headless `ImageEditor.svelte` into the modal shell (reuse whatever modal primitive Phase 2 built — do not build a second one).
6. Wire draggable handles: pointer events per handle → `resizeCropRect` → update `rect` state.
7. Add the metadata panel as local state + the two-column CSS grid (headless: structural only, no visual styling).
8. Add custom W:H inputs alongside the existing aspect presets, with the mutual-exclusion behavior described in Requirements.
9. Relabel rotate/flip buttons; confirm `picker.rotate`/`picker.flip` calls are unchanged.
10. Add the Cancelar/Sobreescribir/Guardar como nuevo footer, wiring `Sobreescribir` to `picker.upload(provider, { overwriteKey: sourceKey })` (disabled with no `sourceKey`) and `Guardar como nuevo` to the existing upload-as-new-key flow; disable both while `picker.state.status === 'uploading'`.
11. Port to tailwind, shadcn, vanilla variants matching reference screenshot visuals.
12. Re-run the full package test suite.

## Success Criteria

- [x] `ImageEditor` renders as a modal with the header/close/two-column/footer layout in all 4 style variants.
- [x] Crop handles are draggable on all 8 points, clamp to image bounds, respect a locked aspect ratio (preset or custom W:H) when one is active, and never invert/collapse below 1px when dragged past their opposite handle (dedicated test case).
- [x] Shared `applyZoom` module has unit test coverage equivalent to the React variants' existing test (closes the verified gap); no behavior change to the zoom math itself.
- [x] Metadata panel fields are fully local UI state; `onSaveMetadata` callback fires with `{ fileName, alt, title, description }` and the component doc comment states no persistence happens by default.
- [x] Custom W:H ratio input and preset buttons are mutually exclusive and both feed the same numeric `aspect` value `applyCrop`/`resizeCropRect` already accept.
- [x] `sourceKey` is sourced only from `ListedObject.key` at editor-open time, never from the editable "Nombre del archivo" input; "Sobreescribir" is disabled when `sourceKey` is absent.
- [x] Sobreescribir and Guardar como nuevo are both disabled while an upload is in flight (`state.status === 'uploading'`) — verified by rapid double-click not producing two network calls.
- [x] "Sobreescribir" performs a real same-key upload via `overwriteKey` against the demo provider and `s3-compatible`; the demo provider revokes the previous entry's object URL on overwrite (no leak). Cloudinary is documented as unsupported for `overwriteKey` in this plan, not silently broken.
- [x] `s3-compatible.ts` forwards `overwriteKey` to its signing endpoint payload (provider test updated); `cloudinary.ts` is unmodified and its doc explicitly states the limitation.
- [x] `pnpm --filter @modularcore/media-picker test` passes.

## Risk Assessment

- **Risk (Red Team Finding, High, resolved by explicit contract above):** Interactive crop handles are the largest scope addition in this plan — pointer-drag math has edge cases, specifically handle direction inversion when dragging past the opposite handle, which without a defined contract would either crash `applyCrop`/upload downstream (`assertValidRect` throws on non-positive dimensions) or silently produce a stuck degenerate crop. **Mitigation:** `resizeCropRect`'s explicit "clamp to 1px minimum, never invert handle identity" contract (Architecture) + exhaustive unit tests (Related Code Files) before any pointer-event wiring; UI wiring only translates `pointermove` deltas, no resize math in the component itself.
- **Risk (Red Team Finding, Critical, resolved by explicit contract above):** The original draft never specified where the overwrite target key comes from, and the only key-shaped field in the design (the editable "Nombre del archivo") was the most likely accidental source an implementer would wire it to — turning a cosmetic rename field into a client-controlled arbitrary-object-overwrite primitive if a real backend trusts the client-supplied key. **Mitigation:** the explicit, non-editable `sourceKey` prop (Requirements) sourced only from `ListedObject.key`, never from user-editable text.
- **Risk (Red Team Finding, Critical, resolved by explicit contract above):** No double-submit guard on Sobreescribir/Guardar como nuevo meant two rapid clicks could fire two concurrent real uploads to the same/a fresh key, racing at the storage layer with the loser's result silently discarded. **Mitigation:** both buttons disabled while `state.status === 'uploading'` (Requirements, Success Criteria).
- **Risk (Red Team Finding, High, descoped rather than fixed):** `Cloudinary`'s `getSignedParams(file)` callback cannot receive `overwriteKey` without a breaking signature change affecting every existing Cloudinary integration — out of proportion for this UX-focused plan. **Mitigation:** explicitly documented as unsupported (Architecture, Related Code Files, Success Criteria) rather than silently failing to forward the field, which the original draft's "parity" claim would have produced.
- **Risk (Red Team Finding, High, resolved by explicit contract above):** The demo provider's overwrite path would leak the previous entry's `URL.createObjectURL` blob on every "Sobreescribir" (no `revokeObjectURL`, unlike `remove()`), and its own prior code comment explaining why fresh-key-always was chosen deliberately would simply vanish with no replacement warning. **Mitigation:** revoke-before-replace + retained ownership-check comment (Architecture).
- **Risk:** `overwriteKey` changes a `core/provider.ts` interface shared with the React adapter and the s3-compatible provider — a signing-endpoint consumer that ignores the new field silently keeps today's "always new key" behavior (optional field, backward compatible), but this must be verified, not assumed. **Mitigation:** provider tests explicitly assert the field is forwarded when present and that omitting it reproduces current behavior exactly.
- **Risk:** Extracting `applyZoom` changes an import path 4 Svelte files depend on — a typo here breaks the zoom slider silently (no compile error if the local fallback function isn't fully removed). **Mitigation:** delete the local `applyZoom` definition in each variant as part of the same edit that adds the import (not a separate cleanup step), so a missing import is a compile error, not a silent duplicate.
- **Risk:** Reworking `ImageEditor`'s layout could regress the delicate zoom/crop math shared verbatim across all 4 variants (explicitly called out in the current tailwind file's comment). **Mitigation:** Step 1's mandatory read-before-touch + running the full test suite before AND after each variant's edit.
- **Risk:** Metadata panel scope creep into "looks like it persists" could mislead a future maintainer. **Mitigation:** explicit doc comment + no store wiring, per Architecture section.
- **Risk:** This phase and Phase 1 both modify `core/provider.ts` (Phase 1: `ListOptions`; Phase 3: `UploadOptions`) — different interfaces in the same file, low but nonzero merge-conflict risk if phases are implemented out of order. **Mitigation:** respect declared phase dependencies (this phase depends on 2, which depends on 1 — implement in order).
