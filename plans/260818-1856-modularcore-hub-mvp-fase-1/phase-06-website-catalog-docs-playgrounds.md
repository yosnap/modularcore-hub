---
title: "Phase 6: Website Catalog Docs Playgrounds"
status: todo
priority: P2
effort: "5-6d"
dependencies: [2, 4, 5]
---

# Phase 6: Website Catalog Docs Playgrounds

## Overview

App SvelteKit 5 (Runes) = catálogo visual + docs + playgrounds + endpoints del registry. Mínimo funcional (sin diseño pulido, decisión de bootstrap). Playground del AI Chat = demo con la OpenRouter key del dueño vía **proxy server-side** (tutorial vivo de cambio de proveedor). Sirve `/registry/*` generado en Fase 2.

## Requirements

- Funcional: catálogo `/` leyendo `index.json`; página de componente `/c/{name}` con docs (desde descriptor + markdown) y frameworks/versión/envVariables.
- Funcional: instrucciones de instalación por componente: manual (`curl` del tarball / copiar) **y** CLI (`modularcore add {name}`).
- Funcional: playground AI Chat (usa componente real de Fase 5) con proxy `+server.ts` que inyecta la key del dueño server-side (nunca al cliente).
- Funcional: playground Media Picker (Fase 4) con provider de demo (o mock) — sin exponer credenciales.
- Funcional: endpoints del registry servidos por esta app (`/registry/index.json|{name}.json|{name}.tar.gz`).
- No funcional: build estático donde sea posible; el proxy del chat es la única parte server. Rate limit básico en el proxy.

## Architecture

```
apps/web/
├─ src/routes/
│  ├─ +page.svelte                 # catálogo (index.json)
│  ├─ c/[name]/+page.svelte        # detalle + docs + install
│  ├─ playground/
│  │  ├─ ai-chat/+page.svelte
│  │  └─ media-picker/+page.svelte
│  ├─ api/chat/+server.ts          # proxy OpenRouter (key del dueño, server-side)
│  └─ registry/                    # servir index/{name}.json/{name}.tar.gz
├─ src/lib/                        # UI mínima compartida
└─ static/registry/               # salida de build:registry (Fase 2)
```

Docs por componente: markdown en el paquete (`packages/{name}/README.md` o `docs.md`) leído en build. Playground del chat = consumidor del propio `@modularcore/ai-chat` apuntando a `/api/chat`.

## Related Code Files

- Create: `apps/web/src/routes/+page.svelte`, `apps/web/src/routes/c/[name]/+page.svelte`
- Create: `apps/web/src/routes/playground/ai-chat/+page.svelte`, `.../media-picker/+page.svelte`
- Create: `apps/web/src/routes/api/chat/+server.ts` (proxy)
- Create: `apps/web/src/lib/*` (componentes UI mínimos, loader de index/docs)
- Modify: `apps/web` config para servir `static/registry/*`
- Reuse: `@modularcore/ai-chat`, `@modularcore/media-picker`, `@modularcore/registry`

## Implementation Steps

1. Consolidar `apps/web` (skeleton de Fase 2) con layout mínimo + navegación.
2. Catálogo `/`: cargar `index.json`, listar tarjetas (title/category/frameworks/version).
3. `/c/[name]`: descriptor + docs markdown + bloques de install (manual curl + `modularcore add`).
4. `api/chat/+server.ts`: proxy a OpenRouter con key del dueño (env server-side) + rate limit básico + streaming passthrough.
5. Playground AI Chat: montar el componente real apuntando a `/api/chat`.
6. Playground Media Picker: demo con provider mock/demo (sin credenciales reales expuestas).
7. Servir endpoints `/registry/*` desde la app (verificar content-types y caché).
8. Verificar build completo (`pnpm build`) y que el sitio lista Media Picker + AI Chat con docs y playgrounds.

## Success Criteria

- [ ] Catálogo lista ≥2 componentes desde `index.json`.
- [ ] Cada componente muestra docs, frameworks, envVariables e instrucciones manual + CLI.
- [ ] Playground AI Chat streamea vía proxy server-side sin exponer la key.
- [ ] Playground Media Picker funciona sin filtrar credenciales.
- [ ] `/registry/index.json|{name}.json|{name}.tar.gz` accesibles con content-type correcto.
- [ ] `pnpm build` de la web verde.

## Risk Assessment

- **Fuga de la key del dueño** → solo server-side en `+server.ts`; nunca en payload cliente; rate limit + límite de tokens.
- **Coste del playground abierto** → rate limit por IP/sesión, tope de tokens por request.
- **Docs desincronizadas** → docs viven en el paquete y se leen en build; una sola fuente.
