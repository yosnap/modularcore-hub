---
phase: 2
title: "MediaLibraryModal component (4 style variants)"
status: done
priority: P1
effort: "2-2.5d"
dependencies: [1]
---

<!-- Updated: Red Team Session 1 - Finding 4 (Critical, multi-file upload races the single-blob state machine) and Finding 9 (High, bits-ui fact-check correction) forced scope/design changes. Effort raised 1.5d -> 2-2.5d. -->

# Phase 2: MediaLibraryModal component (4 style variants)

## Overview

Build a new `MediaLibraryModal` Svelte component that wraps the existing `MediaLibraryGrid`, `RemoteUrlLoader`, `FolderSelect`, and `MimeTypeFilter` headless pieces behind a tabbed modal matching the reference screenshots ("Biblioteca de medios" header, 3 tabs: Biblioteca / Subir archivo / Desde URL). Ship it in all 4 style variants (headless, tailwind, shadcn, vanilla), same pattern as the existing components (see `[[component-style-variants]]`). Enhance `MediaLibraryGrid` in place (filename + size caption, search box, sync button, pagination footer) rather than duplicating grid logic inside the modal.

## Requirements

- Functional:
  - New component `MediaLibraryModal` at `ui/svelte/MediaLibraryModal.svelte` (headless) + `ui/svelte/{tailwind,shadcn,vanilla}/MediaLibraryModal.svelte`.
  - Props: `{ picker, provider, open, onClose, onConfirm, resolveUrl?, allowHttp?, multiple?, folders? }` — reuses `picker`/`provider` the same way the playground already does, does not introduce a second state source.
  - Header: title "Biblioteca de medios" + close (X) button calling `onClose`.
  - Tabs (local `$state` in the modal, not in `picker`): "Biblioteca" | "Subir archivo" | "Desde URL", each with an icon (reuse whatever icon approach `FolderSelect`/`MimeTypeFilter` already use — check first, do not introduce a new icon library if one isn't already a dependency; inline SVG is the safe default).
  - **Biblioteca tab:** search input (wired to the new `state.libraryQuery` from Phase 1, debounced ~300ms before refetch via `picker.listPage`; the debounce timer MUST be cleared on modal close/component teardown — see Risk Assessment, Red Team Finding) + "Sincronizar" button (calls `picker.syncLibrary`, shows a spinning/disabled state while `state.libraryLoading`) + folder tabs (reuse `FolderSelect` or a simplified pill-tab rendering of `state.folders` — "Todas" is the `folder: undefined` state) + the enhanced `MediaLibraryGrid` + footer (item count from `state.libraryItems`/total, sort `<select>` bound to `state.librarySort`, per-page `<select>` [12/24/48/96], numbered pagination bound to `state.libraryPage`, rendering only up to `knownPages + 1` per Phase 1's `cursorForPage`/`reachable` contract — never a page number that would trigger an unbounded sequential walk).
  - **Subir archivo tab (Red Team Finding, Critical — redesigned from the original draft):** `MediaPicker`'s core state machine (`core/media-picker.ts`) is explicitly "one blob at a time" — `loadLocalFile`/`upload` share a single `state.blob`/`state.progress`/`state.status`, gated by a generation counter that drops a stale in-flight upload's *state commit* but does **not** stop its *network call* from firing. Looping `picker.loadLocalFile(file)` → `picker.upload(provider, …)` per dropped file (the original draft's design) races N concurrent real uploads against one shared state slot. **Corrected design:** the dropzone manages its own local per-file queue (`$state<{ file: File; status: 'pending'|'uploading'|'done'|'error'; progress: number; result?: UploadResult; error?: Error }[]>`), calling `provider.upload(file, { onProgress, signal })` **directly**, bypassing `picker.loadLocalFile`/`picker.state.blob` entirely for the multi-file path — `picker.state` is not touched until all queued uploads settle, at which point `refreshLibrary`-equivalent (Phase 5) re-fetches the current page. Single-file upload-then-edit (the common case, one file dropped) MAY still use `picker.loadLocalFile` + hand off to `ImageEditor` per the `onLoaded` callback below; only the *multi-file* path needs the bypass. Text: "Elegí archivo(s) o arrastrá y soltá" / "Imágenes de hasta 8MB, máx. 20" (Spanish copy, adapt from the English reference screenshot per repo convention — this whole UI is Spanish per `apps/web` existing playground copy).
  - **Desde URL tab:** thin wrapper around the existing `RemoteUrlLoader`, restyled to match the reference (link icon in the input, "Usar esta URL" button disabled until the input parses as a URL).
  - Selecting/confirming items in the Biblioteca tab calls `onConfirm(items)` (same contract `BulkActionsBar` uses today) and closes the modal.
  - Uploading a file or resolving a URL feeds `picker.state.blob`, closes the modal on success, and hands off to the (Phase 3) `ImageEditor` modal — wire the hand-off in Phase 5, this phase only needs to emit an `onLoaded` callback (blob ready for editing) so Phase 5 can chain it.
- Non-functional:
  - Focus trap + `Escape` to close + click-outside-to-close. <!-- Updated: Red Team Session 1 - Finding 9 (High): the Validation Session 1 fact-check below was WRONG (grep -m1 truncated at the first match and missed a later one). Corrected here. --> Corrected verification: `bits-ui` is **already** a `peerDependency` (optional) of `packages/media-picker/package.json` (`"bits-ui": ">=2"`, `peerDependenciesMeta.bits-ui.optional: true`) and is **already imported and used** in the existing shadcn variant — `ui/svelte/shadcn/ImageEditor.svelte` uses `bits-ui`'s `Slider`, `ui/svelte/shadcn/MediaLibraryGrid.svelte` uses its `Toggle`, both with an explicit "Requires `bits-ui` as a peer dependency" doc comment. So using `bits-ui`'s `Dialog`/`Tabs` in the shadcn `MediaLibraryModal` continues an established pattern, not a new dependency decision — but it's missing from `devDependencies` (unlike the two `@radix-ui/*` packages the React shadcn variants mirror), which this phase fixes. **Separately**, `FolderSelect.svelte:31` has a comment explaining it *deliberately avoids* `bits-ui`'s `Select` primitive "to keep parity across all variants" — i.e. the codebase already makes this call component-by-component (some shadcn components use a `bits-ui` primitive when it's genuinely load-bearing for that component's behavior — Slider drag math, Toggle a11y state; others build primitives themselves when a plain equivalent is trivial, like a folder dropdown). A `Dialog`/`Tabs` modal shell has real focus-trap/a11y complexity worth reusing `bits-ui` for, consistent with the Slider/Toggle precedent, not the Select one — headless/tailwind/vanilla still build a bespoke minimal modal (focus trap + Escape + backdrop click) with zero new dependencies, matching how those variants already avoid `bits-ui` entirely.
  - Same props/behavior across all 4 style variants (headless ships zero visual styling, only structure/ARIA).

## Architecture

Composition, not reinvention — `MediaLibraryModal` is a shell around the components Phase 1 and the existing package already provide:

```
MediaLibraryModal
├── Header (title + close)
├── Tabs (Biblioteca | Subir archivo | Desde URL)
├── [Biblioteca]
│   ├── search input → state.libraryQuery
│   ├── "Sincronizar" button → picker.syncLibrary(provider)
│   ├── FolderSelect (existing) or pill-tab row over state.folders
│   ├── MediaLibraryGrid (existing, ENHANCED this phase — see below)
│   └── footer: count + sort <select> + per-page <select> + pagination (state.libraryPage)
├── [Subir archivo]
│   └── dropzone → local per-file queue → provider.upload(file, opts) directly (bypasses picker.state — Red Team Finding, Critical, see Requirements)
└── [Desde URL]
    └── RemoteUrlLoader (existing, restyled)
```

`MediaLibraryGrid` enhancement (additive, same props shape, check existing consumers in `+page.svelte` don't break):
- Show `item.key` (basename, truncated with title-attr for full name) + human-readable size (`formatBytes(item.size)` — check if this helper already exists somewhere in `core/`, add one small pure function if not, do not pull in a dependency for this) under each thumbnail.
- Keep `onSelectSingle`/`toggleLibrarySelection` behavior unchanged.

## Related Code Files

- Create: `packages/media-picker/ui/svelte/MediaLibraryModal.svelte` (headless)
- Create: `packages/media-picker/ui/svelte/tailwind/MediaLibraryModal.svelte`
- Create: `packages/media-picker/ui/svelte/shadcn/MediaLibraryModal.svelte` (uses `bits-ui`'s `Dialog`/`Tabs`)
- Create: `packages/media-picker/ui/svelte/vanilla/MediaLibraryModal.svelte`
- Modify: `packages/media-picker/ui/svelte/MediaLibraryGrid.svelte` + its 3 style variants (filename/size caption)
- Modify: `packages/media-picker/ui/svelte/tailwind/MediaLibraryGrid.svelte`, `shadcn/MediaLibraryGrid.svelte`, `vanilla/MediaLibraryGrid.svelte`
- Modify: `packages/media-picker/ui/svelte/{,tailwind/,shadcn/,vanilla/}RemoteUrlLoader.svelte` (restyle to match "Desde URL" tab visuals — link icon + disabled-until-valid button; keep existing `resolveUrl`/`allowHttp` props)
- Possibly modify: `packages/media-picker/core/media-picker.ts` or a new small `core/format.ts` for `formatBytes` (pure function, add tests)
- Modify: `packages/media-picker/ui/vanilla-styles.css`, `packages/media-picker/ui/shadcn-theme.css` (new modal/tab/dropzone classes)
- Modify: `packages/media-picker/test/ui/*` (add coverage if this repo tests Svelte components — confirm test setup first; if only `core/`+`canvas` are tested today, note in Phase 5 whether component tests are in scope or explicitly out of scope)
- Modify: `packages/media-picker/package.json` (`bits-ui` is already a peer dependency — add it to `devDependencies` too, matching the `@radix-ui/*` pattern already used for the React shadcn variants; not a net-new dependency decision, corrected per Red Team Finding 9)

## Implementation Steps

1. Grep `apps/web/src` for an existing Dialog/Modal primitive and for whatever icon strategy `FolderSelect`/`MimeTypeFilter` use; decide reuse vs. new before writing any markup.
2. Add `formatBytes` (or find existing equivalent) with a unit test.
3. Enhance `MediaLibraryGrid` (headless first) with filename/size caption; propagate to the 3 style variants keeping each variant's existing visual language (tailwind utility classes, shadcn tokens, vanilla CSS classes).
4. Build `MediaLibraryModal` headless: tabs, header, close, composition of existing pieces, pagination/sort/per-page controls wired to Phase 1's `state.libraryPage`/`libraryQuery`/`librarySort`/`picker.listPage`. Clear the search debounce `setTimeout` in `onDestroy` and whenever `open` transitions to `false` (Red Team Finding, Failure Mode Analyst).
4b. Build the local per-file upload queue for the Subir archivo tab (see Requirements — bypasses `picker.state` for the multi-file path) with its own progress/error UI per file.
5. Port to tailwind variant matching the reference screenshots' spacing/typography/icons.
6. Port to shadcn variant using `bits-ui`'s `Dialog`/`Tabs` primitives (already a peer dependency — add to `devDependencies` per Related Code Files; corrected in Red Team Session 1, see Non-functional Requirements).
7. Port to vanilla variant (plain CSS classes in `vanilla-styles.css`, no Tailwind/shadcn assumptions).
8. Restyle `RemoteUrlLoader` per variant to match the "Desde URL" tab reference.

## Success Criteria

- [x] `MediaLibraryModal` exists in all 4 style variants with identical props/behavior (only visuals differ), matching the project's established variant-parity convention.
- [x] Biblioteca tab shows filename + size per thumbnail, has working search (debounced, timer cleared on close), working "Sincronizar" (visible loading state), working sort/per-page selects, and numbered pagination that matches Phase 1's `listPage`/page-cache semantics (no dead/unreachable page buttons rendered — capped at `knownPages + 1`).
- [x] Subir archivo tab supports both drag-and-drop and click-to-browse, respects an 8MB/file and 20-files cap with a visible error state on violation, and each queued file has independent progress/error/success state (verified with ≥2 simultaneous files — no shared/overwritten progress).
- [x] Multi-file upload never touches `picker.state.blob`/`status`/`progress` (verified: dropping 3 files while `picker.state` is inspected shows no mutation until the queue settles) — confirms Red Team Finding 4 is closed, not just documented.
- [x] Desde URL tab reuses `RemoteUrlLoader`'s existing SSRF-safe `resolveUrl` contract unchanged.
- [x] Modal closes on `Escape`, click-outside, and the X button; traps focus while open.
- [x] `pnpm --filter @modularcore/media-picker typecheck` (or the repo's equivalent check) passes for all 4 variants.

## Risk Assessment

- **Risk (Red Team Finding, Critical, closed by redesign above):** The original draft looped `picker.loadLocalFile`/`picker.upload` per dropped file, racing N concurrent uploads against `MediaPicker`'s single-blob state machine (`core/media-picker.ts` — "one blob at a time," generation-guarded state commits but unguarded network calls). **Mitigation:** the local per-file queue bypasses `picker.state` entirely for the multi-file path (Requirements/Architecture) — this is a structural fix, not a UI-level guard.
- **Risk (Red Team Finding, High — corrected, not a new risk):** An earlier draft of this plan claimed no Dialog/Modal primitive existed anywhere accessible to `packages/media-picker` and treated `bits-ui` in shadcn as a fresh dependency decision; that fact-check was wrong (see Non-functional Requirements) — `bits-ui` is already a peer dependency and already used in 2 existing shadcn components. **Mitigation:** corrected throughout this phase; no remaining risk beyond the ordinary "keep peer dependency version range compatible" concern.
- **Risk:** `MediaLibraryGrid` prop changes could break the untouched React adapter's expectations if `LibraryItem` shape changes. **Mitigation:** this phase only adds *rendering* (filename/size were already on `ListedObject`), no type changes — confirm no `ListedObject` field is added here.
- **Risk (Red Team Finding, Medium):** A pending debounce `setTimeout` for search can fire after the modal closes, silently mutating the long-lived `picker`'s library state in the background and surprising the user on reopen. **Mitigation:** clear the timer on close/teardown (Implementation Steps, Success Criteria).
- **Risk:** Debounced search re-fetching could race with `syncLibrary`/pagination clicks (stale response overwriting a newer one). **Mitigation:** this is the same class of race Phase 1's `recordPageCursor` generation guard addresses at the core level — `listPage`'s generation-gated commit (Phase 1) already covers stale-response ordering; this phase's UI only needs to avoid firing overlapping requests it doesn't need to (e.g. disable "Sincronizar" while `state.libraryLoading`), not re-implement the guard.
