---
title: "docs-site-starlight"
description: "Sitio de documentación pública de ModularCore Hub (Starlight/Astro) en apps/docs, servido en docs.modularcorehub.com"
status: pending
priority: P2
effort: "24-30h"
tags: [docs, starlight, astro, monorepo, easypanel, versionado]
created: 2026-09-01
---

# docs-site-starlight

## Overview

Crear el sitio de documentación pública de ModularCore Hub con Starlight (Astro) en un nuevo
workspace `apps/docs`, cubriendo los 3 pilares acordados (qué es/para qué sirve, CLI+MCP+Web,
playground), con versionado manual disparado por el usuario, ownership reforzado vía checklist de
PR, integración en el CI existente sin filtrado de Turborepo, y despliegue como servicio Easypanel
nuevo en `docs.modularcorehub.com`.

Plan generado en modo `--debate`: 3 planificadores independientes + síntesis del controlador (ver
`## Debate Synthesis` al final).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | `apps/docs` (Astro 7.2.10 + `@astrojs/starlight` 0.41.11) integrado en pnpm/Turborepo sin romper `pnpm build/typecheck/lint/format:check/test` | P1 |
| 2 | Navegación en 5 secciones (fusión docs.agentkit.best + 3 pilares) con página exacta por comando/tool/playground/componente real — cero elementos inventados | P1 |
| 3 | Versionado manual (sin `starlight-versions`), disparo por el usuario, aislamiento de búsqueda por versión | P1 |
| 4 | Ownership reforzado: `.github/pull_request_template.md` (nuevo) + `CONTRIBUTING.md` con ítem de docs | P2 |
| 5 | CI: `apps/docs` cubierto por el job `unit` existente, cero cambios en `ci.yml`/`turbo.json` | P1 |
| 6 | Despliegue: `Dockerfile.docs` desde la raíz del monorepo, servicio Easypanel `modularhub-docs` **aislado en proyecto propio** (fallback `iservisat` si no es posible), `docs.modularcorehub.com` con TLS | P1 |
| 7 | Retirada controlada: rutas duplicadas de `apps/web` (`/cli`, `/mcp-server`, `/c/[name]`) ocultas con aviso de traslado + issue de seguimiento | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Fase 1: Spikes bloqueantes](./phase-01-start.md) | Pending |
| 2 | [Fase 2: Scaffolding + validación de build Docker](./phase-02-scaffolding.md) | Pending |
| 3 | [Fase 3: Marca, i18n y navegación (IA)](./phase-03-navegacion.md) | Pending |
| 4 | [Fase 4: Andamiaje de contenido de los 3 pilares](./phase-04-contenido.md) | Pending |
| 5 | [Fase 5: Versionado manual](./phase-05-versionado.md) | Pending |
| 6 | [Fase 6: CI, calidad y ownership](./phase-06-ci-ownership.md) | Pending |
| 7 | [Fase 7: Despliegue (Easypanel + DNS)](./phase-07-despliegue.md) | Pending |

Grafo de dependencias (corregido tras red-team — ver `## Red Team Review`):
```
Fase 1 (spikes S1 dominio Easypanel + S3 API Starlight, bloqueante — S2 se movió a Fase 2)
 └─► Fase 2 (scaffolding + validación temprana del build Docker real, site/base fijado solo tras S1)
      └─► Fase 3 (IA/navegación — tabla única de páginas, fuente también para Fase 4)
           └─► Fase 4 (contenido, usa la tabla de Fase 3 como única fuente)
                └─► Fase 5 (versionado, depende de S3 y del esquema de contenido extendido en Fase 2)
                     └─► Fase 6 (CI/ownership, depende de 4 Y 5 — nunca en paralelo con ninguna)
                          └─► Fase 7 (despliegue final, gated por S1; el build Docker ya se validó en Fase 2)
```

## Success Criteria

