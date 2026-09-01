---
title: "Introducción"
description: "Qué es ModularCore Hub, para qué sirve y a quién está dirigido."
---

ModularCore Hub es un repositorio y ecosistema de distribución para **componentes funcionales headless** (sin diseño forzado) orientados a proyectos web. A diferencia de librerías visuales como shadcn UI, Radix o Tailwind UI, que resuelven estilos y accesibilidad básica, ModularCore resuelve la **lógica de negocio compleja y multi-proveedor**: gestión unificada de almacenamiento (AWS S3, MinIO, Cloudinary, Azure Blob), un chat con IA con streaming y function calling sobre un proveedor intercambiable, agentes de SEO automatizados, y motores de traducción, entre otros.

## Qué resuelve

El catálogo publica los componentes y sus metadatos en un **registry HTTP**. Desde ahí puedes llevarlos a tu proyecto con el CLI o pedírselos a un agente de IA mediante el servidor MCP. El código resultante queda copiado en tu propio repositorio, sin runtime del hub ni dependencia de un gestor de componentes: puedes adaptarlo libremente a tus necesidades, igual que cualquier otro código de tu aplicación.

El diferencial frente a integrar cada SDK a mano es unificar varios proveedores bajo una API común y multi-framework:

```
Antes: 4 SDKs de storage × 3 frameworks = 12 integraciones
Después: 1 componente ModularCore × 3 frameworks = 3 integraciones
```

## Cómo se usa

Hay tres formas de acceder al catálogo, todas clientes delgados sobre el mismo registry HTTP:

- **Web**: el catálogo visual con documentación y playgrounds por componente.
- **CLI**: `modularcore init`, `add`, `list`, `search`, `update`, `diff` desde la terminal.
- **MCP**: un servidor que permite a agentes de IA (Cursor, Claude Code, VS Code u otros clientes compatibles) buscar e instalar componentes.

## Casos de uso

ModularCore Hub está pensado para **indie hackers y agencias** que integran storage, LLM o SEO de forma repetida en proyectos React, Svelte, Vue, Angular o backends clásicos como Laravel. No está orientado a necesidades enterprise en su versión actual.

- **Indie hackers**: evitan reescribir la integración de almacenamiento o de un proveedor de IA en cada proyecto nuevo, partiendo de código propio y editable en lugar de una dependencia opaca.
- **Agencias**: reutilizan componentes probados (Media Picker, AI Chat, Auto-SEO) entre distintos clientes y frameworks sin mantener una librería interna propia.

## Próximo paso

Continúa con [Instalación](/empezar/instalacion/) para preparar el CLI, o con [Inicio rápido](/empezar/inicio-rapido/) si ya tienes Node.js instalado y quieres ver el flujo completo.
