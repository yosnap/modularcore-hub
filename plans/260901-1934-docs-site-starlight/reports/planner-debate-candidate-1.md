---
title: "Candidato 1 — Sitio de documentación Starlight en apps/docs"
description: "Plan de 6 fases para publicar docs.modularcorehub.com con Starlight, versionado manual por snapshot y despliegue Easypanel."
status: pending
priority: P2
effort: 19h
branch: develop
tags: [docs, starlight, astro, monorepo, easypanel, versionado]
created: 2026-09-01
---

# Candidato 1 — `docs-site-starlight`

Plan independiente (modo `--debate`, candidato 1 de 3). Basado exclusivamente en el paquete de
evidencia compartido + verificación directa del repo. Todo símbolo/ruta citado abajo lleva
`file:line` verificado en esta sesión; lo no verificable en el repo va marcado `[POR VERIFICAR]`.

---

## 1. Goals (resultado esperado)

**Outcome:** `docs.modularcorehub.com` sirviendo en producción, desde un servicio Easypanel propio,
un portal Starlight estático en español con los 3 pilares (CLI / MCP / Web) navegables, búsqueda
Pagefind, selector de versión visible e infraestructura de versionado disparable a mano por el
usuario.

**Objetivos concretos:**

1. Nuevo workspace `apps/docs` (Astro 7.2.10 + `@astrojs/starlight` 0.41.11) integrado en pnpm +
   Turborepo sin romper `pnpm build/typecheck/lint/format:check/test` de raíz.
2. Arquitectura de información que fusiona el patrón de `docs.agentkit.best` (4 secciones por etapa
   de usuario) con la cobertura obligatoria de los 3 pilares.
3. Andamiaje de páginas **exacto**: 6 comandos CLI reales, **4** tools MCP reales, Web (catálogo +
   registry), 4 playgrounds, 5 componentes de catálogo, Referencia. Cero comandos/tools inventados.
4. Mecanismo de versionado **propio, manual y reversible** (decisión justificada en §4, Fase 4).
5. Ownership documental reforzado por checklist de PR (`CONTRIBUTING.md` + plantilla de PR nueva).
6. CI: el sitio entra en el job existente sin introducir filtrado Turborepo.
7. Despliegue: servicio Easypanel `modularhub-docs` en el proyecto `iservisat`, Dockerfile propio
   multi-stage con imagen final sin runtime Node.

**Non-goals** (heredados del paquete): redacción del contenido final, auth/docs premium, tocar
`modularcorehub.com` o el registry HTTP, decidir la "oficialidad" de `packages/modals`, analytics.

---

## 2. Estado verificado del repo (base del plan)

| Hecho | Evidencia |
|---|---|
| Monorepo pnpm, workspaces `packages/*` + `apps/*` | `pnpm-workspace.yaml:1-4` |
| Node ≥22.13, pnpm 11.5.1 vía `packageManager` | `package.json:6-9` |
| Scripts raíz: `build/typecheck/lint/format:check/test` delegan a turbo o a herramientas globales | `package.json:11-25` |
| `turbo.json` ya declara `outputs: ["dist/**", ...]` para `build` | `turbo.json:12-14` |
| CI monolítica, job `unit` corre build/typecheck/lint/format:check/test sin filtros | `.github/workflows/ci.yml:15-44` |
| Job `smokes` solo en push a `develop`/`main` | `.github/workflows/ci.yml:51-53` |
| Dockerfile actual = solo `apps/web`, multi-stage node→node, puerto 3000 | `Dockerfile:5-37` |
| MCP registra exactamente 4 tools | `packages/mcp-server/src/index.ts:30-33` |
| CLI expone exactamente 6 comandos | `packages/cli/src/commands/{init,add,list,search,diff,update}.ts` |
| 4 playgrounds registrados | `apps/web/src/lib/playgrounds.ts:9-12` |
| Registry HTTP servido en `apps/web/src/routes/registry/[file]/+server.ts` | ruta verificada |
| Checklist de PR existente (5 ítems, sin ítem de docs) | `CONTRIBUTING.md:228-247` |
| Sección CI en CONTRIBUTING describe los 2 jobs | `CONTRIBUTING.md:250-258` |
| No existe `.github/PULL_REQUEST_TEMPLATE.md` (solo `workflows/ci.yml`) | listado de `.github/` |
| Tokens de marca `--mc-primary-*`, `--mc-accent-violet` | `assets/brand-tokens.css:1-15` |
| Favicons y logo disponibles | `assets/favicon/`, `assets/logo/{png,svg}` |
| README ya anuncia el dominio en 3 sitios | `README.md:13,22,89` |
| ESLint ignora `**/dist/**` y `**/*.svelte` | `eslint.config.js:9-20` |
| **Prettier ignora `*.md` pero NO `.mdx` ni `.astro`** | `.prettierignore` (líneas finales) |