- [ ] `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` en verde en local y en CI de GitHub, con `apps/docs` construido.
- [ ] `git diff .github/workflows/ci.yml` y `git diff turbo.json` vacíos.
- [ ] Navegación de 5 secciones de primer nivel; los 3 pilares alcanzables en ≤2 clics desde la portada.
- [ ] Recuento exacto verificado por script (`check-coverage.mjs`): 44 páginas totales — 6 de comando CLI, 4 de tool MCP, 4 de playground, 5 de componente, 4 de Guías, 5 de Solución de problemas (con fuente verificada cada una). Cero páginas para `untrusted-content`/`tool-error`.
- [ ] Las 3 rutas duplicadas de `apps/web` quedan ocultas con aviso de traslado (no eliminadas) y hay un issue de GitHub abierto para su retirada futura.
- [ ] Selector de versión visible; `freeze-version.mjs` demostrado en un ensayo (versión de prueba creada y revertida).
- [ ] Búsqueda Pagefind operativa; una consulta exclusiva de una versión archivada no devuelve resultados desde la versión actual (o el plan B documentado, ver Fase 5).
- [ ] `.github/pull_request_template.md` y `CONTRIBUTING.md` contienen el ítem de ownership de `apps/docs`.
- [ ] `https://docs.modularcorehub.com` responde 200 con TLS válido, ruta profunda recargable, búsqueda funcional.
- [ ] `modularcorehub.com` y el servicio `modularhub` sin regresiones observables.
- [ ] Cero secretos/tokens en `apps/docs`, `Dockerfile.docs` o la config del servicio Easypanel.

## Debate Synthesis

### Candidatos

| ID | Tesis diferencial | Informe |
|---|---|---|
| 1 | Versionado manual por snapshot; cero cambios en `ci.yml`/`turbo.json` (hallazgo: job monolítico ya cubre `apps/docs`); halló el bloqueante crítico de `.prettierignore` no cubriendo `.astro`/`.mdx` | `reports/planner-debate-candidate-1.md` |
| 2 | Versionado manual; **DRY duro**: sincronizar contenido de componentes desde `packages/*/README.md` (patrón ya usado por `apps/web/src/lib/docs.ts:8`) para eliminar deriva; Dockerfile desde raíz por diseño | `reports/planner-debate-candidate-2.md` |
| 3 | Versionado manual; Fase 0 de spikes bloqueantes explícita (S1 dominio Easypanel, S2 build Docker, S3 API de Starlight); IA de 5 secciones con los 3 pilares anidados bajo "Referencia"; Dockerfile desde raíz sin copiar `packages/` ni correr build global | `reports/planner-debate-candidate-3.md` |

### Agreements (convergencia unánime de los 3)

- **Rechazar `starlight-versions`** (plugin comunitario v0.10.1, un solo mantenedor, "early development, expect frequent breaking changes") en favor de un mecanismo manual propio (script de snapshot/freeze + `versions.json` + selector Astro propio). Razón compartida: el disparo es manual y poco frecuente (el usuario decide cuándo), lo que no justifica el riesgo de una dependencia inmadura; además el mecanismo manual cierra por diseño el riesgo de que Pagefind mezcle resultados entre versiones (no garantizado por el plugin).
- **CI: cero cambios en `.github/workflows/ci.yml` y `turbo.json`.** El job `unit` es monolítico (`pnpm build/typecheck/lint/format:check/test` sobre todo el workspace vía turbo) y `apps/docs` entra automáticamente por `pnpm-workspace.yaml` (`apps/*`) y por que `turbo.json` ya declara `outputs: ["dist/**"]` para `build`.
- **Contenido exacto, cero invención:** 6 páginas de comando CLI (`init/add/list/search/diff/update`), **4** páginas de tool MCP (`search_components/get_component/install_component/check_updates`) — `untrusted-content.ts`/`tool-error.ts` son helpers internos y nunca se documentan como tool.
- **Ownership vía `.github/pull_request_template.md` (nuevo, no existe hoy) + ítem en `CONTRIBUTING.md`**, checklist social sin automatización de detección (por decisión explícita del usuario).
- **Dockerfile desde la raíz del monorepo**, no `Build Path = apps/docs` en Easypanel — el lockfile único (`pnpm-lock.yaml`) y el manifiesto de workspace viven en la raíz; un build-context limitado a `apps/docs` no puede ejecutar `pnpm install --frozen-lockfile`. Imagen final `nginx:alpine` sin runtime Node (Easypanel no tiene tipo de servicio "static site" nativo).
- **Riesgo de dominio personalizado en un segundo servicio Easypanel no está confirmado** — los 3 lo tratan como gate bloqueante antes del despliegue final, con escalado al usuario si falla.

