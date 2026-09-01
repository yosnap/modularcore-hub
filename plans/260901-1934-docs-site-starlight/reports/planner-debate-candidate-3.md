# Candidato 3 — Plan de implementación `docs-site-starlight`

Modo `--debate`, planificador independiente 3/3. Basado exclusivamente en `debate-evidence-packet.md` + re-verificación directa contra el repo (todas las citas `file:line` de abajo se han comprobado en esta sesión, no copiadas del paquete).

**Tesis del candidato:** el riesgo real de este proyecto no es Starlight (stack maduro, decisión cerrada), sino los **tres puntos no verificados** — versionado con plugin inmaduro, dominio personalizado en un 2.º servicio Easypanel, y build-context. Por eso el plan (a) **arranca con una fase de spikes bloqueantes**, (b) **descarta `starlight-versions`** en favor de un mecanismo manual de ~1 script + 2 componentes, y (c) **elige el Dockerfile desde la raíz del monorepo como camino primario, no como plan B**, porque hay una razón dura y verificada para ello (ver §Hallazgo H1).

---

## Hallazgos nuevos de re-verificación (afectan a decisiones del plan)

| ID | Hallazgo | Evidencia | Impacto |
|---|---|---|---|
| **H1** | El lockfile es único y vive en la raíz (`pnpm-lock.yaml`), y el workspace se declara en `pnpm-workspace.yaml:1-4` (`packages/*`, `apps/*`). Un build-context limitado a `apps/docs` **no puede** ejecutar `pnpm install --frozen-lockfile`: no hay lockfile ni manifiesto de workspace dentro de ese subdirectorio. | `pnpm-workspace.yaml:1-4`; `pnpm-lock.yaml` (raíz) | Convierte el "plan B" del paquete de evidencia en **plan A**: Dockerfile en la raíz, Build Path `/`. El riesgo 4 heredado queda **cerrado por diseño**, no mitigado. |
| **H2** | `.prettierignore:12-14` ignora `plans/`, `docs/` y `*.md` — pero **no** `*.mdx`. Al añadir `apps/docs/src/content/docs/**/*.mdx`, `pnpm format:check` (`.github/workflows/ci.yml:40-41`) empezará a evaluarlos. | `.prettierignore:12-14`; `package.json:20` (`format:check`) | Fase 5 debe decidir explícitamente: formatear MDX o ignorarlo. Si no, la CI rompe en el primer PR de docs. |
| **H3** | ESLint flat config ignora `**/dist/**`, `**/build/**`, `**/.turbo/**`, `**/.svelte-kit/**` pero **no** `**/.astro/**` (caché de Astro). | `eslint.config.js:9-20` | Añadir `'**/.astro/**'` a `ignores` en Fase 5. |
| **H4** | `turbo.json` ya declara `build.outputs` incluyendo `dist/**` y `build.dependsOn: ["^build", "build:registry"]`. Turbo ignora tareas inexistentes en un paquete, así que `apps/docs` sin `build:registry` funciona sin tocar `turbo.json`. | `turbo.json:8-11` | **No se modifica `turbo.json`.** Ahorro de riesgo: cero cambios en el pipeline compartido. |
| **H5** | `pnpm test` en raíz es `vitest run --passWithNoTests` (`package.json:16`) con `defineWorkspace(['packages/*','apps/*'])` (`vitest.workspace.ts:4`). Un `apps/docs` sin config de vitest no rompe nada. | `package.json:16`; `vitest.workspace.ts:4` | No hace falta test runner en docs. |
| **H6** | **No existe** `.github/pull_request_template.md` (solo `.github/workflows/`). El checklist de PR vive hoy en `CONTRIBUTING.md:228-245`. | `ls -a .github/`; `CONTRIBUTING.md:228-245` | El ownership (ajuste 3) requiere **crear** la plantilla, no editar una existente. |
| **H7** | El Dockerfile actual copia `packages` **completo** y ejecuta `pnpm build` (todo el pipeline) para construir solo `apps/web` (`Dockerfile:13-23`). Replicar ese patrón para docs construiría el monorepo entero en cada deploy de docs. | `Dockerfile:13-23` | El Dockerfile de docs **no debe** copiar `packages/` ni correr `pnpm build` global (ver Fase 6). |
| **H8** | `.dockerignore:11-14` ya excluye `**/build/`, `**/dist/`, `node_modules` y `apps/web/registry-data/` del contexto. Sirve igual para el build de docs desde la raíz. | `.dockerignore:1-19` | No requiere cambios. |

---

## Goals (Objetivos)

**G1.** `docs.modularcorehub.com` sirviendo en producción, desde Easypanel (proyecto `iservisat`, servicio nuevo), un sitio Starlight estático con TLS válido.

**G2.** Navegación que fusiona el patrón de docs.agentkit.best (etapas de usuario) con la cobertura obligatoria de los 3 pilares, con **una página por comando/tool/playground real** y **cero** comandos o tools inventados.

**G3.** Andamiaje de contenido en español de España para: 6 comandos CLI (`init`, `add`, `list`, `search`, `diff`, `update`), **4** tools MCP (`search_components`, `get_component`, `install_component`, `check_updates`), pilar Web (catálogo + endpoints del registry), 5 componentes del catálogo y 4 playgrounds. Sin redactar contenido final (non-goal del paquete).

