---
title: "Problemas de instalación"
description: "Requisitos de Node.js/pnpm y problemas comunes al instalar el CLI de ModularCore Hub."
---

## Instalar el CLI (uso normal, como consumidor)

Para instalar y usar `@modularcore/cli` en un proyecto propio solo necesitas **Node.js 18 o superior**:

```bash
npm install --global @modularcore/cli@0.2.1
```

**El comando `modularcore` no se encuentra tras instalar**

Comprueba que el directorio global de binarios de npm está en tu `PATH`. Ejecuta `npm config get prefix` y verifica que `<prefix>/bin` (o el equivalente en tu sistema) esté incluido en la variable de entorno `PATH` de tu shell.

**Error de permisos al instalar de forma global (`EACCES`)**

Es un problema conocido de instalar paquetes globales con npm sin los permisos adecuados en el directorio global. No lo resuelvas con `sudo npm install -g`: cambia el directorio de instalación global de npm a uno propiedad de tu usuario, o usa un gestor de versiones de Node (nvm, fnm) que evita este problema por diseño.

**Versión de Node.js insuficiente**

Comprueba tu versión con `node --version`. Si es inferior a 18, actualiza Node.js antes de instalar el CLI — versiones anteriores no están soportadas.

## Trabajar en el propio repositorio (contribuir)

Si vas a clonar y trabajar en el monorepo (no solo a usar el CLI publicado), los requisitos son más estrictos, según [`CONTRIBUTING.md`](https://github.com/yosnap/modularcore-hub/blob/develop/CONTRIBUTING.md):

- **Node.js ≥ 22.13** (versión fijada en `.nvmrc`).
- **pnpm 11.x**, gestionado vía `corepack enable` — no lo instales globalmente a mano.

**`pnpm install` falla o tarda mucho la primera vez**

`pnpm install` en el monorepo compila un binario nativo de `canvas`, lo que puede tardar más de lo habitual en la primera ejecución. Si falla, comprueba que tienes las herramientas de compilación nativas de tu sistema operativo disponibles (por ejemplo, Xcode Command Line Tools en macOS, o el paquete `build-essential` en distribuciones Linux basadas en Debian).

**`corepack enable` no reconoce la versión de pnpm**

Corepack lee la versión declarada en el campo `packageManager` del `package.json` raíz. Si tu instalación de Node.js es antigua o corepack está deshabilitado a nivel de sistema, actualiza Node.js a la versión fijada en `.nvmrc` antes de reintentar.

## Ver también

- [Solución de problemas · CLI](/solucion-de-problemas/cli/) para errores al ejecutar comandos del CLI ya instalado.