**Hallazgo crítico nº1 (bloqueante silencioso).** `.prettierignore` ignora `*.md` de forma global
pero no `.mdx` ni `.astro`. `pnpm format:check` (`package.json:19`) ejecuta `prettier --check .`;
Prettier sin plugin no puede inferir parser para `.astro` y **falla el job `unit` entero**
(`.github/workflows/ci.yml:41`) en cuanto exista el primer `astro.config.mjs`/`.astro`. Mitigación
obligatoria en Fase 1, no opcional.

**Hallazgo nº2.** No hace falta editar `.github/workflows/ci.yml`. Al ser un job monolítico que
llama a `pnpm build|typecheck|lint|test` de raíz y estos delegar en `turbo run <task>` sobre todo el
workspace (`package.json:12-17`), un nuevo paquete en `apps/*` entra en CI automáticamente. Esto
cumple la restricción "sin filtrado Turborepo" por construcción, sin escribir YAML nuevo.

---

## 3. Arquitectura de información (fusión agentkit + 3 pilares)

**Justificación de la fusión:** el patrón agentkit organiza por *etapa del usuario* (Get started →
Concepts → Guides → Troubleshooting), lo que funciona porque su producto es una herramienta única.
ModularCore Hub tiene **tres superficies de producto distintas** (CLI, MCP, Web) que el usuario
elige *antes* de tener un problema. Aplicar agentkit literalmente enterraría los 3 pilares dentro de
"Guides" y rompería la cobertura pedida. La fusión adoptada mantiene las etapas de agentkit en los
extremos del recorrido (entrada y salida) y coloca los pilares como eje central por superficie:

```
Empezando            (= Get started)      Introducción · Instalación · Inicio rápido
Conceptos            (= Concepts)         Registry declarativo · Copy-code · Componentes vs paquetes · Arquitectura
Herramientas         (pilares, obligatorio)
  ├── CLI            init · add · list · search · diff · update      (6 páginas)
  ├── MCP            search_components · get_component ·
  │                  install_component · check_updates                (4 páginas + Conexión stdio)
  └── Web            Catálogo · Endpoints del registry
Componentes          AI Chat · Auto-SEO · Media Picker · Modals · Hello Core
Playground           AI Chat · Auto-SEO · Media Picker · Modals
Guías                (= Guides)           Instalar un componente · Actualizar · Contribuir
Solución de problemas(= Troubleshooting)  CLI · MCP · Registry · Build/instalación
Referencia                                Glosario · Versiones de paquetes · Enlaces
```

Reglas de contenido no negociables:
- MCP: **exactamente 4 páginas de tool**. `untrusted-content.ts` y `tool-error.ts` se mencionan, si
  acaso, en `conceptos/arquitectura` como helpers internos; **nunca** como comando de usuario.
- CLI: una página por fichero real de `packages/cli/src/commands/`. Si aparece un comando nuevo en
  el código, aparece una página; no antes.
- Playground: cada página enlaza a la ruta real de `apps/web` (`/playground/<component>`), no la
  reimplementa.

---

## 4. Decisión de versionado (la decisión dura del plan)

### Opciones evaluadas

| | A. `starlight-versions` | B. Snapshot manual de directorio (**elegida**) |
|---|---|---|
| Coste inicial | Bajo (plugin + loader) | Medio (script ~120 LOC + selector) |
| Riesgo de breaking changes | **Alto** — v0.10.1, un mantenedor, autoetiquetado "early development, expect frequent breaking changes" | Nulo (ficheros MDX planos + Node script propio) |
| Filtrado Pagefind por versión | **No garantizado** (riesgo 2 del paquete) | Bajo control total: se decide qué se indexa |
| Encaje con "disparo manual del usuario" | Automatiza algo que no necesitamos automatizar | Encaje exacto: un comando que el usuario pide |
| Reversibilidad | Migrar fuera = extraer contenido de la colección del plugin | Migrar *hacia* el plugin sigue siendo posible (mismo material: MDX) |
| Superficie de dependencia en CI monolítica | Un `pnpm update` roto tumba el job `unit` completo | Ninguna |

### Decisión: **B — versionado manual por snapshot de directorio.**

