---
phase: 5
title: "Versionado manual"
status: pending
priority: P1
effort: "6-8h"
dependencies: [4]
---

# Fase 5: Versionado manual

## Overview

Infraestructura de versionado por snapshot congelado, disparada a mano por el usuario, sin adoptar
`starlight-versions`. **Endurecida tras red-team** (Findings 7, 8, 14, 15): validación de input,
escritura atómica, esquema de contenido ya extendido en Fase 2, `versions.json` como única fuente
del sidebar archivado (no mantenido a mano en dos sitios), y una política explícita sobre qué pasa
cuando la toolchain de Starlight cambie después de congelar una versión.

## Requirements

- Funcional: un script congela la versión actual en una carpeta de solo lectura, actualiza un
  manifiesto único (`versions.json`) del que derivan tanto el selector como el sidebar archivado.
- No funcional: idempotente, **atómico** (escritura en directorio temporal + `rename` final, nunca
  un estado a medias visible), y con el slug validado contra una allowlist estricta.

## Related Code Files

- Create: `apps/docs/versions.json`
- Create: `apps/docs/scripts/freeze-version.mjs`
- Create: `apps/docs/src/components/VersionSelect.astro`
- Modify: `apps/docs/astro.config.mjs` (override de componente; grupos de sidebar archivados **generados desde `versions.json` por `.map()`**, no añadidos a mano)
- Modify: `apps/docs/package.json` (script `version:freeze`)
- Modify: `apps/docs/src/content/docs/conceptos/versionado.md` (contenido definitivo, creado en Fase 4)

## Implementation Steps

1. Crear `apps/docs/versions.json`: `{ "current": "1.0.0", "archived": [] }` (estado inicial;
   contador propio de la documentación, confirmado por el usuario como `v1.0.0`).
2. Implementar `apps/docs/scripts/freeze-version.mjs <slug>`:
   - **Validación de input primero** (red-team, Security Finding 2 — el script escribía ficheros con
     menos validación que el lector de ficheros ya existente del repo,
     `apps/web/src/routes/registry/[file]/+server.ts:26`, que usa
     `/^[a-z0-9-]+\.(?:json|tar\.gz)$/i`): `if (!/^[a-z0-9][a-z0-9.-]{0,31}$/.test(slug)) abort()`.
     Resolver la ruta destino con `path.resolve` y verificar que el resultado sigue bajo
     `src/content/docs/` antes de escribir nada. Rechazar si `slug` coincide con el nombre de una
     sección de primer nivel del sidebar (leído de `versions.json`, **no** importando
     `astro.config.mjs` desde el script — importar la config de Astro fuera de su runtime es fragil,
     red-team Finding 15; en su lugar, `versions.json` mantiene también la lista de slugs de
     secciones de primer nivel reservados).
   - **Escritura atómica:** copiar el árbol actual a un directorio temporal
     `src/content/docs/.<slug>.tmp/` (excluyendo carpetas de versiones ya archivadas), reescribir
     enlaces y frontmatter ahí, y solo al final hacer `fs.rename('.{slug}.tmp', slug)`. Si cualquier
     paso intermedio falla, el directorio temporal queda huérfano pero **el contenido servible nunca
     queda a medias** — limpieza del `.tmp` es un paso de recuperación documentado, no un estado que
     rompa el build.
   - Reescritura de enlaces con función de reemplazo (nunca un string con `$` sin escapar — riesgo
     de inyección en el patrón de `String.replace` señalado por red-team Finding 2).
   - Inyecta en el frontmatter de cada página copiada los campos ya declarados en el esquema
     extendido de Fase 2 (`archived: true`, `pagefindExclude: true` o el mecanismo que Fase 1/S3
     determinó) — el `content.config.ts` ya los acepta, no hace falta tocarlo aquí.
   - Actualiza `versions.json` **como última operación**, después de que el `rename` atómico haya
     tenido éxito.
   - Imprime un informe de enlaces reescritos y lista los enlaces no reconocidos para revisión
     manual.
   - No hace commit ni tag — el disparo y la publicación son responsabilidad del usuario.
3. Crear `apps/docs/src/components/VersionSelect.astro`: `<select>` alimentado por
   `versions.json` + `getCollection('docs')`; navega preservando la ruta relativa cuando existe en
   la versión destino; si no existe, cae a la raíz de esa versión (nunca 404). El banner de "versión
   archivada" se renderiza **desde el mismo componente/override**, leyendo el flag `archived` del
   frontmatter de la página actual — sin un componente `ArchivedBanner.astro` separado y sin cablear
   (red-team Finding en el informe de Scope Critic: un componente huérfano sin consumidor era peor
   que integrarlo directamente donde se usa).
4. Registrar el override en `astro.config.mjs`. Los grupos de sidebar por versión archivada se
   generan programáticamente: `versionsJson.archived.map(slug => ({ label: \`${slug} (archivada)\`, collapsed: true, autogenerate: { directory: slug } }))` — `versions.json` es la única fuente, el
   sidebar nunca se edita a mano para esto (red-team Finding 15).
