---
phase: 5
title: "Playground wiring and end-to-end tests"
status: done
priority: P1
effort: "4h"
dependencies: [1, 2, 3]
---

# Phase 5: Playground wiring and end-to-end tests

## Overview

Rewire `apps/web/src/routes/playground/media-picker/+page.svelte` from today's flat stacked-sections layout to the target flow: a trigger button opens `MediaLibraryModal`; picking/uploading/URL-loading a file in the modal hands off to `ImageEditor` modal; saving closes back to the (refreshed) library. Keep the existing "Estilo del componente" switcher intact and covering the new components. Finish with the package's automated test suite green.

## Requirements

- Functional:
  - Replace the current always-visible sections ("1. Cargar una imagen", "2. Editar", "3. Subir", "4. Biblioteca") with a single "Abrir biblioteca de medios" trigger button that opens `MediaLibraryModal`.
  - `MediaLibraryModal`'s `onLoaded` (from Phase 2) opens `ImageEditor` modal with the loaded blob. **Pass `sourceKey` only when the blob came from an existing library item** (i.e. `onLoaded(blob, { sourceKey: item.key })` when opened via the Biblioteca tab's grid selection) — a fresh upload or URL load has no existing key, so `sourceKey` is omitted and `ImageEditor`'s "Sobreescribir" stays disabled per Phase 3's contract (Red Team Finding: `sourceKey` must never be guessed/defaulted). `ImageEditor`'s `onSaveAsNew`/`onOverwrite` uploads via the existing `demoProvider` and `onClose` returns to (or closes back to) the library.
  - `MediaLibraryModal`'s Biblioteca-tab `onConfirm` (selection without editing) keeps working for the existing bulk-selection demo path (`BulkActionsBar`) — don't regress the multi-select demo the playground currently shows.
  - Style switcher (`styleVariant` `<select>`) must drive `MediaLibraryModal`/`ImageEditor` the same way it already drives the other components today.
  - Update the explanatory copy blocks (the `<p>` tags explaining the demo provider, SSRF proxy, etc.) to match the new flow instead of referencing the old numbered-sections layout.
- Non-functional:
  - Preserve the demo-provider-only trust boundary comments already in the file (no real credentials, in-memory blobs).

## Architecture

Before (current): `+page.svelte` renders every step's UI inline, always visible, driven by `picker.state`.

After: `+page.svelte` renders a trigger + two conditionally-mounted modals, still driven by the same single `picker` instance (per Phase 2's Architecture note — no second state source):

```
+page.svelte
├── "Abrir biblioteca" button → libraryModalOpen = true
├── {#if libraryModalOpen} MediaLibraryModal
│     onLoaded → close library modal, open editor modal
│     onConfirm → (existing BulkActionsBar-style confirm path, unchanged)
├── {#if editorModalOpen} ImageEditor
│     onSaveAsNew/onOverwrite → demoProvider upload → refreshLibrary() → close editor modal
│     onClose/onCancel → close editor modal (discard)
```

## Related Code Files

- Modify: `apps/web/src/routes/playground/media-picker/+page.svelte` (full rewire per Architecture above; keep all 16 style-variant imports, update JSX/markup usage)
- Read: `apps/web/src/lib/demo-storage-provider.ts` (confirm Phase 1's pagination/query/sort additions are actually exercised by the new library modal flow)
- Modify (if needed): `packages/media-picker/test/media-picker.test.ts`, `test/library-state.test.ts` (final pass — ensure Phase 1's new surface has full coverage once the real usage pattern from this phase is known)

## Implementation Steps

1. Rewrite `+page.svelte`'s template section by section, keeping `picker`/`demoProvider`/`styleVariant` setup at the top unchanged.
2. Wire the open/close state for both modals (`libraryModalOpen`, `editorModalOpen` as local `$state`).
3. Wire `MediaLibraryModal`'s `onLoaded` → `editorModalOpen = true`.
4. Wire `ImageEditor`'s save/cancel callbacks per Architecture.
5. Update the explanatory `<p>` copy blocks to describe the new modal flow.
6. Run the full package test suite: `pnpm --filter @modularcore/media-picker test`.
7. Ask the user to run `pnpm --filter web dev` (per this session's dev-server-user-only rule) and manually verify the flow end-to-end, then execute Phase 4's cross-variant pass using this rewired playground as the harness.

## Success Criteria

- [x] Playground flow matches the reference screenshots: open library → (browse/upload/URL) → edit → save → back to (refreshed) library.
- [x] Style switcher still works for every component, old and new.
- [x] `BulkActionsBar` multi-select demo path still functions (selecting up to `maxSelection=4` items and confirming) — implemented via a second dedicated trigger, see note below.
- [x] `pnpm --filter @modularcore/media-picker test` passes (164/164).
- [x] Explanatory copy in the playground page accurately describes the new flow (no stale references to removed numbered sections).

**Nota de implementación (cabo suelto real de Fase 2, no bloqueante):** la spec original asumía que `MediaLibraryModal.onLoaded` se dispararía al seleccionar un item existente de la Biblioteca con un segundo argumento `{ sourceKey }`. La implementación real de Fase 2 usa `onConfirm(items)` para ese caso (vía `MediaLibraryGrid.onSelectSingle`) y `onLoaded(blob: Blob)` solo para upload/URL nuevos. Fase 5 resolvió esto con fidelidad al contrato real: `onConfirm` (single-select) → `picker.loadFromLibrary(demoProvider, item.key)` → abre `ImageEditor` con `sourceKey={item.key}`. También se agregó un segundo trigger ("Selección múltiple (demo)") en vez de un único botón, porque el modo bulk vs. single-select-para-editar no pueden convivir en una sola apertura del modal dado cómo `multiple` gobierna `onSelectSingle` vs. selección acumulativa.

## Risk Assessment

- **Risk:** Collapsing 4 always-visible sections into 2 modals could hide a currently-easy-to-spot-in-review demo capability (e.g. reviewers used the flat layout to see all state at once). **Mitigation:** keep the playground's raw `picker.state.status`/`state.error` debug line visible outside the modals (small dev-facing status strip) so state remains inspectable without opening a modal.
- **Risk:** This phase is the integration point for every other phase — if Phase 1's `syncLibrary`/pagination, Phase 3's `overwriteKey` contract, or the interactive crop handles have loose ends, they surface here first. **Mitigation:** do this phase last (respect `dependencies: [1, 2, 3]`) and treat any surfaced gap as a signal to revisit the earlier phase's Success Criteria before calling this plan done.
<!-- Updated: Validation Session 1 - "Sobreescribir" is now a real overwriteKey upload (core/provider.ts), not a stub; reference corrected. -->