Justificación (ligada a los riesgos 1 y 2 del paquete): el requisito real es "cuando yo te diga,
congela la doc actual y sigue editando la nueva". Eso es una **copia de directorio con reescritura
de enlaces**, no un sistema de versionado. Adoptar un plugin de un solo mantenedor en fase temprana
introduce un coste de mantenimiento recurrente y un riesgo de rotura de CI **para resolver un
problema que ya está resuelto por `cp -R` + un selector de 40 líneas**, y encima deja abierto el
riesgo 2 (mezcla de versiones en la búsqueda), que en B se cierra por diseño. KISS gana aquí.

**No se hace spike de `starlight-versions`.** Un spike solo tendría sentido si el plugin aportara
capacidad que B no tiene; no la aporta, y su propio autor advierte de breaking changes frecuentes.
Se documenta como alternativa reconsiderable en `apps/docs/README.md` si el volumen de versiones
creciera (criterio: >4 versiones vivas mantenidas simultáneamente).

### Diseño de B

- `apps/docs/src/content/docs/**` = versión **en desarrollo** (la "actual"), única editable.
- Congelar versión → `apps/docs/src/content/docs/v<X.Y>/**` (snapshot inmutable, read-only por
  convención + comprobación en CI).
- `apps/docs/src/versions.json` = manifiesto: `{ "current": "0.3", "archived": ["0.2"] }`.
- Script `apps/docs/scripts/snapshot-version.mjs`, expuesto como `pnpm --filter @modularcore/docs
  version:snapshot -- 0.2`:
  1. copia `src/content/docs/**` (excluyendo directorios `v*/`) a `src/content/docs/v0.2/`;
  2. reescribe enlaces internos absolutos `](/x` → `](/v0.2/x` y `link: '/x'` de sidebar;
  3. inserta en el frontmatter de cada página copiada un banner de "versión archivada" y la marca de
     exclusión de índice de búsqueda `[POR VERIFICAR: campo de frontmatter de Starlight para excluir
     de Pagefind — validar en Fase 4 antes de escribir el script]`;
  4. actualiza `src/versions.json`;
  5. es **idempotente y abortante**: si `v0.2/` ya existe, sale con error sin tocar nada.
- Selector de versión: componente propio `apps/docs/src/components/VersionSelect.astro` que lee
  `versions.json`, montado por el mecanismo de *component override* de Starlight
  `[POR VERIFICAR: nombre exacto del slot a sobrescribir en Starlight 0.41.11]`.
- Sidebar: en `astro.config.mjs`, sidebar de la versión actual `autogenerate` sobre `src/content/
  docs` excluyendo `v*/`; cada versión archivada obtiene su propio bloque `autogenerate` con
  `directory: 'v0.2'`.
- Búsqueda: **solo se indexa la versión actual**. Las versiones archivadas quedan fuera de Pagefind
  → el riesgo 2 (mezcla de resultados) se cierra por construcción, a costa de que el contenido
  archivado no sea buscable (trade-off aceptado y documentado en el banner de cada página
  archivada).

---

## 5. Fases

Grafo de dependencias:

```
F1 (scaffolding) ──┬── F2 (IA + navegación) ── F3 (andamiaje de contenido)
                   ├── F4 (versionado)            [depende de F2, no de F3]
                   ├── F5 (CI + ownership)        [depende solo de F1]
                   └── F6 (Docker + Easypanel)    [depende de F1; el DNS puede iniciarse en paralelo desde el día 0]
```

Paralelizable con ownership de ficheros disjunto: **F5** y **F6** pueden correr en paralelo con
F2/F3. F4 toca `astro.config.mjs`, que también toca F2 → **serializar F2 antes de F4**.

---

### Fase 1 — Scaffolding del workspace `apps/docs`  (3h)

**Objetivo:** paquete Astro+Starlight mínimo que compila y no rompe ninguna comprobación de raíz.

**Ficheros a crear**
- `apps/docs/package.json` — `name: "@modularcore/docs"`, `private: true`, `type: module`,
  scripts: `dev` (`astro dev`), `build` (`astro build`), `typecheck` (`astro check`), `preview`.
  Deps exactas del paquete de evidencia: `astro@7.2.10`, `@astrojs/starlight@0.41.11`. **No** se
  instala `@astrojs/svelte` en esta fase (ver "diferido" abajo).
- `apps/docs/astro.config.mjs` — `site: 'https://docs.modularcorehub.com'`, integración Starlight
  con `title`, `logo` (desde `assets/logo/svg`), `favicon`, `defaultLocale: 'es'`, `locales` con
  raíz en español, `social` (repo), `customCss` con los tokens de marca.
