# Code Review: Remote URL proxy + key-collision/loading fixes (follow-up)

Branch: `feat/0.8.0-media-picker-remote-url-ui-and-playground`

## Scope reviewed
- `apps/web/src/lib/demo-storage-provider.ts` (diff)
- `apps/web/src/lib/media-fetch-url-handler.ts` + test
- `apps/web/src/routes/api/media/fetch-url/+server.ts`
- `packages/media-picker/ui/react/RemoteUrlLoader.tsx`, `packages/media-picker/ui/svelte/RemoteUrlLoader.svelte`
- `apps/web/src/routes/playground/media-picker/+page.svelte` (diff)
- `packages/media-picker/core/sources.ts`, `core/net/ssrf-guard.ts`, `core/media-picker.ts` (read-only, for context)

## Regression
- `pnpm -w typecheck` — pass (0 errors, mostly cache hits, `web:typecheck` and `media-picker:typecheck` fresh-verified clean).
- `pnpm -w test` — 34 files / 251 tests pass, fresh run (not cache).
- `pnpm -w lint` — pass, no output.
- `pnpm -w format:check` — pass.
- `pnpm -w build` — pass, `apps/web` build includes the new `/api/media/fetch-url` endpoint chunk.

## Findings

### High — DNS-rebinding pin is silently inert in `apps/web`; `undici` is not resolvable from this app
`fromRemoteUrl` (`packages/media-picker/core/sources.ts`) only closes the DNS-rebinding TOCTOU window (guard resolves hostname once, then the *actual* fetch is pinned to that same resolved IP) if `pinnedFetch()` can `import('undici')`. That import uses a bare specifier, not `node:undici`, so it requires the npm package `undici` to be an actual resolvable dependency of the importing app.

`apps/web/package.json` does not list `undici` in `dependencies` (only `@modularcore/media-picker` does, as an optional peer/dev dependency of that package, not hoisted to `apps/web` under pnpm's default strict linking). Verified empirically:

```
$ cd apps/web && node -e "import('undici').then(()=>console.log('RESOLVED')).catch(e=>console.log('FAILED:', e.message))"
FAILED: Cannot find package 'undici' imported from .../apps/web/[eval]
```

Effect: every real request through `/api/media/fetch-url` in this app falls back to the **unpinned** global `fetch` (`pinnedFetch` catches the import failure and only `console.warn`s). The initial `assertSafeRemoteUrl` DNS check (blocking `127.0.0.1`, `169.254.169.254`, RFC1918, etc.) still runs and is real protection — that's why the manual curl tests against `127.0.0.1` and the metadata IP correctly failed. But a genuine DNS-rebinding attack (attacker's nameserver answers a public IP for the guard's lookup, then a private/metadata IP moments later for the actual unpinned `fetch()`'s own internal resolution) is **not** caught by anything in this app, because pinning never activates. The module's own doc comments describe this exact scenario as the reason pinning exists (`sources.ts:79-91`).

This matters here specifically because this diff is what turns `fromRemoteUrl` into an actually-reachable, unauthenticated, attacker-controlled-URL server endpoint in `apps/web` for the first time — previously the SSRF guard code existed but had no live HTTP entry point in this app.

Fix: add `"undici": "^8.10.0"` (matching the version already pinned in `packages/media-picker/package.json`) to `apps/web/package.json` `dependencies`, then re-verify the resolution check above returns `RESOLVED` and that the `console.warn` fallback path no longer fires on a normal request.

### Informational — guard error message exposes the resolved internal IP to the client
`ssrf-guard.ts`'s rejection message (`refusing to fetch URL resolving to a private/local address (10.x.x.x)`) is forwarded verbatim to the client by `media-fetch-url-handler.ts` (502 body). This confirms DNS-resolution results for attacker-supplied hostnames back to the caller — minor recon value (the attacker already controls/knows the hostname they submitted), not a meaningful leak of server internals, no stack traces or filesystem paths are exposed. Not blocking, no action required.

### Informational — floating rejection on `handleLoad()` in both `RemoteUrlLoader` implementations
`picker.loadFromUrl()` always rethrows after setting `state.error` (`media-picker.ts` `run()`), and `handleLoad()` has `try { } finally { }` with no `catch`. The `loading` flag is correctly always reset (finally is unconditional), and the error is correctly surfaced via `picker.state.error` in the UI either way — but the rejection itself propagates out of the `void handleLoad()` floating promise, which will log an "Uncaught (in promise)" console warning on every SSRF/network/rate-limit failure. This matches the pre-existing convention used by `crop()`/`compress()`/`rotate()` call sites elsewhere in this component family, so it's not a new regression, just worth knowing if it ever needs cleanup.

## Answers to the specific review questions

1. **Key collision fix** — confirmed fixed. `upload()` now always calls `generateKey()` for the final key; `options?.key` is only used to derive an optional `folderId` prefix (first path segment) for the in-memory folder association, never as the literal store key. Grepped the whole tree (`apps/web/src`, `packages/media-picker`, excluding `dist`) — `demo-storage-provider.ts` is the only file that reads `options.key`/`options?.key`, so there is no other unsafe path.

2. **`loading` reset in `RemoteUrlLoader`** — confirmed correct in both React and Svelte versions. `setLoading(true)` (React) / `loading = true` (Svelte) happens before the `await`, and reset happens in an unconditional `finally`, which runs on success, on the SSRF guard's rejection, on the proxy's 429/502 responses (both surface as a rejected promise via `run()`'s rethrow), and on a raw network failure — no code path leaves `loading` stuck at `true`.

3. **`media-fetch-url-handler.ts`** — the forwarded `err.message` is safe (see Informational note above; no filesystem paths or Node internals observed, only guard-authored strings or a generic fallback). Confirmed the rate limiter is a separate instance: `createRateLimiter` is a factory returning a fresh closure-scoped `Map` per call, and `+server.ts` constructs its own module-level instance independent from `chat-rate-limiter`'s consumer in `/api/chat`.

4. **`+server.ts`** — `export const prerender = false` is present. `Content-Type` comes from `result.blob.type` (falling back to `application/octet-stream`), which is populated by `readBodyWithCap` in `sources.ts` from the real upstream response's `content-type` header — not hardcoded.

5. **SSRF end-to-end / new bypass check** — no new bypass found in the query-param handling itself: `url.searchParams.get('url')` returns `null` (handled → 400) or a string (including `''`, which `new URL('')` rejects → 400, also handled); there's no code path that treats a relative/parse-failure input as valid. `new URL(rawUrl).toString()` is re-parsed identically inside `fromRemoteUrl`, so there's no confusion between the two parses. The only real gap found is the pinning issue above (High), which is a missing *defense-in-depth* layer, not a bypass of the primary protocol/IP check.

6. **Regression suite** — all green, independently re-run (see above), matching the reported 251 passing tests.

## Unresolved questions
- Should `undici` be added directly to `apps/web`, or should `packages/media-picker` promote it from an optional/dev peer dependency to a documented "required for pinning in Node consumers" dependency with an explicit setup step in its README? Either closes the gap; which one is a product/packaging decision, not something to guess at.
