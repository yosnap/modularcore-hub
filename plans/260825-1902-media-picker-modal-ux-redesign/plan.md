---
title: "Media Picker Modal UX Redesign"
description: "Rediseñar la UX del Media Picker (Svelte) como un modal con pestañas Biblioteca/Subir archivo/Desde URL, y el editor de imagen como modal de 2 columnas con panel de metadatos, igualando las capturas de referencia del usuario."
status: done
priority: P1
effort: "10-11d"
tags: [media-picker, svelte, ux, modal]
created: 2026-08-25
---

# Media Picker Modal UX Redesign

## Overview

`@modularcore/media-picker` currently exposes its Svelte UI as loose, always-visible sections stacked on a demo page (`apps/web/src/routes/playground/media-picker/+page.svelte`): a file input, a `RemoteUrlLoader`, an `ImageEditor` with flat controls, and a bare `MediaLibraryGrid`. The user wants this to instead look and behave like the reference screenshots: a **"Biblioteca de medios" modal** with 3 tabs (Biblioteca / Subir archivo / Desde URL), a library grid with search + sync + folder tabs + filename/size captions + real numbered pagination, and a separate **"Editar imagen" modal** with a two-column layout (image+crop on the left, a metadata form on the right) and a Cancelar/Sobreescribir/Guardar como nuevo footer.

This plan covers **Svelte only**, all 4 existing style variants (headless, tailwind, shadcn, vanilla) — the React adapter/UI is explicitly out of scope but must keep compiling. Metadata (alt/título/descripción) is **UI-only** in this plan (no backend persistence). Library pagination and the "Sincronizar" button must be **functionally real**, which requires extending the core `StorageProvider`/`ListOptions` contract beyond today's cursor-only pagination (see Phase 1 for why this needs a page-index-to-cursor cache rather than naive page-number requests — S3/Cloudinary can't jump to "page 4" without walking pages 1-3).

The project's existing "Estilo del componente" `<select>` in the playground (`styleVariant` state) already lets a viewer live-swap between the 4 style variants while `picker` state survives the swap — every new/changed component in this plan must keep working through that switcher (see Phase 4).

## Non-Goals

- React adapter UI (`ui/react/*`) — kept compiling, not redesigned. `test/ui/image-editor-zoom.test.ts` only ever tested the React variants (verified: it imports `applyZoom` from `ui/react/*/ImageEditor.tsx`) — this plan adds equivalent Svelte coverage (Phase 3) without touching the React test.
- Real metadata persistence (alt/título/descripción save to a backend) — UI-only, per Validation Log.
- Drag-to-crop math beyond corner/edge handle resize — no free-form crop shapes, no rotation-while-dragging.
- Any UI-kit primitive dependency in headless/tailwind/vanilla — `bits-ui` (used in shadcn only) is already an established peer dependency of `packages/media-picker`, not a new one; see Red Team Review, Finding 9.
- **`overwriteKey` support for the Cloudinary provider** (Red Team Review, Finding 5) — `Cloudinary`'s `getSignedParams(file)` callback cannot receive it without a breaking signature change; "Sobreescribir" against a Cloudinary-backed picker behaves like "Guardar como nuevo" until a follow-up plan scopes that change.
- Batched/queued multi-file upload as a `core/` primitive — the Subir archivo tab's multi-file queue (Phase 2) lives entirely in the UI layer, calling `provider.upload()` directly; `MediaPicker`'s core state machine stays single-blob, unchanged.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Real numbered pagination + search + sort in the library, backed by a page-index-to-cursor cache over the existing cursor-based provider contract | P1 |
| 2 | `MediaLibraryModal` (Biblioteca/Subir archivo/Desde URL tabs) in all 4 Svelte style variants | P1 |
| 3 | `ImageEditor` redesigned as a 2-column modal with interactive crop handles, a UI-only metadata panel, and real same-key overwrite support, in all 4 Svelte style variants | P1 |
| 4 | Cross-variant parity verified live through the existing style switcher | P2 |
| 5 | Playground rewired end-to-end (library → edit → save) with the full test suite green | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Library pagination and search contract](./phase-01-start.md) | Done |
| 2 | [Phase 2: MediaLibraryModal component (4 style variants)](./phase-02-library-pagination-and-search-contract.md) | Done |
| 3 | [Phase 3: ImageEditor modal redesign with metadata panel](./phase-03-medialibrarymodal-component-4-style-variants.md) | Done |
| 4 | [Phase 4: Style-switcher parity pass (shadcn + vanilla polish)](./phase-04-imageeditor-modal-redesign-with-metadata-panel.md) | Done |
| 5 | [Phase 5: Playground wiring and end-to-end tests](./phase-05-playground-wiring-tests-and-cross-variant-parity.md) | Done |