**G4.** Infraestructura de versionado con **disparo manual del usuario**, selector de versión visible, sin dependencias de terceros inmaduras, y sin contaminación cruzada de la búsqueda entre versiones.

**G5.** `apps/docs` integrado en el job `unit` existente de `.github/workflows/ci.yml` sin introducir filtrado de Turborepo y sin romper `build`/`typecheck`/`lint`/`format:check`/`test`.

**G6.** Ownership documental reforzado: todo PR que toque CLI/MCP/Web declara explícitamente si tocó `apps/docs`.

**Fuera de objetivo (heredado):** contenido final redactado, auth/docs premium, tocar `modularcorehub.com` o el registry HTTP, resolver el estatus "oficial" de `packages/modals`, decidir analytics.

---

## Decisiones de arquitectura (y su justificación)

### D1 — Versionado: **manual, sin `starlight-versions`**

**Decisión: NO adoptar `starlight-versions`.** Se implementa un mecanismo manual de *snapshot congelado*.

Justificación, punto por punto contra el paquete de evidencia:

1. **El valor del plugin es su automatización, y aquí no se usa.** El constraint dice "versionado con disparo manual del usuario, no automatizado por CI". El plugin aporta un CLI de snapshot + un selector; nosotros necesitamos exactamente eso, y ambas piezas son ~150 líneas de código propio. Pagar una dependencia de un solo mantenedor, autoetiquetada "*opinionated, early development, expect frequent breaking changes*", para ahorrar 150 líneas es un mal cambio de riesgo.
2. **El riesgo 2 (Pagefind mezclando versiones) no está resuelto por el plugin y sí por nuestro diseño.** Con el mecanismo manual decidimos explícitamente qué se indexa: **solo la versión actual**. Las versiones archivadas se sirven con un aviso de "documentación archivada" y quedan fuera del índice de búsqueda. Riesgo 2 → cerrado por diseño, no delegado a un tercero.
3. **Coste de salida asimétrico.** Con el enfoque manual el contenido sigue siendo Markdown/MDX plano en carpetas: si algún día `starlight-versions` madura, migrar es un `git mv` + config. Al revés (adoptar el plugin y luego abandonarlo tras un breaking change) implica desmontar una colección `versions` con `docsVersionsLoader()` y su modelo de datos propio.
4. **El upgrade de Starlight deja de estar acoplado a un tercero.** Con el plugin, cada `@astrojs/starlight` mayor queda bloqueado hasta que el mantenedor único actualice el peer `>=0.39.0`.

**Mecanismo elegido (KISS):**

```
apps/docs/src/content/docs/           ← versión ACTUAL (única editable, única indexada)
apps/docs/src/content/docs/v0.2/      ← snapshot congelado (solo lectura, sin indexar)
apps/docs/versions.json               ← manifiesto: [{ slug, label, current }]
apps/docs/scripts/freeze-version.mjs  ← script de congelado (lo ejecuta el usuario a petición)
```

`freeze-version.mjs <slug>`: copia el árbol actual a `src/content/docs/<slug>/`, inyecta en el frontmatter de cada página copiada la marca de archivado + la exclusión de indexado, y añade la entrada a `versions.json`. Idempotente y abortando si el destino existe.

El selector de versión (`VersionSelect.astro`) se alimenta de `versions.json` y navega preservando la ruta relativa cuando existe en la versión destino; si no existe, cae a la portada de esa versión.

**Riesgo residual asumido:** las versiones archivadas **no son buscables**. Es una degradación consciente y documentada, preferible a resultados de búsqueda que mezclan versiones sin que el usuario lo sepa. Se documenta en la página de la propia doc.

### D2 — Fusión de estructura (agentkit + 3 pilares)

Se conserva la **espina de 4 etapas de usuario** de docs.agentkit.best y se aloja la cobertura obligatoria de los 3 pilares dentro de una sección **Referencia** expandida. Resultado: 5 secciones de primer nivel.

```
Empezar            (Get started)  → Introducción · Instalación · Inicio rápido
Conceptos          (Concepts)     → Arquitectura · Los 3 pilares · Componentes headless · Versionado de la doc
Referencia         (pilares)      → Herramientas (CLI · MCP · Web) · Componentes del catálogo · Playground
Guías              (Guides)       → Instalar un componente · Actualizar componentes · Migrar entre versiones
Solución de problemas (Troubleshooting)
```

**Justificación de la fusión:** las 4 etapas de agentkit son un eje *por madurez del usuario*; los 3 pilares del usuario son un eje *por superficie de producto*. Mezclarlos al mismo nivel produciría un sidebar de 8 entradas de primer nivel con solapamiento semántico (¿"CLI" es una etapa o una superficie?). Anidar las superficies bajo **Referencia** mantiene los 5 slots de primer nivel de agentkit, no pierde ni una sola página exigida, y hace que "una página por comando/tool" caiga naturalmente en el sitio donde el usuario ya espera contenido exhaustivo.

### D3 — Despliegue: Dockerfile multi-stage **desde la raíz del monorepo**

Directo, no como fallback. Motivo duro: **H1** (lockfile único en raíz). Imagen final `nginx:alpine` sirviendo `dist/` estático, **sin runtime Node en producción** (el paquete confirma que Easypanel no tiene tipo de servicio "static site" nativo).

