# @modularcore/cli

## 0.2.0

### Minor Changes

- Publish the registry client, CLI, and MCP server as public npm packages.

### Patch Changes

- Updated dependencies
  - @modularcore/registry@0.2.0
  - @modularcore/registry-client@0.3.0

## 0.1.2

### Patch Changes

- f239b9e: feat: wire registry-client, mcp-server and auto-seo; bump cli
- Updated dependencies [f239b9e]
  - @modularcore/registry-client@0.2.0

## 0.1.1

### Patch Changes

- b53818b: CLI thin client (`modularcore`): `init`, `add`, `list`, `search`, `diff`, `update`. Framework
  and peer-dependency compatibility gate before writing, guarded npm install
  (`--ignore-scripts` + confirmation), recursive `registryDependencies` resolution with cycle
  detection, idempotent `.env.example`. Retroactive changeset for Fase 3 (v0.3.0), which
  shipped without one — see `docs/branching-release-strategy.md`.
- Updated dependencies [b53818b]
  - @modularcore/registry@0.1.1
