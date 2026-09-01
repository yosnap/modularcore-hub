---
title: "Inicio rápido"
description: "El camino más corto para inicializar un proyecto e incorporar tu primer componente."
---

Este es el flujo mínimo para pasar de un proyecto vacío a tener un componente de ModularCore Hub funcionando en tu código. Da por hecho que ya tienes el [CLI instalado](/empezar/instalacion/).

## 1. Inicializa el proyecto

Desde la raíz de tu proyecto:

```bash
modularcore init
```

El asistente:

- Crea el fichero `modularcore.json` en la raíz del proyecto.
- Detecta o pregunta el framework que usas (React, Svelte, Vue, Angular…).
- Pregunta las rutas de destino donde se copiarán los archivos de los componentes.
- Pide la URL del registry: usa la que corresponda a tu despliegue de ModularCore Hub (por ejemplo, `https://modularcorehub.com/registry` para el registry público).

## 2. Descubre componentes disponibles

```bash
modularcore list
modularcore search modal
```

`list` muestra el catálogo completo; `search` filtra por un término.

## 3. Incorpora un componente

```bash
modularcore add auto-seo
```

`add` copia los archivos del componente a las rutas configuradas en `init`. Antes de escribir nada, el CLI:

- Comprueba que el componente es compatible con el framework de tu proyecto.
- Muestra las dependencias npm que instalará (si las hay) y pide confirmación explícita antes de instalarlas y copiar los archivos.
- Genera o completa `.env.example` con las variables de entorno que documenta el componente (las credenciales nunca viajan en el registry).

A partir de ahí, esos archivos son tuyos: revísalos, modifícalos y versiónalos como cualquier otro código de tu aplicación.

## Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `modularcore init` | Inicializa `modularcore.json` en el proyecto actual. |
| `modularcore list` | Lista los componentes del catálogo. |
| `modularcore search <término>` | Busca componentes por nombre o descripción. |
| `modularcore add <componente>` | Copia un componente y sus dependencias al proyecto. |
| `modularcore update [componente]` | Vuelve a inyectar archivos de un componente ya instalado, con confirmación por archivo. |
| `modularcore diff <componente>` | Muestra qué cambió entre tu copia local y la versión del registry. |

Consulta todas las opciones con `modularcore --help`, o la ayuda de un comando concreto con, por ejemplo, `modularcore add --help`.

## Siguiente paso

Para entender por qué el CLI funciona así, revisa [Arquitectura](/conceptos/arquitectura/) y [Los tres pilares](/conceptos/los-tres-pilares/). Para profundizar en `add`, `update` y `diff`, ve a la sección [Guías](/guias/instalar-un-componente/).