### Disagreements & resolutions

1. **¿Formatear/lintar `.mdx`/`.astro`?** Candidato 2 asumió que `.prettierignore` ya cubre MDX; candidatos 1 y 3 verificaron por grep que `.prettierignore` ignora `*.md` pero no `*.mdx`/`*.astro`, y la síntesis inicial de este plan adoptó eso como "hallazgo crítico bloqueante". **Corrección post-red-team (3 revisores independientes, verificación empírica real ejecutando Prettier sobre el repo, no solo grep):** esa conclusión era **falsa**. Prettier 3 sin plugin instalado **ignora silenciosamente** los `.astro` al recorrer un directorio (no encuentra parser, no falla) — solo `.mdx` tiene parser y sí se comprueba. El riesgo real, no detectado por ningún candidato del debate, es el inverso: como esta plan usa `.md` por defecto (disagreement 5) y `.prettierignore` ya ignora `*.md` globalmente, **ninguna de las páginas de contenido pasará nunca por `format:check`**, y los ficheros de configuración reales de `apps/docs` (`package.json`, `astro.config.mjs`, `content.config.ts`, `versions.json`, `.css`) sí deben pasar `format:check`/`lint` con normalidad — no hace falta ignorarlos. Resolución final: `.prettierignore` solo necesita cubrir `apps/docs/dist/`, `apps/docs/.astro/` (caché de build) y, si se usa en algún punto, `*.mdx`; `eslint.config.js` debe ignorar los ficheros fuente `**/*.astro` (sin parser instalado, mismo criterio que la exclusión ya existente de `**/*.svelte`), no solo el directorio de caché `.astro/`. Aplicado en Fase 6, con la razón correcta documentada.

2. **¿Sincronizar el contenido del catálogo de componentes desde `packages/*/README.md` (DRY, candidato 2) o redactarlo a mano (candidatos 1 y 3)?** El mecanismo de candidato 2 es real y valioso (reduce deriva doc↔código, reutiliza un patrón ya existente en `apps/web/src/lib/docs.ts:8`), pero solo cubre 4 de 5 componentes (`packages/hello-core` y `packages/cli` no tienen README, verificado), introduce un `prebuild` que pull contenido real de npm-READMEs (con su propio estilo/formato pensado para npm, no para un sitio de docs) y no fue parte de los 5 ajustes que el usuario pidió explícitamente tras el brainstorm. **Resolución: NO se adopta como fase obligatoria de este plan** (criterio de alineación con el alcance ya aceptado — el contrato de brainstorm fija "outline/andamiaje", no sincronización automática de contenido real). Se documenta como mejora recomendada de una iteración futura en la Fase 4 (nota explícita en `apps/docs/README.md`), no como trabajo bloqueante de este plan. Esto evita expandir el alcance sin petición explícita del usuario (regla YAGNI del proyecto), preservando la idea para cuando el usuario la valide.

3. **Cobertura del pilar "Playground".** Candidato 2 no incluyó páginas dedicadas de "cómo funciona el playground" como sección de primer nivel — los playgrounds solo aparecían enlazados desde "Componentes". Candidatos 1 y 3 sí tienen una sección "Playground" explícita con página de "qué es/cómo funciona" + una página por cada uno de los 4 playgrounds reales. El contrato de brainstorm aceptado exige explícitamente el playground como **pilar independiente** (pilar 3 pedido por el usuario). **Resolución: se adopta la cobertura de 1 y 3** — sección "Playground" con 5 páginas (1 general + 4 por demo), nunca solo enlaces sueltos desde Componentes.

