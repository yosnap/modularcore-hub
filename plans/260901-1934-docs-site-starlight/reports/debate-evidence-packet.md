# Paquete de evidencia compartido — Plan `docs-site-starlight` (`--debate`)

Este documento es estático: se pasa idéntico a los 3 planificadores independientes. No editar durante el debate.

## Tarea (texto verbatim del usuario, ya con el contrato de brainstorm aceptado)

Crear la documentación pública de ModularCore Hub en `docs.modularcorehub.com` usando Starlight (Astro) en un nuevo workspace `apps/docs`, siguiendo el contrato de brainstorm ya aceptado (ganador del `--ultra`, candidato E), con estos 5 ajustes acordados por el usuario después del brainstorm:

1. **Estructura inspirada en docs.agentkit.best** con selector de versión visible.
2. **Versionado**: cada cambio importante debe generar una nueva versión de la documentación. El usuario decide cuándo ("yo te diré cuando necesitamos hacer este cambio") — no se automatiza el disparo, solo la infraestructura que lo soporta.
3. **Ownership**: cualquier PR que cambie CLI, MCP o Web debe tocar `apps/docs` en el mismo PR — reforzado en `CONTRIBUTING.md`/checklist de PR.
4. **Tools MCP documentadas**: solo las 4 tools reales expuestas — `search_components`, `get_component`, `install_component`, `check_updates`. `untrusted-content.ts` y `tool-error.ts` son helpers internos, NO tools — no deben documentarse como comandos de usuario.
5. **CI/Despliegue**: integrar en el mismo job de CI existente (`.github/workflows/ci.yml`, sin filtrado por paquete de Turborepo) y desplegar como nuevo servicio Easypanel análogo a `modularhub`, apuntando a la misma rama del repo.

## Contrato de brainstorm ganador (Candidato E, resumen fiel — no reinterpretar)

**Outcome:** `docs.modularcorehub.com` sirviendo en producción (Easypanel) un portal real con los 3 pilares navegables.

**Stack:** Starlight (Astro), nuevo workspace `apps/docs` en el monorepo pnpm/Turborepo, build estático, desplegado como servicio Easypanel independiente (`modularhub-docs`) junto a `modularhub` en el proyecto `iservisat`.

**Estructura de navegación** (3 pilares con página propia por comando/tool real):
```
Introducción → Empezando
Herramientas
  ├── CLI  → init / add / list / search / diff / update (página por comando)
  ├── MCP  → search-components / get-component / install-component / check-updates (página por tool)
  └── Web  → catálogo + endpoints del registry
Playground → AI Chat / Auto-SEO / Media Picker / Modals
Componentes del catálogo → AI Chat / Auto-SEO / Media Picker / Modals / Hello Core
Referencia
```
Actualización post-brainstorm: adoptar el patrón de docs.agentkit.best (4 secciones de primer nivel por etapa de usuario: Get started / Concepts / Guides / Troubleshooting) como inspiración de organización, combinado con la cobertura obligatoria de los 3 pilares pedidos por el usuario. El planificador puede fusionar ambos patrones con criterio propio, pero debe justificar la fusión.

**i18n:** español como idioma primario (verificado: README.md y CONTRIBUTING.md del repo están en español).

**Búsqueda:** Pagefind (integrado en Starlight).

## Estructura real del repo (verificada, no reinterpretar)

