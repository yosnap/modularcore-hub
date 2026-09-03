# Investigación: Starlight + Svelte 5 + Turborepo (monorepo docs)

## 1. Versionado de contenido en Starlight

No hay soporte oficial en `@astrojs/starlight` para múltiples versiones con selector (confirmado: no aparece en su changelog ni en getting-started). Existe el plugin comunitario **`starlight-versions`** (paquete npm exacto: `starlight-versions`), mantenido por HiDeoo (autor de otros plugins Starlight populares). Última versión publicada: **0.10.1** (2026-08-26, hace pocos días) — actividad reciente confirmada vía npm registry y GitHub (`pushed_at` 2026-08-26, 99 stars, 6 issues abiertos). El propio autor lo etiqueta "opinionated, early development, expect frequent breaking changes".

- Peer dependency: `@astrojs/starlight >=0.39.0` (compatible con la 0.41.11 actual).
- No usa carpetas paralelas manuales tipo `src/content/docs/v0.2/`; internamente gestiona una colección `versions` vía `docsVersionsLoader()` en `src/content.config.ts`, y el propio plugin snapshotéa/copia el contenido al crear una nueva versión.
- Integración mínima en `astro.config.mjs`:
```js
import starlight from '@astrojs/starlight';
import starlightVersions from 'starlight-versions';

export default {
  integrations: [
    starlight({
      plugins: [starlightVersions({ versions: [{ slug: '1.0' }] })],
    }),
  ],
};
```
- Selector en header: sí, el plugin añade un selector de versión al navbar (documentado en https://starlight-versions.vercel.app/, no pude extraer el detalle exacto del componente en el fetch).
- **Riesgo de adopción**: alto para un plugin "early development" de un solo mantenedor — válido para un roadmap "stable/beta" simple, pero antes de comprometerse conviene revisar issues abiertos y probar en una rama aislada.

Fuentes: https://github.com/HiDeoo/starlight-versions · https://starlight-versions.vercel.app/getting-started/ · https://www.npmjs.com/package/starlight-versions

## 2. Svelte dentro de Astro/Starlight

Paquete oficial: **`@astrojs/svelte`**, versión actual **9.0.1** (verificado vía `npm view`). Soporta Svelte 5 con Runes desde su **v6** (release note oficial de Astro). Peer dependencies actuales: `astro: ^7.0.0`, `svelte: ^5.43.6`.

Pasos:
1. `npx astro add svelte` (o instalar manualmente `@astrojs/svelte` + `svelte`).
2. Añadir `svelte()` al array `integrations` de `astro.config.mjs`.
3. Los componentes `.svelte` con Runes (`$state`, `$derived`, etc.) funcionan igual que fuera de Astro; se embeben como islas con directivas `client:*` (`client:load`, `client:visible`...) dentro de `.mdx`/`.astro` de Starlight.
4. Starlight actual (0.41.11) requiere `astro ^7.0.2` como peer — compatible con `@astrojs/svelte` 9.x (`astro ^7.0.0`). No hay incompatibilidad conocida.

Fuentes: https://docs.astro.build/en/guides/integrations-guide/svelte/ · npm registry (`@astrojs/svelte` peerDependencies) · astro.build blog (anuncio soporte Svelte 5 en v6 de la integración).

## 3. Turborepo + Astro

No hay un gotcha "oficial" documentado por Astro, pero sí patrones conocidos en la comunidad Turborepo:
- Declarar `outputs: ["dist/**"]` en el `turbo.json` del paquete de docs (Astro por defecto emite a `dist/`, no hay ruta no estándar salvo que se configure `outDir` distinto).
- Turborepo infiere automáticamente variables de entorno públicas de Astro para el cache-key (no hace falta declararlas manualmente en `env`).
- Gotcha real: `inputs` por defecto incluye todo el árbol del paquete, así que cambios no relacionados (README, etc.) invalidan cache — conviene acotar `inputs` explícitamente.
- Si conviven builds anteriores con el mismo `outDir` y el build no limpia antes de escribir, restaurar cache + rebuild puede mezclar artefactos obsoletos; mitigación estándar: limpiar `dist/` antes del build o usar `outputs` con negación de subcarpetas volátiles (`!dist/.astro/**`, cache de Pagefind incluido si aplica).

Fuente: https://turborepo.dev/docs/crafting-your-repository/caching (no encontré caso de estudio específico "Astro+Turborepo" con más detalle; esto queda como recomendación basada en patrones generales de Turborepo, no en un documento oficial Astro-Turborepo).

## 4. Últimas versiones estables (verificado con `npm view`, 2026-09-01)

| Paquete | Versión | Fuente |
|---|---|---|
| `astro` | **7.2.10** | npm registry |
| `@astrojs/starlight` | **0.41.11** | npm registry |
| `@astrojs/svelte` | **9.0.1** | npm registry |

## 5. Pagefind

Starlight integra Pagefind de fábrica para búsqueda estática (sin configuración adicional para un sitio de una sola versión) — Starlight ha ido actualizando su versión interna de Pagefind (mencionado en changelog: soporte de opciones avanzadas `diacriticSimilarity`/`metaWeights`).

**No encontré fuente fiable que confirme que `starlight-versions` filtre o segmente los resultados de Pagefind por versión** (para evitar mezclar resultados de v0.2 y v0.3 en la misma búsqueda). Esto es una laguna real: al ser contenido generado como páginas normales dentro del build, Pagefind indexará todas las versiones juntas salvo que se configure manualmente `data-pagefind-filter`/`data-pagefind-body` con el slug de versión como filtro, o se excluyan versiones antiguas del índice. Recomendación: tratar esto como ítem de validación obligatoria en el plan (spike técnico), no asumir que el plugin lo resuelve.

## Preguntas sin resolver
1. ¿`starlight-versions` inyecta automáticamente `data-pagefind-filter` por versión o hay que añadirlo manualmente? — no verificado, requiere probar el plugin o abrir un issue/leer código fuente.
2. Detalle exacto del componente de selector de versión en el header (posición, si es sobreescribible vía Starlight component override) — no pude extraerlo del fetch a la doc.
3. No existe caso de estudio oficial "Astro + Turborepo" con gotchas documentados por Vercel/Astro; lo indicado en el punto 3 es inferencia de buenas prácticas generales de Turborepo, no una fuente específica del stack.