- `apps/docs/src/content.config.ts` — colección `docs` de Starlight.
- `apps/docs/src/styles/brand.css` — importa/replica los tokens de `assets/brand-tokens.css:1-15`
  mapeando `--mc-primary-600` → variables de acento de Starlight
  `[POR VERIFICAR: nombres de las custom properties de tema de Starlight 0.41.11]`.
- `apps/docs/public/` — copia de `assets/favicon/*`.
- `apps/docs/tsconfig.json` — extiende el de Astro; **no** extiende `tsconfig.base.json` (evita
  arrastrar reglas de Node al proyecto Astro).
- `apps/docs/README.md` — cómo arrancar, política de versionado, y la nota de "por qué no
  `starlight-versions`".
- `apps/docs/src/content/docs/index.mdx` — landing provisional (solo para que el build tenga una
  ruta).

**Ficheros a modificar**
- `.prettierignore` — añadir `apps/docs/dist/`, `apps/docs/.astro/`, `apps/docs/**/*.astro`,
  `apps/docs/**/*.mdx`. **Obligatorio**: cierra el hallazgo crítico nº1.
- `turbo.json` — *sin cambios necesarios*: `build.outputs` ya cubre `dist/**` (`turbo.json:12-14`).
  Solo si el spike de caché muestra invalidaciones espurias, acotar `inputs` en un `turbo.json`
  local de `apps/docs` (patrón recomendado en el paquete de evidencia).
- `pnpm-workspace.yaml` — *sin cambios*: `apps/*` ya lo cubre (`pnpm-workspace.yaml:3`).

**Pasos**
1. `pnpm add -w --filter` no: crear el paquete a mano con versiones fijas del paquete de evidencia,
   luego `pnpm install` en la raíz.
2. Ejecutar `pnpm --filter @modularcore/docs build` y comprobar `apps/docs/dist/index.html`.
3. Ejecutar, en este orden, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
   `pnpm test` desde la raíz. Cada fallo se corrige aquí, no más adelante.
4. Verificar que `vitest.workspace.ts` no capta `apps/docs` (si lo hiciera, excluirlo explícitamente).

**Criterios de éxito (verificables)**
- [ ] `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` verde en local.
- [ ] `apps/docs/dist/` contiene HTML estático y `pagefind/` generado.
- [ ] `pnpm --filter @modularcore/docs dev` sirve el sitio y el logo/colores de marca son visibles.
- [ ] Segunda ejecución de `pnpm build` sin cambios → turbo reporta `FULL TURBO` para `@modularcore/docs`.

**Riesgo** (prob. × impacto): Prettier/`.astro` rompe CI — **Alta × Alto** → mitigado por el cambio
en `.prettierignore` dentro de esta misma fase, verificado por el criterio 1.
**Rollback:** borrar `apps/docs/`, revertir `.prettierignore`, `pnpm install`. Cero impacto en otros
paquetes (ningún workspace lo importa).

**Diferido explícito:** `@astrojs/svelte` 9.0.1 solo se instala si una página concreta necesita una
isla interactiva. La documentación es estática; instalarlo "por si acaso" añade peers (`svelte
^5.43.6`) sin uso. Se documenta como extensión de una línea (`npx astro add svelte`).

---

### Fase 2 — Navegación e IA  (2h) · *depende de F1*

**Ficheros a modificar/crear**
- `apps/docs/astro.config.mjs` — `sidebar` completo según §3, con `autogenerate` por directorio.
- Esqueleto de directorios en `apps/docs/src/content/docs/`: `empezando/`, `conceptos/`,
  `herramientas/{cli,mcp,web}/`, `componentes/`, `playground/`, `guias/`, `solucion-problemas/`,
  `referencia/`.
- `apps/docs/src/content/docs/index.mdx` — landing definitiva con `template: splash` y 3 tarjetas de
  pilar.

**Pasos:** definir el sidebar antes de escribir páginas (evita renombrados masivos); un `.mdx`
placeholder con frontmatter `title` + `description` por cada entrada de sidebar.

**Criterios de éxito**
- [ ] `pnpm --filter @modularcore/docs build` sin ningún aviso de enlace de sidebar roto.
- [ ] La navegación renderiza las 8 secciones de §3 en el orden indicado.
- [ ] Ninguna entrada de sidebar apunta a una página inexistente (comprobado por el build).

**Riesgo:** IA discutible tras ver el resultado — Media × Bajo. **Rollback:** el sidebar es un solo
objeto en `astro.config.mjs`; reordenar es barato mientras no exista contenido redactado (por eso
esta fase va antes que F3).

