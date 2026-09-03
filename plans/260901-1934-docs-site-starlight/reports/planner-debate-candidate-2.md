# Candidato 2 — Plan de implementación `docs-site-starlight`

Planificador independiente 2 de 3 (`--debate`). Basado exclusivamente en el paquete de evidencia
compartido + re-verificación directa del repo (todas las citas `file:line` de abajo se han vuelto a
comprobar con `grep`/`cat` en esta sesión, no copiadas del paquete).

**Tesis diferencial de este candidato (3 divergencias del camino obvio):**

1. **NO adoptar `starlight-versions`.** Versionado manual por carpetas de contenido paralelas +
   selector propio como override de Starlight. Justificación completa en §3.
2. **DRY duro sobre la documentación de componentes:** los README de `packages/*` son la única
   fuente de verdad y se sincronizan al build, replicando el patrón que `apps/web` ya usa
   (`apps/web/src/lib/docs.ts:8`). Cero copia manual de contenido de componentes.
3. **Dockerfile desde la raíz del repo desde el día 1**, no `Build Path = apps/docs`. Se decide
   antes de tocar Easypanel porque la sincronización de READMEs (punto 2) convierte la dependencia
   `apps/docs → packages/*` en un hecho de diseño, no en una posibilidad — el riesgo 4 del paquete
   deja de ser un riesgo y pasa a ser una decisión cerrada.

---

## 1. Goals (objetivos)

**Outcome medible:** `docs.modularcorehub.com` sirviendo en producción, desde un servicio Easypanel
propio del proyecto `iservisat`, un sitio Starlight estático en español con los 3 pilares
navegables, búsqueda funcional y selector de versión visible.

| # | Objetivo | Verificable por |
|---|---|---|
| G1 | Nuevo workspace `apps/docs` integrado en pnpm/Turborepo sin romper el pipeline actual | `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` en verde desde la raíz |
| G2 | Navegación completa de los 3 pilares con página propia por comando/tool real, cero inventados | Inventario cruzado contra `packages/cli/src/commands/` y `packages/mcp-server/src/index.ts:10-13` |
| G3 | Versionado con disparo manual del usuario, infraestructura lista y probada con una versión archivada real | `pnpm --filter @modularcore/docs snapshot-version 0.3` produce sitio con selector operativo |
| G4 | Búsqueda (Pagefind) sin mezclar versiones | Búsqueda de un término único devuelve solo resultados de la versión actual |
| G5 | Ownership reforzado: todo PR que toque CLI/MCP/Web obliga a tocar `apps/docs` | Ítem en checklist de `CONTRIBUTING.md` + plantilla de PR |
| G6 | CI existente cubre `apps/docs` sin introducir filtrado Turborepo | `.github/workflows/ci.yml` job `unit` construye y verifica `apps/docs` |
| G7 | Contenido de componentes nunca diverge del paquete publicado | El build falla si un README esperado desaparece |

**No-goals** (heredados, no reabrir): redactar el contenido final de las páginas (solo outline +
andamiaje), auth/docs premium, tocar `modularcorehub.com` o el registry HTTP, decidir si `modals`
es "oficial" según el PRD, analytics.

---

## 2. Hechos verificados que condicionan el plan

Re-verificados en esta sesión (no del paquete):

| Hecho | Evidencia |
|---|---|
| pnpm workspace incluye `apps/*` → `apps/docs` entra sin editar `pnpm-workspace.yaml` | `pnpm-workspace.yaml:3` |
| `turbo.json` task `build` ya declara `outputs: ["dist/**", ...]` → Astro cubierto sin cambios | `turbo.json:12-14` |
| CI job `unit` corre `pnpm build/typecheck/lint/format:check/test` sobre todo el monorepo | `.github/workflows/ci.yml:31-44` |
| No existe paso de deploy en Actions; tampoco plantilla de PR (`.github/` solo tiene `workflows/`) | `ls -a .github` |
| ESLint ignora `**/*.svelte` por falta de parser; hará falta el equivalente para `**/*.astro` | `eslint.config.js:19` |
| Prettier ya ignora `*.md` globalmente → el contenido MDX/MD de docs no entra en `format:check` | `.prettierignore` (bloque final) |
| `apps/web` usa el patrón `predev`/`build:registry` con script Node propio | `apps/web/package.json:7-9` |
| `apps/web` ya trata `packages/*/README.md` como única fuente de docs de componente | `apps/web/src/lib/docs.ts:8-25` |
| READMEs existentes: `ai-chat`, `auto-seo`, `mcp-server`, `media-picker`, `modals`. **NO existen** `packages/hello-core/README.md` ni `packages/cli/README.md` | `ls packages/*/README.md` |
| Los 4 playgrounds reales están en una constante única | `apps/web/src/lib/playgrounds.ts:8-13` |
| MCP registra exactamente 4 tools | `packages/mcp-server/src/index.ts:30-33` |
| CLI expone exactamente 6 comandos | `packages/cli/src/commands/{init,add,list,search,diff,update}.ts` |
| Dockerfile actual es multi-stage desde la raíz, copia `packages` completo y corre `pnpm build` | `Dockerfile:13-23` |
| Tokens de marca disponibles como CSS de variables `--mc-*` | `assets/brand-tokens.css:1-25` |
| Checklist de PR existente (5 ítems) al que hay que añadir el de ownership | `CONTRIBUTING.md:242-246` |