---

## Dependencias entre fases

```
F0 (spikes, bloqueante)
 ├─ S1 dominio ─────────────────────────────────► F6
 ├─ S2 build raíz ──────────────────────────────► F6
 └─ S3 Starlight+versionado ───► F1 ─► F2 ─► F3 ─► F4 ─► F5 ─► F6
```

`F3` (contenido) y `F5` (CI/ownership) pueden solaparse parcialmente: no comparten ficheros. `S1` y `S2` pueden correr en paralelo con `F1`–`F4` **siempre que F6 no se dé por buena hasta que ambos estén en verde**.

**Propiedad de ficheros (sin solapes entre fases):**

| Fase | Ficheros que posee en exclusiva |
|---|---|
| F1 | `apps/docs/package.json`, `astro.config.mjs`, `tsconfig.json`, `src/content.config.ts`, `.gitignore` |
| F2 | `apps/docs/src/styles/*`, `src/components/*`, `public/*`, bloque `sidebar` de `astro.config.mjs` |
| F3 | `apps/docs/src/content/docs/**` |
| F4 | `apps/docs/versions.json`, `apps/docs/scripts/freeze-version.mjs`, `src/components/Version*.astro` |
| F5 | `.github/workflows/ci.yml`, `.prettierignore`, `eslint.config.js`, `CONTRIBUTING.md`, `.github/pull_request_template.md` |
| F6 | `Dockerfile.docs`, `apps/docs/docker/nginx.conf`, `docs/deploy-docs.md` |

Colisión controlada: F2 y F1 tocan `astro.config.mjs`. Mitigación: F1 lo crea con el bloque `starlight({})` mínimo; F2 solo añade `sidebar`, `customCss`, `components`, `logo`. Secuenciales, nunca en paralelo.

---

## Fases

### F0 — Spikes bloqueantes (antes de comprometer nada)

**Objetivo:** convertir los 4 riesgos heredados en hechos verificados. Ninguna otra fase se da por cerrada mientras un spike siga en rojo.

#### S1 — Dominio personalizado en un 2.º servicio Easypanel *(riesgo heredado 3)*

- **Quién:** requiere acceso al dashboard real de Easypanel del proyecto `iservisat`. **Es un paso del usuario**, no automatizable desde el repo.
- **Pasos:** abrir el proyecto `iservisat` → crear un App service de prueba (o inspeccionar la pantalla Domains del servicio existente `modularhub`) → comprobar si la acción "Add domain / Custom service domain" está disponible para un **segundo** servicio bajo el plan contratado actual.
- **Salida esperada:** una de estas 3 respuestas registradas en `docs/deploy-docs.md`: (a) disponible sin cambios; (b) disponible solo tras upgrade de plan; (c) no disponible.
- **Plan B si falla (b/c):**
  - **B1 (preferido):** upgrade del plan Easypanel al mínimo que liste "Custom service domain" (Hobby+ según la página de precios). Decisión de coste → **la toma el usuario**, no el plan.
  - **B2 (sin coste, degradado):** servir la doc en la ruta `modularcorehub.com/docs` mediante regla de proxy/ruta del servicio existente en vez de subdominio propio. Coste: pierde el subdominio anunciado en el README; obliga a `base: '/docs'` en `astro.config.mjs` y a revisar todos los enlaces internos. **No se implementa salvo que S1 devuelva (c) y el usuario rechace B1.**
  - **B3 (temporal):** publicar en el dominio interno que Easypanel asigna por defecto al servicio, y añadir el dominio propio cuando se resuelva el plan. Permite desbloquear F6 sin bloquear todo el proyecto.
- **Criterio de éxito:** respuesta (a), (b)+decisión del usuario, o (c)+B2/B3 aceptado explícitamente. **Sin esto, F6 no se cierra.**

#### S2 — Build desde la raíz del monorepo *(riesgo heredado 4)*

- **Hipótesis a validar:** `docker build -f Dockerfile.docs .` desde la raíz produce una imagen que sirve `dist/` correctamente, y el `pnpm install` filtrado por el workspace de docs no arrastra el build de `apps/web` ni el binario nativo de `canvas`.
- **Pasos:**
  1. Escribir el `Dockerfile.docs` borrador (contenido en F6).
  2. `docker build -f Dockerfile.docs -t modularhub-docs:spike .` en local (macOS).
  3. `docker run --rm -p 8080:80 modularhub-docs:spike` y comprobar que la portada responde 200 y que un enlace profundo del sidebar resuelve.
  4. Medir tiempo de build y tamaño de imagen (objetivo informativo, no gate).
- **Criterio de éxito:** imagen construye en local, sirve `index.html` y una página anidada, y **no** contiene runtime Node.
- **Plan B si falla:** si el `install` filtrado resulta inviable, caer a `pnpm install --frozen-lockfile` completo en el stage de build (más lento, funcionalmente idéntico) — es exactamente lo que hace hoy `Dockerfile:17`. Si aun así falla por `canvas` (dependencia nativa, ver `Dockerfile:3-5`), usar `node:22-bookworm-slim` en el stage de build (no Alpine), igual que el Dockerfile actual.
- **Nota:** no se contempla el camino "Build Path = `apps/docs`" porque **H1** lo descarta por evidencia, no por precaución.