- Monorepo pnpm + Turborepo + Changesets. Node ≥22.13, pnpm 11.x vía corepack.
- `apps/web` — SvelteKit 5 (Runes). Sirve catálogo + registry HTTP (`/registry/*.json` + tarballs) + playgrounds. Scripts: `dev`, `build`, `build:registry`, `typecheck`, `test`.
- `packages/cli` — `@modularcore/cli@0.2.1`, comando `modularcore`. Subcomandos reales en `packages/cli/src/commands/`: `init.ts`, `add.ts`, `list.ts`, `search.ts`, `diff.ts`, `update.ts`.
- `packages/mcp-server` — `@modularcore/mcp-server@0.3.1`, conexión **stdio** (el cliente MCP lanza el proceso). `packages/mcp-server/src/index.ts` registra exactamente 4 tools: `registerSearchComponentsTool`, `registerGetComponentTool`, `registerInstallComponentTool`, `registerCheckUpdatesTool`. `untrusted-content.ts` (string de advertencia anti-prompt-injection) y `tool-error.ts` (formateador de errores compartido) son helpers internos importados por esas 4 tools — NO son tools registradas.
- `packages/registry`, `packages/registry-client` — lógica del registry declarativo y cliente compartido.
- `packages/ai-chat`, `packages/auto-seo`, `packages/media-picker`, `packages/modals`, `packages/hello-core` — componentes del catálogo. `packages/modals` es un paquete real y versionado (`@modularcore/modals@0.2.0`, con `core/`, `ui/`, `adapters/`, `test/`, `README.md`, `docs/` propio) — confirmado por lectura directa, no un ejemplo descartable.
- Playgrounds reales: `apps/web/src/routes/playground/{ai-chat,auto-seo,media-picker,modals}/+page.svelte`, registrados en `apps/web/src/lib/playgrounds.ts`.
- No existe hoy ningún generador de docs instalado (sin Starlight/VitePress/Docusaurus fuera de `node_modules`).
- Identidad de marca (`docs/brand-guide.md`, `assets/brand-tokens.json`/`.css`): índigo `#6366F1`/`#4F46E5`, violeta acento `#8B5CF6`, tipografía Geist (UI)/Inter (body)/Geist Mono (código) vía `@fontsource`, sin coste de licencia.
- Despliegue actual: Easypanel, proyecto `iservisat`, servicio `modularhub` (app `apps/web`), Dockerfile propio en la raíz, adapter-node SvelteKit, puerto interno 3000, sin volúmenes, sin DB en MVP. README ya anuncia `docs.modularcorehub.com` como "portal oficial estará en...".
- CI existente: `.github/workflows/ci.yml` — un único job de monorepo completo (`pnpm build/typecheck/lint/format:check/test`), **sin filtrado por paquete de Turborepo**; más un job de smoke tests con proveedores reales solo en push a `develop`/`main`. **No hay paso de deploy en GitHub Actions** — Easypanel despliega tirando directamente de la rama del repo (pull-based), no vía webhook de CI.
- Estructura de docs.agentkit.best (verificada por fetch): 4 secciones de primer nivel (Get started: Installation/Onboarding/Quickstart · Concepts: Architecture/Building blocks/Advisory supervision/Runtime adapters · Guides: Kit installation/Updates/Migration · Troubleshooting: 6 categorías), selector de versión visible ("stable 2.14.0" / "beta 2.15.0-beta.6"), selector de idioma en footer, búsqueda ⌘K.

## Investigación técnica (2 investigadores, verificada vía npm/GitHub/fetch — 2026-09-01)

### Versiones exactas actuales (verificado `npm view`)
| Paquete | Versión |
|---|---|
| `astro` | 7.2.10 |
| `@astrojs/starlight` | 0.41.11 |
| `@astrojs/svelte` | 9.0.1 |

### Versionado de contenido Starlight
No hay soporte oficial. Plugin comunitario **`starlight-versions`** (npm, v0.10.1, actualizado 2026-08-26, un solo mantenedor, el propio autor lo etiqueta "opinionated, early development, expect frequent breaking changes"). Peer: `@astrojs/starlight >=0.39.0` (compatible con 0.41.11). Gestiona una colección `versions` vía `docsVersionsLoader()` en `src/content.config.ts` — snapshotea el contenido al crear una versión nueva (NO son carpetas manuales `v0.2/`, `v0.3/` como se asumió en el brainstorm; el mecanismo real es distinto, el planificador debe decidir si usa este plugin o un enfoque manual más simple/robusto dado el riesgo "early development"). Añade selector de versión al navbar. **Riesgo de adopción alto** para un plugin de un solo mantenedor en fase temprana — evaluar antes de comprometerse.

**Riesgo no resuelto:** no hay evidencia de que `starlight-versions` filtre resultados de Pagefind por versión — riesgo real de que la búsqueda mezcle contenido de v0.2 y v0.3. Tratar como spike de validación obligatorio, no asumir que el plugin lo resuelve solo.

