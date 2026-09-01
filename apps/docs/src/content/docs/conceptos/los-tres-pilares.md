---
title: "Los tres pilares"
description: "Por qué Web, CLI y MCP son las tres formas de usar ModularCore Hub."
---

ModularCore Hub se distribuye a través de tres canales de primer nivel: **Web, CLI y MCP**. No son tres productos distintos, sino tres clientes delgados del mismo [registry HTTP](/conceptos/arquitectura/) — cada uno pensado para un contexto de uso diferente.

## Web

El catálogo visual, con documentación y un playground por componente. Es el punto de entrada para explorar qué existe, leer su documentación y, en componentes que lo permiten, probarlo en vivo sin instalar nada (por ejemplo, el playground del AI Chat corre con la clave de OpenRouter del propio sitio, a modo de demo). También sirve los endpoints del registry que consumen el CLI y el MCP.

## CLI

El canal pensado para trabajar desde la terminal. El comando `modularcore` cubre el ciclo completo: `init` para configurar el proyecto, `list`/`search` para descubrir componentes, `add` para incorporarlos, y `update`/`diff` para mantenerlos al día. Es un cliente delgado: no contiene lógica de producto propia, solo llama al registry y aplica las decisiones (compatibilidad, dependencias, confirmaciones) antes de tocar el disco.

## MCP

El canal pensado para agentes de IA. El servidor `@modularcore/mcp-server` conecta un cliente compatible con el protocolo MCP (Cursor, Claude Code, VS Code u otros) al mismo registry, por `stdio`. El cliente MCP inicia el proceso del servidor cuando lo necesita: no hace falta mantener un servicio desplegado. Permite buscar y consultar componentes y, cuando el cliente admite confirmación, guardar sus archivos dentro del proyecto activo. El MCP no instala dependencias npm automáticamente: quien lo usa (persona o agente) debe revisar e instalar las dependencias indicadas.

## Por qué tres, y no uno

Cada canal resuelve una fricción distinta:

- La Web resuelve **descubrimiento** — entender qué hay disponible antes de comprometerse a nada.
- El CLI resuelve **incorporación explícita desde la terminal** — para quien ya sabe qué quiere y trabaja en su editor y su shell.
- El MCP resuelve **incorporación asistida por un agente** — para flujos donde es el propio agente de IA quien decide qué componente encaja y lo trae al proyecto, con la persona confirmando el resultado.

Los tres comparten la misma fuente de verdad, así que un componente instalado por CLI se ve exactamente igual —mismos archivos, misma versión, mismas variables de entorno— que uno instalado por MCP.
