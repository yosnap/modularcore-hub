---
title: "Versionado de la documentación"
description: "Cómo funciona el versionado manual del sitio de documentación y sus limitaciones conocidas."
---

La documentación de ModularCore Hub tiene su **propio sistema de versionado**, independiente del versionado semántico por paquete que gestiona Changesets en el monorepo. Este sistema está pensado para conservar una copia navegable de la documentación tal como era en un momento dado, de forma que quien siga usando una versión anterior de un componente o del CLI pueda consultar la documentación que le corresponde.

## Versionado manual, no automático

A diferencia del versionado de paquetes (que se dispara en cada release mediante Changesets), el versionado de la documentación **lo dispara el mantenedor de forma manual**, cuando decide que hay un punto de la documentación digno de congelar como versión archivada. No ocurre automáticamente en cada cambio ni en cada release de un paquete.

Para congelar una versión, el mantenedor usa el comando:

```bash
pnpm version:freeze
```

Una vez congelada, la versión archivada queda accesible desde el **selector de versión en la cabecera del sitio**, donde se puede navegar entre la documentación vigente y las versiones anteriores publicadas.

## Limitación conocida: la búsqueda no cubre versiones archivadas

El buscador del sitio solo indexa la documentación **vigente**. Las versiones archivadas no aparecen en los resultados de búsqueda. Esta es una limitación conocida y aceptada del sistema: para consultar contenido de una versión archivada hay que navegar directamente a ella a través del selector de versión, no a través del buscador.

## Política de mantenimiento de versiones archivadas

Las versiones archivadas se recompilan con la versión de Starlight/Astro vigente en cada build. Si una actualización mayor rompe el build de una versión archivada, se corrige puntualmente su frontmatter o se degrada a HTML estático fuera de la colección de contenido.

Esto significa que una versión archivada no es un snapshot estático congelado para siempre a nivel de infraestructura: sigue construyéndose con las herramientas actuales del sitio, y solo se aísla manualmente (frontmatter puntual o HTML estático) cuando una actualización mayor la rompe y no compensa mantenerla dentro del pipeline normal.

## Restricción del identificador de versión

El identificador de versión (`slug`) que se pasa a `pnpm --filter docs version:freeze` **no debe
contener puntos** (`.`). Astro sanea el nombre del directorio al generar la URL final y elimina los
puntos silenciosamente — un slug como `1.0.0` termina sirviéndose como `/100/`, no `/1.0.0/`, lo que
rompe la navegación y los enlaces reescritos. Usa guiones en su lugar (por ejemplo `v1-0-0` o
`1-0-0`).

## Ver también

Para el proceso de navegar entre versiones desde la perspectiva de quien lee la documentación, consulta la guía [Migrar entre versiones](/guias/migrar-entre-versiones/).
