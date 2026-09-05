---
title: "AI Chat"
description: "Componente headless de chat con streaming, function calling y fallback de modelos, compatible con cualquier endpoint OpenAI."
---

`@modularcore/ai-chat` es el core headless de chat con IA: streaming compatible con OpenAI,
fallback entre modelos, seguimiento de uso de tokens, function calling con confirmación
human-in-the-loop, e historial local o contra tu propio backend — con adaptadores finos para
React, Svelte, Vue 3, Angular y Web Components sin framework.

## BYOK (Bring Your Own Key)

El core nunca lee ni hardcodea una API key desde el entorno. Tu aplicación pasa `apiKey` (y
opcionalmente `baseURL`) en `ChatConfig`. Esto permite apuntar a OpenRouter (el proveedor por
defecto), a OpenAI directamente, o a cualquier otro endpoint `/chat/completions` compatible con
OpenAI — incluido tu propio proxy en servidor, de modo que la clave nunca llega al navegador.

## Qué incluye el paquete

- `core/client.ts` — cliente ligero basado en `fetch`, compatible con OpenAI
  (`requestChatCompletionStream`).
- `core/stream.ts` — parser real de SSE sobre el `ReadableStream<Uint8Array>` que devuelve `fetch`.
- `core/chat.ts` — `Chat`, el orquestador headless (streaming, bucle de tool-calls, historial).
- `core/fallback.ts` — prueba una lista ordenada de modelos, haciendo fallback si uno falla.
- `core/tokens.ts` — parsea los payloads `usage` de cada proveedor.
- `core/tools.ts` — registro de function calling + despacho human-in-the-loop.
- `core/history/*` — historial de conversación conectable (almacenamiento local o tu propio
  backend).
- `ui/markdown.ts` — renderizador Markdown → HTML sin dependencias que escapa todo el texto no
  confiable antes de añadir cualquier marcado, por lo que su salida es segura para asignar a
  `innerHTML`/`{@html}`.
- `adapters/react`, `adapters/svelte`, `adapters/web` — bindings finos sobre `Chat` para cada
  framework (el adaptador de Svelte usa runas de Svelte 5). `adapters/web` es el binding sin
  framework, el que el descriptor declara como `vanilla`.
- `adapters/vue`, `adapters/angular` — bindings por componente (Composition API / signals) con
  limpieza de ciclo de vida; no comparten estado de conversación de forma global.

## Laravel / Blade

`snippets/laravel/` incluye un punto de montaje Blade y una referencia de proxy OpenAI-compatible
en servidor. Mantén la clave del proveedor en la configuración de Laravel, autentica y limita la
ruta, y conserva el allowlist de modelos; nunca inyectes una clave de proveedor en una plantilla
Blade.

## Uso básico (Svelte 5)

```ts
import { createChat } from '@modularcore/ai-chat/svelte';

const chat = createChat({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY, // o proxy a través de tu propio backend
  models: ['openai/gpt-4o-mini'],
});

await chat.send('Hola!');
```

Para una demo pública, nunca envíes una clave real al cliente: haz proxy de las peticiones a
través de un endpoint en servidor que inyecte la clave (el propio [Playground de AI
Chat](/referencia/playground/ai-chat/) de este sitio hace exactamente esto).

## Más documentación

- `docs/backend-history-contract.md` (dentro de `packages/ai-chat/`) — el contrato que debe
  implementar tu backend si usas `core/history/backend.ts` en lugar del almacenamiento local.