### Svelte en Astro/Starlight
`@astrojs/svelte` 9.0.1 soporta Svelte 5 Runes desde su v6. Peers: `astro ^7.0.0`, `svelte ^5.43.6`. Integración estándar: `npx astro add svelte`, luego usar `.svelte` como islas con directivas `client:*` dentro de páginas `.mdx`/`.astro` de Starlight. Sin incompatibilidad conocida con Starlight 0.41.11.

### Turborepo + Astro
Sin gotcha oficial documentado. Patrones recomendados por la comunidad: declarar `outputs: ["dist/**"]` en el `turbo.json` del paquete; acotar `inputs` explícitamente (por defecto invalida caché con cualquier cambio en el árbol del paquete); cuidado con builds incrementales sobre `dist/` sin limpiar antes.

### Despliegue Easypanel (verificado vía docs oficiales `easypanel.io/docs`)
- Cada "App" es un servicio independiente dentro de un proyecto. Campo **Build Path** define el contexto de build y puede apuntar a un subdirectorio del monorepo (p.ej. `apps/docs`) sin construir todo el repo. **Advertencia no verificada oficialmente** (fuente secundaria): si el subdirectorio importa paquetes compartidos fuera de sí mismo, el build-context limitado puede fallar — en ese caso, construir desde la raíz con un Dockerfile específico del servicio en vez de fijar el Build Path al subdirectorio.
- TLS: Easypanel corre sobre Docker Swarm + Traefik, SSL automático vía Let's Encrypt con auto-renovación. Paso manual: crear registro DNS (A/CNAME) apuntando el subdominio al servidor, esperar propagación antes de añadir el dominio en Easypanel.
- **No existe tipo de servicio "static site" nativo** en Easypanel (solo App/Compose/Box) — el patrón correcto para Astro (build 100% estático) es un App service con Dockerfile propio multi-stage (`node` para `astro build` → copiar `dist/` a `nginx:alpine`/`caddy` como imagen final), sin runtime Node en producción.
- **Punto pendiente de verificación real (no confirmado):** la página de precios de Easypanel lista "Custom service domain" entre las features de planes de pago (Hobby+); el plan Free podría no incluirlo para un **segundo** servicio. Debe verificarse directamente en el dashboard del proyecto `iservisat` antes de dar el plan de despliegue por cerrado — riesgo a documentar, no a asumir resuelto.

## Constraints (no negociables salvo que el usuario decida lo contrario)

- Español como idioma primario de la doc.
- Starlight (Astro) como stack — decisión ya tomada, no reabrir el debate de alternativas (VitePress/Docusaurus/rutas SvelteKit) salvo hallazgo bloqueante nuevo.
- Cobertura completa y exacta de los 3 pilares con los comandos/tools/playgrounds reales listados arriba — cero comandos/tools inventados.
- Versionado con disparo manual del usuario, no automatizado por CI.
- Ownership vía checklist de PR, no vía automatización de detección de cambios.
- CI: extender `.github/workflows/ci.yml` existente sin introducir filtrado Turborepo nuevo (fuera de alcance salvo que el planificador justifique por qué es necesario).
- Despliegue: servicio Easypanel nuevo, mismo proyecto `iservisat`, mismo patrón Dockerfile que `modularhub`.

## Non-goals

- No redactar el contenido final de las páginas (solo outline + andamiaje).
- No implementar auth/docs premium.
- No tocar `modularcorehub.com` ni el registry HTTP existente.
- No resolver aquí si `packages/modals` es "oficial" según el PRD — se documenta como existe en el código.
- No decidir analytics (diferido, no bloqueante).

## Riesgos conocidos a heredar en el plan

1. `starlight-versions` es un plugin de un solo mantenedor en fase temprana — riesgo de breaking changes; el plan debe incluir una decisión explícita (adoptarlo con spike de validación previo, o implementar versionado manual más simple) y un plan de mitigación si se abandona.
2. Filtrado de Pagefind por versión no está garantizado — riesgo de búsqueda mezclando versiones.
3. Soporte de dominio personalizado en un segundo servicio Easypanel bajo el plan actual de `iservisat` no está confirmado — verificar en el dashboard real antes de dar el despliegue por cerrado.
4. Build-context de Easypanel limitado a `apps/docs` puede fallar si el paquete depende de otros workspaces del monorepo — mitigación: Dockerfile desde la raíz si hace falta.