#### S3 — Starlight + versionado manual (spike técnico, ~1 sesión)

Proyecto desechable fuera del repo (`/private/tmp/.../scratchpad`), no en `apps/docs`:

1. `astro@7.2.10` + `@astrojs/starlight@0.41.11` + `@astrojs/svelte@9.0.1`, 3 páginas de prueba y una isla `.svelte` con Runes dentro de `.mdx`.
2. Duplicar el árbol de contenido a un subdirectorio `v0.2/` y comprobar que Starlight lo enruta y lo muestra en un grupo de sidebar separado.
3. **Verificar el mecanismo de exclusión de Pagefind para las páginas archivadas.** El paquete de evidencia no documenta cuál es el mecanismo soportado — se prueban por orden y se adopta el primero que funcione: (i) campo de frontmatter de Starlight que desactive el indexado por página `[POR VERIFICAR]`; (ii) atributo `data-pagefind-ignore` inyectado vía override de componente de Starlight; (iii) opción de exclusión en la config de Pagefind.
4. Verificar que un override de componente de Starlight permite renderizar el selector de versión en el chrome del sitio.
- **Criterio de éxito:** una consulta de búsqueda cuyo término existe **solo** en `v0.2/` devuelve **0 resultados**. Ese es el gate.
- **Plan B si (i)-(iii) fallan todos:** ejecutar `astro build` y **borrar del `dist/` las páginas archivadas del índice Pagefind mediante un post-build script**, o —última opción— aceptar y **documentar** que la búsqueda cubre todas las versiones, mostrando la versión en cada resultado. Se anota como riesgo residual asumido, nunca se deja silencioso.

**Riesgo de la fase:** medio/alto impacto (bloquea F6), baja probabilidad de fallo total. Mitigación: S1 y S2 se lanzan **el primer día**, en paralelo con S3.

---

### F1 — Scaffolding del workspace `apps/docs`

**Ficheros a crear:**