---

### Fase 3 — Andamiaje de contenido de los 3 pilares  (6h) · *depende de F2*

**Ficheros a crear** (uno por página real; sin contenido final, con outline + secciones fijas):
- CLI (6): `herramientas/cli/{init,add,list,search,diff,update}.mdx` + `herramientas/cli/index.mdx`.
  Fuente de verdad: `packages/cli/src/commands/*.ts`.
- MCP (4 + 1): `herramientas/mcp/{search-components,get-component,install-component,check-updates}.mdx`
  + `herramientas/mcp/index.mdx` (incluye la conexión **stdio**: el cliente MCP lanza el proceso).
  Fuente de verdad: `packages/mcp-server/src/index.ts:30-33`.
- Web (2): `herramientas/web/{catalogo,registry-endpoints}.mdx`. Fuente:
  `apps/web/src/routes/registry/[file]/+server.ts`.
- Componentes (5): `componentes/{ai-chat,auto-seo,media-picker,modals,hello-core}.mdx`.
  `modals` se documenta como paquete real y versionado (`@modularcore/modals@0.2.0`), sin juicio de
  "oficialidad".
- Playground (4): `playground/{ai-chat,auto-seo,media-picker,modals}.mdx`, enlazando a los `href` de
  `apps/web/src/lib/playgrounds.ts:9-12`.
- Resto: `empezando/*`, `conceptos/*`, `guias/*`, `solucion-problemas/*`, `referencia/*`.

**Plantilla obligatoria por página de comando/tool:** Qué hace · Sintaxis · Parámetros · Ejemplo ·
Errores comunes · Ver también.

**Criterios de éxito**
- [ ] `ls apps/docs/src/content/docs/herramientas/cli/*.mdx | wc -l` = 7 (6 comandos + index) y cada
      nombre coincide con un fichero de `packages/cli/src/commands/`.
- [ ] `ls apps/docs/src/content/docs/herramientas/mcp/*.mdx | wc -l` = 5 (**4** tools + index).
- [ ] `grep -ril "untrusted-content\|tool-error" apps/docs/src/content/docs/herramientas/mcp/` no
      devuelve nada (helpers internos nunca documentados como tools).
- [ ] Cada `.mdx` tiene frontmatter `title` + `description` y el build no emite avisos.
- [ ] Búsqueda ⌘K encuentra "init", "install_component" y "Media Picker".

**Riesgo:** deriva entre docs y código (comando nuevo sin página) — Media × Medio → mitigado por F5
(checklist de PR). **Rollback:** borrado de ficheros individuales; sin acoplamiento.

---

### Fase 4 — Versionado manual  (4h) · *depende de F2*

**Ficheros a crear**
- `apps/docs/src/versions.json`
- `apps/docs/scripts/snapshot-version.mjs`
- `apps/docs/src/components/VersionSelect.astro`
- `apps/docs/docs/versionado.md` *(nota interna del paquete; alternativa: sección en
  `apps/docs/README.md` — preferir README para no crear un árbol de docs dentro de docs)*.

**Ficheros a modificar:** `apps/docs/package.json` (script `version:snapshot`),
`apps/docs/astro.config.mjs` (override del componente + sidebar por versión archivada).

**Pasos**
1. **Antes de escribir el script**, resolver los dos `[POR VERIFICAR]` de §4 contra la documentación
   de Starlight 0.41.11 instalada en `node_modules` (campo de frontmatter para excluir de Pagefind;
   slot de override para el selector). Si el campo de exclusión **no existe**, plan B: excluir los
   directorios `v*/` del índice mediante la configuración de Pagefind del build
   `[POR VERIFICAR]`; plan C: aceptar el índice mezclado y añadir a cada resultado archivado el
   banner de versión (degradación consciente, no bloqueante).
2. Implementar el script con reescritura de enlaces + guardas de idempotencia.
3. Prueba de humo real: congelar `0.2` sobre el contenido de F3, comprobar diff, revertir con
   `git clean` del directorio generado.

**Criterios de éxito**
- [ ] `pnpm --filter @modularcore/docs version:snapshot -- 0.2` crea `src/content/docs/v0.2/` con el
      mismo número de `.mdx` que la versión actual.
- [ ] Re-ejecutar el mismo comando falla con error explícito y **no** modifica ficheros.
- [ ] Tras el snapshot, el build pasa y el selector muestra `0.3 (actual)` y `0.2`.
- [ ] Navegar a `/v0.2/herramientas/cli/init` funciona y ningún enlace interno de esa página apunta
      fuera de `/v0.2/`.
