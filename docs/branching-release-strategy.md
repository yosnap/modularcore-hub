# Estrategia de Branching y Releases — ModularCore Hub

Flujo Git de tres niveles **feature → develop → main**, con release por fase del plan.
Aplica al plan `plans/260818-1856-modularcore-hub-mvp-fase-1/`.

## Modelo de ramas

| Rama | Rol | Recibe cambios |
|------|-----|----------------|
| `main` | Producción / estado publicado | **Solo** vía release: merge `develop → main` + tag `vX.Y.0`. Nunca commits directos. |
| `develop` | Integración por defecto | Merge `--no-ff` de ramas de fase (tras PR/aprobación). Nunca commits directos. |
| `{tipo}/{version}-{slug}` | Trabajo por fase | Se ramifica de `develop`; abre PR **hacia `develop`**. |

**Regla de oro:** todo el contenido pasa por `develop` antes de llegar a `main`. `main` solo avanza cuando se corta una release con su tag.

## Ramas y versiones por fase

Una rama de trabajo por fase → PR a `develop` → al completar la fase, release `develop → main` + tag (bump **minor**).

| Fase | Rama | Versión / tag |
|------|------|---------------|
| 1 · Monorepo Foundation | `chore/0.1.0-monorepo-foundation` | `v0.1.0` |
| 2 · Registry Schema + Build Spike | `feat/0.2.0-registry-schema-build-spike` | `v0.2.0` |
| 3 · CLI Thin Client | `feat/0.3.0-cli-thin-client` | `v0.3.0` |
| 4 · Universal Media Picker | `feat/0.4.0-universal-media-picker` | `v0.4.0` |
| 5 · AI Chat | `feat/0.5.0-ai-chat` | `v0.5.0` |
| 6 · Website Catalog Docs Playgrounds | `feat/0.6.0-website-catalog-docs-playgrounds` | `v0.6.0` |

Fixes intermedios sobre una fase ya liberada usan patch (`fix/0.1.1-…` → `v0.1.1`).

## Dos ejes de versionado (no confundir)

El PRD §12 exige versionado semántico **por componente** con Changesets. Es un eje **distinto** del versionado de hitos del repo. Ambos coexisten:

| Eje | Qué versiona | Fuente de verdad | Ejemplos |
|-----|--------------|------------------|----------|
| **Hito de repo** (esta estrategia) | Avance del plan por fase | **Git tags** `v0.1.0..v0.6.0` en `main` | `v0.4.0` = Fase 4 liberada |
| **Paquete/componente** (§12) | Cada paquete publicable de forma independiente | **Changesets** → `package.json` de cada `packages/*` | `@modularcore/media-picker@1.0.0`, `@modularcore/cli@0.3.1` |

- El tag `vX.Y.0` marca "fase X liberada a `main`"; **no** implica que los paquetes compartan ese número.
- Los paquetes se versionan/publican con Changesets según su propio semver (independiente por paquete). `apps/*` privadas quedan fuera de Changesets (`ignore`).
- Al cortar una release de fase: primero se consumen los changesets pendientes (bump + changelog por paquete), luego se hace el merge a `main` y el tag de hito.

## Ciclo por fase (operativo)

```bash
# 1. Rama de fase desde develop
git checkout develop && git pull        # (pull solo si hay remoto)
git checkout -b feat/0.2.0-registry-schema-build-spike

# 2. Commits atómicos (Conventional Commits, sin secretos, sin referencias a IA)
#    feat(registry): schema declarativo + validación zod

# 3. PR hacia develop (requiere remoto GitHub)
gh pr create --base develop --title "feat(registry): registry schema + build spike v0.2.0"

# 4. Tras aprobación: merge --no-ff a develop
git checkout develop && git merge --no-ff feat/0.2.0-registry-schema-build-spike
git push origin develop                 # (si hay remoto)

# 5. Release de fase: develop → main + tag
git checkout main && git merge --no-ff develop -m "chore(release): v0.2.0"
git tag -a v0.2.0 -m "Release v0.2.0 — Registry Schema + Build Spike"
git push origin main --tags             # (si hay remoto)
gh release create v0.2.0 --generate-notes   # (si hay remoto)
```

## Estado actual y pendientes

- ✅ Repo con commit baseline en `main`; rama `develop` creada.
- ⏳ **Sin remoto GitHub aún.** Hasta añadir uno (`git remote add origin …`):
  - Los PRs (`gh pr create`), releases (`gh release`) y la protección de ramas quedan pendientes.
  - El flujo local funciona: ramas de fase → `merge --no-ff` a `develop` → release a `main` + tag local.
- ⏳ Al añadir remoto: aplicar protección de `main` y `develop` (revisar `~/.claude/skills/branching-avanzado/references/assets/branch-protection.json`).

## Seguridad

Sin `--force`, `branch -D` ni `reset --hard` sobre `main`/`develop` sin confirmación explícita. Nunca secretos en commits (las credenciales viven en `.env` del usuario, ver §11 del PRD).
