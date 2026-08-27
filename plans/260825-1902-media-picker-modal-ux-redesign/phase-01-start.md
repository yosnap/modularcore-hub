---
phase: 1
title: "Library pagination and search contract"
status: done
priority: P1
effort: "6-8h"
dependencies: []
---

# Phase 1: Library pagination and search contract

<!-- Updated: Red Team Session 1 - Finding 1 (Critical) forced a redesign of how numbered pages fetch: listLibrary/mergeLibraryPage's append-on-cursor semantics cannot serve numbered pagination as originally architected. Effort raised 4h -> 6-8h. -->

## Overview

Extend the headless core so the library grid can offer real numbered pagination ("24 por página", page N, prev/next), a text search box, and a sort selector ("Más reciente") — none of which the current cursor-only `ListOptions`/`ListPage` contract supports. This phase only touches `core/` and the providers; no UI changes.

**Critical constraint (Red Team Finding 1):** `mergeLibraryPage` (`core/library-state.ts:52-59`) is an infinite-scroll accumulator by design — its own doc comment says a page fetched with a `cursor` is *appended*, one fetched without a `cursor` *replaces*. `media-picker.ts`'s existing `listLibrary` action feeds every cursor-bearing fetch through `mergeLibraryPage` with `hadCursor: true`, so calling it for "page 3" would concatenate pages 1+2+3 into `libraryItems`, not show page 3 alone. **Numbered pagination therefore needs a separate action that always replaces the list**, not a variant of `listLibrary`. `listLibrary`/`mergeLibraryPage` stay exactly as-is and keep serving their original "load more" (infinite scroll) use case — this phase does not touch either.

## Requirements

