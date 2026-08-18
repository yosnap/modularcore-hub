# Code Review: Phase 2 Registry Schema & Build Spike (red-team hardening)

Branch: `feat/0.2.0-registry-schema-build-spike` (uncommitted working tree)
Plan: `plans/260818-1856-modularcore-hub-mvp-fase-1/phase-02-registry-schema-and-build-spike.md`

## Scope
- Files reviewed: `packages/registry/src/{schema.ts,schema.zod.ts,build-registry.ts,tarball.ts,resolve-write.ts,index.ts}`, all `packages/registry/test/*`, `packages/hello-core/*`, `apps/web/{package.json,svelte.config.js,scripts/build-registry.mjs,src/routes/*}`, `scripts/inject-spike.mjs`, `fixtures/*`, root `turbo.json`/`pnpm-workspace.yaml`/`.gitignore`/`eslint.config.js` diffs.
- Commands re-run: `pnpm -w test` (20/20 pass), `pnpm -w build` (4/4 tasks succeed, registry emitted with empty public index as expected — only component present is `hello-core`, which is internal), `pnpm -w run typecheck` (registry + hello-core pass), `pnpm -w lint` (clean).

## Overall Assessment
The five critical red-team items (SA1, AD3, FMA2, FMA6, dual-package non-duplication) are implemented correctly and covered by real (non-phantom) tests, not just docstrings. I did not find a working bypass of the path-traversal clamp. One real gap found (AD3 binary auto-detection) and one process gap (no typecheck coverage for `apps/web`).

## Critical Issues
None found.

## High Priority

**1. AD3 not fully implemented: no binary auto-detection or encoding/content mismatch check (`packages/registry/src/build-registry.ts:74-82`, `schema.zod.ts:27`).**
The plan text says "el builder detecta binarios → base64", but the builder only trusts the `encoding` field declared in `modularcore.json`; there is no sniffing of the actual file bytes. `readEntryFile` does `buffer.toString('utf8')` whenever `encoding !== 'base64'`. If a component author declares `encoding: "utf8"` for a file that is actually binary (e.g. a `.png` copy/pasted into a wrong descriptor), `Buffer.toString('utf8')` will **silently** replace invalid byte sequences with U+FFFD — no error is thrown, the build succeeds, `validateBuildOutput` only checks non-zero file size, and the corrupted content is what ends up in `{name}.json`/tarball and gets written to consumer projects via `resolve-write.ts`. This is a silent data-corruption path with no test covering it (`schema.zod.test.ts` only tests declared-encoding-value validation, not encoding-vs-actual-content mismatch).
- Impact: binary assets (icons, fonts, images) added by a future component author with a wrong/forgotten encoding tag will be silently corrupted in the published registry, discovered only by consumers after copy-code injection.
- Fix options: (a) have the builder sniff bytes (e.g. reject/require base64 if the buffer contains a NUL byte or fails a strict UTF-8 round-trip check `Buffer.from(buffer.toString('utf8'), 'utf8').equals(buffer)`), or (b) explicitly narrow MVP scope by dropping the "auto-detect" claim from the plan and documenting that `encoding` is author-declared and trusted — but this must be a stated decision, not silent scope drop, since the plan explicitly hardened this as AD3.

## Medium Priority

**2. `apps/web` has no `typecheck` script; root `pnpm typecheck` silently skips it (`apps/web/package.json`).**
`turbo run typecheck` only runs for `@modularcore/registry` and `@modularcore/hello-core`; `web` has no `typecheck` entry so Turbo no-ops it without warning. `svelte-check` isn't even installed (`npx svelte-check` fails with "missing package"). `apps/web/src/routes/+layout.ts` and `+page.svelte` are therefore never type-checked in the standard quality gate, only implicitly compiled by `vite build`. Given `tsconfig.base.json` enforces `strict`, `noUncheckedIndexedAccess`, etc., this is a real gap in the "TypeScript strict conforme a tsconfig.base.json" requirement for this new app. Low current risk since the skeleton is trivial, but will mask real errors once real routes/logic are added in later phases.
- Fix: add `"typecheck": "svelte-check --tsconfig ./tsconfig.json"` (or `tsc --noEmit` if svelte-check is deferred) to `apps/web/package.json` and add `svelte-check` as a devDependency.

## Low Priority

**3. `validateBuildOutput` (FMA6) only checks entries present in `publicIndex`, not `internal`-visibility entries.**
This matches the plan's literal wording ("cada entrada de `index.json`"), so not a defect against spec, but it means an internal component's `{name}.json`/`.tar.gz` could theoretically end up empty/corrupt without failing the build (only public output is currently gated). Since `inject-spike.mjs` reads `hello-core.json` directly (internal, not indexed) and depends on it being well-formed, consider validating **all** built entries, not just public ones, since internal components are still consumed locally.

