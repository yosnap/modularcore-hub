---
"@modularcore/cli": patch
---

CLI thin client (`modularcore`): `init`, `add`, `list`, `search`, `diff`, `update`. Framework
and peer-dependency compatibility gate before writing, guarded npm install
(`--ignore-scripts` + confirmation), recursive `registryDependencies` resolution with cycle
detection, idempotent `.env.example`. Retroactive changeset for Fase 3 (v0.3.0), which
shipped without one — see `docs/branching-release-strategy.md`.
