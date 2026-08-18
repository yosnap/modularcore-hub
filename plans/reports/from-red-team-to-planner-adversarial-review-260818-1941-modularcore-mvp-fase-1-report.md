# Red Team — ModularCore Hub MVP Fase 1

**Fecha:** 2026-08-18 · **Plan:** `plans/260818-1856-modularcore-hub-mvp-fase-1/`
**Revisores:** 4 hostiles (Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic)
**Total:** 27 hallazgos (3 Critical, 15 High, 9 Medium). Todos con evidencia `plan-file:line`.

## A) Hardening técnico — ACEPTADOS (no reversan decisiones del usuario; aplicables al alcance que resulte)

| # | Sev | Hallazgo | Fix | Fase |
|---|-----|----------|-----|------|
| SA1 | **Crit** | Builder lee `files[].path` sin clamp → un descriptor con `../../.env` inyecta secretos del runner al `{name}.json` PÚBLICO | Clamp `path` al root del paquete (resolve+assert prefix, rechazar `..`/abs/symlink); zod refinement; fallar build | 2 |
| AD1 | **Crit** | Schema sin `peerDependencies`/versión mínima → runes Svelte 5 / hooks React copiados rompen en proyecto incompatible | Añadir `peerDependencies`/`frameworkVersion` al descriptor; `add` lee versión instalada y aborta si no satisface | 2,4,5 |
| SA2 | High | `add` instala `dependencies` con lifecycle scripts → postinstall RCE / dependency-confusion | `--ignore-scripts` por defecto; pin semver; allowlist; confirmar paquetes+versiones | 3 |
| SA3 | High | CI inyecta secretos en push/PR → PR de fork exfiltra keys / abuso de coste | Job unit sin secretos en todo PR; smokes con secretos solo en push a rama protegida / Environment aprobado; nunca en fork | 1 |
| SA4 | High | Core AI Chat despacha `tool_calls` sin validar args (prompt-injection→SSRF) en el componente que shippea el usuario | Validar args contra schema del tool antes de dispatch; rechazar tools desconocidos; hook `confirm(toolCall)`; defaults SSRF-safe | 5 |
| FMA1 | High | Turbo no declara `static/registry/**` como output/input → cache sirve registry rancio/vacío | `build:registry.outputs` + añadir a inputs del build web; test de cache-invalidation | 1,2 |
| FMA2 | High | `hello-core` (prueba) se fuga al `index.json` de producción (glob sin exclusión) | `visibility:"internal"` en schema + filtro en builder; assert que index no lo contiene | 2 |
| FMA3 | High | `changeset version` es repo-wide → con fases 3/4/5 paralelas, consume changesets de fases no liberadas (version drift) | Serializar release por fase, o versionar por paquete al mergear cada rama (desacoplar de tag de hito); documentar | branching |
| FMA5 | High | Merges paralelos 3/4/5 colisionan en `pnpm-lock.yaml` → `--frozen-lockfile` rompe | Política rebase+regenerar lockfile antes de PR; lockfile en lista de coordinación | 1 |
| AD2 | High | `framework-detect` ambiguo en monorepo + detecta Vue/Angular (out of scope) sin gate | `add` rechaza si framework del proyecto ∉ `descriptor.frameworks`; `init` promptea ante ambigüedad | 3 |
| AD3 | High | `files[].content` inline sin `encoding` → binarios/no-UTF8 se corrompen, CRLF genera diff espurio | Añadir `encoding: utf8\|base64` por archivo; política de line-endings | 2 |
| AD4 | High | "OpenAI-compatible conmuta sin tocar core" no probada: `tool_calls`/`usage` divergen; solo se smokea OpenRouter | Degradar claim a "OpenRouter soportado, resto best-effort"; normalizar deltas/usage (`stream_options.include_usage`); smokear 2º endpoint | 5 |
| AD6 | High | Tests crop/compress "jsdom/canvas mock" son phantom: jsdom no renderiza Canvas ni OffscreenCanvas → tests pasan sin probar | Vitest browser-mode (Playwright) o `canvas` real con asserts sobre bytes/dims; prohibir mock para criterios de output | 4 |
| FMA6 | Med | Emisión no atómica del registry → `index.json` referencia tarball inexistente ante fallo a mitad | Emitir a tmp + `rename` atómico; validación post-build index↔artefactos; reconsiderar hash como gate barato | 2 |
| FMA7 | Med | `pnpm dev` sin `build:registry` sirve `/registry/*` inexistente → `add` falla opaco | `predev` corre `build:registry` (o watcher); registry-client detecta no-JSON/404 con error claro | 2,3 |
| SA5 | Med | Fuente "URL remota" hace fetch de URL arbitraria → SSRF si el core corre server-side | `https:` only, bloquear IP privadas/link-local tras DNS, revalidar redirects, cap de tamaño | 4 |
| SA6 | Med | Cloudinary unsigned preset como opción de 1ª clase → escritura abierta / abuso de storage | Default a signed (server-side); si unsigned, documentar restricciones (formatos/tamaño/folder/moderación), marcar dev-only | 4 |
| AD5 | High | Historial "backend-agnostic" sin contrato de wire (forma del `Message`, HTTP, paginación, errores) | Schema `Message` (zod) + contrato HTTP versionado; validar en borde `backend.ts`; contract-test con fixture | 5 |
| AD7 | Med | KPI <5 min ignora coste de `npm install` en frío; sin `engines`; `fetch` global asumido | `engines:{node:">=18"}` + fallo temprano si no hay `fetch`; instrumentar KPI separando red/install del tiempo del CLI | 3 |