- [ ] Buscar un término exclusivo del contenido archivado **no** devuelve resultados de `v0.2`
      (o, si se aplicó el plan C, los devuelve etiquetados).

**Riesgo 1 heredado (plugin early-dev):** *evitado*, no mitigado — no se adopta el plugin.
**Riesgo 2 heredado (Pagefind por versión):** cerrado por diseño si funciona el plan A/B; el plan C
lo deja **parcialmente sin resolver** (ver §8).
**Riesgo nuevo:** la reescritura de enlaces del script puede fallar en formas de enlace no previstas
(HTML crudo dentro de MDX, enlaces en frontmatter) — Media × Medio → mitigación: el script imprime
un informe de enlaces reescritos y **lista los enlaces no reconocidos** para revisión manual.
**Rollback:** `git rm -r apps/docs/src/content/docs/v0.2` + revertir `versions.json`. El snapshot es
puro contenido; ninguna otra fase depende de él.

---

### Fase 5 — CI y ownership documental  (1h) · *depende de F1*

**CI:** *cero cambios en `.github/workflows/ci.yml`* (hallazgo nº2). El job `unit`
(`.github/workflows/ci.yml:15-44`) ya ejecuta las 5 comprobaciones de raíz que ahora incluyen
`apps/docs` vía turbo. No se introduce filtrado por paquete, tal como exige la restricción.

**Ficheros a crear**
- `.github/PULL_REQUEST_TEMPLATE.md` — reproduce el checklist de `CONTRIBUTING.md:241-246` y añade:
  `- [ ] Si este PR cambia CLI, MCP o Web, incluye los cambios correspondientes en apps/docs.`

**Ficheros a modificar**
- `CONTRIBUTING.md` — añadir el mismo ítem al checklist (`CONTRIBUTING.md:241-246`); añadir a la
  sección "Estructura del monorepo" (`CONTRIBUTING.md:84`) la entrada `apps/docs`; ampliar la
  sección CI (`CONTRIBUTING.md:250-258`) indicando que el sitio de docs se construye en el job
  `unit`.
- `README.md` — cambiar el fraseo de "portal oficial estará en..." por el enlace vivo
  (`README.md:13,22,89`). **Se hace al final de F6**, no antes (evita anunciar un dominio caído).

**Criterios de éxito**
- [ ] Un PR de prueba muestra la plantilla con el ítem de docs.
- [ ] `CONTRIBUTING.md` menciona `apps/docs` en estructura, checklist y CI.
- [ ] El job `unit` del PR de la Fase 1 pasa en verde en GitHub Actions (no solo en local).

**Riesgo:** el checklist es un control social, no técnico — deriva docs/código posible. Aceptado por
la restricción del usuario ("ownership vía checklist, no automatización"). Sin mitigación técnica.
**Rollback:** revertir 2 ficheros de texto.

---

### Fase 6 — Dockerfile y servicio Easypanel  (3h) · *depende de F1*

**Decisión de build-context:** construir **desde la raíz** con `Dockerfile.docs` propio, no fijar el
Build Path a `apps/docs`. Motivo: `pnpm install --frozen-lockfile` exige `pnpm-lock.yaml` +
`pnpm-workspace.yaml` + los manifiestos del workspace, que están fuera de `apps/docs`. Esto elimina
de entrada el riesgo 4 del paquete en vez de descubrirlo en el primer despliegue fallido, y replica
el patrón ya probado de `Dockerfile:13-17`.

**Ficheros a crear**
- `Dockerfile.docs` (raíz), multi-stage:
  - *build*: `node:22-bookworm-slim`, `corepack enable`, copiar `package.json pnpm-lock.yaml
    pnpm-workspace.yaml turbo.json` + `apps/docs/package.json` + `assets/`, `pnpm install
    --frozen-lockfile --filter @modularcore/docs...`, copiar `apps/docs`, `pnpm --filter
    @modularcore/docs build`.
  - *runtime*: `nginx:alpine`, copiar `apps/docs/dist` a `/usr/share/nginx/html`, `EXPOSE 80`.
    Sin runtime Node en producción (patrón correcto según el paquete de evidencia: Easypanel no
    tiene tipo de servicio estático nativo).
- `apps/docs/nginx.conf` — `try_files` con 404 propio de Starlight y cabeceras de caché para
  `/_astro/` (hash en el nombre → `immutable`).