- `apps/docs/package.json` — `{ "name": "docs", "private": true, "type": "module" }`, scripts `dev` (`astro dev`), `build` (`astro build`), `preview`, `typecheck` (`astro check`). Deps fijadas a las versiones verificadas: `astro@7.2.10`, `@astrojs/starlight@0.41.11`, `@astrojs/svelte@9.0.1`, `svelte@^5.43.6` (peer verificado), `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `@fontsource-variable/inter` (mismas familias que `apps/web/package.json:18-20`, sin coste de licencia).
- `apps/docs/astro.config.mjs` — mínimo: `site: 'https://docs.modularcorehub.com'`, integraciones `starlight({ title, defaultLocale: 'es', locales: { root: { label: 'Español', lang: 'es' } } })` y `svelte()`.
- `apps/docs/tsconfig.json` — extiende el de Astro.
- `apps/docs/src/content.config.ts` — colección `docs` con el loader de Starlight.
- `apps/docs/.gitignore` — `dist/`, `.astro/`.

**Pasos:**
1. Crear el directorio. `apps/*` ya está en `pnpm-workspace.yaml:3` → no se toca.
2. `pnpm install` en la raíz.
3. `pnpm --filter docs build` y luego `pnpm build` (raíz) para confirmar que Turbo lo recoge.
4. Confirmar **H4**: no hace falta editar `turbo.json`.

**Criterios de éxito verificables:**
- `pnpm --filter docs dev` sirve la portada en local.
- `pnpm build` en la raíz produce `apps/docs/dist/index.html`.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` en la raíz siguen en verde (aún sin los ajustes de F5 — si `format:check` falla aquí, es exactamente **H2** y se resuelve en F5).
- `git diff turbo.json` vacío.

**Riesgo:** bajo. **Rollback:** `rm -rf apps/docs && pnpm install`. Sin efectos fuera del directorio.

---

### F2 — Marca, i18n, navegación y islas Svelte

**Ficheros:**
- `apps/docs/src/styles/brand.css` — importa/replica los tokens de `assets/brand-tokens.css:1-30` (índigo `--mc-primary-500 #6366f1` / `--mc-primary-600 #4f46e5`, violeta `--mc-accent-violet #8b5cf6`) mapeados a las variables de tema de Starlight; tipografías Geist (UI) / Inter (body) / Geist Mono (código) vía `@fontsource-variable`.
- `apps/docs/public/` — favicon y logo desde `assets/favicon/` y `assets/logo/`.
- `apps/docs/astro.config.mjs` (edición) — `customCss`, `logo`, y el `sidebar` completo con las 5 secciones de **D2**.

**Pasos:**
1. Definir el `sidebar` con las 5 secciones y todos los slugs de F3 (enlaces primero, contenido después: así el build falla ruidosamente si falta una página).
2. Aplicar tokens de marca y verificar contraste en tema claro y oscuro.
3. Isla Svelte de prueba con `client:visible` dentro de una página `.mdx` para validar la integración en el proyecto real (S3 ya la validó en aislado).

**Criterios de éxito:**
- Sidebar renderiza las 5 secciones de primer nivel; `astro build` no reporta enlaces del sidebar rotos.
- La isla Svelte hidrata en el navegador (interacción observable, no solo render).
- El color primario del sitio coincide exactamente con `#4f46e5` inspeccionado en el DOM.
- Búsqueda ⌘K de Pagefind abre y devuelve resultados.

**Riesgo:** bajo. **Rollback:** revertir `astro.config.mjs` al estado F1 y borrar `src/styles/`, `src/components/`.

---

### F3 — Andamiaje de contenido de los 3 pilares

**Reglas duras (cero invención):** todo comando/tool/playground documentado debe existir en el código. Lista cerrada y re-verificada en esta sesión:

| Pilar | Elementos reales | Evidencia |
|---|---|---|
| CLI (`@modularcore/cli`, binario `modularcore`) | `init`, `add`, `list`, `search`, `diff`, `update` — **6** | `ls packages/cli/src/commands/` → `add.ts diff.ts init.ts list.ts search.ts update.ts` |
| MCP (`@modularcore/mcp-server`, stdio) | `search_components`, `get_component`, `install_component`, `check_updates` — **4** | `packages/mcp-server/src/index.ts:30-33` (`registerSearchComponentsTool`, `registerGetComponentTool`, `registerInstallComponentTool`, `registerCheckUpdatesTool`) |
| Web | catálogo + endpoints del registry HTTP (`/registry/*.json` + tarballs) | paquete de evidencia + `apps/web` |
| Playgrounds | `ai-chat`, `auto-seo`, `media-picker`, `modals` — **4** | `apps/web/src/lib/playgrounds.ts:8-12`; `ls apps/web/src/routes/playground/` |
| Componentes del catálogo | `ai-chat`, `auto-seo`, `media-picker`, `modals`, `hello-core` — **5** | `ls packages/` |

**Prohibición explícita (ajuste 4 del usuario):** `untrusted-content.ts` y `tool-error.ts` son helpers internos importados por esas 4 tools. **No** aparecen como páginas de tool ni en el sidebar. Como máximo se mencionan dentro de la página de Conceptos sobre seguridad/errores del MCP, etiquetados como internos.

**Ficheros a crear** (todos bajo `apps/docs/src/content/docs/`, en español de España, con frontmatter `title` + `description`; contenido = outline + andamiaje, **no** redacción final):

```
index.mdx
empezar/{introduccion,instalacion,inicio-rapido}.md               3
conceptos/{arquitectura,los-tres-pilares,componentes-headless,versionado}.md   4
referencia/herramientas/cli/{index,init,add,list,search,diff,update}.md        7
referencia/herramientas/mcp/{index,conexion-stdio,search-components,
        get-component,install-component,check-updates}.md                      6
referencia/herramientas/web/{index,catalogo,endpoints-registry}.md             3
referencia/componentes/{index,ai-chat,auto-seo,media-picker,modals,hello-core}.md  6
referencia/playground/{index,ai-chat,auto-seo,media-picker,modals}.md          5
guias/{instalar-un-componente,actualizar-componentes,migrar-entre-versiones}.md 3
solucion-de-problemas/{index,instalacion,cli,mcp,registry}.md                  5
```
**Total: 43 páginas.**

**Pasos:**
1. Generar el árbol con el frontmatter y los encabezados de sección de cada página (Qué hace / Uso / Opciones / Ejemplo / Errores frecuentes para comandos y tools).
2. Cada página de comando CLI enlaza a su fuente real (`packages/cli/src/commands/<cmd>.ts`); cada página de tool MCP a `packages/mcp-server/src/tools/<tool>.ts`.
3. La página `conexion-stdio.md` documenta que el transporte es **stdio** (el cliente MCP lanza el proceso) — hecho verificado, no inventar HTTP/SSE.
4. Las páginas de playground enlazan a las rutas reales de `apps/web/src/routes/playground/*` — **no** se duplica el playground en la doc (non-goal: no tocar `modularcorehub.com`).
5. `packages/modals` se documenta **como existe en el código** (`@modularcore/modals@0.2.0`), sin pronunciarse sobre su estatus "oficial" (non-goal).

**Criterios de éxito verificables:**
- Conteo automático: `find apps/docs/src/content/docs -name '*.md*' | wc -l` = 43.
- Grep de control: `grep -rl "untrusted-content\|tool-error" apps/docs/src/content/docs/referencia/herramientas/mcp/` devuelve **0 páginas de tool**.
- Correspondencia 1:1 verificable: por cada fichero en `packages/cli/src/commands/*.ts` existe `referencia/herramientas/cli/<nombre>.md`, y por cada `register*Tool` de `packages/mcp-server/src/index.ts:30-33` existe su página.
- `astro build` sin advertencias de enlaces internos rotos.

**Riesgo:** medio (volumen). **Mitigación:** el sidebar de F2 se escribe antes → el build falla si falta cualquier página. **Rollback:** borrar `src/content/docs/` (aislado, no afecta a config ni a CI).

---

### F4 — Infraestructura de versionado (manual)

**Ficheros:**
- `apps/docs/versions.json` — `[{ "slug": "current", "label": "0.3 (actual)", "current": true }]` (estado inicial: una sola versión).
- `apps/docs/scripts/freeze-version.mjs` — script Node puro, sin dependencias.
- `apps/docs/src/components/VersionSelect.astro` — selector alimentado por `versions.json`, montado vía override de componente de Starlight.
- `apps/docs/src/components/ArchivedBanner.astro` — aviso permanente en páginas archivadas.
- `apps/docs/src/content/docs/conceptos/versionado.md` (creado en F3, **contenido definitivo aquí**) — explica el modelo al lector, incluida la limitación de búsqueda.
- `CONTRIBUTING.md` — sección "Congelar una versión de la documentación" (edición en F5, para no partir la propiedad de fichero; ver tabla de propiedad).

**Comportamiento de `freeze-version.mjs <slug> <label>`:**
1. Aborta si `src/content/docs/<slug>/` ya existe o si `<slug>` colisiona con un directorio de sección de primer nivel.
2. Copia recursivamente el contenido actual (excluyendo los directorios de versiones ya congeladas listados en `versions.json`).
3. En cada fichero copiado inyecta en el frontmatter la marca de archivado y el mecanismo de exclusión de indexado adoptado en **S3**.
4. Añade la entrada a `versions.json`.
5. **No** hace commit ni tag: el disparo y la publicación son del usuario (constraint).

**Pasos:**
1. Implementar script + componentes.
2. Ensayo en rama desechable: congelar una `v0.2` de prueba, construir, verificar el gate de búsqueda de S3, y **descartar la rama**. No se congela ninguna versión real en este plan (el usuario decide cuándo).

**Criterios de éxito verificables:**
- Ejecutar el script dos veces con el mismo slug → la segunda aborta con error, sin modificar nada.
- Tras un congelado de prueba: el selector muestra 2 entradas y navegar preserva la ruta.
- **Gate crítico:** buscar un término presente solo en la versión archivada devuelve 0 resultados (o, si S3 cayó al plan B documentado, los resultados etiquetan la versión).
- Las páginas archivadas muestran el banner en el 100% de las rutas.

**Riesgo:** medio. Concentrado en el gate de Pagefind, ya mitigado por S3. **Rollback:** el mecanismo es puramente aditivo — borrar el directorio de versión y su entrada en `versions.json` restaura el estado anterior por completo. Sin migración de datos, sin estado persistente.

**Compatibilidad hacia atrás:** el sitio no tiene aún usuarios ni URLs publicadas, así que no hay rutas que preservar. Una vez publicado, la regla es: **las rutas de la versión actual viven en la raíz y nunca se mueven**; congelar añade rutas nuevas bajo `/<slug>/`, jamás reescribe las existentes. Eso mantiene estables los enlaces externos y los resultados de buscadores.

---

### F5 — CI, calidad y ownership

**Ficheros a modificar/crear:**
- `.github/workflows/ci.yml` — **verificar que no requiere cambios**. El job `unit` (`ci.yml:15-44`) ejecuta `pnpm build/typecheck/lint/format:check/test` sobre todo el monorepo sin filtrado de Turborepo; `apps/docs` entra solo. **Cambio esperado: ninguno.** Si el gate falla, se corrige en la config del paquete, no añadiendo pasos al workflow (constraint del usuario).
- `.prettierignore` — resolver **H2**. Decisión: añadir `*.mdx` junto a `*.md` (línea 14), coherente con la política ya existente de "Markdown de planificación/documentación: formato gestionado por sus propios skills" (`.prettierignore:12`). Alternativa descartada: formatear MDX con Prettier — introduce ruido de formato en cada PR de contenido sin beneficio.
- `eslint.config.js` — resolver **H3**: añadir `'**/.astro/**'` a `ignores` (`eslint.config.js:9-20`).
- `.github/pull_request_template.md` — **crear** (H6).
- `CONTRIBUTING.md` — ampliar el checklist de `CONTRIBUTING.md:240-245` y añadir la sección de congelado de versión de F4.

**Ownership (ajuste 3 del usuario) — checklist, no automatización:**

Nueva casilla en ambos sitios (plantilla de PR + `CONTRIBUTING.md`), con redacción que fuerza una decisión consciente:

> - [ ] Si este PR cambia el comportamiento de **CLI**, **MCP** o **Web**, se ha actualizado `apps/docs` en este mismo PR (o se justifica abajo por qué no aplica).

**Pasos:**
1. Aplicar `.prettierignore` y `eslint.config.js`.
2. Correr localmente la secuencia exacta de la CI (`CONTRIBUTING.md:232-238`): `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`.
3. Crear la plantilla de PR replicando el checklist existente + la casilla nueva.
4. Actualizar `CONTRIBUTING.md`: casilla nueva, `apps/docs` en la sección de estructura del monorepo, y la sección de congelado de versión.

**Criterios de éxito verificables:**
- Los 5 comandos de la CI pasan en local con `apps/docs` presente y poblado.
- `git diff .github/workflows/ci.yml` está **vacío** (constraint cumplido literalmente).
- `git diff turbo.json` está vacío (H4).
- Un PR de prueba muestra el checklist con la casilla de docs.
- La CI de GitHub pasa en el PR real.

**Riesgo:** bajo/medio. El fallo más probable es `format:check` (H2) o `typecheck` si `astro check` no está en el paquete. **Mitigación:** paso 2 antes de abrir PR. **Rollback:** los 4 ficheros de esta fase se revierten independientemente; ninguno es prerequisito de F6.

---

### F6 — Despliegue (Easypanel + DNS) — **gated por S1 y S2**

> **Gate explícito:** esta fase **no se declara completa** hasta que S1 tenga una respuesta registrada (a/b/c + decisión del usuario si procede) y S2 esté en verde. Si S1 devuelve (c) y el usuario no acepta B1, la fase se cierra con B3 (dominio interno) y queda un elemento abierto documentado, **no** se declara G1 cumplido.

**Ficheros:**
- `Dockerfile.docs` (raíz del monorepo) — multi-stage.
- `apps/docs/docker/nginx.conf` — servir estático, `try_files`, cabeceras de caché (assets con hash inmutables, HTML sin caché), página 404 de Starlight.
- `docs/deploy-docs.md` — runbook de despliegue y resultado de S1.
- `.dockerignore` — **verificar que no requiere cambios** (H8: ya excluye `**/dist/`, `**/build/`, `node_modules`, `apps/web/registry-data/`).

**Forma del `Dockerfile.docs`** (contexto = raíz, imagen final sin Node):

- *Stage build:* `node:22-bookworm-slim` (misma base que `Dockerfile:5`, por portabilidad glibc en Easypanel) → `corepack enable` → copiar `package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json` + `apps/docs/package.json` → `pnpm install` acotado al workspace de docs → copiar `apps/docs` y `assets` → `pnpm --filter docs build`.
- *Stage runtime:* `nginx:alpine` → copiar `apps/docs/dist` a la raíz web → `EXPOSE 80`.

Diferencias deliberadas frente a `Dockerfile:13-23` (H7): **no** se copia `packages/` y **no** se ejecuta `pnpm build` global. La doc es estática y no depende de `build:registry` ni del binario nativo `canvas`; arrastrarlos multiplicaría el tiempo de deploy y acoplaría el despliegue de docs a fallos de `apps/web`.

**Pasos:**
1. Escribir `Dockerfile.docs` + `nginx.conf`; validar con S2 en local.
2. **DNS primero** (el paquete lo marca como paso manual previo): crear el registro A/CNAME de `docs.modularcorehub.com` apuntando al servidor de Easypanel y **esperar propagación** antes de añadir el dominio en el panel.
3. Crear el App service `modularhub-docs` en el proyecto `iservisat`: fuente = mismo repo, **misma rama** que `modularhub`; Build Path = `/` (raíz); Dockerfile = `Dockerfile.docs`; puerto interno **80**.
4. Primer despliegue contra el dominio interno de Easypanel (B3) y verificación funcional.
5. Añadir el dominio personalizado (según resultado de S1) y esperar la emisión del certificado Let's Encrypt vía Traefik.
6. Escribir `docs/deploy-docs.md` con el runbook, el resultado de S1 y los planes B vigentes.

**Criterios de éxito verificables:**
- `curl -I https://docs.modularcorehub.com` → `200`, TLS válido, sin advertencia de certificado.
- Una ruta profunda (p. ej. la página de la tool `install_component`) responde `200` en carga directa, no solo por navegación cliente.
- Búsqueda ⌘K funciona en producción (índice Pagefind presente en `dist/`).
- El servicio `modularhub` sigue accesible y sin cambios (verificado antes y después).
- El despliegue **no** ejecuta el build de `apps/web` (revisar los logs de build del servicio).
- El runbook `docs/deploy-docs.md` refleja el resultado real de S1, no una suposición.