Dependency order: 1 → 2 → 3 → (4, 5 both depend on 1-3; do 5 before/alongside 4 since 4 needs the rewired playground as its test harness).

## Success Criteria

- [x] `MediaLibraryModal` (Biblioteca/Subir archivo/Desde URL) and the redesigned `ImageEditor` exist in headless/tailwind/shadcn/vanilla Svelte variants with identical props/behavior.
- [x] Library search, sort, per-page, and numbered pagination are functionally real against the demo provider (verified live: sync, pagination, sort/per-page selects) and pass through to `s3-compatible`/`cloudinary` provider request payloads (unit-tested).
- [x] "Sincronizar" re-fetches the current page with a visible loading state — verified live after fixing the `libraryGeneration`/`foldersGeneration` race found in Phase 4.
- [x] Metadata panel is clearly UI-only (documented, no persistence), matching the confirmed scope.
- [x] Playground flow matches the reference screenshots end-to-end; style switcher still works for every component — verified live across all 4 variants.
- [x] `pnpm --filter @modularcore/media-picker test` passes (164/164); React adapter still typechecks (`svelte-check`: 970 files, 0 errors).

## Open Questions

None — all decision points resolved in `## Validation Log` below.

## Validation Log

### Session 1 — 2026-08-25

**Verification pass (code-checked before interview):**
- `bits-ui` IS a dependency of `apps/web/package.json`, NOT of `packages/media-picker/package.json`. No existing Dialog/modal primitive found in `apps/web/src` (grep for `Dialog`/`role="dialog"` returned nothing).
- No `formatBytes`/`formatSize`/`humanFileSize` helper exists anywhere in `packages/media-picker` — confirmed net-new in Phase 2.
- `core/canvas/crop.ts` exports only pure math (`resolveAspectRatio`, `applyAspectRatio`, `cropImage`) — no drag/resize/interactive helpers exist today.
- `AspectRatio = AspectRatioPreset | number` (already supports arbitrary numeric ratios) — confirms Phase 3's custom W:H input needs zero core changes, just compute `width / height` and pass it as `aspect`.
- `test/ui/image-editor-zoom.test.ts` imports `applyZoom` from `ui/react/{headless,tailwind,shadcn,vanilla}/ImageEditor.tsx` ONLY — it does not, and never did, cover the Svelte variants. Svelte's `applyZoom` is an unexported function local to each `.svelte` file's `<script>` block.