## B) Alcance / decisiones del usuario — NO auto-aplicados (reversan decisiones explícitas; requieren voto)

| # | Sev | Hallazgo | Recorte propuesto | Choca con |
|---|-----|----------|-------------------|-----------|
| SC1 | **Crit** | MVP carga DOS flagship completos en paralelo (6-8d c/u) → riesgo real de no entregar ninguno pulido | MVP = slice vertical único (Media Picker + Registry + CLI + Website); AI Chat fast-follow v1.05 | Decisión bootstrap "MVP Fase 1 completo" |
| SC2 | High | `tools.ts` (lo más caro del core) sin consumidor real: el único playground lo DESHABILITA | Diferir function calling a v1.1; core MVP = streaming+cancel+system prompt+historial local | — |
| SC3/FMA4 | High | Smokes externos obligatorios y **bloqueantes** de release → un servicio de terceros frena fases no relacionadas; coste/flaky | Job separado no-bloqueante (o nightly/on-demand); unit+mocks = gate obligatorio | Validación S1 #6 (usuario) |
| SC4 | Med | Historial `backend` + adaptador vanilla `Web` especulativos (sin consumidor MVP; asimetría con Media Picker) | MVP = historial `local` only; cortar adaptador `web`; alinear a React+Svelte | — |
| SC5 | Med | Media Picker "biblioteca" (`provider.list` + paginación/ACL) y "presets por rol" = gold-plating | MVP = fuentes local+URL; dimensiones/calidad como opciones directas; diferir "biblioteca" a v1.1 | — |
| SC6 | Med | CLI `search` redundante (2 componentes; el PRD §17 tampoco lo lista); `diff` solapa con `update` | MVP = `init,add,list,update`; `diff` plegado en `update`; `search` a v1.1 | — |
| SC7 | Med | `type` extensible a `agent-tool` (Fase 4/backlog) anticipado en schema/zod = YAGNI | Unión cerrada de 3 (`frontend-component\|headless-core\|snippet`); añadir `agent-tool` cuando exista consumidor | PRD §6 ("anticipado desde v1") |

## Preguntas abiertas
- SC3/FMA4 (smokes bloqueantes) y SC1 (dos flagship) reversan decisiones explícitas del usuario → requieren su confirmación antes de cambiar.
- Si se corta AI Chat (SC1), SC2/SC4 y los técnicos SA4/AD4/AD5 sobre AI Chat quedan diferidos con él.
