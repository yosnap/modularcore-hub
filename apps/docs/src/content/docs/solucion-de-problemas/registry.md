---
title: "Errores del registry y despliegue"
description: "Errores de conexión al registry y problemas conocidos de despliegue de ModularCore Hub."
---

## Errores de conexión al registry (`RegistryClientError`)

Estos errores los produce `@modularcore/registry-client`, el paquete que usan tanto el CLI como el MCP para hablar con el registry HTTP. Se muestran con el mismo formato limpio en ambos canales.

- **`No se pudo conectar con el registry en "<url>": <detalle>`**
  Fallo de red al intentar alcanzar el registry: el host no responde, no hay conexión a internet, o la URL apunta a un servicio caído. Verifica la `registryUrl` configurada (en `modularcore.json` para el CLI, o en `MODULARCORE_REGISTRY_URL`/`--registry-url` para el MCP) y que el servicio esté accesible desde tu red.

- **`<recurso> no encontrado (404 en "<url>"). Corre \`pnpm build:registry\` en el repo del registry (o verifica \`registryUrl\`).`**
  El endpoint solicitado (índice, descriptor de un componente, tarball) no existe en esa URL. Si estás apuntando a un registry propio en desarrollo, probablemente no se ha generado el JSON estático todavía — corre `pnpm build:registry` en ese repositorio. Si apuntas al registry público, verifica que el nombre del componente sea correcto con `modularcore search`.

- **`El registry respondió <código> en "<url>". Corre \`pnpm build:registry\`...`**
  El servidor respondió con un código de error distinto de 404 (por ejemplo, 500 o 503). Suele indicar un problema temporal del servicio; reintenta más tarde o consulta el estado del despliegue si administras tú mismo el registry.

- **`Respuesta no-JSON del registry en "<url>" (¿registry no generado?).`**
  El endpoint respondió con contenido que no es JSON válido — normalmente porque el registry no se ha generado (build pendiente) o porque la URL configurada no apunta realmente a un registry de ModularCore Hub.

- **`El índice del registry en "<url>" no tiene el formato esperado: <detalle>`** / **`El descriptor de "<componente>" en "<url>" no es válido: <detalle>`**
  El JSON es válido pero no cumple el schema esperado (campos faltantes o de tipo incorrecto). Indica una incompatibilidad entre la versión del cliente (CLI/MCP) y la versión del registry, o un descriptor mal publicado. Si ocurre contra el registry público, repórtalo como issue.

- **`No se pudo descargar el tarball de "<componente>" (<código> en "<url>").`**
  Fallo al descargar el `.tar.gz` de un componente (por ejemplo, vía `curl` manual). Aplica la misma comprobación que para el resto de errores HTTP: revisa el nombre del componente y la URL del registry.

## Problemas conocidos de despliegue del Hub

Esta sección aplica a quien despliega su propia instancia de ModularCore Hub (la web + registry), no a quien solo consume el registry público.

El despliegue de referencia usa **Easypanel**: el proyecto `iservisat`, servicio `modularhub`, desplegando `apps/web` (SvelteKit con `adapter-node`) desde el `Dockerfile` de la raíz del repositorio, escuchando en el puerto `3000`.

- **El chat de IA no responde en el playground desplegado**
  El endpoint `/api/chat` no está disponible mientras no se configure explícitamente una clave del proveedor de IA en el entorno del servicio. No es un fallo del despliegue: es una funcionalidad deshabilitada por falta de configuración.

- **Verificación previa a desplegar**
  Antes de desplegar, confirma que el build pasa en local con las mismas condiciones que usará el hosting:
  ```bash
  pnpm install --frozen-lockfile
  pnpm build
  ```

- **Revertir un despliegue roto**
  En Easypanel, selecciona el último despliegue correcto del servicio y usa **Redeploy**. Para volver a una revisión concreta del código, restaura la rama Git a ese commit y despliega de nuevo desde ahí.

- **No hay variables de entorno globales requeridas**
  La imagen define internamente el modo de producción, el host y el puerto `3000`; no hace falta (ni se debe) reemplazar el entorno global del servicio en Easypanel.

## Ver también

- [Solución de problemas · CLI](/solucion-de-problemas/cli/) para cómo se propagan estos errores a través de los comandos del CLI.
- [Solución de problemas · MCP](/solucion-de-problemas/mcp/) para la configuración de la URL del registry en el servidor MCP.
