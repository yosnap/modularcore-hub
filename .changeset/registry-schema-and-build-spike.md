---
"@modularcore/registry": patch
---

Registry descriptor schema (zod-validated) and static build pipeline (`index.json` +
`{name}.json` + `{name}.tar.gz`), with path-traversal clamp, atomic emission, and
binary/utf8 encoding-mismatch detection. Retroactive changeset for Fase 2 (v0.2.0), which
shipped without one — see `docs/branching-release-strategy.md`.
