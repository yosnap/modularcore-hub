---
title: "Catálogo de componentes"
description: "Qué es un componente headless copy-code de ModularCore Hub y qué componentes forman el catálogo."
---

ModularCore Hub distribuye **componentes headless "copy-code"**: no son una dependencia npm que
instalas y versionas desde un registro externo, sino código real que se copia dentro de tu propio
proyecto (a través de la CLI de ModularCore o manualmente) y pasa a ser tuyo. Puedes editarlo,
adaptarlo a tu diseño y mantenerlo con tu propio control de versiones, exactamente igual que con
componentes al estilo shadcn/ui.

## Qué significa "headless"

Cada componente separa la lógica (el "core", framework-agnóstico) de la interfaz. El core no
impone estilos ni marcado HTML concreto: expone un orquestador y un estado que tú conectas a la UI
que prefieras. La mayoría de componentes incluyen además adaptadores finos para varios frameworks
(React, Svelte 5, Vue 3, Angular) y, en algunos casos, varias presentaciones de UI de referencia
(Tailwind, Shadcn/Radix, CSS plano) para que elijas la que mejor encaje con tu stack.

## Qué significa "copy-code"

No hay un paquete publicado en un registro que se instale con `npm install`. El código fuente se
copia a tu proyecto (bajo tu propio `src/modularcore/<componente>/...` o equivalente), junto con
sus dependencias de tipo `peer` declaradas explícitamente. Esto significa:

- Ves y controlas cada línea del componente desde el primer momento.
- No dependes de que el mantenedor del paquete publique una nueva versión para poder modificar su
  comportamiento.
- Las actualizaciones del catálogo no se aplican automáticamente: si ModularCore Hub publica una
  mejora, tienes que volver a copiar (o fusionar manualmente) los cambios que te interesen.

## Componentes del catálogo

- [AI Chat](/referencia/componentes/ai-chat/) — chat con streaming, function calling y fallback de
  modelos, compatible con cualquier endpoint OpenAI-compatible.
- [Auto SEO](/referencia/componentes/auto-seo/) — generación de datos estructurados JSON-LD para
  Schema.org.
- [Media Picker](/referencia/componentes/media-picker/) — selector de medios con recorte,
  compresión y subida a distintos proveedores de almacenamiento.
- [Modals](/referencia/componentes/modals/) — sistema unificado de overlays (modal, fullscreen,
  banners, slide-in, toast) con elegibilidad y frecuencia de aparición.
- [Hello Core](/referencia/componentes/hello-core/) — componente mínimo de ejemplo usado como
  plantilla interna para el pipeline de copiado de la CLI.

Cada componente tiene además una demo interactiva en el [Playground](/referencia/playground/),
donde puedes probarlo en vivo antes de copiarlo a tu proyecto.