**Decisions:**
1. **Svelte zoom test coverage** — Extract `applyZoom` to a shared pure `.ts` module (new file, exact path decided in Phase 3) reused by all 4 Svelte `ImageEditor` variants, with a Vitest suite mirroring `test/ui/image-editor-zoom.test.ts`'s structure. Closes the Svelte/React coverage gap this plan's verification pass found.
2. **shadcn modal primitive** — The shadcn Svelte variant of `MediaLibraryModal`/`ImageEditor` uses `bits-ui` (add as a dependency of `packages/media-picker`). Headless/tailwind/vanilla variants stay dependency-free (bespoke minimal modal: focus trap + Escape + backdrop click), same as originally planned.
3. **Crop handles** — Interactive (draggable), not decorative, in this plan. New pure resize-math helpers land in `core/canvas/crop.ts` (e.g. `resizeCropRect(rect, handle, delta, bounds)`), unit-tested the same way `resolveAspectRatio`/`applyAspectRatio` already are; each Svelte `ImageEditor` variant only wires pointer events and calls the shared helper. This expands Phase 3's scope and effort (was 1.5d, now ~2.5-3d) and moves crop-handle logic from "UI variant" ownership to "core, shared across all 4 variants" — consistent with how `applyZoom`/aspect logic is already meant to be identical across variants.
4. **"Sobreescribir" contract** — Extend `UploadOptions` (`core/provider.ts`) with an optional `overwriteKey?: string`; `s3-compatible.ts`, `cloudinary.ts`, and the demo provider all honor it (upload to that exact key instead of minting a new one) when present. This is a **core contract change**, so Phase 3 (which owns the "Sobreescribir" button) now also touches `core/provider.ts` + the 3 providers — Phase 3's Architecture note claiming "core/ untouched in this phase" is corrected in the phase file.

### Whole-Plan Consistency Sweep

Re-read `plan.md` and all 5 phase files after propagation. Corrections applied:
- Removed the stale claim that crop handles are "decorative in this phase" / "real drag-to-resize... deferred" from Phase 3 (now interactive, core-backed).
- Removed the stale "Sobreescribir... callback stub, no contract change" framing from Phase 3 (now a real `overwriteKey` contract change).
- Removed Phase 3's stale "Metadata state is intentionally not added to core/media-picker.ts... this keeps core/ untouched in this phase" claim — core/ IS touched in Phase 3 now, for crop-resize helpers and the overwrite contract (metadata itself remains UI-only/local state, that part is unchanged and correctly still true).
- Corrected Phase 3's reference to `test/ui/image-editor-zoom.test.ts` from "keep passing, must not change" (implying it covers Svelte) to "this file covers React only; Phase 3 adds an equivalent new Svelte test, does not modify the React one."
- Bumped Phase 3 effort 1.5d → 2.5-3d and overall plan effort 5d → 7d.
- Added `bits-ui` as a new `packages/media-picker` dependency (shadcn variant only) to Phase 2's Related Code Files / `package.json`.
- No remaining contradictions found between `plan.md` and the 5 phase files.

**Verification Results**
- Claims checked: 9 (Dialog primitive absence, `formatBytes` absence, `crop.ts` exports, `AspectRatio` type, zoom test scope × 4 variants, `bits-ui` dependency location)
- Verified: 9 | Failed: 0 | Unverified: 0
- Tier: Full (5 phases)

## Red Team Review

### Session — 2026-08-25

