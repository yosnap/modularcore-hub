---
title: "Media Picker"
description: "Selector de medios headless con recorte, compresión y subida a proveedores de almacenamiento S3-compatible, Cloudinary y Azure Blob."
---

`@modularcore/media-picker` es un selector de medios headless — fuentes de archivo local, URL
remota y biblioteca, recorte y compresión con canvas, y proveedores de almacenamiento
S3-compatible, Cloudinary y Azure Blob — con adaptadores para React, Svelte, Vue 3 y Angular
standalone.

## Las credenciales nunca viven en este componente

`StorageProvider` (ver `core/provider.ts`) es el único punto de contacto con un backend de
almacenamiento, y su interfaz no tiene ningún lugar por donde pasar un secreto de larga duración
(access key, API secret). Cualquier proveedor real (`core/providers/s3-compatible.ts`,
`core/providers/cloudinary.ts`) obtiene credenciales de corta duración y con alcance limitado (una
URL prefirmada, un payload de subida firmado) desde un endpoint de backend que tú controlas e
implementas.

## Qué incluye el paquete

- `core/media-picker.ts` — `MediaPicker`, el orquestador headless (cargar → recortar → comprimir →
  subir), con estado protegido por generación para que los resultados asíncronos obsoletos nunca
  sobrescriban a los más recientes.
- `core/provider.ts` — la interfaz `StorageProvider` contra la que implementa cada backend.
- `core/sources.ts` — carga un `Blob` desde un `File` local, una URL remota (protegida contra
  SSRF) o una clave de biblioteca respaldada por un proveedor.
- `core/canvas/crop.ts`, `core/canvas/compress.ts` — transformaciones de imagen basadas en canvas.
- `core/net/ssrf-guard.ts` — bloquea objetivos privados/loopback/link-local antes de cualquier
  fetch remoto.
- `core/providers/s3-compatible.ts`, `core/providers/cloudinary.ts` — implementaciones reales de
  proveedor que llaman a tu backend de firmado.
- `adapters/react`, `adapters/svelte` — bindings finos sobre `MediaPicker` (el adaptador de Svelte
  usa runas de Svelte 5).
- `adapters/vue`, `adapters/angular` — bindings por componente sobre el mismo core. Vue usa refs;
  Angular usa signals más `DestroyRef`.
- `core/providers/azure-blob.ts` — subida desde el navegador a través de un target SAS de corta
  duración y con alcance de blob, emitido por tu propio backend.

## Proveedores de almacenamiento soportados

- **S3-compatible** (`core/providers/s3-compatible.ts`) — cualquier backend compatible con la API
  de S3 (AWS S3, MinIO, etc.), a través de una URL de subida prefirmada que obtienes de tu propio
  endpoint.
- **Cloudinary** (`core/providers/cloudinary.ts`) — a través de un payload de subida firmado por tu
  backend.
- **Azure Blob** (`core/providers/azure-blob.ts`) — a través de un target SAS de corta duración
  emitido por tu backend.

## Azure Blob y Laravel

Usa `createAzureBlobProvider` solo con un endpoint de target SAS que tú controles. El endpoint
autentica, autoriza, valida el archivo y genera la clave antes de devolver una URL de corta
duración. Consulta `snippets/laravel/` para snippets Laravel; ninguno envía credenciales de cuenta
al navegador.

## Uso básico (Svelte 5)

```ts
import { createMediaPicker } from '@modularcore/media-picker/svelte';
import { createS3CompatibleProvider } from '@modularcore/media-picker/providers/s3-compatible';

const picker = createMediaPicker();
const provider = createS3CompatibleProvider({ getUploadUrl: /* tu llamada al endpoint de firmado */ });

picker.loadLocalFile(file);
await picker.crop({ x: 0, y: 0, width: 512, height: 512 });
await picker.upload(provider);
```

Para una demo/playground sin backend real, se implementa un `StorageProvider` mínimo en memoria
(`apps/web/src/lib/demo-storage-provider.ts` en este monorepo) que guarda los blobs en un `Map` y
los sirve vía `URL.createObjectURL` — nunca conectes un proveedor real a una página de demo sin
autenticar.

## Variantes de estilo de UI

Cada uno de los 6 componentes de UI (`MediaLibraryGrid`, `FolderSelect`, `MimeTypeFilter`,
`ImageEditor`, `BulkActionsBar`, `RemoteUrlLoader`) se distribuye en 4 presentaciones, todas con
las mismas props/comportamiento — solo cambia el marcado/CSS:

- `ui/react/*.tsx`, `ui/svelte/*.svelte` — UI de referencia headless, sin estilos (la opción por
  defecto original).
- `ui/{react,svelte}/tailwind/` — solo clases utilitarias de Tailwind CSS.
- `ui/{react,svelte}/shadcn/` — tema Shadcn/ui, usando `@radix-ui/react-toggle` +
  `@radix-ui/react-slider` reales (React) o `bits-ui` (Svelte) como peer dependencies opcionales.
  Requiere Tailwind CSS v4.
- `ui/{react,svelte}/vanilla/` — CSS plano (`ui/vanilla-styles.css`, prefijo de clase `mc-*`), sin
  dependencia de framework, funciona con o sin bundler.

Junto a esos seis se instalan dos componentes de apoyo:

- `MediaLibraryModal` (solo Svelte, en las cuatro presentaciones) — envuelve la biblioteca en un
  modal con pestañas Biblioteca / Subir archivo / Desde URL, paginación numerada, búsqueda y
  orden.
- `ModernSelect` — el desplegable que usan `FolderSelect` e `ImageEditor`. La versión de React
  no tiene dependencias y se estiliza con `ui/modern-select.css`; la de Svelte se apoya en
  `bits-ui`, que la CLI instala junto al componente.

Prueba este componente en vivo en el [Playground de Media Picker](/referencia/playground/media-picker/).