4. **Estructura de navegación (IA).** Candidato 1 propuso 8 secciones de primer nivel (Empezando/Conceptos/Herramientas/Componentes/Playground/Guías/Solución de problemas/Referencia). Candidato 2 propuso 7, con Herramientas como eje de referencia dentro de las etapas. Candidato 3 propuso 5, anidando explícitamente Herramientas + Componentes + Playground bajo una única sección "Referencia" (evitando un sidebar de primer nivel sobrecargado, alineado con el patrón "guías vs. referencia" que ya se identificó como acertado en el brainstorm original de docs.agentkit.best/Starlight). **Resolución: se adopta la estructura de 5 secciones de candidato 3** — más disciplinada, evita el solapamiento semántico entre "etapa del usuario" y "superficie de producto" que candidato 1 señaló como riesgo de su propia opción de 8 secciones. Se preserva el desglose completo de páginas por pilar exigido por el contrato (criterio de aceptación del brainstorm).

5. **Extensión de fichero de contenido (`.md` vs `.mdx`).** Candidatos 1 y 2 usaron `.mdx` por defecto; candidato 3 usó `.md` salvo páginas con islas interactivas. **Resolución: `.md` por defecto** (candidato 3) — más simple, sin runtime MDX innecesario; `.mdx` solo donde se embeba un componente Astro/Svelte real. La corrección de Prettier/ESLint (disagreement 1) cubre ambas extensiones de todos modos, así que esta elección no afecta la robustez de CI.

### Rejected alternatives

- **`starlight-versions` (plugin comunitario).** Rechazado por los 3 candidatos: un solo mantenedor, fase temprana declarada por su propio autor, sin evidencia de filtrado de Pagefind por versión, acopla los upgrades de Astro/Starlight al ritmo de un tercero. Reconsiderable solo si el número de versiones vivas mantenidas simultáneamente supera 4 (criterio propuesto por candidato 1).
- **Build-context de Easypanel limitado a `apps/docs` (`Build Path`).** Descartado por evidencia dura (H1: lockfile único en la raíz), no por precaución — ningún candidato lo consideró viable tras verificarlo.
- **Sincronización DRY de READMEs de componentes como fase obligatoria.** Ver disagreement 2 — buena idea, aplazada a una iteración futura fuera de este plan.

### Risks carried forward

1. **Filtrado de Pagefind por versión no confirmado.** Los 3 planes lo tratan como spike (Fase 1, S3) con 2-3 mecanismos candidatos (campo de frontmatter / `data-pagefind-ignore` / exclusión de config) y un plan de degradación cosmética si todos fallan (banner visible en vez de exclusión real del índice). Riesgo abierto hasta que S3 se complete.
2. **Dominio personalizado en un segundo servicio Easypanel bajo el plan actual de `iservisat` — no confirmado.** Requiere verificación humana en el dashboard real (Fase 1, S1). Si la respuesta es negativa, el outcome del plan cambia (upgrade de plan, servir en `/docs` de `modularcorehub.com`, o dominio interno temporal) y requiere decisión explícita del usuario — no se resuelve unilateralmente en este plan.
3. **Ownership por checklist sin fuerza técnica.** Decisión explícita del usuario ("checklist, no automatización"); un PR puede cambiar CLI/MCP/Web sin tocar `apps/docs` y nada lo impide mecánicamente. Riesgo residual permanente y aceptado.
4. **Deriva de contenido en páginas sin fuente única.** Con el rechazo del mecanismo DRY (disagreement 2), la exactitud del contenido de CLI/MCP/Web/Guías depende de revisión humana, no de verificación automática de *contenido* (sí se verifica automáticamente la *existencia* de páginas vía el guardarraíl anti-invención de la Fase 4).
5. **Despliegue pull-based sin gate de CI real.** Easypanel tira de la rama directamente; un `docker build` roto es lo único que frena un despliegue con docs rotas. Fuera de alcance añadir un paso de deploy a GitHub Actions (restricción explícita del usuario).

### Unresolved questions