**4. `scripts/inject-spike.mjs` deviates from the plan's literal step 5 ("fetch ... desde el registry local") by reading built files directly from disk instead of over HTTP.**
This is a reasonable, documented simplification (comment explains rationale) and doesn't affect correctness or the go/no-go outcome, but it means the spike does not exercise the actual HTTP delivery path (content-type headers, `adapter-static` static serving) end-to-end — flagging so it's a conscious, not accidental, scope reduction relative to the accepted plan.

## Verified Correct (no issues)

- **SA1 (Critical) path traversal**: two-layer defense confirmed effective — `schema.zod.ts:isSafeRelativePath` rejects `..` segments (split on both `/` and `\`), absolute POSIX paths, and Windows drive-letter absolute paths, both for `path` and `target`; `build-registry.ts:assertSafeSourcePath` additionally `realpath`s the resolved candidate and asserts it starts with the realpath-resolved component directory, which correctly catches symlink escapes (verified by a real test that plants a symlink to an external `.env` and asserts the build throws `/escapes/`). I did not find a bypass (encoded traversal strings like `..%2f` are treated as literal filename segments since nothing URL-decodes them; embedded NUL bytes would just throw a Node `ERR_INVALID_ARG_VALUE`, not a bypass).
- **AD3 write-side symmetry**: `resolve-write.ts:decodeFileContent` and `tarball.ts` both branch on the same `encoding` field with matching semantics (`base64` → `Buffer.from(x,'base64')`, else `Buffer.from(x,'utf8')`), and content flows as raw `Buffer`/string without any newline normalization, so line-endings and binary bytes are preserved end-to-end (build → `{name}.json`/tarball → `writeRegistryEntryFiles`). Test `resolve-write.test.ts` exercises both encodings and asserts round-trip fidelity.
- **FMA2**: `visibility` schema field defaults to `public`, `hello-core/modularcore.json` explicitly sets `internal`, `build-registry.ts` filters `entry.visibility === 'public'` before pushing to `publicIndex`, and a real test (`excludes internal-visibility components from index.json but still emits their descriptor and tarball`) asserts the index array does not contain the internal name while its `.json`/`.tar.gz` are still emitted (needed for the local spike). Confirmed live via `pnpm build`: `public index: (none)` since the only current component (`hello-core`) is internal.
- **FMA6**: real temp-dir-then-`rename` atomic emission, staged on the same filesystem as `outputDir`'s parent (avoids `EXDEV` cross-device rename failures — a legitimate, non-obvious correctness note in the code comment), with `try/finally`-style cleanup of the temp dir on any failure. Post-build validation checks each public index entry's `.json`/`.tar.gz` exist and are non-empty, with a real test for atomic replacement ("replaces a pre-existing output directory atomically instead of merging with it").
- **Dual-package non-duplication**: `packages/hello-core/modularcore.json.files[0].path` points at `src/hello.ts` (the same source file compiled by `tsc` for the package's `exports`), confirmed byte-identical between `packages/hello-core/src/hello.ts` and the copy injected into `fixtures/vite-react/src/modularcore/hello-core/hello.ts` — single source of truth, no drift. Injected copies are correctly `.gitignore`d (`fixtures/*/src/modularcore/`).
- **General quality**: all new modules are small (max 171 lines, `build-registry.ts`), descriptive names, no `any`, no dead code, no hardcoded secrets found. `pnpm -w test`, `pnpm -w build`, `pnpm -w run typecheck` (for the packages that have it), and `pnpm -w lint` are all green as of this review.

## Recommended Actions
1. (High) Decide and implement AD3 binary-safety: either add byte-sniffing/mismatch detection in the builder, or explicitly document `encoding` as author-trusted and drop the "auto-detect" claim from the plan text with the user's sign-off.
2. (Medium) Add a `typecheck` script (`svelte-check`) to `apps/web` so the root `pnpm typecheck` gate actually covers the SvelteKit app.
3. (Low) Consider extending `validateBuildOutput` to cover internal entries too, since `inject-spike.mjs` depends on `hello-core.json` being well-formed and it currently isn't covered by that gate.

## Plan Status
Success criteria in `phase-02-registry-schema-and-build-spike.md` appear met: invalid descriptor fails build with clear zod error (tested), `pnpm build:registry` emits the three artifacts (verified live), fixtures compile/run per the referenced go/no-go report (not independently re-verified beyond file presence — `fixtures/*/dist` exist from a prior run). Recommend the lead confirm the existing go/no-go report's "GO" conclusion still stands given finding #1 above, since it affects future binary-asset components, not the current `hello-core` spike.

## Unresolved Questions
- Is AD3's "auto-detect binaries" a hard MVP requirement or aspirational language carried over from red-team notes? If aspirational, the plan doc should be updated to match the trust-the-declared-encoding implementation to avoid future confusion.
