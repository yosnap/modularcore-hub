---
title: "modularcore init"
description: "Detecta el framework y el gestor de paquetes del proyecto, y escribe modularcore.json."
---

## Qué hace

`init` es el primer comando que se ejecuta en cualquier proyecto. Detecta automáticamente el framework usado (React, Svelte, Vue, Angular, Blade o ninguno) y el gestor de paquetes del proyecto, pregunta las rutas donde se instalarán los componentes y la URL del registry, y escribe el fichero `modularcore.json` que el resto de comandos necesita para funcionar.

La detección de framework solo se auto-selecciona cuando es inequívoca: exactamente un framework detectado y el directorio actual no es la raíz de un workspace/monorepo. En cualquier otro caso —cero coincidencias, más de una, o raíz de workspace— el comando explica el motivo y pide elegir el framework manualmente mediante un prompt interactivo (`react`, `svelte`, `vue`, `angular`, `blade` o `vanilla`).

`vanilla` es la opción para páginas sin framework —Astro, HTMX, Rails, Blade sin islas— cuya interactividad es TypeScript plano en un `<script>`. Se detecta a partir de `astro` en las dependencias; con cualquier otro generador, elígelo a mano. La ausencia de todo marcador no basta para deducirlo: un proyecto que aún no ha instalado su framework es un proyecto desconocido, no uno sin framework, así que ahí `init` pregunta igual. Un Astro con islas de React declara ambos y también pregunta: elegir entre la isla y el script plano es decisión tuya.

Tras elegir framework, pregunta interactivamente:

1. La ruta para componentes (`paths.components`), con un valor por defecto según el framework (p. ej. `src/components`, o `resources/views/components` para Blade).
2. La ruta para la librería (`paths.lib`), con valor por defecto `src/lib/modularcore` (o `resources/js/modularcore` en Blade).
3. La URL del registry, con valor por defecto `http://localhost:5173/registry`.

Al finalizar, escribe `modularcore.json` en el directorio actual con la forma `{ registryUrl, framework, paths, installed: {} }`, e informa por consola qué gestor de paquetes se detectó (npm, pnpm, yarn, etc.).

## Sintaxis

```bash
modularcore init
```

No acepta argumentos ni flags adicionales — toda la configuración se recoge de forma interactiva mediante prompts.

## Parámetros

Ninguno. El comando no toma argumentos posicionales ni opciones de línea de comandos; todas las decisiones (framework, rutas, URL del registry) se hacen a través de los prompts interactivos descritos arriba.

## Ejemplo

```bash
cd mi-proyecto-react
modularcore init
```

```
◆  modularcore init
│
◇  Framework detectado: react
│
◇  Ruta para componentes (paths.components)
│  src/components
│
◇  Ruta para librería (paths.lib)
│  src/lib/modularcore
│
◇  URL del registry
│  http://localhost:5173/registry
│
◆  modularcore.json escrito. Package manager detectado: pnpm.
```

## Errores comunes

- Si cancelas cualquier prompt (Ctrl+C / Esc), la operación se aborta con "Operation cancelled." sin escribir ningún fichero.
- Si el directorio parece la raíz de un workspace (monorepo), o se detectan varios frameworks a la vez, o ninguno, `init` no adivina: te pedirá elegir el framework manualmente y explicará el motivo.

## Ver también

- [Visión general del CLI](/referencia/herramientas/cli/)
- [`add`](/referencia/herramientas/cli/add/) — usa `modularcore.json` para saber dónde escribir los componentes
- [`update`](/referencia/herramientas/cli/update/) — reinyecta componentes ya instalados
