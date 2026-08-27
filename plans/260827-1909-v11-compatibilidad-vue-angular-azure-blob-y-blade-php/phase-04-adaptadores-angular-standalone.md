---
phase: 4
title: "Proveedor Azure Blob seguro"
status: completed
priority: P1
effort: "3-4d"
dependencies: [1]
---

# Phase 4: Proveedor Azure Blob seguro

## Overview

Implementar Azure Blob en `StorageProvider` siguiendo el patrón S3: backend del consumidor emite
destino SAS limitado y el browser sube directamente.

## Requirements

- Upload mediante SAS por blob, método/headers explícitos, progreso y `AbortSignal`.
- List/getUrl/remove no reciben SAS de cuenta ni permisos globales; backend decide autorización.
- `@azure/storage-blob` solo en ejemplo server-side; provider browser usa Fetch/XHR.
- Documentar CORS mínimo, no `*` en producción.

## Related Code Files

- Create: `packages/media-picker/core/providers/azure-blob.ts`
- Create: `packages/media-picker/test/providers/azure-blob.test.ts`
- Create: `packages/media-picker/docs/azure-blob-sas-endpoint-example.md`
- Modify: `packages/media-picker/{README.md,modularcore.json,package.json}`

## Implementation Steps

1. Convertir respuesta firmada a `UploadResult`; validar URL HTTPS, key y headers.
2. Usar `XMLHttpRequest` solo para progreso; conectar `AbortSignal`; Fetch para el resto.
3. Modelar fallos HTTP sin filtrar query SAS y revocar object URLs locales si procede.
4. Escribir ejemplo server-side con identidad gestionada/User Delegation SAS: auth, nombre servidor,
   MIME/tamaño, blob concreto, permisos `c`/`w`, TTL corto.
5. Probar PUT, headers, abort, progreso, HTTP no-2xx, URL inválida y config con secretos prohibida.

## Success Criteria

- [x] Azure es intercambiable por S3/Cloudinary bajo `StorageProvider`.
- [x] SAS/secrets no aparecen en registry, logs ni configuración persistente.
- [x] Docs cubren CORS, permiso mínimo y expiración.

## Risk Assessment

SAS es credencial: limitar recurso/operación/TTL, no serializar en errores y emitirla solo tras
autenticar/autorizar al usuario final.
