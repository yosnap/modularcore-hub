---
title: "Playground"
description: "Qué es el Playground de ModularCore Hub y cómo enruta cada demo de componente en producción."
---

El **Playground** es el conjunto de demos interactivas de `modularcorehub.com` donde puedes probar
un componente en vivo, en el navegador, antes de copiarlo a tu proyecto. No es una simulación
estática: cada demo monta el core real del paquete (`@modularcore/ai-chat`, `@modularcore/
auto-seo`, etc.) contra una implementación de referencia — un proxy de servidor propio para AI
Chat, un `StorageProvider` en memoria para Media Picker, etc. — para que puedas interactuar con el
comportamiento real sin necesidad de credenciales propias.

## Cómo funciona el enrutado

Cada demo vive en una ruta propia bajo `/playground/<componente>` en la app `apps/web` (SvelteKit).
El registro central de qué demos existen y a qué URL apuntan es el array `PLAYGROUNDS` en
`apps/web/src/lib/playgrounds.ts`:

```ts
export interface PlaygroundEntry {
  component: string;
  label: string;
  href: string;
}

export const PLAYGROUNDS: readonly PlaygroundEntry[] = [
  { component: 'ai-chat', label: 'AI Chat', href: '/playground/ai-chat' },
  { component: 'auto-seo', label: 'Auto SEO', href: '/playground/auto-seo' },
  { component: 'media-picker', label: 'Media Picker', href: '/playground/media-picker' },
  { component: 'modals', label: 'Modals', href: '/playground/modals' },
];
```

Cada entrada tiene una ruta física correspondiente (`apps/web/src/routes/playground/<componente>/
+page.svelte`) que renderiza esa demo concreta. `playgroundFor(component)` resuelve una entrada por
su slug, lo que permite a cualquier parte de la app (por ejemplo, un enlace desde la página de un
componente del catálogo) enlazar de forma consistente al playground correcto sin repetir rutas
hardcodeadas.

## El caso especial de AI Chat: un proxy real, no una simulación

La demo de AI Chat (`apps/web/src/lib/playground-chat.svelte.ts`) es un consumidor real de la
primitiva de streaming del propio paquete (`core/stream.ts`'s `parseSseStream`), pero en lugar de
hablar directamente con OpenRouter, envía las peticiones a `/api/chat`, un endpoint propio de la
app `apps/web` (`apps/web/src/routes/api/chat/+server.ts`). Ese endpoint:

- Inyecta la API key de OpenRouter del propio proyecto en el servidor (nunca llega al navegador).
- Aplica un límite de peticiones (rate limiting) en memoria por proceso de servidor.
- Sirve como allowlist de modelos y streaming real hacia el cliente.

Deliberadamente no usa el orquestador `Chat` completo del paquete (`core/chat.ts`), que siempre
hace POST a `${baseURL}/chat/completions`: la demo necesita el endpoint más plano `/api/chat`, así
que solo consume el parser de streaming y gestiona el estado de la conversación (`$state` de
Svelte 5) por su cuenta.

## Las demás demos

Auto SEO, Media Picker y Modals no necesitan ningún backend propio: sus playgrounds ejecutan el
core del paquete directamente en el navegador (Auto SEO genera JSON-LD sin red; Media Picker usa
un `StorageProvider` en memoria; Modals usa su `core/providers/in-memory.ts`).

## Páginas de cada playground

- [Playground de AI Chat](/referencia/playground/ai-chat/)
- [Playground de Auto SEO](/referencia/playground/auto-seo/)
- [Playground de Media Picker](/referencia/playground/media-picker/)
- [Playground de Modals](/referencia/playground/modals/)
