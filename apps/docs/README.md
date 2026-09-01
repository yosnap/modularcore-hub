# apps/docs

Sitio de documentación pública de ModularCore Hub (Starlight/Astro), servido en
`docs.modularcorehub.com`.

## Desarrollo

```bash
pnpm --filter docs dev
pnpm --filter docs build
```

## Versionado

El versionado de esta documentación es **manual**, disparado por el mantenedor cuando lo decide —
nunca automático ni desde CI:

```bash
pnpm --filter docs version:freeze -- <slug>
```

`<slug>` no puede contener puntos (Astro los sanea en la URL final) — usa guiones, p. ej.
`v1-0-0`, no `1.0.0`.

No se adoptó el plugin comunitario `starlight-versions` (un solo mantenedor, fase temprana,
"expect frequent breaking changes" según su propio autor) — en su lugar, este workspace implementa
un mecanismo propio (`scripts/freeze-version.mjs`, `versions.json`) de ~150 líneas sin dependencias
externas. Ver `src/content/docs/conceptos/versionado.md` para la política completa, incluida la de
qué hacer si una actualización futura de Astro/Starlight rompe el build de una versión archivada.

## Mejora futura considerada, no implementada

Los README de `packages/ai-chat`, `packages/auto-seo`, `packages/media-picker` y `packages/modals`
ya son la fuente real de la documentación de esos componentes en `apps/web`
(`apps/web/src/lib/docs.ts`). Sincronizar automáticamente esos README hacia
`referencia/componentes/*.md` (en vez de mantenerlos escritos a mano, como se hizo en esta primera
entrega) eliminaría la deriva entre ambos sitios. No se implementó en esta entrega porque no
formaba parte del alcance pedido explícitamente y `packages/hello-core`/`packages/cli` no tienen
README propio — evaluar si se retoma en una iteración futura.

## Rutas duplicadas en apps/web

`apps/web` sirve documentación real en `/cli`, `/mcp-server` y `/c/[name]` desde antes de que este
sitio existiera. Una vez `docs.modularcorehub.com` esté en producción, esas rutas se ocultan de la
navegación (no se eliminan) con un aviso de traslado — ver el issue de GitHub de seguimiento y el
plan `docs-site-starlight`, Fase 7.
