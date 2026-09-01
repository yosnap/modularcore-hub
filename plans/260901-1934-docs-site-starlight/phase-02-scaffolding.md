---
phase: 2
title: "Scaffolding + validación de build Docker"
status: pending
priority: P1
effort: "6-8h"
dependencies: [1]
---

# Fase 2: Scaffolding del workspace `apps/docs` + validación temprana del build Docker

## Overview

Paquete Astro+Starlight mínimo que compila e integra en pnpm/Turborepo, con el esquema de contenido
ya preparado para el versionado de Fase 5, el guardarraíl anti-invención (`check-coverage.mjs`), y
**el build Docker validado aquí mismo con el patrón correcto** (red-team Finding 1 y Finding 4: el
Dockerfile no puede excluir `packages/*` del contexto porque el `package.json` raíz depende de
`@modularcore/registry` como workspace, y el spike original de "Fase 1/S2" era inejecutable antes de
que este paquete existiera). Validar esto temprano evita descubrirlo en la Fase 7, con toda la
infraestructura de producción ya montada.

## Requirements

- Funcional: `pnpm --filter docs build` produce `apps/docs/dist/index.html`, `dist/pagefind/`; la
  imagen Docker construida con el Dockerfile definitivo sirve ese `dist/` correctamente.
- No funcional: `site`/`base` de `astro.config.mjs` se fijan **solo después** de que Fase 1/S1 tenga
  respuesta — ver Risk Assessment.

## Related Code Files

- Create: `apps/docs/package.json`
- Create: `apps/docs/astro.config.mjs`
- Create: `apps/docs/tsconfig.json`
- Create: `apps/docs/src/content.config.ts`
- Create: `apps/docs/.gitignore`
- Create: `apps/docs/scripts/check-coverage.mjs`
- Create: `apps/docs/src/content/docs/index.md` (landing provisional)
- Create: `Dockerfile.docs` (raíz del repo — definitivo, no borrador; reutilizado sin cambios en Fase 7)
- Create: `apps/docs/nginx.conf` (esqueleto; cabeceras de seguridad + caché definitivas en Fase 7)
- Modify: ninguna configuración raíz compartida en esta fase (`.prettierignore`/`eslint.config.js` se resuelven en Fase 6 con la razón correcta — ver `plan.md` → Red Team Review, Finding 2)

## Implementation Steps

### 2.1 — Paquete base