3 hostile reviewers (Security Adversary, Failure Mode Analyst, Assumption Destroyer — 5-phase plan → Full tier, per `references/red-team-workflow.md`'s 3-5-phase → 3-reviewer scaling) reviewed `plan.md` + all 5 phase files independently. 17 raw findings collected, deduplicated to 14 unique (2 pairs of independent reviewers converged on the same bug from different angles — the pagination-append bug and the object-URL leak — which corroborates rather than double-counts them). All 14 passed the evidence filter (file:line citations required) and were accepted.

**Findings:** 14 (14 accepted, 0 rejected)
**Severity breakdown:** 4 Critical, 5 High, 5 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Numbered pagination via `listLibrary`/`mergeLibraryPage` would concatenate pages instead of replacing (append-on-cursor semantics) | Critical | Accept | Phase 1 |
| 2 | `overwriteKey`'s source was never defined; the only key-shaped field in scope was the editable "Nombre del archivo" — arbitrary-overwrite risk if wired there | Critical | Accept | Phase 3 |
| 3 | No double-submit guard on Sobreescribir/Guardar como nuevo — rapid double-click fires concurrent uploads to the same/a fresh key | Critical | Accept | Phase 3 |
| 4 | Multi-file upload (dropzone, up to 20 files) looped through `picker.loadLocalFile`/`picker.upload`, racing `MediaPicker`'s single-blob state machine | Critical | Accept | Phase 2 |
| 5 | `Cloudinary`'s `getSignedParams(file)` has no `options` parameter — `overwriteKey` cannot reach it without a breaking signature change, contradicting the plan's claimed provider parity | High | Accept | Phase 3 |
| 6 | `recordPageCursor`/`PageCache` mutations weren't gated by the existing `libraryGeneration` guard — a stale response could poison a freshly-reset cache | High | Accept | Phase 1 |
| 7 | `resizeCropRect` had no contract for the handle-inversion/degenerate-rect case (dragging a handle past its opposite) — `assertValidRect` throws on non-positive dimensions downstream | High | Accept | Phase 3 |
| 8 | `overwriteKey` demo-provider path leaked the previous entry's `URL.createObjectURL` (no revoke, unlike `remove()`) | High | Accept | Phase 3 |
| 9 | Validation Session 1's fact-check that `bits-ui` was NOT a `packages/media-picker` dependency was wrong (a `grep -m1` truncation bug) — it's already a peer dependency and already used in 2 shadcn components | High | Accept | Phase 2 |
| 10 | Reversing the demo provider's "always mint fresh key" design for `overwriteKey` dropped its original anti-overwrite safety comment with no replacement warning | Medium | Accept | Phase 3 |
| 11 | `query`/`sort` forwarded to consumer-authored signing endpoints with no sanitization guidance — a naive implementation risks filter/search-expression injection, distinct from the "sorting may not be honored" risk | Medium | Accept | Phase 1 |
| 12 | Debounced search `setTimeout` wasn't scoped to modal lifetime — could fire a background refetch on the long-lived `picker` after the modal closed | Medium | Accept | Phase 2 |
| 13 | Phase 1's Architecture claimed `listLibrary`'s signature stayed "unchanged" while secretly widening it with a `page` field — TypeScript excess-property checks make that combination impossible | Medium | Accept | Phase 1 |
| 14 | Demo-provider synthetic (index-based) pagination doesn't model real S3/Cloudinary cursor opacity — walking to an unvisited page costs N-1 real round-trips against a real backend, unbounded-jump risk not scoped | Medium | Accept | Phase 1 |

**Adjudication rationale (representative sample — full detail in each phase file's inline `<!-- Updated: Red Team Session 1 -->` markers and Risk Assessment sections):**
- Findings 1, 2, 3, 4 (all Critical) were accepted without qualification — each is a concrete, evidenced correctness/security gap that would have shipped broken or exploitable, not a stylistic preference.
- Finding 9 was accepted as a **correction of this plan's own prior verification error**, not a new design decision — the underlying choice (bits-ui in shadcn only) was already directionally right, the stated *reason* was wrong.
- Finding 5 (Cloudinary) was accepted and resolved by **descoping** rather than implementing — a breaking `getSignedParams` signature change is disproportionate to a UX plan; documented as an explicit Non-Goal instead.
- Finding 14 was accepted as a **documentation + UI-cap** fix (bound jump-ahead pagination to `knownPages + 1` for real providers), not a request to build real load-testing infrastructure — proportionate to what a plan-stage finding can require.

### Whole-Plan Consistency Sweep

Re-read `plan.md` and all 5 phase files after applying the 14 accepted findings.
- Decision deltas checked: 14 (one per finding).
- Corrected Phase 1's core action design: `listLibrary`/`mergeLibraryPage` are now explicitly untouched (append/"load more" semantics preserved); a new `listPage` action (always replaces) serves numbered pagination — propagated to Architecture, Related Code Files, Implementation Steps, Success Criteria, Risk Assessment.
- Corrected Phase 2's Subir archivo tab design: local per-file upload queue bypassing `picker.state`, replacing the original `loadLocalFile`-loop design — propagated to Requirements, Architecture diagram, Implementation Steps, Success Criteria, Risk Assessment.
- Corrected Phase 2's `bits-ui` fact-check (was wrong) and reconciled it against the `FolderSelect.svelte` precedent of avoiding a `bits-ui` primitive for parity reasons — propagated to Non-functional Requirements, Related Code Files, Implementation Steps, Risk Assessment, and `plan.md` Non-Goals.
- Corrected Phase 3: added `sourceKey` prop (distinct from the editable filename), disabled-during-upload footer buttons, explicit crop-handle inversion contract, Cloudinary `overwriteKey` descope, demo-provider URL-revoke + ownership-check comment — propagated to Requirements, Architecture, Related Code Files, Implementation Steps, Success Criteria, Risk Assessment.
- Propagated the `sourceKey` hand-off requirement to Phase 5 (only pass it when opening the editor from an existing library item, never from a fresh upload/URL load).
- Effort re-estimated per phase (Phase 1: 4h→6-8h, Phase 2: 1.5d→2-2.5d, Phase 3: 2.5-3d→3.5-4d) and overall plan (7d→10-11d).
- No remaining contradictions found between `plan.md` and the 5 phase files.

## PR Code Review (2026-08-26, PR #18)

`/code-review` sobre el PR encontró 8 hallazgos. 2 descartados (React `ImageEditor` sin `applyZoom` compartido / sin crop interactivo) — no aplican, el plan deja explícitamente la UI de React fuera de alcance (Non-Goals: "kept compiling, not redesigned").

**Corregidos antes de mergear (2 críticos, confirmados):**
1. `isBusy` (footer de `ImageEditor`) solo cubría `status === 'uploading'`, no `cropping`/`compressing`; los botones Rotar/Voltear no tenían ningún guard. Click en Rotar seguido de un click rápido en Guardar podía dejar que `crop()` arrancara con el blob aún sin rotar (mismo contador de generación compartido en `core/media-picker.ts`'s `run()`) y ganara la carrera, descartando la rotación sin ningún error visible. Fix: `isBusy` ahora cubre `status !== 'idle'` y los 4 botones de rotar/voltear quedan deshabilitados mientras tanto, en las 4 variantes.
2. `demo-storage-provider.ts`: al "Sobreescribir", `folderId` se derivaba solo de `options.key` (nunca pasado en ese flujo), reseteando la carpeta de la imagen a `undefined` y haciéndola desaparecer de esa vista filtrada. Fix: cae al `folderId` de la entrada previa cuando hay `overwriteKey`.

**Pendiente como seguimiento (severidad media/baja, no bloquea el merge):**
3. `listPage`'s `filterKey` no incluye `limit`/per-page — cambiar el tamaño de página no invalida la cache de cursores; contra un backend real (S3/Cloudinary) podría reproducir una página desalineada. El provider demo (index-based) no lo sufre.
4. `core/canvas/crop.ts`: la corrección de tamaño mínimo tras un resize con aspect-ratio bloqueado corre después del último `clampToBounds()`, sin re-clamp — caso extremo teórico, no confirmado alcanzable desde una interacción normal de UI.
5. `MediaLibraryModal.svelte` duplica ~300 líneas de orquestación (fetchPage, debounce de búsqueda, cola de subida, focus trap) casi verbatim entre las 4 variantes — riesgo de mantenimiento (ya causó el gap del punto 3, documentado solo en una copia).
6. El drag de los handles de recorte recalcula `resizeCropRect` y reescribe el estilo del overlay en cada `pointermove` crudo, sin throttling/rAF — podría notarse jank en dispositivos de gama baja con alta tasa de reporte del puntero.

**Verificación tras los fixes:** `pnpm --filter @modularcore/media-picker test` → 164/164; `pnpm --filter web exec svelte-check` → 970 archivos, 0 errores.

<!-- slug: media-picker-modal-ux-redesign -->
