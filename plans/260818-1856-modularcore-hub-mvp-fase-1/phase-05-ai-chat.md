---
title: "Phase 5: AI Chat"
status: todo
priority: P1
effort: "6-8d"
dependencies: [2]
---

# Phase 5: AI Chat

## Overview

Componente AI Chat (fusión OpenRouter LLM Proxy + Chatbot Engine). Core headless: streaming, fallback entre modelos, token counting, system prompts, function calling, historial (local o backend). **Proveedor agnóstico estilo LiteLLM**: endpoint OpenAI-compatible configurable (OpenRouter por defecto). Adaptadores React/Svelte/Web + render Markdown/código.

## Requirements

- Funcional: cliente OpenAI-compatible configurable (`baseURL`, `apiKey`, `model`) — OpenRouter default; LiteLLM/OpenAI/otro cambiando solo config.
- Funcional: streaming vía `fetch` + `ReadableStream` (SSE parse), cancelable (AbortController).
- Funcional: fallback entre modelos (lista ordenada; si uno falla, siguiente).
- Funcional: token counting (aprox por tokenizer ligero) + límites/uso.
- Funcional: system prompts configurables; function calling (tools) con ejecución de handlers registrados.
- Funcional: historial con interfaz de storage intercambiable (`local` = memoria/localStorage; `backend` = endpoints del usuario) — backend-agnostic.
- Funcional: adaptadores `useChat` (React), rune (Svelte), y API vanilla (Web) + util render Markdown/código.
- No funcional: BYOK; la key nunca se hardcodea en el core. Ningún archivo >1000 líneas.

## Architecture

```
packages/ai-chat/
├─ modularcore.json          # descriptor (frameworks: [react, svelte, web])
├─ core/
│  ├─ chat.ts               # orquestador headless (mensajes, estado, acciones)
│  ├─ client.ts             # OpenAI-compatible client (baseURL/model)
│  ├─ stream.ts             # ReadableStream/SSE parse, cancel
│  ├─ fallback.ts           # estrategia multi-modelo
│  ├─ tokens.ts             # counting/uso
│  ├─ tools.ts              # function calling (registro + dispatch)
│  └─ history/{local.ts,backend.ts,types.ts}
├─ adapters/react/use-chat.ts
├─ adapters/svelte/create-chat.svelte.ts
├─ adapters/web/chat-element.ts     # API vanilla
├─ ui/markdown.ts                   # render Markdown/código (util)
└─ test/*
```

Config: `{ baseURL, apiKey, models:[...], systemPrompt, tools:[], history:'local'|Backend }`.
`ChatHistory` interfaz: `load()`, `append(msg)`, `clear()`. `Tool`: `{ name, schema, handler }`.

## Related Code Files

- Create: `packages/ai-chat/modularcore.json`
- Create: `packages/ai-chat/core/{chat.ts,client.ts,stream.ts,fallback.ts,tokens.ts,tools.ts}`
- Create: `packages/ai-chat/core/history/{local.ts,backend.ts,types.ts}`
- Create: `packages/ai-chat/adapters/react/use-chat.ts`
- Create: `packages/ai-chat/adapters/svelte/create-chat.svelte.ts`
- Create: `packages/ai-chat/adapters/web/chat-element.ts`
- Create: `packages/ai-chat/ui/markdown.ts`, `packages/ai-chat/test/*`

## Implementation Steps

1. `client.ts`: request OpenAI-compatible chat/completions (baseURL/model/headers); default OpenRouter.
2. `stream.ts`: parse SSE desde `ReadableStream`, emitir deltas, `AbortController` para cancelar.
3. `chat.ts`: estado headless (mensajes, streaming, error) + acciones send/stop/reset.
4. `fallback.ts`: iterar lista de modelos ante error/timeout.
5. `tokens.ts`: counting aproximado + reporte de uso.
6. `tools.ts`: registrar tools (name+schema+handler), detectar tool_calls en el stream, ejecutar y realimentar.
7. `history/`: `local` (localStorage/memoria) + `backend` (interfaz que llama endpoints del usuario).
8. Adaptadores React/Svelte/Web + `ui/markdown.ts` (render seguro Markdown/código).
9. Descriptor con envVariables (`OPENROUTER_API_KEY` u `OPENAI_API_KEY`, `LLM_BASE_URL` opcional). Registrar en build.
10. Tests: stream mock (SSE fixture), fallback (primer modelo falla), tool dispatch, history local. Smoke real contra OpenRouter (key de test).

## Success Criteria

- [ ] Streaming real vía OpenRouter renderiza tokens incrementales; cancelable.
- [ ] Cambiar `baseURL/model` conmuta de proveedor sin tocar el core.
- [ ] Fallback pasa al siguiente modelo ante fallo.
- [ ] Function calling ejecuta un tool y realimenta el resultado.
- [ ] Historial local y backend-agnostic funcionan.
- [ ] Instalable vía CLI; `.env.example` con la key. Ningún archivo >1000 líneas.

## Risk Assessment

- **Diferencias entre endpoints "OpenAI-compatible"** → ceñirse al subset común; probar OpenRouter primero, documentar límites.
- **Fugas de key** → BYOK; el playground del website usa proxy server-side con la key del dueño (Fase 6), nunca en cliente.
- **Render Markdown inseguro** → sanitizar; escapar HTML no confiable.