1. Si el plan de Easypanel **del proyecto aislado nuevo** (ver pregunta 6, resuelta) no admite dominio personalizado: ¿se acepta el upgrade de plan, servir bajo `modularcorehub.com/docs`, o publicar primero en el dominio interno de Easypanel como paso intermedio? **Bloquea el cierre de la Fase 2** (fija `site`/`base`), no solo la Fase 7 — ver Red Team Review, Finding 10.
2. ~~Esquema de numeración de versiones de la doc~~ — **Resuelto por el usuario:** contador propio de la documentación, arranca en `v1.0.0` (no atado a la versión del CLI/MCP). Aplicado en `versions.json` de la Fase 5.
3. ¿Se acepta que las versiones archivadas queden fuera de la búsqueda (trade-off para cerrar el riesgo de mezcla de resultados), o se prefiere búsqueda global con resultados etiquetados por versión (mitigación cosmética, más trabajo)?
4. Rama de despliegue del servicio `modularhub-docs`: ¿`develop` o `main`? El contrato dice "misma rama que `modularhub`" sin nombrarla explícitamente. **Nuevo dato del red-team:** `docs/deployment.md:12` documenta `chore/easypanel-deployment` "mientras se valida" para `modularhub` — confirmar si sigue vigente antes de fijar la rama de `modularhub-docs`.
5. ¿Se retoma la sincronización DRY de READMEs de componentes (candidato 2, ver disagreement 2 y "Rejected alternatives") como fase futura una vez el sitio esté publicado?
6. ~~Acoplamiento de rama con `modularhub`~~ — **Resuelto por el usuario:** `modularhub-docs` se aísla en un **proyecto Easypanel distinto** de `iservisat` siempre que el plan/cuenta lo permita (verificar en Fase 1/S1). Elimina el riesgo de que un commit de solo-docs dispare el rebuild de producción web, a cambio de mayor complejidad de gestión (dos proyectos Easypanel en vez de uno). Si el plan de Easypanel no permite un segundo proyecto, fallback documentado en Fase 1/S1: filtrado por ruta si Easypanel lo soporta, o aceptar el acoplamiento como riesgo residual explícito.
7. ~~Alcance de "Guías" y "Solución de problemas"~~ — **Resuelto por el usuario: entran en esta entrega.** Contenido con fuente verificada (ver Fase 3/Fase 4 actualizadas): Guías desde CLI (`init`/`add`/`update`/`diff`) y `CONTRIBUTING.md`; Solución de problemas desde `packages/cli/src/errors.ts`+`format-error.ts`, `packages/mcp-server/src/errors.ts`, `packages/registry-client/src/errors.ts` y `docs/deployment.md`.
8. ~~Rutas duplicadas de `apps/web`~~ — **Resuelto por el usuario:** `/cli`, `/mcp-server` y `/c/[name]` de `apps/web` se **ocultan temporalmente** (no se eliminan) una vez `docs.modularcorehub.com` esté en producción, sustituidas por un aviso con enlace directo al sitio nuevo; se abre un issue de GitHub para su eliminación definitiva en una iteración futura. Aplicado en Fase 7 (paso nuevo, después de verificar el despliegue).

## Red Team Review

### Session — 2026-09-01

**Modo:** 4 revisores hostiles (Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic — escala de 6+ fases), todos con rol de verificación Full Tier (Fact Checker/Flow Tracer/Scope Auditor/Contract Verifier).

**Findings:** 15 tras deduplicar y capar (de >35 hallazgos brutos entre los 4 informes) — todos con evidencia `file:line` verificada, todos adjudicados **Accept** (evidencia excepcionalmente fuerte: varios hallazgos corroborados de forma independiente por 2-4 revisores, incluidas pruebas empíricas reales — ejecución de Prettier, recuento de importers del lockfile, comprobación de existencia de un plugin en npm).

