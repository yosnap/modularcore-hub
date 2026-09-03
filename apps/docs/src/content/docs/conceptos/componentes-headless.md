---
title: "Componentes headless"
description: "Qué significa 'headless' y 'copy-code' en ModularCore Hub, y en qué se diferencia de shadcn, Radix o Tailwind UI."
---

## Headless: sin diseño forzado

Un componente headless en ModularCore Hub resuelve **lógica**, no apariencia. No impone un sistema de diseño, ni una hoja de estilos, ni marcado HTML concreto que tengas que sobreescribir para adaptarlo a tu marca. La capa visual (si el componente la tiene) es un adaptador delgado sobre un núcleo de lógica pura, escrito con APIs web estándar (`fetch`, `ReadableStream`, `FormData`, Canvas API) sin dependencias visuales.

Esto es deliberado: ModularCore no compite con librerías de estilos, compite con la **reescritura repetida de lógica de negocio compleja y multi-proveedor** — gestión unificada de storage entre S3, MinIO o Cloudinary; un chat con streaming y function calling sobre un proveedor de LLM intercambiable; generación de SEO estructurado; motores de traducción, etc.

## Copy-code: el código es tuyo

Los componentes se distribuyen por **copy-code**: el CLI (o el MCP, o una descarga manual) copia los archivos fuente directamente a tu proyecto. No hay una dependencia npm del propio hub que quede instalada, no hay runtime de ModularCore corriendo en tu aplicación, y no depende de ningún gestor de componentes obligatorio: funciona igual con Webpack, Vite o sin bundler.

Una vez copiado, el código es indistinguible del resto de tu base: lo modificas, lo revisas y lo versionas como cualquier otro archivo de tu proyecto. Esto es uno de los principios de diseño no negociables del producto: **cero dependencia de gestores de terceros**.

## Diferencia con shadcn, Radix o Tailwind UI

Estas librerías (y ModularCore comparte con ellas el patrón copy-code) resuelven principalmente **estilos y accesibilidad básica**: un botón, un modal, un select accesible y bien estilado que copias a tu proyecto y personalizas visualmente.

ModularCore Hub resuelve un problema distinto y complementario: la **lógica de negocio** detrás de funcionalidades complejas que suelen requerir integrar varios SDKs de terceros. Por ejemplo, el Media Picker no es solo un input de archivo estilizado: es la lógica de subida, recorte, compresión y almacenamiento que funciona igual hables con S3, MinIO o Cloudinary, cambiando solo configuración.

De hecho, el registry de ModularCore puede exponer un export opcional compatible con el formato de shadcn (`GET /r/{name}.json`), pensado como interoperabilidad gratuita para quien ya use `npx shadcn add` en su flujo — no como una dependencia del proyecto.

## Multi-proveedor como diferencial

Cada componente que lo requiere abstrae varios proveedores bajo una interfaz común, y quien lo usa elige (y puede cambiar) el proveedor por configuración, sin reescribir código de integración. Es la diferencia entre integrar cuatro SDKs de storage en tres frameworks (doce integraciones) y usar un componente de ModularCore en esos tres frameworks (tres integraciones).
