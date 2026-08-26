# Phase 3 Implementation Report — MCP Server

Plan: `plans/260825-1931-modularcore-hub-v11-auto-seo-y-mcp-server/phase-03-auto-seo-json-ld-core.md`
(filename misleading — content is "MCP Server", used as source of truth per instructions).

## Step 0 spike (blocking gate) — result: GO

- `npm view @modelcontextprotocol/sdk versions` confirmed latest is **1.30.0** (1.x, no "v2" —
  research's "v2" claim was false, as the plan already flagged). Pinned `1.30.0` exactly (not
  a caret range) in `package.json`.
- Ran a throwaway spike (`node` script, not committed) using
  `InMemoryTransport.createLinkedPair()` + `McpServer.registerTool` + a stub tool that calls
  `elicitInput`. Findings, all later re-verified as real Vitest tests:
  - Elicitation works via `server.server.elicitInput(...)` (the low-level `Server` instance
    `McpServer` wraps) — **not** via `extra.elicitInput` on the tool handler's second
    argument (that doesn't exist in 1.30.0; `extra` only exposes `sendRequest`/etc). Adjusted
    all tool implementations accordingly — tools close over the `McpServer` instance and call
    `server.server.elicitInput`.
  - Client capability shape is `{ elicitation: { form: {} } }` (an object, not `true`) — a
    client with `{}` (no `elicitation` key) triggers `Server.elicitInput` throwing
    synchronously *before* any request is sent: `"Client does not support form elicitation."`.
    This is the clean, distinguishable "client has no elicitation support" failure mode
    required by Red-team #4.
  - Confirmed accept/decline/no-capability as three distinct, observable outcomes.
  - **Concurrency (Red-team #9):** tool calls on one `InMemoryTransport` connection are **not**
    serialized. A `fast_tool` call completed immediately while a `blocking_tool` call sat
    awaiting its elicitation response. Documented in README and `src/index.ts` doc comment,
    and covered by a dedicated test (`install-component.test.ts`, "does not block other tool
    calls...").

No deviation from the plan's architecture was needed beyond the `extra.elicitInput` →
`server.server.elicitInput` correction discovered in the spike.

## What was implemented

New package `packages/mcp-server/` (`@modularcore/mcp-server`):

- `src/config.ts` — `resolveConfig(argv, env)`: reads `registryUrl` from
  `MODULARCORE_REGISTRY_URL`, `--registry-url` overrides it, no production default (throws
  `McpServerConfigError` if unset), forces `https://` unless
  `MODULARCORE_REGISTRY_ALLOW_INSECURE=1` / `--allow-insecure-registry` opts into `http://`.
  Also resolves `projectRoot = process.cwd()`, the root every tool's `targetPath` is clamped
  against.
- `src/errors.ts` — `McpServerConfigError`.
- `src/tools/tool-error.ts`, `src/tools/untrusted-content.ts` — shared helpers (error→tool
  result shape; the "external, not instructions" notice text prepended to every read-only
  tool's output).
- `src/tools/search-components.ts`, `src/tools/get-component.ts` — read-only, no elicitation,
  built on `@modularcore/registry-client`'s `createRegistryClient`.
- `src/tools/install-component.ts` — the only write-capable tool:
  1. Clamps `targetPath` itself against the server's `projectRoot` via
     `resolveTargetPath(projectRoot, targetPath)` from `@modularcore/registry-client` — this
     is what stops an attacker-supplied `targetPath` containing `..` from escaping the
     server's working directory (the tool never invents its own path-joining).
  2. Fetches the descriptor; if `version` was supplied and doesn't match the registry's
     current version, fails immediately (registry only serves the current version — no
     historical versions available; documented in the tool description).
  3. Reads `.env.example` at `resolveTargetPath(projectRoot, '.env.example')` — same clamp,
     never a raw `readFile(join(targetPath, '.env.example'))` — to compute which
     `envVariables` are new (ENOENT → treated as "no existing file", not an error).
  4. Calls `server.server.elicitInput(...)` with a message summarizing destination, version,
     files to write, new env vars, and npm dependencies (informational only — this tool never
     runs `npm install`, documented explicitly).
  5. Distinguishes three non-write outcomes with different error text: elicitation throws
     (client has no elicitation capability) vs `action !== 'accept'` (user declined) vs
     traversal/version-mismatch (caught before elicitation is even attempted).
  6. On accept, writes via `writeFilesTracked(descriptor.files, projectRoot)` from
     `@modularcore/registry-client` — no reimplemented clamp or write logic; on partial
     failure, reports which files were already written via `isTrackedWriteError`.
- `src/tools/check-updates.ts` — compares caller-supplied `installedComponents` (name+version)
  against `getIndex()`. Plain string equality, not semver: the registry index has exactly one
  published version per component (not a range), so pulling in the `semver` package (not in
  the plan's dependency list) would be unjustified — documented in the tool description.
- `src/index.ts` — entrypoint: builds config + registry client, registers all 4 tools on an
  `McpServer`, connects `StdioServerTransport`. Doc comment records the concurrency finding
  from the spike.
- `README.md` — registration instructions (`mcpServers` JSON for Cursor/Claude
  Code/VS Code), untrusted-content warning, `install_component` write/elicitation/concurrency
  behavior, registry URL security posture. Carries `<!-- Updated: Validation Session 1 -->` as
  required (source for the Fase 4 website docs page).
- Tests (`test/*.test.ts`, `test/helpers/*.ts`): 19 tests across 5 files, all via
  `InMemoryTransport.createLinkedPair()` against a local fixture HTTP server
  (`test/fixtures/registry/`, pattern copied from `packages/cli/test/helpers/` since those
  helpers aren't a shared package). Covers: `search_components` (match/limit/registry-error),
  `get_component` (found/not-found), `check_updates` (outdated/up-to-date/not-in-registry),
  `config.ts` (env/flag/https-enforcement — 7 cases), and `install_component`'s 6 cases:
  accept+writes-files+new-envVariables-only, version-mismatch-rejected-before-eliciting,
  user-declines (client supports elicitation), client-has-no-elicitation-capability,
  **targetPath traversal (`../../../etc`) rejected without reading `.env.example` or eliciting
  or writing**, and the concurrency check (search_components completes while install_component
  awaits a pending elicitation).

## Build / test / smoke results

- `pnpm --filter @modularcore/mcp-server build` — pass (tsc, no errors).
- `pnpm --filter @modularcore/mcp-server typecheck` — pass.
- `pnpm --filter @modularcore/mcp-server test` — pass, 19/19 tests, 5/5 files.
- Manual smoke: started a local static-JSON HTTP server serving `test/fixtures/registry/*`,
  then launched `node dist/index.js` as a real child process via `StdioClientTransport` (a
  throwaway script, not committed) with `MODULARCORE_REGISTRY_URL`/
  `MODULARCORE_REGISTRY_ALLOW_INSECURE=1` env vars. `listTools()` returned all 4 tool names;
  `callTool({ name: 'search_components', ... })` returned the expected fixture data with the
  untrusted-content notice. No startup errors.

## Deviations from the plan

- `extra.elicitInput` (implied by the plan's phrasing) does not exist on SDK 1.30.0's tool
  handler `extra` argument — used `server.server.elicitInput` instead (see spike section).
  No behavioral difference, purely an API-surface correction discovered by the mandated spike.
- Did not add the `semver` package for `check_updates` — the registry index schema
  (`RegistryIndexEntry.version`, from Phase 1's `@modularcore/registry`) is a single published
  version string, not a range, so plain equality is the correct comparison and `semver` isn't
  in the phase's declared dependency list (`@modelcontextprotocol/sdk`, `registry-client`,
  `zod` only). Documented in the tool description so this isn't silently surprising.
- `install_component` does not execute `npm install`/etc for the component's `dependencies` —
  the plan's Implementation Steps only say to "mostrar" (show) them in the elicitation, and
  the CLI's own `installNpmDependencies` (`packages/cli/src/install.ts`) is CLI-specific
  (`spawn`, `--ignore-scripts`, package-manager detection) with no equivalent requested for
  this phase. Documented explicitly in the tool description and README as an intentional scope
  boundary, not an oversight.

No file outside `packages/mcp-server/` was modified. `packages/cli/src/*` and
`packages/auto-seo/` were not touched.

Status: DONE
Summary: Step-0 spike confirmed SDK 1.30.0 supports elicitation as required (with one API-surface correction: `server.server.elicitInput`, not `extra.elicitInput`) and that stdio tool calls are not serialized; implemented all 4 tools plus config/README, 19/19 tests green, build/typecheck/smoke all pass.
Concerns/Blockers: none.