**Riesgo:** **alto** — es la única fase con dependencias externas fuera del repo (plan de Easypanel, DNS, propagación). **Mitigación:** S1+S2 al inicio del proyecto, no al final; B3 permite entregar valor sin resolver el dominio.

**Rollback:** eliminar el App service `modularhub-docs` en Easypanel y el registro DNS. `modularhub` es un servicio independiente (cada App es independiente dentro del proyecto), así que el rollback no le afecta. `Dockerfile.docs` y `nginx.conf` son ficheros nuevos: borrarlos no altera el despliegue existente, que sigue usando `Dockerfile` en la raíz.

---

## Matriz de verificación (qué se prueba y cómo)

| Nivel | Alcance | Cómo se verifica |
|---|---|---|
| Build | `apps/docs` compila | `pnpm --filter docs build` |
| Build (integración monorepo) | no rompe el pipeline | `pnpm build` en la raíz |
| Estático | tipos, lint, formato | `pnpm typecheck`, `pnpm lint`, `pnpm format:check` |
| Unitario | ninguno propio | H5: `--passWithNoTests`; no se añade runner a docs (KISS) |
| Integridad de contenido | 43 páginas, correspondencia 1:1 con comandos/tools reales, ausencia de helpers-como-tool | `find`/`wc`, greps de control de F3 |
| Enlaces | sidebar y enlaces internos | `astro build` (falla ante rutas del sidebar inexistentes) |
| Versionado | congelado idempotente, selector, aislamiento de búsqueda | ensayo en rama desechable (F4) |
| Contenedor | imagen construye y sirve | S2: `docker build` + `docker run` local |
| E2E producción | dominio, TLS, ruta profunda, búsqueda | `curl` + comprobación manual en navegador (F6) |
| No regresión | `modularhub` intacto | comprobación antes/después del deploy |

