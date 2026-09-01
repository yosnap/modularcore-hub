---
title: "Playground: Media Picker"
description: "Prueba en vivo el componente Media Picker con un almacenamiento en memoria de demostración."
---

Prueba el componente [Media Picker](/referencia/componentes/media-picker/) en vivo, directamente
en tu navegador, en:

**[modularcorehub.com/playground/media-picker](https://modularcorehub.com/playground/media-picker)**

Esta página de documentación no reimplementa la demo — la demo real vive en producción y se
mantiene junto al código del componente.

## Cómo funciona

La demo usa un `StorageProvider` en memoria de referencia (`demo-storage-provider.ts` en la app
`apps/web`) que guarda los blobs cargados en un `Map` y los sirve vía `URL.createObjectURL`, en
lugar de un proveedor real (S3-compatible, Cloudinary o Azure Blob). Esto te permite probar el
flujo completo (cargar → recortar → comprimir → "subir") sin necesidad de credenciales ni un
backend de firmado propio.

Para producción, copia el componente y conéctalo a uno de sus proveedores reales a través de tu
propio endpoint de firmado — consulta [la documentación del componente Media
Picker](/referencia/componentes/media-picker/) para el patrón de credenciales de corta duración.
