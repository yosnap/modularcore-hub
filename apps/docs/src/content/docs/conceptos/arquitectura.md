---
title: "Arquitectura"
description: "El registry HTTP como única fuente de verdad y los canales como clientes delgados."
---

ModularCore Hub se organiza alrededor de un principio central: **un registry HTTP como única fuente de verdad; todos los canales son clientes delgados.**

```
                ┌──────────────────────────────────┐
                │   REGISTRY HTTP API (SvelteKit)  │  ← ÚNICA fuente de verdad
                │   GET /registry/index.json       │     (catálogo + versiones)
                │   GET /registry/{name}.json      │     (descriptor + archivos)
                │   GET /registry/{name}.tar.gz    │     (descarga directa)
                │   Auth: API keys (Better Auth)   │
                └───┬────────┬────────┬────────┬───┘
                    │        │        │        │
              ┌─────▼───┐ ┌──▼─────┐ ┌▼───────┐ ┌▼────────────────┐
              │ Website │ │  CLI   │ │  MCP   │ │ Export opcional │
              │ catálogo│ │ propio │ │ propio │ │ schema shadcn   │
              │ + docs  │ │ (npm)  │ │ (sdk)  │ │ (interop gratis)│
              └─────┬───┘ └──┬─────┘ └┬───────┘ └─────────────────┘
                    │        │        │
              copiar a mano  │   agentes IA
              / curl (sin    │   (Cursor, Claude,
              ningún gestor) │    VS Code, ChatGPT)
                             │
                    add / list / update / diff
```

## Por qué un registry único

Toda la lógica de producto —versiones de componentes, dependencias entre componentes, variables de entorno requeridas, compatibilidad de frameworks— vive en el registry HTTP. Web, CLI y MCP **no** duplican esa lógica: solo la consumen a través de los mismos endpoints.

Esto tiene una consecuencia directa para quien contribuye o integra: cualquier cambio de comportamiento del producto (qué componentes existen, qué versión tienen, qué dependencias requieren) se hace en el registry, nunca en un cliente concreto.

## Endpoints del registry

| Endpoint | Descripción |
| --- | --- |
| `GET /registry/index.json` | Catálogo completo: nombre, título, categoría, versión, frameworks, descripción. |
| `GET /registry/{name}.json` | Descriptor completo del componente, incluido el contenido de sus archivos. |
| `GET /registry/{name}.tar.gz` | Descarga directa del componente (canal manual / `curl`). |
| `GET /r/{name}.json` (opcional) | Export compatible con el formato de shadcn, generado desde el mismo descriptor. |

El registry es JSON estático generado en build, lo que permite servirlo desde cualquier hosting barato con caché de CDN, sin necesidad de una base de datos para el catálogo en sí.

## Capas de un componente

1. **Core agnóstico** (TypeScript / Web Standards): la lógica de negocio, escrita con APIs web universales (`fetch`, `ReadableStream`, `FormData`, Canvas API), sin dependencias visuales.
2. **Adaptadores reactivos**: wrappers delgados sobre ese core — Hooks en React, Runes en Svelte, y en el futuro Composables en Vue o componentes standalone en Angular.
3. **Snippets planos**: para stacks que no tienen un modelo de componentes reactivo equivalente (por ejemplo, Laravel Blade/PHP), el componente se distribuye como archivos planos dentro del mismo paquete del registry, sin una capa especial.

## Cómo encajan los clientes

- La **Web** sirve el catálogo, la documentación y los endpoints del registry.
- El **CLI** es un cliente npm que resuelve dependencias, revisa compatibilidad y copia archivos, siempre pidiendo confirmación antes de escribir o instalar nada.
- El **MCP** ofrece la misma capacidad a agentes de IA a través de tools, hablando con el mismo registry.

Para el detalle de por qué existen estas tres formas de uso, ve a [Los tres pilares](/conceptos/los-tres-pilares/).
