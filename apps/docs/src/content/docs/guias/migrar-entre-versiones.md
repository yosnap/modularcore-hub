---
title: "Migrar entre versiones de la documentación"
description: "Cómo navegar entre la documentación vigente y versiones archivadas del sitio."
---

La documentación de ModularCore Hub conserva versiones archivadas cuando el mantenedor decide congelar un punto concreto (ver [Versionado](/conceptos/versionado/)). Esta guía describe cómo moverte entre esas versiones como lector.

## Localizar el selector de versión

El sitio expone un **selector de versión en la cabecera**. Al abrirlo, verás la documentación vigente marcada como tal, junto con la lista de versiones archivadas disponibles (si existe alguna en el momento de tu visita). Selecciona la versión que quieras consultar para navegar a su copia de la documentación.

## Qué esperar de una versión archivada

- El contenido corresponde al estado de la documentación en el momento en que se congeló esa versión con `pnpm version:freeze`.
- La navegación interna (menú lateral, enlaces entre páginas) funciona dentro de esa misma versión archivada.
- **La búsqueda del sitio no indexa versiones archivadas.** Si necesitas encontrar algo dentro de una versión antigua, navega manualmente por su índice en lugar de usar el buscador — es una limitación conocida, no un fallo.

## Cuándo consultar una versión archivada

Consulta una versión archivada cuando:

- Estás usando una versión de un componente o del CLI anterior a la vigente, y el comportamiento documentado en la versión actual ya no coincide con lo que ves en tu proyecto.
- Quieres confirmar cómo se documentaba una funcionalidad antes de un cambio, por ejemplo al revisar un registro de cambios.

Para trabajar con la versión vigente del componente que sea, actualiza tu instalación con [`modularcore update`](/guias/actualizar-componentes/) y consulta la documentación vigente (sin seleccionar ninguna versión archivada).

## Volver a la documentación vigente

Desde cualquier versión archivada, usa el mismo selector de versión en la cabecera y elige la entrada marcada como vigente para volver al contenido actual del sitio.