---

## Riesgos heredados: estado en este plan

| # | Riesgo heredado | Estado |
|---|---|---|
| 1 | `starlight-versions` inmaduro | **Eliminado.** No se adopta el plugin (D1). El riesgo se sustituye por uno menor y bajo control: mantener ~150 líneas de código propio (script + 2 componentes). |
| 2 | Pagefind mezclando versiones | **Mitigado por diseño, con residuo asumido.** Solo se indexa la versión actual; el gate de S3 lo verifica. **Residuo:** las versiones archivadas no son buscables. Si los 3 mecanismos de exclusión de S3 fallan, se cae al plan B documentado (post-build o aceptación explícita). |
| 3 | Dominio personalizado en 2.º servicio Easypanel | **NO resuelto por el plan — requiere acción del usuario.** S1 es bloqueante y su resultado puede implicar un **coste** (upgrade de plan, B1) que el plan no puede decidir. Peor caso (B2, servir en `/docs`) obliga a `base` y revisión de enlaces: trabajo adicional no estimado aquí. |
| 4 | Build-context limitado a `apps/docs` | **Cerrado por evidencia.** H1 (lockfile único en raíz) descarta ese camino de antemano; se construye desde la raíz desde el principio. |

**Riesgos adicionales que este plan introduce o descubre y no resuelve del todo:**

