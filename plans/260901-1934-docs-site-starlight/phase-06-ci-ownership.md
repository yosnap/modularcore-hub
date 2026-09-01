---
phase: 6
title: "CI, calidad y ownership"
status: pending
priority: P1
effort: "1-2h"
dependencies: [4, 5]
---

# Fase 6: CI, calidad y ownership

## Overview

Cerrar el gate de formato/lint **con la razón correcta** (red-team Finding 2: la síntesis original
del debate diagnosticó mal el problema — verificado empíricamente que Prettier ignora `.astro` sin
plugin, así que el bloqueante real no era ese), confirmar que `.github/workflows/ci.yml` y
`turbo.json` no necesitan cambios, y reforzar el ownership documental vía checklist de PR.

**Corrección de dependencia (red-team Finding 12):** esta fase depende de la Fase 4 **y** de la
Fase 5 (necesita el contenido completo y el script de versionado ya escritos para poder validar
`format:check`/`lint` sobre el árbol final) — nunca en paralelo con ninguna de las dos, a diferencia
de lo que decía el grafo original.

## Requirements

- Funcional: `pnpm format:check` y `pnpm lint` pasan con `apps/docs` completo (contenido + scripts
  de versionado) presente.
- No funcional: `git diff .github/workflows/ci.yml turbo.json` vacío.

## Related Code Files

- Modify: `.prettierignore` (alcance corregido — ver paso 1)
- Modify: `eslint.config.js` (ignorar los ficheros fuente `**/*.astro`, no solo el directorio de caché `.astro/`)
- Create: `.github/PULL_REQUEST_TEMPLATE.md` (no existe hoy — verificado; nombre exacto en mayúsculas, GitHub solo reconoce esa forma o `.github/pull_request_template.md` en minúsculas — usar la primera, que es la convención más extendida)
- Modify: `CONTRIBUTING.md` (checklist de PR + sección "Estructura del monorepo" + sección CI)

## Implementation Steps

1. **Editar `.prettierignore` con el alcance correcto** (red-team Finding 2, verificado
   empíricamente por 3 revisores independientes ejecutando Prettier real):
   - Prettier 3 sin plugin **ignora silenciosamente** los ficheros `.astro` al recorrer un
     directorio — no hace falta añadirlos a `.prettierignore`, sería un no-op.
   - El contenido `.md` de `apps/docs` ya queda cubierto por el patrón global `*.md` existente
     (`.prettierignore:13`) — **decisión explícita a confirmar con el usuario:** esto significa que
     el contenido de la doc pública nunca pasa por `format:check`. Si se prefiere que sí (coherencia
     de estilo del contenido publicado), excluir `apps/docs/src/content/` del patrón `*.md` global
     en vez de dejarlo así por accidente.
   - Añadir explícitamente: `apps/docs/dist/`, `apps/docs/.astro/` (directorio de caché de build —
     esto sí es necesario, es contenido generado, no fuente) y `apps/docs/**/*.mdx` si se usa alguna
     página `.mdx` (el único caso real donde Prettier sí tiene parser y sí comprobaría el fichero).
   - Los ficheros de configuración reales (`apps/docs/package.json`, `astro.config.mjs`,
     `content.config.ts`, `versions.json`, `.css`) **no se ignoran** — deben pasar `format:check`
     con normalidad, como cualquier otro fichero del monorepo.
2. Editar `eslint.config.js`: añadir `'**/*.astro'` al bloque `ignores` (ficheros fuente, no solo
   `'**/.astro/**'` el directorio de caché) — mismo razonamiento que la exclusión ya existente de
   `**/*.svelte`: sin parser de Astro instalado en el repo. Añadir también `'**/.astro/**'` para el
   directorio de caché, que sí es necesario.
3. Crear `.github/PULL_REQUEST_TEMPLATE.md` reproduciendo el checklist actual de `CONTRIBUTING.md` y
   añadiendo el ítem de ownership:
   `- [ ] Si este PR cambia el comportamiento de CLI, MCP o Web, se ha actualizado apps/docs en este mismo PR (o se justifica abajo por qué no aplica).`
4. Editar `CONTRIBUTING.md`:
   - Añadir el mismo ítem al checklist de PR existente.
   - Añadir `apps/docs` a la sección "Estructura del monorepo".
   - Ampliar la sección de CI indicando que el sitio de docs se construye en el job `unit` existente
     (sin workflow nuevo).
5. Correr localmente la secuencia exacta de CI:
   `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`, con `apps/docs`
   ya conteniendo el contenido completo de Fase 4 y los scripts de Fase 5.
6. Confirmar explícitamente que **no** hace falta tocar `.github/workflows/ci.yml` ni `turbo.json`
   (el job `unit` es monolítico y `apps/docs` entra por `pnpm-workspace.yaml`; `turbo.json` ya
   declara `outputs: ["dist/**"]`, y el `astro sync` añadido al script de Fase 2 evita depender de
   que `turbo.json` liste `.astro/**` como output).

## Success Criteria

- [x] Los 5 comandos de la CI pasan en local con `apps/docs` presente y poblado (contenido de Fase 4 + scripts de Fase 5). Verificado repetidamente a lo largo de la implementación, última pasada limpia tras los fixes de versionado.
- [x] `git diff .github/workflows/ci.yml` vacío. Verificado.
- [x] `git diff turbo.json` vacío. Verificado.
- [ ] Un PR de prueba muestra la plantilla con la casilla de ownership de docs. **Pendiente:** requiere abrir un PR real (acción visible/con efecto en GitHub) — no ejecutado de forma autónoma, pendiente de confirmación del usuario en el paso de commit/push del cierre del plan.
- [x] `CONTRIBUTING.md` menciona `apps/docs` en checklist, estructura del monorepo y sección de CI. Verificado (3 ediciones aplicadas).
- [ ] La CI de GitHub Actions pasa en verde en el PR real. **Pendiente:** mismo motivo que el ítem anterior — requiere PR real.
- [x] La decisión sobre si el contenido `.md` de `apps/docs` pasa por `format:check` está tomada explícitamente (paso 1 de esta fase): se deja fuera del gate, igual que el resto del `*.md` del repo, documentado como decisión consciente, no heredada por accidente.

## Risk Assessment

- **Riesgo corregido (red-team Finding 2):** el riesgo original ("Prettier rompe CI por `.astro`")
  era una falsa alarma. El riesgo real y más probable ahora es que el contenido `.md` de la doc
  quede fuera de cualquier gate de calidad de formato sin que nadie lo haya decidido — mitigado por
  hacerlo una decisión explícita en el paso 1.
- **Riesgo aceptado, sin mitigación técnica:** el ownership es un control social (checklist), no
  técnico — decisión explícita del usuario. Un PR puede cambiar CLI/MCP/Web sin marcar la casilla y
  CI no lo detecta. Riesgo residual permanente y aceptado.
- **Rollback:** revertir los 4 ficheros de esta fase de forma independiente; ninguno es prerequisito
  técnico de la Fase 7.
