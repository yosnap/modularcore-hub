# Phase 4 Implementation Report — Registry Descriptors, Docs & Release

## Executed Phase
- Phase: phase-04-mcp-server.md (title: "Registry Descriptors, Docs & Release")
- Plan: `plans/260825-1931-modularcore-hub-v11-auto-seo-y-mcp-server/`
- Status: completed

## Files Created
- `packages/auto-seo/modularcore.json` — registry descriptor (`type: headless-core`, `category: seo`, `frameworks: ["agnostic"]`, `visibility: public`, `dependencies: ["zod"]`, `envVariables: []`, 6 `files[]` entries pointing to the real `core/*.ts` files including the `core/index.ts` barrel Phase 2 added).
- `apps/web/src/routes/mcp-server/+page.svelte` (151 lines) — static docs page: tools table, `install_component` elicitation/security notes, `mcpServers` JSON config block, registry-URL security section, install instructions. Deliberately not wired to `registry-data/index.json` (no `+page.server.ts` load), matching the plan's explicit instruction not to fake a registry descriptor for the MCP server.
- `.changeset/chubby-impalas-glow.md` — single changeset covering the 4 packages (see below).

## Files Modified
- `apps/web/src/routes/+page.svelte` (+22 lines) — added a `<section class="tools">` "Herramientas" block with a card linking to `/mcp-server`, reusing the existing `.cards`/`.card`/`.meta`/`.badge` CSS classes already scoped in this file. Kept fully separate from the `{#each data.components as component}` loop; copy explicitly states it installs via client config, not CLI/copy-code.

## Files Verified, Not Modified
- `packages/auto-seo/README.md`, `packages/mcp-server/README.md` — read in full; no `_TBD_`/`Describe...` placeholders found. Both already contain real, working examples matching the Phase 2/3 test suites (`createSchema`/`createGraph`/`stringify`/`validate` for auto-seo; tools table + `mcpServers` config + elicitation/concurrency notes for mcp-server, already carrying `<!-- Updated: Validation Session 1 -->` markers). No edits needed for step 7.
- `turbo.json`, `.changeset/config.json` — confirmed no changes needed: `build:registry` task already runs for all workspace packages via `dependsOn: ["^build"]`; none of the 4 affected packages are in `.changeset/config.json`'s `ignore: ["web", "@modularcore/hello-core"]`.

## `pnpm build:registry` Result
Ran with `--force` (the shared turbo cache had a stale replay pointing at a different worktree's absolute path — `/Volumes/EVO990/Proyectos/Personales/ModularCore Hub/...` instead of this `Fases-siguientes` worktree — so the cached result had to be invalidated). Forced run:
```
web:build:registry: wrote 4 component(s) to .../Fases-siguientes/apps/web/registry-data
web:build:registry: public index: ai-chat, auto-seo, media-picker
```
`registry-data/index.json` now lists `auto-seo` alongside `ai-chat`/`media-picker` with the same field shape (`name, title, category, version, frameworks, description`). `registry-data/auto-seo.json` was validated to have all 13 descriptor fields and 6 files with embedded content. Descriptor validation happens inline inside `buildRegistry()` via `registryDescriptorSchema.safeParse` (`packages/registry/src/build-registry.ts`); no separate validation script existed in `packages/registry/test/`, so no new one was added — the real build run is the validation.

## `pnpm changeset status` Result
```
Packages to be bumped at patch:
- @modularcore/cli
Packages to be bumped at minor:
- @modularcore/auto-seo
- @modularcore/mcp-server
- @modularcore/registry-client
NO packages to be bumped at major
```
Matches the phase's expected bump plan exactly.

## Build / Test / Lint
- `pnpm -w build`: 10/10 tasks successful (full turbo, includes the new `mcp-server` route compiling).
- `pnpm -w test`: 44 test files / 300 tests passed.
- `pnpm lint`: clean, no output.

## Deviations / Notes
1. **Changeset created via the interactive CLI, driven through a scripted piped-stdin session** (space/arrow-key/enter bytes fed to `pnpm changeset add` with small delays between keystrokes), not written by hand. This was necessary because the sandboxed shell has no real TTY for a human to drive `pnpm changeset` interactively; the bytes sent are the literal keystrokes a human would type (space to toggle checkboxes, arrow-down to navigate, enter to confirm, then the summary text). The resulting `.changeset/chubby-impalas-glow.md` frontmatter was produced entirely by `@changesets/cli`'s own writer, not hand-authored. `changeset status` confirms the tool round-trips it correctly.
2. **Single combined changeset** (`@modularcore/auto-seo`: minor, `@modularcore/mcp-server`: minor, `@modularcore/registry-client`: minor, `@modularcore/cli`: patch) rather than 4 separate changeset files. The phase requirement is "changesets created for the 3 new/modified packages + the cli bump" — a single changeset file listing multiple packages with independent bump levels is the standard/idiomatic Changesets pattern for one cohesive change (this whole sub-phase), and `changeset status`/`changeset version` treat it identically to 4 separate files. Flagging this as a judgment call in case the orchestrator prefers 4 separate files for changelog granularity — easy to split later if needed.
3. **Duplicate changeset cleanup**: an earlier `expect`-driven attempt at the same flow appeared to crash with a `SyntaxError` from enquirer's autocomplete filter (arrow-key escape sequences were being consumed as literal search text in that attempt), but it turned out to have silently written a second, near-identical changeset (`tough-webs-dream.md`) before I noticed. Deleted it once found — verified via `changeset status` that exactly one changeset remains and the bump plan is unaffected.
4. **No code files touched outside scope**: did not modify `packages/cli/src/*`, `packages/registry-client/*`, `packages/mcp-server/src/*`, or `packages/auto-seo/core/*` — confirmed via `git status --porcelain` that only files owned by this phase were created/modified (plus the pre-existing Phase 1 diff already in the working tree, untouched).
5. **Final sweep (step 8)**: grepped the new/modified files for `opengraph`, `_TBD_`, `Describe...`, and stray SDK "v2" references — the only OpenGraph mentions are the intentional "out of scope" disclaimers already present in `packages/auto-seo/README.md`/copied into the new descriptor's `description`, consistent with `plan.md`'s Non-Goals. No stale decisions found.

## Unresolved Questions
None.

Status: DONE
Summary: Auto-SEO registry descriptor created and validated via a real `pnpm build:registry` run (appears in `/registry/index.json`); static `/mcp-server` docs page added and linked from a new "Herramientas" section on the home page, kept separate from the registry-driven catalog loop; one combined Changesets file bumps `auto-seo`/`mcp-server`/`registry-client` (minor) and `cli` (patch), confirmed via `changeset status`; both new packages' READMEs already had real examples, no placeholders to fix. `pnpm -w build`, `pnpm -w test` (300/300), and `pnpm lint` all green; nothing committed.
Concerns/Blockers: Single combined changeset vs. 4 separate files (see Deviation 2) is a judgment call — flag for orchestrator review before the actual release commit/version bump.
