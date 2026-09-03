---
title: "Errores del servidor MCP"
description: "Errores reales de configuración del servidor MCP de ModularCore Hub y cómo resolverlos."
---

El servidor `@modularcore/mcp-server` valida su configuración al arrancar. Si algo falta o es inválido, lanza un `McpServerConfigError` con un mensaje explícito antes de aceptar ninguna conexión del cliente MCP. Esta página documenta esos mensajes.

## `No se configuró la URL del registry. Define la variable de entorno "MODULARCORE_REGISTRY_URL" o pasa el flag "--registry-url <url>". No hay una URL de producción por defecto.`

El servidor no asume ningún registry por defecto: hay que indicarlo explícitamente. En la configuración de tu cliente MCP (Cursor, Claude Code, VS Code…), añade la variable de entorno al bloque `env` del servidor:

```json
{
  "mcpServers": {
    "modularcore": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modularcore/mcp-server@0.3.1"],
      "cwd": "/ruta/absoluta/a/tu-proyecto",
      "env": {
        "MODULARCORE_REGISTRY_URL": "https://modularcorehub.com/registry"
      }
    }
  }
}
```

Alternativamente, puedes pasar `--registry-url <url>` en `args`.

## `"<flag>" requiere un valor (ej. "<flag> https://...").`

Pasaste `--registry-url` (o `--allow-insecure-registry`, si aplica el mismo patrón) en `args` sin el valor que le sigue. Revisa que el array `args` tenga la URL como elemento independiente justo después del flag.

## `"<url>" no es una URL válida.`

El valor de `MODULARCORE_REGISTRY_URL` o de `--registry-url` no es una URL bien formada. Revisa que incluya el esquema (`https://`) y no tenga espacios ni caracteres sueltos.

## `"<url>" debe usar https:// (registry HTTP inseguro habilita MITM/spoofing del contenido que las tools de solo-lectura devuelven a un LLM). Si de verdad necesitas http:// en un entorno local/confiable, pasa "--allow-insecure-registry" o define "MODULARCORE_REGISTRY_ALLOW_INSECURE=1".`

Por defecto, el servidor exige `https://` porque el contenido que las tools MCP devuelven (resultados de búsqueda, descriptores de componentes) se relaya directamente a un LLM, y un registry servido por `http://` es vulnerable a manipulación en tránsito. Si estás apuntando a un registry local o de confianza en `http://` (por ejemplo, en desarrollo), añade explícitamente `MODULARCORE_REGISTRY_ALLOW_INSECURE=1` al bloque `env`, o el flag `--allow-insecure-registry` en `args`. No actives esta opción contra un registry en producción o accesible públicamente.

## El agente no instala dependencias npm automáticamente

No es un error, es el comportamiento esperado: el MCP no ejecuta `npm install` ni ningún gestor de paquetes por ti. Cuando el agente guarda los archivos de un componente en tu proyecto, revisa e instala manualmente las dependencias que el propio componente documenta (el CLI sí automatiza este paso; ver [Instalar un componente](/guias/instalar-un-componente/)).

## Ver también

- [Solución de problemas · Registry](/solucion-de-problemas/registry/) para errores de conexión al registry que también puede propagar el MCP al consultar o instalar componentes.
