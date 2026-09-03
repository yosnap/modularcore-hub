---
title: "Servidor MCP de ModularCore"
description: "Visión general de @modularcore/mcp-server y de su conexión por stdio."
---

`@modularcore/mcp-server` es un paquete npm publicado que expone el registro de componentes de ModularCore a cualquier cliente MCP (Model Context Protocol) — Claude Desktop, Claude Code, Cursor, VS Code, ChatGPT y otros. Igual que el CLI, es un adaptador delgado sobre `@modularcore/registry-client`: consume la misma API HTTP del registry, sin backend propio ni estado adicional.

## La conexión es stdio, no un servicio remoto

Este punto es importante: **no hay ningún servidor MCP desplegado en ModularCore Hub**. El servidor MCP es un proceso Node.js que el propio cliente MCP lanza en local, en tu máquina, y con el que se comunica por `stdio` (entrada/salida estándar), no por HTTP ni WebSocket.

En la práctica, esto significa que:

- Cada cliente MCP (Claude Code, Cursor, etc.) arranca su propia instancia del proceso `@modularcore/mcp-server` cuando lo necesita.
- El servidor solo conoce lo que le llega por su configuración: la URL del registry (`MODULARCORE_REGISTRY_URL`) y el directorio de trabajo (`process.cwd()`) desde el que el cliente lo lanzó.
- Las escrituras en disco que hace `install_component` ocurren en la máquina donde corre el cliente MCP — no en ningún servidor de ModularCore Hub.

El punto de entrada del paquete es `packages/mcp-server/src/index.ts`, que resuelve la configuración con `resolveConfig()` (`packages/mcp-server/src/config.ts`), crea un `RegistryClient` apuntando a `registryUrl`, registra las cuatro tools disponibles sobre una instancia de `McpServer` del SDK oficial de MCP, y conecta un `StdioServerTransport`. No abre ningún puerto ni escucha peticiones entrantes de red.

## Configuración

`resolveConfig()` no asume ninguna URL de registry por defecto — es un error de configuración explícito si no se define. Las dos fuentes posibles, en orden de precedencia:

1. El flag `--registry-url <url>` en los argumentos del proceso.
2. La variable de entorno `MODULARCORE_REGISTRY_URL`.

Por defecto se exige `https://`. Un registry `http://` se rechaza salvo que se pase explícitamente `--allow-insecure-registry` o `MODULARCORE_REGISTRY_ALLOW_INSECURE=1` — necesario, por ejemplo, para apuntar a un registry corriendo en `localhost` durante desarrollo. Esta restricción existe porque el contenido que devuelven las tools de solo lectura (`search_components`, `get_component`) se relaya tal cual a un LLM, y un registry HTTP es un vector de MITM/spoofing sobre ese contenido.

El directorio de proyecto (`projectRoot`) que usa `install_component` para resolver `targetPath` es siempre `process.cwd()` — el directorio desde el que el cliente MCP lanzó el proceso, no un valor configurable por flag.

## Ejemplo de configuración de cliente MCP

La mayoría de clientes MCP (Claude Desktop, Claude Code, Cursor, VS Code) usan un bloque `mcpServers` en su configuración JSON. Con `npx`, el paquete se descarga y ejecuta sin instalación previa:

```json
{
  "mcpServers": {
    "modularcore": {
      "command": "npx",
      "args": ["-y", "@modularcore/mcp-server"],
      "env": {
        "MODULARCORE_REGISTRY_URL": "https://registry.example.com"
      }
    }
  }
}
```

Para desarrollo local contra un registry en `localhost`, añade `"MODULARCORE_REGISTRY_ALLOW_INSECURE": "1"` al bloque `env`. Configura también el directorio de trabajo del servidor (si tu cliente MCP lo permite) apuntando a la raíz de tu proyecto, ya que de ahí se resuelve `targetPath` en `install_component`.

## Tools disponibles

| Tool | Lecturas/escrituras | Elicitation |
|---|---|---|
| [`search_components`](/referencia/herramientas/mcp/search-components/) | Registry HTTP (solo lectura) | no |
| [`get_component`](/referencia/herramientas/mcp/get-component/) | Registry HTTP (solo lectura) | no |
| [`install_component`](/referencia/herramientas/mcp/install-component/) | Registry HTTP + escritura en disco local | **sí** |
| [`check_updates`](/referencia/herramientas/mcp/check-updates/) | Registry HTTP (solo lectura) | no |

Las llamadas a estas tools **no se serializan** dentro de la misma conexión stdio: mientras `install_component` espera la respuesta de una elicitation, el resto de tools (u otra llamada a `install_component`) pueden ejecutarse y completarse en paralelo sobre la misma conexión.

## Ver también

- [CLI de ModularCore](/referencia/herramientas/cli/) — el cliente de línea de comandos equivalente, mismo registry.
- [Visión general del catálogo web](/referencia/herramientas/web/) — la otra forma de consumir el mismo registry.