**Ficheros a modificar:** ninguno del despliegue actual. `Dockerfile` (`apps/web`) **no se toca** —
aislamiento total entre servicios.

**Pasos**
1. `docker build -f Dockerfile.docs -t modularhub-docs .` y `docker run -p 8080:80` en local.
2. **Verificación bloqueante:** entrar en el dashboard de Easypanel, proyecto `iservisat`, y
   confirmar que el plan actual permite **dominio personalizado en un segundo servicio** (riesgo 3
   del paquete). Si no lo permite → parar y escalar la decisión al usuario (opciones: subir de plan,
   o servir la doc bajo una ruta del servicio existente — esta última **cambia el outcome** y
   requiere aprobación explícita).
3. Crear registro DNS (A/CNAME) de `docs.modularcorehub.com` al servidor; esperar propagación.
4. Crear App `modularhub-docs` en `iservisat`: fuente = mismo repo/rama que `modularhub`, Build Path
   = raíz, Dockerfile = `Dockerfile.docs`, puerto interno **80**, sin volúmenes, sin variables de
   entorno secretas.
5. Añadir el dominio en Easypanel; verificar emisión TLS Let's Encrypt.
6. Actualizar `README.md` (`README.md:13,22,89`).

**Criterios de éxito**
- [ ] `curl -I https://docs.modularcorehub.com/` → `200` y certificado válido.
- [ ] `curl -I https://docs.modularcorehub.com/herramientas/mcp/check-updates` → `200`.
- [ ] Una ruta inexistente devuelve el 404 de Starlight, no el de nginx por defecto.
- [ ] `https://modularcorehub.com` sigue respondiendo igual que antes del despliegue (no regresión).
- [ ] La imagen final no contiene Node (`docker run ... node -v` falla).

**Riesgos:** dominio en segundo servicio no confirmado — **Media × Alto**, mitigado por el paso 2
como *gate* bloqueante antes de tocar DNS. Pull-based deploy: Easypanel tira de la rama, así que un
build roto en `develop` puede desplegarse aunque CI esté roja — Media × Medio, mitigado porque el
build de Docker falla y Easypanel conserva la versión anterior.
**Rollback:** borrar el servicio `modularhub-docs` y el registro DNS. `apps/web`/`modularhub` no se
tocan en ningún paso, así que el rollback no puede cascadear.

---

## 6. Matriz de pruebas

| Nivel | Qué se valida | Cómo | Fase |
|---|---|---|---|
| Unit | ninguno nuevo (contenido estático; `pnpm test` usa `--passWithNoTests`, `package.json:18`) | `pnpm test` | F1 |
| Estático | tipos y frontmatter del contenido | `pnpm typecheck` → `astro check` | F1–F3 |
| Estático | lint + formato de todo el repo, incluida la nueva app | `pnpm lint`, `pnpm format:check` | F1 |
| Integración | build completo del monorepo con el paquete nuevo | `pnpm build` en raíz | F1 |
| Integración | caché de Turborepo estable | dos `pnpm build` seguidos → `FULL TURBO` | F1 |
| Integración | snapshot de versión idempotente y enlaces reescritos | ejecución real + `git diff` | F4 |
| Integración | aislamiento de búsqueda entre versiones | consulta manual de término archivado | F4 |
| Contrato | nº de páginas CLI/MCP == nº de comandos/tools reales | `ls | wc -l` + `grep` (§ criterios F3) | F3 |
| E2E | imagen Docker sirve el sitio | `docker build` + `docker run` + `curl` | F6 |
| E2E | producción con TLS y rutas profundas | `curl -I` sobre 3 URLs | F6 |
| Regresión | `modularcorehub.com` intacto | `curl -I` antes/después | F6 |

---

## 7. Compatibilidad hacia atrás y migración

- **Datos/usuarios:** ninguno. El sitio es nuevo y no hay contenido previo que migrar.
- **Integraciones existentes:** el registry HTTP (`apps/web/src/routes/registry/[file]/+server.ts`)
  y el catálogo no se tocan. El servicio `modularhub` no se modifica; `Dockerfile` de raíz intacto.
- **Consumidores del repo:** `pnpm install` de raíz descarga ~1 dependencia grande nueva (Astro).
  Impacto: tiempo de CI del job `unit` sube (estimado +40–90 s). Aceptable; si molesta, el paso
  siguiente sería filtrado Turborepo, hoy **fuera de alcance** por restricción explícita.
- **Enlaces publicados:** `README.md:13,22,89` ya anuncian el dominio; tras F6 pasan de promesa a
  enlace vivo. Antes de F6 no se cambia nada, así que no hay ventana de enlace roto nuevo.
