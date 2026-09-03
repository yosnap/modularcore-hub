---
title: "Instalación"
description: "Requisitos e instalación del CLI de ModularCore Hub."
---

## Requisitos

- **Node.js 18 o superior.**
- Acceso a un registry de ModularCore Hub (el público, en `https://modularcorehub.com/registry`, u otro despliegue propio).

No necesitas ninguna otra herramienta para empezar a usar el CLI: no requiere base de datos, ni servicios adicionales, ni una cuenta para los componentes gratuitos.

## Instalar el CLI

El CLI público es [`@modularcore/cli`](https://www.npmjs.com/package/@modularcore/cli) y expone el comando `modularcore`. Instálalo de forma global con npm:

```bash
npm install --global @modularcore/cli@0.2.1
```

Puedes fijar una versión distinta si lo necesitas, pero usar `@0.2.1` (u otra versión concreta) evita sorpresas si se publica una versión mayor con cambios incompatibles.

Verifica que quedó disponible:

```bash
modularcore --help
```

## Alternativas sin instalar el CLI

Si prefieres no instalar nada de forma global:

- **Descarga manual**: copia archivos directamente desde la web del catálogo, o descarga el tarball de un componente con `curl` desde `https://<tu-registry>/{nombre}.tar.gz`.
- **MCP**: configura el servidor `@modularcore/mcp-server` en tu cliente de IA (Cursor, Claude Code, VS Code u otro compatible) para pedir componentes desde un agente, sin pasar por la terminal. Se ejecuta bajo demanda con `npx`, sin necesidad de mantener un servicio desplegado.

## Siguiente paso

Con el CLI instalado, continúa con [Inicio rápido](/empezar/inicio-rapido/) para inicializar un proyecto e incorporar tu primer componente.