1. Crear `apps/docs/package.json` — `name: "docs"`, `private: true`, `type: "module"`. Scripts:
   `dev` (`astro dev`), `build` (`astro sync && astro build`), `typecheck` (`astro sync && astro check`),
   `preview` (`astro preview`). El `astro sync` previo genera `.astro/types.d.ts` (tipos de
   `astro:content`) antes de que `astro check`/`astro build` lo necesiten — evita depender de que
   Turborepo restaure ese directorio desde caché (red-team, Failure Mode Finding 7: `turbo.json` no
   declara `.astro/**` como output y este plan no lo toca, así que el `sync` explícito en el script
   es la corrección local, sin editar `turbo.json`).
   Dependencias completas (red-team, Finding 5 — lista incompleta original):
   - `astro@7.2.10`, `@astrojs/starlight@0.41.11` (versiones verificadas por `npm view`).
   - `@astrojs/check` + `typescript` (requeridos por `astro check`; sin ellos el script `typecheck`
     falla en CI sin TTY para instalar interactivamente).
   - `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `@fontsource-variable/inter`
     (usados en Fase 3; declarados hoy en `apps/web/package.json`, no en `apps/docs` — deben
     declararse aquí explícitamente, pnpm strict no los resuelve por estar en otro workspace).
   - `@astrojs/svelte@9.0.1` **solo** si Fase 1/S3 validó una isla concreta que la necesite — no
     instalar "por si acaso".
2. Crear `apps/docs/astro.config.mjs`. **`site` y `base` se derivan de una única constante**, no se
   fijan a mano en dos sitios: leer el resultado de `reports/spike-s1-easypanel-dominio.md` (Fase 1)
   y fijar:
   - Si S1 = (a)/(b aceptado)/(c con B3): `site: 'https://docs.modularcorehub.com'`, sin `base`.
   - Si S1 = (c) con B2 aceptado: `site: 'https://modularcorehub.com'`, `base: '/docs'`.
   Exportar esa constante desde un fichero pequeño (`apps/docs/src/site-config.mjs` o similar) que
   Fase 5 (reescritura de enlaces del script de versionado) importe también — nunca cablear el
   prefijo en dos sitios independientes (red-team, Assumption Destroyer Finding 5).
   Integración `starlight({ title: 'ModularCore Hub', defaultLocale: 'es', locales: { root: { label: 'Español', lang: 'es' } } })`.
   El `sidebar` completo se añade en Fase 3.
3. Crear `apps/docs/tsconfig.json` extendiendo el de Astro (no `tsconfig.base.json` de la raíz).
4. Crear `apps/docs/src/content.config.ts` con la colección `docs` de Starlight, **extendiendo el
   esquema** (red-team Finding 8) para aceptar los campos que Fase 5 inyectará en el frontmatter de
   páginas archivadas:
   ```ts
   import { defineCollection } from 'astro:content';
   import { docsLoader } from '@astrojs/starlight/loaders';
   import { docsSchema } from '@astrojs/starlight/schema';
   import { z } from 'astro:content';

   export const collections = {
     docs: defineCollection({
       loader: docsLoader(),
       schema: docsSchema({
         extend: z.object({
           archived: z.boolean().optional(),
           pagefindExclude: z.boolean().optional(), // nombre exacto a confirmar contra Fase 1/S3
         }),
       }),
     }),
   };
   ```
   El nombre exacto del campo de exclusión de Pagefind depende del resultado de Fase 1/S3 — ajustar
   aquí si S3 determinó un mecanismo distinto (p. ej. `data-pagefind-ignore` vía componente, sin
   campo de frontmatter).
5. Crear `apps/docs/.gitignore`: `dist/`, `.astro/`.
6. Crear `apps/docs/scripts/check-coverage.mjs` (guardarraíl anti-invención, red-team Finding 3 y
   Finding 11 — sustituye la asunción errónea de que `astro build` detecta enlaces rotos):
   - Lee `packages/cli/src/commands/*.ts`, los `register*Tool` de `packages/mcp-server/src/index.ts`,
     y el array `PLAYGROUNDS` de `apps/web/src/lib/playgrounds.ts`.
   - Lee las entradas de `sidebar` de `astro.config.mjs` (única fuente de verdad, ver Fase 3) y los
     slugs reales de `getCollection('docs')`.
   - Falla con mensaje explícito (listando qué falta o qué sobra) si: (a) hay un comando/tool/
     playground real sin página correspondiente; (b) hay una página de tool para
     `untrusted-content`/`tool-error`; (c) hay una entrada de sidebar sin página real, o una página
     real sin entrada de sidebar.
   - Se ejecuta en `prebuild` (`apps/docs/package.json`).

### 2.2 — Validación temprana del build Docker (antes "Fase 1/S2", corregido)

7. Crear `Dockerfile.docs` en la raíz, multi-stage, **definitivo desde ahora** (reutilizado sin
   cambios en Fase 7):
   - *Stage build*: `node:22-bookworm-slim` (misma base que el `Dockerfile` actual, por
     `canvas`/glibc), `corepack enable`, copiar `package.json pnpm-lock.yaml pnpm-workspace.yaml
     turbo.json tsconfig.base.json`, **copiar los manifiestos de todos los workspaces**
     (`packages/*/package.json`, preservando la estructura de carpetas — no el código fuente) más
     `apps/docs/package.json` y `apps/web/package.json` (el lockfile los referencia como importers;
     omitirlos hace fallar `--frozen-lockfile`, red-team Finding 1), copiar `assets/`,
     `pnpm install --frozen-lockfile --filter docs...` (filtro acotado al workspace de docs —
     confirmar en el paso 8 que esto **no** compila `canvas` de `packages/media-picker`, que está en
     `allowBuilds` de `pnpm-workspace.yaml`), copiar `apps/docs`, `pnpm --filter docs build`.
   - *Stage runtime*: `nginx:alpine`, `COPY --from=build /app/apps/docs/dist /usr/share/nginx/html`,
     **`COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf`** (red-team Finding 6: el borrador
     original nunca copiaba la config a la imagen), `EXPOSE 80`.
8. `docker build -f Dockerfile.docs -t modularhub-docs .` y `docker run -p 8080:80` en local.
   Verificar explícitamente: (a) la portada responde 200; (b) una página anidada responde 200; (c)
   `docker run modularhub-docs:spike node -v` falla (sin runtime Node); (d) los logs del build **no**
   muestran compilación de `canvas` (si aparecen, ajustar el filtro de `pnpm install` con
   `--prod=false --filter docs...` explícito hasta confirmarlo).
   Si `pnpm install --frozen-lockfile` falla igualmente por manifiestos ausentes de un workspace no
   listado arriba: añadirlo a la lista de `COPY` — no hay atajo, el lockfile es la fuente de verdad
   de qué importers existen.
9. `pnpm install` en la raíz (local, fuera de Docker) y `pnpm --filter docs build`.
10. Ejecutar, en este orden, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
    `pnpm test` desde la raíz — con `apps/docs` presente y poblado con la portada provisional.
11. Confirmar explícitamente que `vitest.workspace.ts` (`defineWorkspace(['packages/*', 'apps/*'])`)
    detecta `apps/docs` como proyecto nuevo sin config propia y que `pnpm test` sigue en verde
    (`--passWithNoTests`) — no asumirlo, ejecutarlo (red-team, Assumption Destroyer Finding 8).

## Success Criteria

- [x] `pnpm --filter docs dev` sirve la portada en local. Verificado: 200 en `/` y en una ruta anidada (`/referencia/herramientas/cli/init/`), dev server detenido limpiamente después.
- [x] `pnpm build` en la raíz produce `apps/docs/dist/index.html` y `apps/docs/dist/pagefind/`. Verificado: 45 páginas construidas, índice Pagefind generado.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` en verde desde la raíz (`pnpm test` ejecutado y confirmado, no asumido). Verificado: typecheck 0 errores (solo hints cosméticos corregidos), lint sin salida, 429 tests en verde (62 ficheros), sin regresiones.
- [x] Segunda ejecución de `pnpm build` sin cambios reporta caché HIT de Turborepo para `docs`. Verificado: `docs:build: cache hit, replaying logs` + `>>> FULL TURBO`.
- [x] `docker build -f Dockerfile.docs .` construye y `docker run` sirve el sitio correctamente; la config nginx copiada responde con el 404 de Starlight en una ruta inexistente. Verificado: 200/200/404 reales vía curl, cuerpo del 404 contiene "Starlight" (confirmado no es el 404 por defecto de nginx).
- [x] Los logs del build Docker no muestran compilación de `canvas`. Verificado en el log real del build (`pnpm install --frozen-lockfile --filter docs...` — sin mención de `canvas`, solo `esbuild` postinstall).
- [ ] **PARCIAL, no falso-positivo:** `git diff turbo.json` vacío (confirmado). `pnpm-workspace.yaml` **no** está vacío — `pnpm install` añadió automáticamente 4 entradas a `minimumReleaseAgeExclude` (gate de supply-chain ya existente en el repo, mismo mecanismo usado para Vue/SvelteKit) para `astro`/`@astrojs/starlight` por ser paquetes recién publicados. Es un cambio legítimo y esperado del propio gate de seguridad del repo, no una edición manual — pero no es literalmente "vacío", así que se deja sin marcar por honestidad.
- [ ] `site`/`base` en `astro.config.mjs` reflejan la respuesta real de Fase 1/S1 — no un valor provisional. **Bloqueado:** sigue usando la asunción documentada en `src/site-config.mjs` (respuesta "a") porque Fase 1/S1 requiere acceso humano al dashboard de Easypanel, no ejecutable de forma autónoma.