**Consecuencia dura:** `packages/hello-core` no tiene README. La página del catálogo para
`hello-core` se redacta a mano en `apps/docs`; no puede sincronizarse. Cualquier plan que asuma
"sincronizo los 5 READMEs" está mal.

---

## 3. Decisión de arquitectura: versionado — **manual, NO `starlight-versions`**

### Comparación seria de los dos caminos

| Eje | A: `starlight-versions` 0.10.1 | B: carpetas paralelas + selector propio |
|---|---|---|
| Coste inicial | Bajo (~2 h): instalar, `docsVersionsLoader()` en `src/content.config.ts`, config del plugin | Medio (~6-8 h): script de snapshot + `versions.json` + componente override + config de sidebar |
| Coste de mantenimiento | **Impredecible**: el propio autor declara "opinionated, early development, expect frequent breaking changes"; un solo mantenedor | Predecible: ~200 líneas de código propio, sin peer deps |
| Acoplamiento a upgrades | **Alto**: bloquea `astro`/`@astrojs/starlight` a lo que el plugin soporte (peer `>=0.39.0` hoy, sin garantía mañana) | Nulo: solo usa API pública de Starlight (colección `docs`, `components` override) |
| Aislamiento de búsqueda | **No garantizado** (riesgo 2 del paquete, sin evidencia de filtrado Pagefind) | Controlable por nosotros: excluir del índice las páginas archivadas |
| Bus factor si se abandona | Migración forzada de una colección `versions` propietaria a otra cosa | El contenido archivado son ficheros Markdown normales; migrar es mover carpetas |
| Selector de versión | Incluido | Hay que construirlo (~80 líneas Astro) |
| Frecuencia de uso real | El disparo es **manual y raro** ("yo te diré cuándo") | Igual |

### Decisión: **camino B (manual)**

Razones, por orden de peso:

1. **La frecuencia de uso no justifica la deuda de dependencia.** El versionado se dispara
   manualmente, quizá 2-4 veces al año. Adoptar una dependencia en fase temprana que puede romper
   en *cada* upgrade de Astro/Starlight para automatizar una operación trimestral es un mal cambio.
   El coste del plugin no se paga en la instalación; se paga en cada `pnpm update`.
2. **El camino B convierte el riesgo 2 (Pagefind mezclando versiones) de "riesgo abierto" en
   "decisión de diseño".** Con carpetas propias controlamos página a página qué entra en el índice.
   Con el plugin dependemos de un comportamiento no documentado ni verificado.
3. **Bus factor y reversibilidad.** Si el camino B resulta insuficiente, migrar de carpetas Markdown
   a `starlight-versions` más adelante es viable (el plugin snapshotea contenido; nuestras carpetas
   *son* snapshots). La migración inversa —salir del plugin— es mucho más cara. Elegimos el camino
   con la salida barata.
4. **KISS real.** El plugin resuelve un problema (snapshot + rutas + selector) que en nuestro caso
   es `cp -R`, un JSON y un componente. La complejidad del plugin excede la del problema.

**Argumento honesto en contra que aceptamos:** el camino B nos obliga a escribir y mantener el
selector y la lógica de mapeo de URLs entre versiones, incluido el fallback cuando una página no
existe en la versión destino. Es trabajo real (~80-120 líneas) que el plugin regala. Lo aceptamos
porque ese código no tiene superficie de rotura externa.

**Mitigación si el camino B resulta insuficiente** (p.ej. si el usuario pide diffs entre versiones o
banners automáticos por página): reevaluar `starlight-versions` en ese momento, con el contenido ya
en carpetas Markdown planas —el formato más fácil de importar a cualquier mecanismo.

### Mecanismo concreto (camino B)

```
apps/docs/src/versions.json          ← fuente única: { "current": "0.3", "archived": [] }
apps/docs/src/content/docs/**        ← versión ACTUAL, sin prefijo → URLs limpias (/cli/init/)
apps/docs/src/content/docs/v0.2/**   ← versiones archivadas (creadas por snapshot)
apps/docs/scripts/snapshot-version.mjs
apps/docs/src/components/VersionSelect.astro
```

Flujo de datos del snapshot (`pnpm --filter @modularcore/docs snapshot-version 0.3`):

```
versions.json.current (= "0.3")
      │
      ▼
copiar src/content/docs/**  (excluyendo carpetas v*/)  →  src/content/docs/v0.3/**
      │
      ├─ por cada fichero copiado: inyectar en frontmatter
      │     pagefind: false            ← excluye del índice de búsqueda  [POR VERIFICAR §4-F0]
      │     banner: { content: "Documentación archivada de la v0.3. Ver la versión actual." }
      │
      ▼
versions.json ← { "current": "<nueva>", "archived": ["0.3", ...] }
      │
      ▼
astro.config.mjs lee versions.json → añade un grupo de sidebar colapsado por versión archivada
VersionSelect.astro lee versions.json + getCollection('docs') → dropdown con fallback de ruta
```

Mapeo de URL del selector: desde `/mcp/search-components/` a v0.3 → `/v0.3/mcp/search-components/`;
si ese slug no existe en la colección, se cae a la raíz de la versión (`/v0.3/`). El componente
resuelve esto en build con `getCollection('docs')`, sin JS de cliente más allá del `onchange`.