- **Migración futura a `starlight-versions`:** posible sin pérdida — el contenido archivado son MDX
  planos; el criterio de reconsideración es >4 versiones vivas.

---

## 8. Riesgos heredados que este plan NO resuelve del todo

1. **Filtrado de Pagefind por versión (riesgo 2).** Cerrado *solo* si existe el mecanismo de
   exclusión del índice (plan A/B de F4). Si hay que caer al **plan C**, el índice mezclará
   versiones y la mitigación será cosmética (banner de "estás viendo una versión archivada"), no
   funcional. Queda como riesgo abierto hasta el criterio de éxito correspondiente de F4.
2. **Dominio personalizado en un segundo servicio Easypanel (riesgo 3).** No se puede resolver desde
   el repo; requiere que alguien mire el dashboard de `iservisat`. El plan lo convierte en un *gate*
   bloqueante (F6, paso 2), pero si la respuesta es "no", **el outcome cambia** y hay que volver al
   usuario. Este plan no propone alternativa unilateral.
3. **Deriva docs↔código (ownership por checklist).** Por decisión del usuario no hay automatización
   de detección; un PR puede cambiar la CLI y saltarse el ítem del checklist sin que CI lo note.
   Riesgo residual permanente, aceptado.
4. **Advertencia no verificada sobre Build Path de Easypanel (riesgo 4).** El plan la **evita** (se
   construye desde la raíz), pero no la verifica; si el usuario prefiriera Build Path = `apps/docs`,
   el riesgo vuelve entero.
5. **Despliegue pull-based sin gate de CI.** Easypanel tira de la rama sin esperar a GitHub Actions.
   Un merge con docs rotas se intentará desplegar; solo lo frena el fallo del `docker build`. Fuera
   del alcance acordado (no se añade paso de deploy en Actions).
6. **Tres `[POR VERIFICAR]` de la API de Starlight 0.41.11** (custom properties de tema, slot de
   override para el selector, campo de exclusión de Pagefind). No están en el paquete de evidencia;
   se resuelven leyendo `node_modules/@astrojs/starlight` en F1/F4 antes de escribir código que
   dependa de ellos.

---

## 9. Criterios de aceptación globales (definición de "hecho")

1. `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` en verde en la raíz
   y en el job `unit` de GitHub Actions.
2. `https://docs.modularcorehub.com/` responde 200 con TLS válido y sirve el sitio Starlight.
3. Navegación con las 8 secciones de §3; los 3 pilares alcanzables desde la portada en ≤2 clics.
4. Recuento exacto: 6 páginas CLI, **4** páginas de tool MCP, 2 páginas Web, 5 de componentes,
   4 de playground. Ninguna página documenta `untrusted-content` o `tool-error` como tool.
5. Selector de versión visible en el navbar con al menos la versión actual listada; el comando
   `version:snapshot` demostrado sobre una versión de prueba y revertido.
6. Búsqueda Pagefind operativa sobre la versión actual.
7. `CONTRIBUTING.md` y `.github/PULL_REQUEST_TEMPLATE.md` contienen el ítem de ownership de docs.
8. `README.md` enlaza el dominio como recurso vivo.
9. `modularcorehub.com` y el registry HTTP sin regresiones observables.
10. Ningún secreto, token ni variable de entorno en `apps/docs`, `Dockerfile.docs` ni en el servicio
    Easypanel nuevo.

**Esfuerzo total estimado:** 19h (F1 3h · F2 2h · F3 6h · F4 4h · F5 1h · F6 3h).

---

## 10. Preguntas abiertas

1. Si el plan de Easypanel de `iservisat` **no** admite dominio personalizado en un segundo
   servicio: ¿subir de plan o replantear el hosting de la doc? (Bloquea F6; cambia el outcome.)
2. Numeración de versiones de la doc: ¿sigue la versión de la CLI (`0.2.1`), del MCP (`0.3.1`), o
   lleva su propio contador independiente? El script y `versions.json` se implementan igual, pero la
   etiqueta del selector depende de esto.
3. ¿Se acepta que el contenido de versiones archivadas quede **fuera** de la búsqueda (trade-off
   elegido en §4 para cerrar el riesgo 2), o se prefiere búsqueda global con resultados etiquetados?
4. ¿Se quiere `apps/docs` en el flujo de Changesets (`package.json:22-24`) o queda `private` y fuera
   del versionado de paquetes? (Este plan asume `private: true`, fuera de Changesets.)