- Functional:
  - `ListOptions` gains `query?: string` (search) and `sort?: 'newest' | 'oldest' | 'name' | 'size'`.
  - `list()` keeps its cursor contract (`ListPage.nextCursor`) — S3/Cloudinary are inherently cursor/continuation-token based, they cannot jump to "page 4" without walking pages 1-3 server-side.
  - `library-state.ts` gains a **page-index-to-cursor cache**: visiting page N stores the cursor that produced page N+1, so "Anterior/Siguiente" and direct clicks on already-visited page numbers are free; jumping past the last visited page walks forward sequentially (no arbitrary random-access jump — same real-world limitation every cursor-paginated UI has, e.g. Stripe's dashboard).
  - Changing `folder`, `mimeTypes`, `query`, or `sort` resets the cache and refetches page 1.
  - A `syncLibrary()`-style state helper re-fetches the *current* page from the provider (used by the "Sincronizar" button) without losing the current page position when possible.
  - `recordPageCursor` mutations are gated by the same generation counter `media-picker.ts` already uses to drop stale `listLibrary` responses (`libraryGeneration`, `media-picker.ts:244-264`) — a page-N response that resolves *after* a filter/query/sort change has reset the cache must be a no-op against the (already-reset) cache, not write a cursor from the old query into it. (Red Team Finding: "PageCache mutations not gated by generation counter" — merges Failure Mode Analyst Finding 2 + Security Adversary Finding 5.)
- Non-functional:
  - `s3-compatible.ts` and `cloudinary.ts` must pass `query`/`sort` through to their backend signing endpoint contract (documented in `docs/*-presign-endpoint-example.md`) as query params — actual server-side filtering/sorting is the consuming backend's responsibility, same trust boundary as `scope` today.
  - The two signing-endpoint doc examples must warn against naively interpolating `query` into a backend filter/search expression without parameterization (Red Team Finding, Security Adversary): a signing endpoint that string-interpolates `query` into e.g. a Cloudinary Admin API search expression or an S3 prefix filter risks the free-text search box becoming a filter-injection vector (a user's query text influencing which objects outside their intended `scope`/`folder` get listed). This is a distinct concern from the "sorting may not be honored" note below — document both separately.
  - Demo provider (`apps/web/src/lib/demo-storage-provider.ts`) implements `query`/`sort` for real (in-memory filter/sort) plus **synthetic pagination** (slice by `limit`) so the playground can actually demonstrate multi-page browsing — today it returns every item in one page. This synthetic pagination is index-based and cheap to "walk sequentially"; it does **not** validate the real cost of the same operation against S3/Cloudinary, whose continuation tokens are opaque and cannot be reconstructed from a page index — walking to an unvisited page N against a real backend costs N-1 sequential round-trips. Document this gap explicitly rather than letting the demo give false confidence (Red Team Finding, Assumption Destroyer).

## Architecture

`core/provider.ts`:
```ts
export interface ListOptions {
  folder?: string;
  scope?: 'mine' | 'all';
  mimeTypes?: string[];
  query?: string;
  sort?: 'newest' | 'oldest' | 'name' | 'size';
  cursor?: string;
  limit?: number;
}
```

`core/library-state.ts` — new pure functions (`mergeLibraryPage`/`toggleSelection` stay completely unchanged — they keep serving `listLibrary`'s existing "load more" callers, untouched by this phase):
```ts
export interface PageCache {
  /** cursor to fetch page N; page 1 has no cursor (undefined). */
  cursorsByPage: Map<number, string | undefined>;
  /** highest page number we know exists (grows as user pages forward). */
  knownPages: number;
  currentPage: number;
  /** libraryGeneration value active when this cache was created/last reset — see recordPageCursor. */
  generation: number;
}

export function initPageCache(generation: number): PageCache;

/**
 * Records the cursor for `page + 1` once a page's ListPage.nextCursor is known. Pure — returns
 * a new PageCache, UNLESS `responseGeneration !== cache.generation` (the cache was reset by a
 * filter/query/sort change after this response's request was sent), in which case `cache` is
 * returned unchanged — a no-op guard against stale-response cache poisoning (Red Team Finding).
 */
export function recordPageCursor(
  cache: PageCache,
  page: number,
  nextCursor: string | undefined,
  responseGeneration: number,
): PageCache;

/** Cursor to request for `targetPage`, or `undefined` if it must be walked sequentially first (caller fetches 1..targetPage-1 first). */
export function cursorForPage(cache: PageCache, targetPage: number): { cursor: string | undefined; reachable: boolean };

/** Builds a fresh PageCache tagged with the current generation — called whenever folder/query/sort changes. */
export function resetPageCache(generation: number): PageCache; // same as initPageCache, exported name kept distinct for call-site clarity
```

**New core action — `listPage` (replaces, never appends)**, added alongside (not instead of) the existing `listLibrary`:
```ts
// core/media-picker.ts
export interface ListLibraryPageOptions extends ListOptions {
  /** 1-based page number, resolved against state.libraryPage's PageCache. */
  page: number;
}

// New method, distinct from listLibrary — this is a REAL signature addition, not a same-shape
// overload, and is not claimed to be "unchanged" (Red Team Finding, Assumption Destroyer: the
// original draft claimed listLibrary's signature stayed unchanged while secretly widening it —
// that was wrong; listPage is a new, separately-typed method instead).
async listPage(provider: StorageProvider, options: ListLibraryPageOptions): Promise<void>;
```
`listPage` resolves `options.page` via `cursorForPage`, calls `provider.list({ ...options, cursor })`, and — critically — **always replaces** `state.libraryItems` with the response's `items` (never appends, regardless of whether a `cursor` was used), then calls `recordPageCursor` for `page + 1` gated by the current `libraryGeneration`. `listLibrary` (the existing infinite-scroll "load more" action) is untouched and keeps its append-on-cursor behavior for any UI that still wants that pattern.

`adapters/svelte/create-media-picker.svelte.ts` and `adapters/react/use-media-picker.ts` (both adapters — read-only in this phase, just confirm the new state fields compile through; no UI wiring yet):
- `state.libraryPage: PageCache`
- `state.libraryQuery: string`
- `state.librarySort: ListOptions['sort']`
- `picker.listPage(provider, options)` — new method (see above), used by Phase 2's numbered-pagination UI. `picker.listLibrary(provider, options)` stays byte-for-byte unchanged.
- `picker.syncLibrary(provider)` — new adapter method: re-runs `listPage` with the same `folder`/`query`/`sort`/current page, no cache reset.

## Related Code Files

- Modify: `packages/media-picker/core/provider.ts` (add `query`, `sort` to `ListOptions`)
- Modify: `packages/media-picker/core/library-state.ts` (add `PageCache` + `initPageCache`/`recordPageCursor`/`cursorForPage`)
- Modify: `packages/media-picker/core/media-picker.ts` (add the new `listPage`/`ListLibraryPageOptions` action per Architecture — do NOT modify `listLibrary`'s existing implementation or signature)
- Modify: `packages/media-picker/adapters/svelte/create-media-picker.svelte.ts` (expose `state.libraryPage`, `state.libraryQuery`, `state.librarySort`, `picker.syncLibrary`)
- Modify: `packages/media-picker/adapters/react/use-media-picker.ts` (same additive fields — keep React adapter compiling/in parity even though its UI is out of scope, per plan Non-Goals)
- Modify: `packages/media-picker/core/providers/s3-compatible.ts` (pass `query`/`sort` to signing endpoint request)
- Modify: `packages/media-picker/core/providers/cloudinary.ts` (same)
- Modify: `apps/web/src/lib/demo-storage-provider.ts` (real in-memory `query` filter + `sort` + synthetic `limit`/cursor pagination; update the stale "never grows large enough to warrant real pagination" comment)
- Modify: `packages/media-picker/docs/s3-presign-endpoint-example.md`, `packages/media-picker/docs/cloudinary-signing-endpoint-example.md` (document new query params)
- Modify: `packages/media-picker/test/library-state.test.ts` (cover `PageCache` helpers)
- Modify: `packages/media-picker/test/providers/s3-compatible.test.ts`, `test/providers/cloudinary.test.ts` (assert `query`/`sort` forwarded)
- Modify: `packages/media-picker/test/media-picker.test.ts` (cover `syncLibrary` + page-cache-driven `listLibrary`)

## Implementation Steps

1. Read `core/media-picker.ts` fully, in particular the `libraryGeneration`/`ifCurrent`/`commitIfCurrent` guard around the existing `listLibrary` action (~lines 244-296) and `mergeLibraryPage`'s append/replace contract (`library-state.ts:52-59`) — this phase's design depends on both staying exactly as understood in Red Team Finding 1.
2. Add `query`/`sort` to `ListOptions` in `provider.ts`.
3. Add `PageCache` + pure helpers (`initPageCache`, `recordPageCursor` with the generation guard, `cursorForPage`, `resetPageCache`) to `library-state.ts`, with unit tests first — these are pure functions, cheapest to get right test-first. Explicitly test: a `recordPageCursor` call with a stale `responseGeneration` is a no-op against a cache with a newer `generation`.
4. Add the new `listPage`/`ListLibraryPageOptions` action to `media-picker.ts` (Architecture) — always replaces `libraryItems`, gates `recordPageCursor` by `libraryGeneration`. Do not modify `listLibrary`.
5. Add `syncLibrary(provider)`, implemented as `listPage` with the current page/folder/query/sort.
6. Expose the new state/methods from both adapters (Svelte first, React kept in parity — see Phase 5 for the parity check).
7. Implement `query`/`sort`/synthetic pagination in `demo-storage-provider.ts`; update its stale pagination comment; add a code comment noting the synthetic pagination does not model real cursor-opacity walk cost.
8. Pass `query`/`sort` through `s3-compatible.ts`/`cloudinary.ts` request payloads; update the two signing-endpoint doc examples with both the "sorting not guaranteed" note and the "sanitize `query`, don't interpolate it into a filter/search expression" warning.
9. Run `pnpm --filter @modularcore/media-picker test` and fix regressions.

## Success Criteria

- [x] `ListOptions.query` and `ListOptions.sort` exist and are typed; existing callers (no `query`/`sort`) compile unchanged.
- [x] `listPage` always replaces `state.libraryItems` with exactly the requested page's items — verified by a test that fetches page 1 then page 2 and asserts `libraryItems.length` stays at the page size, not cumulative. `listLibrary`'s existing append behavior is unchanged and has a regression test proving so.
- [x] `PageCache` helpers have unit tests covering: page 1 (no cursor), sequential forward paging, jump to an already-visited page (cache hit), jump past the last known page (marked unreachable — caller must walk forward), cache reset on filter change, and a stale-generation `recordPageCursor` call being a no-op.
- [x] `picker.syncLibrary(provider)` exists on both adapters and re-fetches the current page without resetting `currentPage`.
- [x] Demo provider actually paginates (verify by uploading/seeding >24 items in a scratch test or the playground and confirming page 2 returns different items, not page 1's items plus page 2's).
- [x] A success criterion bounds real-provider sequential-walk cost: the Phase 2 pagination UI (see that phase) must not let a user request a page more than `knownPages + 1` ahead — i.e., never triggers an unbounded walk against a real S3/Cloudinary backend.
- [x] `pnpm --filter @modularcore/media-picker test` passes.
- [x] No breaking change to `StorageProvider`/`ListOptions`/`ListPage` for existing consumers that don't pass `query`/`sort`; `listLibrary`'s signature and behavior are byte-for-byte unchanged.

## Risk Assessment

- **Risk:** Real backends (S3/Cloudinary) cannot honor `sort` server-side without the consuming backend's signing endpoint implementing it — a provider that ignores `sort` is still a valid implementation (same pattern as `scope` today). **Mitigation:** document this explicitly in the two `docs/*-presign-endpoint-example.md` files and in the `ListOptions.sort` JSDoc, so this plan doesn't silently promise sorting the package cannot guarantee.
- **Risk:** Page-cache "jump past last known page" UX (must walk forward) could look broken if the UI lets the user click an unreachable page number directly. **Mitigation:** Phase 2's pagination control only renders page numbers up to `knownPages + 1`, matching real cursor-pagination UIs (Stripe, GitHub CLI).
- **Risk:** Touching `media-picker.ts` risks breaking the React adapter even though its UI is out of scope. **Mitigation:** `listPage` is purely additive (new method) — `listLibrary` is never modified, so no existing React-facing behavior changes; run a `tsc --noEmit` pass on `adapters/react/` after this phase regardless.
- **Risk (Red Team Finding, Critical):** A page-cache design built as a variant of `listLibrary` would silently concatenate pages instead of showing one page at a time, because `mergeLibraryPage` always appends when a `cursor` is present. **Mitigation:** this is why `listPage` exists as a separate action that always replaces — see Overview and Architecture. Any implementation that reuses `listLibrary`/`mergeLibraryPage` for numbered pagination is a plan violation, not an optimization.
- **Risk (Red Team Finding):** `recordPageCursor` racing a filter-change cache reset could poison the new cache with a stale query's cursor. **Mitigation:** the `generation` guard in `PageCache`/`recordPageCursor` (Architecture) — a response older than the cache's current generation is dropped.
- **Risk (Red Team Finding, Assumption Destroyer):** Demo-provider pagination validates cheaply (index-based synthetic cursors) but does not prove the UX holds up against real S3/Cloudinary's opaque, non-reconstructible continuation tokens, where "walk forward to page N" costs N-1 real network round-trips. **Mitigation:** documented above; Phase 2's UI caps jump-ahead to `knownPages + 1` for exactly this reason, not just as a "nice to have."