## Risk Assessment

- **Riesgo bloqueante (red-team Finding 10):** si Fase 1/S1 no tiene respuesta cerrada, esta fase no
  puede fijar `site`/`base` de forma definitiva. Señal: S1 sigue en (c) sin decisión. Respuesta
  pre-decidida: no avanzar más allá del paso 2 hasta que S1 se resuelva; el resto del scaffolding
  (pasos 3-11) no depende de `site`/`base` y puede avanzar en paralelo.
- **Riesgo:** conflicto de versión de `svelte` si se instala `@astrojs/svelte`. Señal: `pnpm install`
  reporta conflicto de peers. Respuesta pre-decidida: no declarar `@astrojs/svelte` en el MVP.
- **Riesgo (red-team Finding 1, mitigado en el paso 7-8 de esta misma fase, no diferido):** un
  workspace del lockfile queda sin manifiesto copiado en el Dockerfile. Señal: `ERR_PNPM_OUTDATED_LOCKFILE`
  en el paso 8. Respuesta pre-decidida: añadir el manifiesto que falte; el Dockerfile no se da por
  definitivo hasta que el paso 8 pase limpio.
- **Rollback:** `rm -rf apps/docs Dockerfile.docs && pnpm install`. Cero impacto en otros paquetes —
  ningún workspace existente importa `apps/docs`.
