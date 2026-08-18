# Code Review — media-picker v2 (multiselect/folders/editor)

Branch: `feat/0.7.0-media-picker-v2` (working tree, uncommitted)

## Scope

Files reviewed (all uncommitted changes on the branch):
- `packages/media-picker/core/media-picker.ts`, `core/library-state.ts`
- `packages/media-picker/core/canvas/transform.ts`, `core/canvas/crop.ts`
- `packages/media-picker/core/provider.ts`, `core/providers/{s3-compatible,cloudinary}.ts`
- `packages/media-picker/adapters/react/use-media-picker.ts`, `adapters/svelte/create-media-picker.svelte.ts`
- `packages/media-picker/ui/react/*.tsx`, `ui/svelte/*.svelte`
- `packages/media-picker/{modularcore.json,package.json,tsconfig.json}`
- `apps/web/src/lib/demo-storage-provider.ts`, `eslint.config.js`

LOC: ~1050 in core+adapters, plus ~10 new UI files. All modules stay under the 1000-line ceiling; largest is `media-picker.ts` at 327 lines.

Re-ran (not just trusted the implementer's report): `pnpm build`, `pnpm turbo run test --force`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — all green. Full suite: 10 test files / 106 tests in `media-picker` alone, matches monorepo-wide totals the implementer claimed.

## Overall Assessment

The generation-guard work (item 1) and the trust-boundary work (items 3/4) are solid and verified against the code, not just the comments. One real production bug found in the new `ImageEditor` components (item 5/8 area): unbounded `URL.createObjectURL` leak with no `revokeObjectURL`, worse in the React variant because it fires on every render, not just on blob change.

## Critical Issues

None.

## High Priority

**1. `ImageEditor` leaks object URLs — no `revokeObjectURL` anywhere in the package.**
- `packages/media-picker/ui/react/ImageEditor.tsx:24`: `const previewUrl = blob ? URL.createObjectURL(blob) : null;` runs unconditionally in the render body, not in a `useEffect`/`useMemo`. Because `zoom`/`rect`/`aspect` are local `useState`, every keystroke on the width/height inputs or every tick of the zoom slider re-renders the component and calls `URL.createObjectURL(blob)` again on the *same* blob, permanently registering a new blob URL each time. None are ever revoked (`grep -rn "revokeObjectURL" packages/media-picker/ui/` returns nothing). In a long editing session (dragging the zoom slider is the worst case) this leaks memory in the tab until reload.
- `packages/media-picker/ui/svelte/ImageEditor.svelte:13`: `let previewUrl = $derived(picker.state.blob ? URL.createObjectURL(picker.state.blob) : null);` is less severe (Svelte's `$derived` only re-evaluates when `picker.state.blob` reference actually changes — i.e., once per rotate/flip/crop/upload, not per keystroke) but still never revokes the previous URL, so the leak persists across the lifetime of an editing session, just at a much slower rate.
- Fix: track the previous URL and revoke it when a new one is created or the component unmounts, e.g. in React:
  ```ts
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  ```
  and the Svelte equivalent via `$effect` with cleanup, keyed only on `picker.state.blob`.

## Medium Priority

**2. `zoom` state in `ImageEditor` is dead weight / misleading UX.**
- Both `ImageEditor.tsx:21` and `ImageEditor.svelte:10` track a `zoom` value that only ever feeds a CSS `transform: scale()` on the `<img>` preview — it is never passed into `picker.crop()` (`handleApplyCrop`/`applyCrop` only sends `{ rect, aspect }`). A user who "zooms in" and then clicks "Apply crop" gets a crop of the *unzoomed* rect against the *unzoomed* image — the visual zoom has no effect on the actual output. Not a security/data-loss issue, but worth flagging since it looks functional and isn't. Either wire zoom into the crop rect math (still core-only, not UI — `applyAspectRatio`-style helper in `core/canvas/crop.ts`) or drop the control until it does something.

## Verified Findings (no issue — confirmed correct per the review checklist)

1. **Library-listing generation guard (item 1)**: `runLibrary()` in `core/media-picker.ts:251-269` captures `gen = ++this.libraryGeneration` synchronously before `await action()`, and every subsequent state mutation goes through `ifCurrent`, which re-checks `gen === this.libraryGeneration`. No TDZ-style bug — the counter is read at call time, not at resolution time, matching the fixed pattern from the original Phase-4 guard (`run()`/`commitIfCurrent`). Confirmed the out-of-order test (`media-picker.test.ts:323-354`) genuinely forces the race with a manually-resolved `Promise` (`resolveSlow` captured via executor, resolved after the "fast" call has already completed) — not timers/sleeps, so it's not a false-positive-prone test.
2. **`maxSelection`**: `toggleSelection()` in `core/library-state.ts` is a pure, synchronous function called synchronously from `toggleLibrarySelection()`. Being single-threaded JS, there's no interleaving window between two `toggleLibrarySelection` calls, so no race is possible. `confirmSelection()` only snapshots; it never mutates the count. Config default (`maxSelection: config.maxSelection ?? Infinity`) is sane. No path found where the limit can be exceeded.
3. **Core never touches secrets after the `list()` signature change**: both `s3-compatible.ts` and `cloudinary.ts` `list`/`listFolders`/`createFolder` on the returned `StorageProvider` all throw if the corresponding server-backed hook (`config.list`/`config.listFolders`/`config.createFolder`) isn't supplied, and otherwise delegate straight through — no direct storage/API call from the core. Same pattern as `upload`/`getUploadUrl`. `provider.ts`'s doc comment (lines 1-8) states this contract explicitly.
4. **`scope: 'mine'|'all'`**: documented as UX-only at `core/provider.ts:34-40` — explicitly states the core "never decides who may see what" and that ignoring `scope` entirely is a valid implementation. Grepped both providers and `media-picker.ts`; `scope` is only ever forwarded into `options` passed to `provider.list(options)`, never branched on. No privilege-elevation logic in the core.
5. **rotate()/flip() vs. the blob-generation guard**: both go through the same `run()`/`commitIfCurrent` machinery as `crop()`/`compress()`/`upload()` (`media-picker.ts:185-200`), using the main `generation` counter (not `libraryGeneration`), which is correct — they mutate the single working blob, not library state. No regression versus the pre-existing Phase 4 guard; `run()`/`commitIfCurrent` themselves are unchanged by this diff.
6. **`list()` signature propagation**: `apps/web/src/lib/demo-storage-provider.ts` implements `list(options): Promise<ListPage>` with the new `folder`/`mimeTypes` filtering and no forced casts. No other call sites of the old signature found in the repo.
7. **`.svelte` files excluded from monorepo build/lint**: reasonable and consistently applied — `eslint.config.js` ignores `**/*.svelte` with a comment explaining no `svelte-eslint-parser` is installed; `packages/media-picker/tsconfig.json` only includes `ui/react` (not `ui/svelte`); and `package.json`'s exports map `./ui/svelte/*` directly to the raw `.svelte` source (not `dist`), consistent with treating them as copy-code-only. All 5 `.svelte` files under `ui/svelte/` are listed in `modularcore.json`'s `files[]` (verified path-by-path against `find ui -type f`), so `copy-code` installs will still deliver them.
8. **`ImageEditor.tsx`/`.svelte` business logic**: confirmed no crop/rotate/flip math lives in either component — both only hold local UI state (`aspect`, `zoom`, `rect`) and forward it verbatim to `picker.crop()`/`picker.rotate()`/`picker.flip()`. All aspect-ratio resolution and clamping happens in `core/canvas/crop.ts` (`resolveAspectRatio`/`applyAspectRatio`).
9. **Type safety**: no `any`/`as any` found in `core`, `adapters`, or `ui` for this diff. All files under 1000 lines.
10. **Regression**: `pnpm build`, `pnpm turbo run test --force`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` all pass cleanly from a fresh (forced, non-cached where relevant) run.

## Recommended Actions

1. (High) Fix the `URL.createObjectURL` leak in both `ImageEditor` components — scope the object URL to `blob` identity via `useEffect`/`$effect` with a `revokeObjectURL` cleanup, not the render/derive body.
2. (Medium) Either wire `zoom` into the actual crop calculation or remove the control — as shipped it visually lies about what "Apply crop" will produce.

## Unresolved Questions

None.