- **R-A (nuevo):** al no adoptar el plugin, el mantenimiento del versionado recae en este repo. Si el modelo de contenido de Starlight cambia en un mayor, el script de congelado puede necesitar ajuste. Bajo impacto (Markdown plano), pero real.
- **R-B (nuevo, H2):** ignorar `*.mdx` en Prettier significa que el formato del contenido de docs queda sin gate automático. Consciente y coherente con la política ya existente para `*.md`, pero es una relajación de calidad.
- **R-C:** el ownership es un checklist humano (constraint explícito del usuario: "no automatización de detección de cambios"). No hay garantía mecánica de que la doc no se desincronice del código. Riesgo aceptado por decisión del usuario.
- **R-D:** el paquete de evidencia marca la advertencia de build-context de Easypanel como "no verificada oficialmente" (fuente secundaria). El plan la sortea, pero eso no valida ni invalida la advertencia.

---

## Criterios de aceptación (definición de "hecho")

Observables, no subjetivos. El proyecto está completo cuando **todos** se cumplen:

1. `https://docs.modularcorehub.com` responde `200` con TLS válido *(o, si S1 = (c) y el usuario aceptó B3, el dominio interno de Easypanel responde `200` y el elemento del dominio queda abierto y documentado en `docs/deploy-docs.md`)*.
2. `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` pasan en la raíz, y la CI de GitHub está en verde en el PR.
3. `git diff .github/workflows/ci.yml` y `git diff turbo.json` están **vacíos**.
4. Existen exactamente **43** páginas en `apps/docs/src/content/docs/`, con **6** páginas de comando CLI, **4** páginas de tool MCP y **4** páginas de playground, cada una correspondiente 1:1 con un artefacto real del repo.
5. **Cero** páginas de tool para `untrusted-content` o `tool-error`; cero comandos/tools inventados (verificado por grep de control).
6. El selector de versión es visible en el chrome del sitio y se alimenta de `versions.json`.
7. `freeze-version.mjs` ejecutado en un ensayo produce una versión archivada navegable, con banner en el 100% de sus páginas, y una búsqueda de un término exclusivo de esa versión devuelve `0` resultados *(o el comportamiento del plan B queda documentado en `conceptos/versionado.md`)*.
8. La búsqueda ⌘K de Pagefind funciona en producción.
9. `.github/pull_request_template.md` y `CONTRIBUTING.md` contienen la casilla de ownership de `apps/docs`.
10. El sitio está en español de España, con la marca aplicada (primario `#4f46e5` verificable en el DOM) y tipografías Geist/Inter/Geist Mono.
11. El servicio `modularhub` sigue operativo y sin cambios tras el despliegue.
12. Los logs de build del servicio de docs **no** muestran build de `apps/web` ni compilación de `canvas`.
13. `docs/deploy-docs.md` existe y registra el resultado real de S1.

---

## Preguntas abiertas (requieren decisión del usuario)

1. **S1 / coste:** si el plan actual de Easypanel de `iservisat` no permite dominio personalizado en el segundo servicio, ¿se acepta el upgrade de plan (B1), se prefiere servir en `modularcorehub.com/docs` (B2, sin coste pero pierde el subdominio que el README ya anuncia), o se lanza primero en el dominio interno (B3)?
2. **Búsqueda en versiones archivadas:** ¿se acepta la degradación de D1 (versiones archivadas no buscables) a cambio de eliminar el riesgo de mezcla de resultados?
3. **Formato MDX (H2/R-B):** ¿se confirma ignorar `*.mdx` en Prettier, coherente con la política existente para `*.md`?
4. **Esquema de nombres de versión:** ¿los slugs siguen la versión de qué artefacto — `@modularcore/cli` (0.2.1), `@modularcore/mcp-server` (0.3.1), o una versión propia del sitio de documentación? El paquete de evidencia no lo fija y afecta al primer congelado.
5. **Rama de despliegue:** el paquete dice "misma rama del repo" que `modularhub`. Confirmar si es `develop` o `main` antes de crear el servicio.