---

## 4. Fases

Estimación total: **~28-34 h**. Prioridad P2.

### F0 — Spike de validación técnica (bloqueante, timebox 4 h)

**Por qué existe:** el plan asume comportamientos de Starlight 0.41.11 que el paquete de evidencia
**no** cubre. Ninguna fase posterior arranca sin cerrar estas incógnitas. Se ejecuta en una rama
desechable (`spike/docs-starlight`), no se mergea.

| # | Incógnita a cerrar | Cómo se valida | Si falla |
|---|---|---|---|
| S1 | Starlight 0.41.11 + Astro 7.2.10 + `@astrojs/svelte` 9.0.1 conviven con Svelte 5 del monorepo sin conflicto de peers en pnpm | `pnpm install` en un `apps/docs` mínimo + build | Fijar `svelte` en `apps/docs` vía override; si no, aplazar islas Svelte (no bloqueante para el MVP: la doc es estática) |
| S2 | `pagefind: false` en frontmatter excluye realmente la página del índice `[POR VERIFICAR]` | Build con 2 páginas, una con la flag; buscar un término único en `dist/pagefind/` | Plan B: excluir el directorio archivado del crawl de Pagefind vía `pagefind.glob`/exclusión de build; Plan C: `data-pagefind-ignore` en el layout de versión archivada |
| S3 | Override de componente Starlight (`components: { ... }` en la config) permite renderizar el componente por defecto + añadido propio `[POR VERIFICAR]` | Montar `VersionSelect.astro` importando el componente por defecto de Starlight | Renderizar el selector en el slot disponible que sí funcione (p.ej. cabecera), sin importar el default |
| S4 | `import.meta.glob('../../../packages/*/README.md', { query: '?raw' })` funciona igual desde Astro que desde SvelteKit (`apps/web/src/lib/docs.ts:8`) | Prueba directa | Fallback: el script de sync lee con `node:fs` en `prebuild` (no depende de Vite) — **este fallback es el diseño por defecto en F2**, el glob solo se explora como alternativa |
| S5 | `eslint .` y `prettier --check .` con `.astro` en el árbol: qué se rompe exactamente | Correr ambos con `apps/docs` mínimo presente | Añadir ignores (F1) |
| S6 | Build Docker desde raíz con `apps/docs` produce `dist/` estático servible | Dockerfile de spike + `docker build` local | Ajustar copiado de `packages/` |

**Criterio de éxito F0:** informe corto en `plans/260901-1934-docs-site-starlight/reports/` con
respuesta binaria a S1-S6 y el fallback elegido para cada fallo. Rama desechada.

**Rollback:** ninguno (rama desechable, cero ficheros en `develop`).

---

### F1 — Scaffolding del workspace `apps/docs` (~5 h)

**Depende de:** F0.

**Ficheros a crear:**

- `apps/docs/package.json` — nombre `@modularcore/docs`, `"private": true`. Scripts:
  `dev` (`astro dev`), `build` (`astro build`), `typecheck` (`astro check`), `preview`.
  Deps: `astro@7.2.10`, `@astrojs/starlight@0.41.11`, `@astrojs/svelte@9.0.1` (solo si S1 pasa),
  `@astrojs/check`, `sharp`.
- `apps/docs/astro.config.mjs` — `site: 'https://docs.modularcorehub.com'`,
  `defaultLocale: 'es'`, `locales: { root: { label: 'Español', lang: 'es' } }`, título, logo desde
  `assets/logo`, sidebar (F3 lo completa), `customCss: ['./src/styles/brand.css']`.
- `apps/docs/tsconfig.json` — extiende `astro/tsconfigs/strict` + alinea con `tsconfig.base.json`.
- `apps/docs/src/content.config.ts` — colección `docs` estándar de Starlight (sin loader de
  versiones: decisión §3).
- `apps/docs/src/styles/brand.css` — `@import` de `assets/brand-tokens.css` + mapeo de las
  variables `--mc-*` (`assets/brand-tokens.css:1-25`) a las variables `--sl-color-*` de Starlight.
  Tipografías Geist/Inter/Geist Mono vía `@fontsource-variable/*`, ya presentes en el lockfile
  (`apps/web/package.json:17-19`).
- `apps/docs/src/content/docs/index.mdx` — portada placeholder.
- `apps/docs/.gitignore` — `dist/`, `.astro/`.

**Ficheros a modificar** (propiedad exclusiva de F1):

- `eslint.config.js` — añadir `'**/*.astro'` y `'**/.astro/**'` al bloque `ignores`
  (`eslint.config.js:9-20`), con comentario del *porqué* (sin parser instalado), en la misma línea
  argumental que la exclusión existente de `**/*.svelte` (`eslint.config.js:19`).
- `.prettierignore` — añadir `apps/docs/.astro` y `*.astro` (KISS: no instalamos
  `prettier-plugin-astro`; el árbol ya excluye `*.svelte` del linter por el mismo motivo).
- `.gitignore` — añadir `apps/docs/src/content/docs/componentes/_generated/` (salida de F2).