**Severity breakdown:** 4 Critical, 8 High, 3 Medium.

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | `Dockerfile.docs` no puede instalar sin manifiestos de `packages/*` | Critical | Accept | Fase 2 |
| 2 | El "hallazgo crítico" de `.prettierignore`/`.astro` del debate es falso (verificado empíricamente) | Critical | Accept | plan.md (Disagreement 1), Fase 6 |
| 3 | Guardarraíl anti-invención asume validación de enlaces que Starlight no tiene | Critical | Accept | Fase 2 (script `check-coverage.mjs`) |
| 4 | Fase 1/S2 inejecutable (`apps/docs` no existe aún) | Critical | Accept | Fase 1 (S2 eliminado de aquí) → Fase 2 |
| 5 | Dependencias incompletas en Fase 2 (`@astrojs/check`, `typescript`, `@fontsource-variable/*`) | High | Accept | Fase 2 |
| 6 | Dockerfile no copia `nginx.conf` a la imagen | High | Accept | Fase 2/Fase 7 |
| 7 | `freeze-version.mjs`: slug sin validar (path traversal) + mutación no atómica | High | Accept | Fase 5 |
| 8 | Esquema de colección (Zod estricto) rechaza el frontmatter inyectado por el versionado | High | Accept | Fase 2, Fase 5 |
| 9 | Despliegue en la misma rama que `modularhub` — commits de docs disparan rebuild de producción | High | Accept | Fase 7, Unresolved question 6 |
| 10 | Gate S1 (dominio/`base`) secuenciado demasiado tarde — invalida trabajo de Fases 2/4/5 | High | Accept | Fase 1, Fase 2 |
| 11 | Sidebar (Fase 3) y árbol de contenido (Fase 4) no cuentan lo mismo — páginas huérfanas | High | Accept | Fase 3, Fase 4 |
| 12 | Grafo de dependencias entre fases se contradice (Fase 6 deps, "paralelizable") | High | Accept | plan.md, Fase 6 |
| 13 | `nginx.conf` sin cabeceras de seguridad + caché de Pagefind rota en 2º deploy | Medium | Accept | Fase 7 |
| 14 | Versiones archivadas se recompilan con la toolchain futura, no la congelada | Medium | Accept | Fase 5 |
| 15 | `versions.json` y sidebar archivado son estado duplicado mantenido a mano | Medium | Accept | Fase 5 |

### Whole-Plan Consistency Sweep

- Ficheros releídos: `plan.md`, `phase-01-start.md`, `phase-02-scaffolding.md`, `phase-03-navegacion.md`, `phase-04-contenido.md`, `phase-05-versionado.md`, `phase-06-ci-ownership.md`, `phase-07-despliegue.md`.
- Deltas de decisión aplicados: (a) S2 se mueve de Fase 1 a Fase 2 con el Dockerfile corregido (copia solo manifiestos de `packages/*`); (b) S1 pasa a bloquear también la Fase 2, no solo la 7; (c) la corrección de `.prettierignore`/`eslint.config.js` en Fase 6 usa la razón correcta (Prettier ignora `.astro` silenciosamente; el gap real es `.mdx` + ficheros de config que si deben pasar el gate); (d) Fase 6 depende de Fase 4 **y** Fase 5, nunca en paralelo; (e) tabla única de páginas vive en Fase 3, Fase 4 la referencia en vez de duplicarla; (f) `freeze-version.mjs` valida el slug y escribe de forma atómica; (g) `content.config.ts` (Fase 2) extiende el esquema con los campos que Fase 5 inyecta; (h) `docs/deploy-docs.md` se sustituye por una sección nueva en el `docs/deployment.md` ya existente, evitando dos runbooks divergentes.
- Términos/rutas obsoletos buscados y corregidos en todas las fases: referencias a "S2 en Fase 1", a "`.astro` en `.prettierignore` como bloqueante", a "Fase 4 paralelizable con Fase 6", a "`docs/deploy-docs.md`" como fichero nuevo independiente.
- Contradicciones no resueltas: 0. Las preguntas 6, 7 y 8 (nuevas, arriba) quedan como decisiones de producto/proceso pendientes del usuario, no como contradicciones internas del plan.

<!-- slug: docs-site-starlight -->
