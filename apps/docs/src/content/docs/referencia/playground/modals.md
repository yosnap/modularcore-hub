---
title: "Playground: Modals"
description: "Prueba en vivo el sistema de overlays Modals con el proveedor en memoria de referencia."
---

Prueba el componente [Modals](/referencia/componentes/modals/) en vivo, directamente en tu
navegador, en:

**[modularcorehub.com/playground/modals](https://modularcorehub.com/playground/modals)**

Esta página de documentación no reimplementa la demo — la demo real vive en producción y se
mantiene junto al código del componente.

## Cómo funciona

La demo ejecuta el `OverlayManager` real del paquete contra `core/providers/in-memory.ts`, la
implementación de referencia del `ModalsProvider`. Puedes disparar los distintos tipos de overlay
(modal, fullscreen, banner superior, banner inferior, slide-in, toast) y ver en vivo cómo funcionan
la elegibilidad, la limitación de frecuencia y los triggers (`page-load`/`delay`, `scroll`,
`exit-intent`, `click`, `manual`), sin necesidad de ninguna base de datos ni backend propio.

Para producción, copia el componente y conecta tu propio `ModalsProvider` a tu fuente de datos
(CMS, base de datos) — consulta [la documentación del componente Modals](/referencia/componentes/modals/)
para la frontera de seguridad que aplica la UI sobre el contenido del proveedor.