5. Redactar `conceptos/versionado.md` explicando el modelo al lector, incluida:
   - La limitación de búsqueda si Fase 1/S3 cayó a degradación cosmética.
   - **Política explícita sobre el riesgo de toolchain (red-team Finding 14):** las versiones
     archivadas viven en la misma colección de contenido y se recompilan con el Astro/Starlight
     *actual* en cada build — congelar el contenido no congela la herramienta que lo renderiza. Si
     una actualización mayor de Starlight rompe el build de una versión archivada (p. ej. cambia el
     nombre del campo de exclusión de Pagefind), la política es: corregir el frontmatter de esa
     versión archivada puntualmente (no está prohibido tocarla para mantenerla compilable, solo para
     cambiar su contenido narrativo) o, si el coste es alto, degradarla a HTML estático servido desde
     `apps/docs/public/<slug>/` fuera de la colección de contenido. Documentado aquí para que la
     decisión no se improvise en el momento del incidente.
6. Ensayo en rama desechable: congelar una versión de prueba sobre el contenido de Fase 4,
   comprobar el build, comprobar el gate de búsqueda, y descartar la rama (no se congela ninguna
   versión real en este plan — el usuario decide cuándo).

## Success Criteria

- [x] **Ejecutado con hallazgo real y corregido:** el primer ensayo usó el slug `1.0.0-test` (con puntos) y descubrió que Astro sanea los puntos del nombre de directorio en el slug final (`1.0.0-test` → `100-test` en la URL servida, 404 real reproducido con Docker). Repetido con `v1-0-0-test` (sin puntos): crea `src/content/docs/v1-0-0-test/` con las mismas 44 páginas, vía directorio temporal + rename, sin residuo `.tmp`. **Implicación documentada:** los slugs de versión no deben contener puntos — ver nota añadida a `conceptos/versionado.md` y al `README.md` de `apps/docs`.
- [x] `pnpm --filter docs version:freeze -- ../../../etc` falla en la validación de input sin escribir nada. Verificado: `[freeze-version] Slug inválido "../../../etc"...`, `versions.json` intacto tras el intento.
- [x] Re-ejecutar el mismo slug válido ya archivado falla con error explícito (`ya está archivada`) y no modifica ningún fichero. Verificado.
- [x] **Verificado por revisión de diseño, no por interrupción real:** dos intentos de matar el proceso a mitad de ejecución (con `kill -9` tras polling) no lograron capturarlo — el script copia 44 páginas en menos de los milisegundos que tarda el propio `kill` en llegar, así que la interrupción real no fue reproducible de forma fiable. El diseño atómico (copia a `.tmp` + `rename` final) se mantiene verificado por lectura de código, no por prueba empírica de fallo a mitad.
- [x] Tras el ensayo, el build pasa; el selector mostró la versión actual y la archivada; el sidebar archivado se generó desde `versions.json` sin edición manual. **Hallazgo real corregido en el camino:** la sintaxis inicial `{ label, collapsed, autogenerate: {...} }` para un grupo archivado no es válida en Starlight 0.41 — el error real del build indicó la forma correcta: `{ label, collapsed, items: [{ autogenerate: {...} }] }`. Corregido en `astro.config.mjs`.
- [x] Navegar a una página archivada funciona (200 real vía Docker) y los enlaces del cuerpo del artículo no se salen de su prefijo de versión (verificado extrayendo solo los enlaces de `.sl-markdown-content`, excluyendo el sidebar global que correctamente siempre apunta a la versión actual).
- [x] **Hallazgo real corregido:** el campo `pagefindExclude` que este documento especificaba originalmente **no existe** — es un campo inventado que Pagefind ignora (confirmado empíricamente: con él, Pagefind indexó 89/89 páginas, incluidas las archivadas). El campo real es `pagefind: false` (nativo de `docsSchema`, verificado en `starlight.astro.build/reference/frontmatter/`). Corregido en `content.config.ts` (ya no necesita extensión de esquema para esto) y `freeze-version.mjs`. Reverificado tras el fix: `page_count: 44` en `pagefind-entry.json` real (no 89) — la búsqueda ya no cubre versiones archivadas.
- [x] `conceptos/versionado.md` incluye la política de riesgo de toolchain explícita (creado por el agente de contenido de Fase 4, verificado).
- [x] El ensayo se revirtió: `src/content/docs/v1-0-0-test/` eliminado, `versions.json` restaurado a `archived: []`, rebuild confirma 45 páginas (44 + 404), guardarraíl en verde.

## Risk Assessment

- **Riesgo 1 heredado (plugin inmaduro):** eliminado por diseño — no se adopta `starlight-versions`.
- **Riesgo 2 heredado (Pagefind mezclando versiones):** mitigado por diseño si el mecanismo de Fase
  1/S3 funciona; residuo asumido si cae a degradación cosmética.
- **Riesgo nuevo (red-team Finding 7, mitigado en el diseño de esta fase):** slug malicioso o
  malformado escribiendo fuera del árbol de contenido. Mitigación: allowlist + `path.resolve` +
  verificación de que la ruta resultante sigue bajo `src/content/docs/`, antes de cualquier copia.
- **Riesgo nuevo (red-team Finding 14, documentado, no eliminado):** upgrade futuro de
  Astro/Starlight puede romper el build de versiones archivadas. Mitigación: política explícita en
  `conceptos/versionado.md` (paso 5), no un mecanismo automático — es un riesgo operativo aceptado.
- **Rollback:** borrar la carpeta de la versión archivada y su entrada en `versions.json` — el
  mecanismo es puramente aditivo, sin estado persistente ni migración de datos, gracias a la
  escritura atómica del paso 2.