**Ficheros NO tocados:** `turbo.json` (los `outputs: ["dist/**"]` de `turbo.json:12-14` ya cubren
Astro), `pnpm-workspace.yaml` (`apps/*` ya lo incluye, `pnpm-workspace.yaml:3`),
`vitest.workspace.ts` (`apps/*` descubierto, sin config = sin tests, y la raíz corre
`--passWithNoTests`).

**Criterios de éxito (verificables):**
- `pnpm install` sin conflictos de peers.
- `pnpm build` construye `apps/docs/dist/index.html`.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` en verde desde la raíz.
- Segunda ejecución de `pnpm build` reporta cache HIT de Turborepo para `@modularcore/docs`.
- `dist/pagefind/` existe (búsqueda activa por defecto en Starlight).

**Riesgo:** conflicto de versión de `svelte` entre `apps/web` y `@astrojs/svelte` (Media/Alto·Medio).
**Mitigación:** cerrado en S1; si falla, `apps/docs` no declara `@astrojs/svelte` en el MVP.

**Rollback:** borrar `apps/docs/` y revertir los 3 ficheros de config raíz. Sin efecto sobre
`apps/web` ni sobre publicación de paquetes.

---

### F2 — Sincronización DRY de documentación de componentes (~4 h)

**Depende de:** F1.

**Problema que resuelve:** `apps/web` ya define que la doc de un componente vive en
`packages/<name>/README.md` y se lee al build (`apps/web/src/lib/docs.ts:1-25`). Duplicar ese
contenido en `apps/docs` garantiza divergencia. Este es el mecanismo antideriva.

**Ficheros a crear:**

- `apps/docs/scripts/sync-package-readmes.mjs` — lee con `node:fs` (no Vite; fallback S4 elegido
  como diseño por robustez y por paridad con `apps/web/scripts/build-registry.mjs`):
  - Manifiesto explícito en el propio script:
    `[{ pkg: 'ai-chat', title: 'AI Chat' }, { pkg: 'auto-seo' }, { pkg: 'media-picker' }, { pkg: 'modals' }]`
    — **exactamente los 4 con README verificado** (`ls packages/*/README.md`).
  - Por cada entrada: leer README, **eliminar el H1** (Starlight genera el título desde frontmatter),
    inyectar frontmatter (`title`, `description`, `editUrl` apuntando al README de origen,
    `sidebar.order`) y escribir en
    `apps/docs/src/content/docs/componentes/_generated/<pkg>.md`.
  - **Falla con exit≠0 si un README del manifiesto no existe** (cumple G7).
  - Idempotente: reescribe siempre; el directorio `_generated/` está en `.gitignore`.
- `apps/docs/src/content/docs/componentes/hello-core.md` — **escrito a mano**: `packages/hello-core`
  no tiene README (verificado). Si en el futuro se añade, se mueve al manifiesto.
- `apps/docs/src/content/docs/componentes/index.mdx` — índice del catálogo con enlaces a los 4
  playgrounds reales, tomados literalmente de `apps/web/src/lib/playgrounds.ts:8-13`
  (`/playground/{ai-chat,auto-seo,media-picker,modals}` en `modularcorehub.com`, enlaces externos:
  no se duplica el playground en docs).

**Ficheros a modificar:** `apps/docs/package.json` — añadir
`"predev"` y `"prebuild"` → `node scripts/sync-package-readmes.mjs`, replicando exactamente el
patrón de `apps/web/package.json:7`.

**Flujo de datos:**
```
packages/{ai-chat,auto-seo,media-picker,modals}/README.md
        │ (prebuild, node:fs)
        ▼
apps/docs/src/content/docs/componentes/_generated/*.md   [gitignored]
        │ (colección docs de Astro)
        ▼
dist/componentes/<pkg>/index.html   +   índice Pagefind
```

**Criterios de éxito:**
- `pnpm build` genera 4 páginas en `dist/componentes/`.
- Renombrar temporalmente `packages/modals/README.md` hace fallar el build con mensaje explícito
  que nombra el fichero ausente (prueba de G7, se revierte).
- `git status` limpio tras el build (nada generado entra en el repo).
- `hello-core` aparece en el índice del catálogo y sus 4 hermanos enlazan a su playground correcto.

**Riesgo:** un README usa sintaxis Markdown que MDX/Starlight rechaza (HTML crudo, `<` sin escapar)
(Media·Media). **Mitigación:** los ficheros generados son `.md`, no `.mdx` (parser más permisivo);
si aun así falla, el script escapa los caracteres conflictivos y el spike de este fallo se acota a un
paquete concreto.

**Riesgo no resuelto:** un README optimizado para npm puede leerse mal como página de doc (enlaces
relativos al repo). **Mitigación parcial:** el script reescribe enlaces relativos a URLs absolutas de
GitHub; enlaces exóticos se documentan como deuda.

**Rollback:** borrar el script, quitar `prebuild`/`predev`, y las 4 páginas pasan a escribirse a
mano. Degradación, no rotura.

---

### F3 — Estructura de navegación y andamiaje de los 3 pilares (~8 h)

**Depende de:** F1 (F2 en paralelo posible: no comparten ficheros salvo `astro.config.mjs`, que es
propiedad de F3 — F2 solo toca `apps/docs/package.json`).

**Fusión de patrones (justificación exigida por el paquete):** docs.agentkit.best organiza por
*etapa del usuario* (Get started / Concepts / Guides / Troubleshooting); el contrato de brainstorm
exige cobertura *por pilar* (CLI/MCP/Web). No son alternativas: son dos ejes distintos. Se adopta la
espina de etapas como **primer nivel** (es la que responde a "¿por dónde empiezo?") y los pilares
como **espina de referencia** dentro de ella (responde a "¿qué hace exactamente `add`?"). Cada
sección de etapa enlaza a las páginas de pilar correspondientes; ninguna página se duplica.

```
1. Empezar            Qué es ModularCore Hub · Instalación · Inicio rápido
2. Conceptos          Modelo copy-code · Registry declarativo · Arquitectura del monorepo ·
                      Versionado y actualizaciones
3. Herramientas       CLI  → Visión general · init · add · list · search · diff · update   (6 comandos reales)
                      MCP  → Visión general (transporte stdio) · search_components ·
                             get_component · install_component · check_updates             (4 tools reales)
                      Web  → Catálogo · Endpoints del registry (/registry/*.json + tarballs)
4. Componentes        AI Chat · Auto SEO · Media Picker · Modals  (generados, F2) ·
                      Hello Core (manual) · enlaces a los 4 playgrounds
5. Guías              Instalar un componente · Actualizar componentes ·
                      Conectar el MCP a tu cliente · Contribuir a la documentación
6. Solución de problemas
7. Referencia         Índice de comandos, tools y endpoints
```

**Ficheros a crear:** un `.md`/`.mdx` por hoja del árbol anterior en
`apps/docs/src/content/docs/`, con frontmatter completo y **outline** (encabezados + qué debe
contener cada sección), sin redactar el contenido final (non-goal explícito). Total ≈ 30 páginas.

**Ficheros a modificar:** `apps/docs/astro.config.mjs` — sidebar explícito (no `autogenerate`) para
controlar orden y etiquetas en español.

**Guardarraíl anti-invención (obligatorio):** las páginas de CLI se derivan una a una de
`packages/cli/src/commands/*.ts`; las de MCP de `packages/mcp-server/src/index.ts:30-33`.
`untrusted-content.ts` y `tool-error.ts` **no** generan página; si acaso, se mencionan en Conceptos
como helpers internos, nunca como comandos de usuario.

**Criterios de éxito:**
- Script de verificación (`apps/docs/scripts/check-coverage.mjs`, integrado en `prebuild`):
  compara la lista de ficheros en `packages/cli/src/commands/` y los `register*Tool` de
  `packages/mcp-server/src/index.ts` contra las páginas existentes; falla si sobra o falta alguna.
  Esto convierte G2 en una prueba automática, no en una revisión humana.
- 0 enlaces rotos: `pnpm --filter @modularcore/docs build` + comprobación de enlaces internos.
- Búsqueda ⌘K encuentra "install_component" y no encuentra "tool-error" como comando.

**Riesgo:** el guardarraíl se rompe si la CLI adopta subcomandos anidados o el MCP registra tools
fuera de `index.ts` (Baja·Media). **Mitigación:** el script falla ruidosamente y su mensaje explica
cómo actualizar el manifiesto.

**Rollback:** el sidebar vuelve a `autogenerate`; las páginas sobrantes se borran.

---

### F4 — Versionado manual (~7 h)

**Depende de:** F3 (necesita el árbol de contenido estable) y del resultado de S2/S3 en F0.

**Ficheros a crear:**

- `apps/docs/src/versions.json` — `{ "current": "0.3", "archived": [] }`. Fuente única (DRY)
  consumida por 3 lugares: `astro.config.mjs`, `VersionSelect.astro`, `snapshot-version.mjs`.
- `apps/docs/scripts/snapshot-version.mjs` — implementa el flujo de §3. Validaciones:
  rechaza si la versión ya existe en `archived`; rechaza si el árbol de trabajo tiene cambios sin
  commitear (evita snapshots de contenido a medias); imprime el resumen de ficheros copiados.
- `apps/docs/src/components/VersionSelect.astro` — `<select>` con la versión actual + archivadas;
  mapeo de ruta con fallback a la raíz de la versión destino; `aria-label` en español; funciona sin
  framework de cliente (`onchange` → `location.assign`).

**Ficheros a modificar:**
- `apps/docs/astro.config.mjs` — registrar el override (`components: { ... }`, slot definido en S3)
  y añadir, por cada versión archivada de `versions.json`, un grupo de sidebar
  `{ label: 'v0.2 (archivada)', collapsed: true, autogenerate: { directory: 'v0.2' } }`.
- `apps/docs/package.json` — script `"snapshot-version": "node scripts/snapshot-version.mjs"`.
- `CONTRIBUTING.md` — sección corta "Publicar una versión de la documentación" con el comando y la
  advertencia de que **el disparo lo decide el usuario, nunca CI** (constraint del paquete).
  *(Propiedad compartida con F5 sobre el mismo fichero → ver §6: F4 y F5 no corren en paralelo.)*

**Decisión de UX aceptada conscientemente:** las versiones archivadas aparecen como grupos
colapsados al final del sidebar de la versión actual. Starlight no ofrece sidebars por ruta sin
plugins de terceros y **rechazamos añadir más dependencias de un solo mantenedor** por coherencia
con §3. Trade-off: sidebar algo más largo; a cambio, cero dependencias nuevas.

**Criterios de éxito:**
- `pnpm --filter @modularcore/docs snapshot-version 0.3` crea `src/content/docs/v0.3/**`, actualiza
  `versions.json` y el build sigue verde.
- El selector aparece en todas las páginas y navegar de `/cli/add/` a v0.3 aterriza en
  `/v0.3/cli/add/`.
- Navegar a una versión donde la página no existe aterriza en la raíz de esa versión (no 404).
- **G4:** buscar un término presente solo en la doc archivada devuelve 0 resultados desde la
  versión actual (mecanismo validado en S2).
- Las páginas archivadas muestran el banner "Documentación archivada".

**Riesgo 1 (heredado, parcialmente resuelto):** el aislamiento de búsqueda depende de que la
exclusión de Pagefind funcione como se espera. **Estado:** validado en S2 antes de escribir código;
si los tres planes (frontmatter / exclusión de glob / `data-pagefind-ignore`) fallan, se documenta
el defecto y se añade a cada resultado archivado un prefijo visible en el título — mitigación
cosmética, no funcional. **Se marca explícitamente como riesgo no cerrado del todo.**

**Riesgo 2:** el contenido archivado infla el tiempo de build linealmente con cada versión
(Baja·Baja a corto plazo). **Mitigación:** política de retener como máximo 3 versiones archivadas;
las más antiguas se borran (siguen en el historial de git).

**Rollback:** borrar la carpeta `v<N>/` y su entrada en `versions.json`; el sitio vuelve a
mono-versión sin tocar nada más. Es el rollback más barato de todo el plan — y fue un criterio de la
decisión §3.

---

### F5 — Ownership (CONTRIBUTING + plantilla de PR) y verificación de CI (~3 h)

**Depende de:** F1 (para que el CI ya cubra `apps/docs`) y F4 (mismo fichero `CONTRIBUTING.md`).

**Ficheros a crear:**
- `.github/pull_request_template.md` — **no existe hoy** (`ls -a .github` → solo `workflows/`).
  Replica el checklist actual (`CONTRIBUTING.md:242-246`) y añade el ítem de ownership:
  `- [ ] Si el PR cambia CLI, MCP o Web, actualiza también apps/docs en este mismo PR.`

**Ficheros a modificar:**
- `CONTRIBUTING.md` — (a) nuevo ítem en el checklist (`CONTRIBUTING.md:228-246`) idéntico al de la
  plantilla; (b) `apps/docs` añadido a "Estructura del monorepo" (`CONTRIBUTING.md:84`);
  (c) mención de la doc en "Integración continua" (`CONTRIBUTING.md:250`).
- `README.md` — el enlace a `docs.modularcorehub.com` pasa de "estará en" a activo (solo tras F6).

**CI:** *no se modifica `.github/workflows/ci.yml`.* Verificado que el job `unit`
(`.github/workflows/ci.yml:31-44`) ya ejecuta `pnpm build/typecheck/lint/format:check/test` sobre
todo el monorepo sin filtrado, y que `apps/docs` entra por `pnpm-workspace.yaml:3`. Cumple G6 con
cero cambios y respeta el constraint de "sin filtrado Turborepo nuevo". **Si F1 revelara que hace
falta un paso extra** (p.ej. instalar dependencias nativas de `sharp`), se añade un único step al job
`unit` existente, nunca un workflow nuevo.

**Criterios de éxito:**
- Un PR de prueba muestra la plantilla con el ítem de ownership.
- La checklist de `CONTRIBUTING.md` y la plantilla dicen literalmente lo mismo (DRY textual: la
  plantilla enlaza a la sección del CONTRIBUTING como fuente).
- CI verde en ese PR, con `apps/docs` construido (visible en el log de Turborepo).

**Riesgo:** el ownership es una convención social sin fuerza técnica (constraint del usuario: "vía
checklist, no automatización). **Riesgo no resuelto, aceptado por decisión del usuario** — se
documenta como tal; el único refuerzo técnico presente es indirecto (F2/F3: si cambian los comandos
o tools, `check-coverage.mjs` rompe el build).

**Rollback:** borrar la plantilla y revertir el bloque de `CONTRIBUTING.md`.

---

### F6 — Docker + despliegue Easypanel + DNS (~5 h)

**Depende de:** F1-F5 en `develop`.

**Decisión cerrada:** `Dockerfile.docs` **desde la raíz del repo**, no `Build Path = apps/docs`.
Motivo verificado, no precautorio: F2 hace que el build de `apps/docs` lea
`packages/*/README.md`; un contexto de build limitado a `apps/docs` fallaría con certeza. Esto
resuelve el riesgo 4 del paquete por diseño.

**Ficheros a crear:**
- `Dockerfile.docs` (raíz) — multi-stage, calcado del patrón de `Dockerfile:1-37`:
  - stage `build`: `node:22-bookworm-slim`, `corepack enable`, copiar
    `package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json`,
    `apps/docs/package.json`, `packages`, `assets`, luego `apps/docs`;
    `pnpm install --frozen-lockfile` + `pnpm --filter @modularcore/docs build`.
  - stage final: `nginx:alpine`, `COPY --from=build /app/apps/docs/dist /usr/share/nginx/html`,
    `EXPOSE 80`. Sin runtime Node en producción (patrón correcto para Astro estático según el
    paquete de evidencia: Easypanel no tiene tipo de servicio "static site").
- `apps/docs/nginx.conf` — `try_files` para rutas con barra final, headers de caché
  (inmutable para `/_astro/*`, corto para HTML), y `add_header` de seguridad básicos.
- `docs/` (documento de operación, ubicación según la navegación de docs existente del repo) —
  runbook del servicio: nombre `modularhub-docs`, proyecto `iservisat`, Dockerfile
  `Dockerfile.docs`, build context raíz, puerto interno 80, rama de despliegue, pasos de DNS.

**Pasos de despliegue (orden estricto):**
1. **Verificación previa bloqueante:** comprobar en el dashboard real del proyecto `iservisat` que
   el plan actual permite dominio personalizado en un **segundo** servicio (riesgo 3 del paquete,
   explícitamente **no confirmado**). Si no lo permite → parar y escalar al usuario la decisión de
   coste. Ninguna acción posterior arranca sin esto.
2. `docker build -f Dockerfile.docs .` en local + `docker run` y verificación manual del sitio.
3. Crear el servicio App `modularhub-docs` en `iservisat`, mismo repo, misma rama que `modularhub`,
   Dockerfile `Dockerfile.docs`, contexto raíz, puerto 80.
4. Registro DNS (A/CNAME) de `docs.modularcorehub.com` al servidor; esperar propagación.
5. Añadir el dominio en Easypanel → TLS automático Let's Encrypt (Traefik).
6. Verificar despliegue pull-based: push a la rama → el servicio se actualiza. **No se añade paso de
   deploy a GitHub Actions** (constraint: Easypanel tira del repo, no hay webhook desde CI).
7. Actualizar el enlace en `README.md` (F5).

**Criterios de éxito:**
- `https://docs.modularcorehub.com` responde 200 con TLS válido.
- Búsqueda ⌘K funciona en producción (Pagefind sirviéndose correctamente desde nginx).
- Una ruta profunda recargada directamente (`/mcp/get-component/`) devuelve 200, no 404.
- `modularcorehub.com` sigue en verde tras el despliegue (servicio independiente, sin efectos
  cruzados).
- Un commit a la rama de despliegue actualiza el sitio sin intervención manual.

**Riesgos:**
- **Riesgo 3 heredado, NO resuelto por este plan:** dominio personalizado en segundo servicio bajo el
  plan actual. Mitigado con un gate humano (paso 1), no eliminado.
- Imagen nginx sin configuración de rutas → 404 en recargas profundas (Media·Alta).
  **Mitigación:** `nginx.conf` explícito + prueba del criterio 3.
- Consumo de recursos del servidor con un segundo servicio (Baja·Media). **Mitigación:** la imagen
  final es nginx estático (~30 MB), huella mínima.

**Rollback:** eliminar el servicio `modularhub-docs` en Easypanel y el registro DNS. `apps/web` y
`modularcorehub.com` no se tocan en ningún paso, así que el radio de daño es nulo.

---

## 5. Grafo de dependencias y paralelismo

```
F0 (spike, bloqueante)
 └─► F1 (scaffolding + configs raíz)
      ├─► F2 (sync READMEs)     ──┐
      └─► F3 (navegación 3 pilares)┤   F2 ∥ F3 (ficheros disjuntos)
                                   └─► F4 (versionado)
                                        └─► F5 (ownership + CI)
                                             └─► F6 (Docker + Easypanel)
```

**Propiedad de ficheros (sin solapes entre fases paralelas):**

| Fichero | Fase propietaria |
|---|---|
| `eslint.config.js`, `.prettierignore`, `.gitignore` | F1 |
| `apps/docs/astro.config.mjs` | F3 (F4 lo extiende, secuencial) |
| `apps/docs/package.json` | F1 crea · F2 añade `prebuild` · F4 añade `snapshot-version` (secuencial) |
| `apps/docs/scripts/sync-package-readmes.mjs`, `componentes/**` | F2 |
| `apps/docs/src/content/docs/**` (salvo `componentes/`) | F3 |
| `apps/docs/src/versions.json`, `scripts/snapshot-version.mjs`, `components/VersionSelect.astro` | F4 |
| `CONTRIBUTING.md` | F4 (sección versionado) → F5 (checklist). **Nunca en paralelo.** |
| `.github/pull_request_template.md`, `README.md` | F5 |
| `Dockerfile.docs`, `apps/docs/nginx.conf` | F6 |
| `.github/workflows/ci.yml` | **Nadie** (sin cambios, ver F5) |
| `Dockerfile`, `apps/web/**`, `packages/**` | **Nadie** (fuera de alcance) |

---

## 6. Matriz de pruebas

| Nivel | Qué | Cómo | Fase |
|---|---|---|---|
| Unit | `snapshot-version.mjs`: idempotencia, rechazo de versión duplicada, inyección de frontmatter | Vitest en `apps/docs/` (el workspace ya descubre `apps/*`, `vitest.workspace.ts:5`) | F4 |
| Unit | `sync-package-readmes.mjs`: strip de H1, reescritura de enlaces, fallo con README ausente | Vitest | F2 |
| Unit | `check-coverage.mjs`: detecta comando/tool sobrante y faltante | Vitest con fixtures | F3 |
| Integración | Build completo: `pnpm build` genera todas las páginas esperadas | CI job `unit` (`.github/workflows/ci.yml:31`) | F1-F4 |
| Integración | Enlaces internos sin roturas | Comprobador de enlaces sobre `dist/` en `prebuild`/script | F3 |
| Integración | Aislamiento de Pagefind entre versiones (G4) | Aserción sobre el índice generado en `dist/pagefind/` | F4 |
| E2E manual | Selector de versión: navegación + fallback | Checklist en el runbook | F4 |
| E2E manual | Producción: TLS, ⌘K, rutas profundas, recarga | Checklist en el runbook | F6 |
| No regresión | `apps/web` y publicación de paquetes intactos | `pnpm build/typecheck/test` en verde + `modularcorehub.com` responde | F1, F6 |

---

## 7. Riesgos heredados que este plan **no** resuelve del todo

Declarados de forma explícita, como exige el encargo:

1. **Riesgo 3 (dominio personalizado en segundo servicio Easypanel):** no resuelto. Mitigado con un
   gate humano bloqueante en F6 paso 1. Si el plan actual no lo soporta, es una decisión de coste
   del usuario, fuera del alcance técnico del plan.
2. **Riesgo 2 (Pagefind mezclando versiones):** *reducido*, no eliminado. El camino B nos da control
   sobre el índice, pero el mecanismo concreto (`pagefind: false` en frontmatter) está marcado
   `[POR VERIFICAR]` hasta S2. Existen dos planes de respaldo y, en el peor caso, una mitigación
   cosmética que no resuelve el problema de fondo.
3. **Ownership por checklist:** sin fuerza técnica por decisión explícita del usuario. Un PR puede
   cambiar la CLI sin tocar `apps/docs`; nada lo impide. El único refuerzo real es indirecto
   (`check-coverage.mjs` rompe el build si aparece/desaparece un comando o tool, F3).
4. **Deriva de contenido en las páginas no generadas:** F2 elimina la deriva de los 4 componentes con
   README, pero las ~30 páginas de F3 (CLI, MCP, Web, guías) son texto humano sin fuente única. Solo
   la *existencia* de la página está verificada automáticamente, no su *exactitud*.
5. **Advertencia no verificada del paquete sobre build-context de Easypanel:** neutralizada por
   diseño (Dockerfile desde raíz), no verificada.
6. **APIs de Starlight asumidas** (overrides de componentes, exclusión de Pagefind): todas marcadas
   `[POR VERIFICAR]` y concentradas en F0. Si S2 y S3 fallan a la vez, F4 debe replantearse antes de
   escribir código — el spike existe precisamente para que ese descubrimiento cueste 4 h y no 7.

---

## 8. Criterios de aceptación globales (definición de "hecho")

Observables, no subjetivos. El plan está completo cuando **todos** se cumplen:

- [ ] `pnpm install && pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
      en verde desde la raíz, con `apps/docs` construido.
- [ ] CI (`.github/workflows/ci.yml`) verde en un PR contra `develop`, **sin cambios en el workflow**.
- [ ] El sitio expone exactamente 6 páginas de comando CLI, 4 de tool MCP y 0 páginas para
      `untrusted-content` / `tool-error`; `check-coverage.mjs` lo verifica en cada build.
- [ ] Las 4 páginas de componente con README se generan desde `packages/*/README.md`; borrar un
      README rompe el build.
- [ ] `hello-core` tiene página propia escrita a mano (no tiene README).
- [ ] Los 4 playgrounds enlazados coinciden con `apps/web/src/lib/playgrounds.ts:8-13`.
- [ ] `snapshot-version` produce una versión archivada navegable, con selector operativo y banner.
- [ ] Búsqueda ⌘K no devuelve resultados de versiones archivadas (o el defecto está documentado
      como riesgo aceptado con su mitigación cosmética aplicada).
- [ ] `CONTRIBUTING.md` y `.github/pull_request_template.md` incluyen el ítem de ownership de
      `apps/docs`, con el mismo texto.
- [ ] `https://docs.modularcorehub.com` responde 200 con TLS válido, búsqueda funcional y rutas
      profundas recargables.
- [ ] `modularcorehub.com` y la publicación de paquetes no han sufrido cambios ni regresiones.
- [ ] `README.md` enlaza el portal como activo.

---

## 9. Preguntas abiertas (para el usuario, no bloquean el arranque de F0)

1. **Rama de despliegue del servicio `modularhub-docs`:** ¿`main` o `develop`? El paquete dice
   "misma rama del repo" que `modularhub` pero no la nombra. Debe confirmarse antes de F6 paso 3.
2. **Versión inicial etiquetada en el selector:** ¿`0.3` (alineada con `@modularcore/mcp-server@0.3.1`)
   o un versionado propio de la documentación desacoplado de los paquetes? Afecta al valor inicial de
   `versions.json` (F4). Recomendación: versionado propio de la doc, para no atarla a la cadencia de
   publicación de 6 paquetes con versiones distintas.
3. **Política de retención de versiones archivadas:** el plan propone máximo 3. ¿Se acepta?
4. **`packages/cli` y `packages/hello-core` sin README:** ¿se crean sus README (y entran en el
   mecanismo DRY de F2) o se mantienen las páginas escritas a mano en `apps/docs`? Fuera del alcance
   actual; solo cambia el manifiesto de F2 si se decide crearlos.
