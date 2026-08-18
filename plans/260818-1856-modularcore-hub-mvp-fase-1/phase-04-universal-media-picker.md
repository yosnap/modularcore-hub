---
title: "Phase 4: Universal Media Picker"
status: todo
priority: P1
effort: "6-8d"
dependencies: [2]
---

# Phase 4: Universal Media Picker

## Overview

Componente flagship: core headless TS (Web Standards) para subida (local/URL/biblioteca), **recorte y compresión en canvas**, con **providers multi-proveedor bajo una interfaz común** (S3-compatible cubre AWS+MinIO, + Cloudinary). Adaptadores React (hook) y Svelte (rune). Se distribuye como copy-code vía el descriptor del registry.

## Requirements

- Funcional: core agnóstico usando `File`, `Blob`, `FormData`, `fetch`, `Canvas`/`OffscreenCanvas` — sin deps visuales.
- Funcional: interfaz `StorageProvider` común; implementaciones `s3-compatible` (presigned PUT/POST) y `cloudinary` (unsigned/signed upload).
- Funcional: recorte (crop rect) + compresión (calidad/target size) en canvas antes de subir.
- Funcional: fuentes de entrada: archivo local, URL remota, biblioteca (listar objetos del provider).
- Funcional: presets por rol (p.ej. avatar/banner) = config de dimensiones/calidad.
- Funcional: adaptadores `useMediaPicker` (React) y rune `createMediaPicker` (Svelte) envolviendo el core.
- Funcional: descriptor `modularcore.json` con `envVariables` (STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY... marcados required) — credenciales fuera del registry.
- No funcional: core testeable en Node/jsdom; ningún archivo >1000 líneas (fragmentar por provider/concern).
- No funcional: el paquete es **importable** (`exports` + build) para website/tests/playground **y** copy-code source del descriptor — mismo source (predict — Architect).

## Architecture

```
packages/media-picker/
├─ modularcore.json          # descriptor (frameworks: [react, svelte])
├─ core/
│  ├─ media-picker.ts       # orquestador headless (estado, acciones)
│  ├─ provider.ts           # interfaz StorageProvider + tipos
│  ├─ providers/s3-compatible.ts
│  ├─ providers/cloudinary.ts
│  ├─ canvas/crop.ts        # recorte
│  ├─ canvas/compress.ts    # compresión
│  └─ sources.ts            # local | url | library
├─ adapters/react/use-media-picker.ts
├─ adapters/svelte/create-media-picker.svelte.ts
└─ test/*
```

`StorageProvider`: `{ upload(file, opts), list(prefix?), remove(key), getUrl(key) }`.
El usuario elige provider por config; cambiar de S3 a Cloudinary = cambiar la instancia del provider, no el componente. Credenciales resueltas en el proyecto del usuario (server-side o presigned), nunca en el hub.

**Contrato de seguridad del provider `s3-compatible` (red-team):** el core corre en el browser, por lo que **NUNCA** recibe `accessKey/secretKey`. El provider s3-compatible se construye con un hook `getUploadUrl(file) => Promise<{url, fields?}>` que el usuario implementa contra **su propio backend** (endpoint que firma el presigned PUT/POST). El descriptor documenta esto y su `envVariables` (STORAGE_*) son para ese backend del usuario, no para el componente cliente. Cloudinary usa unsigned upload preset (público por diseño) o el mismo patrón de firma server-side.

## Related Code Files

- Create: `packages/media-picker/modularcore.json`
- Create: `packages/media-picker/core/{media-picker.ts,provider.ts,sources.ts}`
- Create: `packages/media-picker/core/providers/{s3-compatible.ts,cloudinary.ts}`
- Create: `packages/media-picker/core/canvas/{crop.ts,compress.ts}`
- Create: `packages/media-picker/adapters/react/use-media-picker.ts`
- Create: `packages/media-picker/adapters/svelte/create-media-picker.svelte.ts`
- Create: `packages/media-picker/test/*`

## Implementation Steps

1. Definir `StorageProvider` + tipos de opciones/resultados en `provider.ts`.
2. Core `media-picker.ts`: máquina de estado headless (idle/cropping/compressing/uploading/done/error) + acciones, sin UI.
3. `canvas/crop.ts` + `canvas/compress.ts` usando Canvas API (target size, calidad).
4. `sources.ts`: local (File), URL (fetch→Blob), library (provider.list).
5. Provider `s3-compatible`: se construye con hook `getUploadUrl(file) => {url,fields?}` (el usuario firma en su backend); **incluir en el paquete un snippet de referencia** del endpoint firmante (archivo doc, no core). Smoke contra MinIO. (Validación S1)
6. Provider `cloudinary`: upload (unsigned preset o signed); smoke contra cuenta de test.
7. Adaptadores React (`useMediaPicker`) y Svelte (rune) envolviendo el core.
8. Descriptor `modularcore.json` (files core+adapters, envVariables, dependencies p.ej. `browser-image-compression` si se usa). Registrar en build del registry.
9. Tests (Vitest): crop/compress deterministas (jsdom/canvas mock), upload contra provider mock (siempre) + **smoke real requerido en CI** contra MinIO (servicio docker) y Cloudinary (secretos `CLOUDINARY_*`). (Validación S1)

## Success Criteria

- [ ] Subida local + URL + biblioteca contra S3-compatible (MinIO) funciona.
- [ ] Upload a Cloudinary funciona con preset.
- [ ] Crop + compresión producen output esperado (dimensiones/tamaño).
- [ ] Cambiar de provider = solo cambiar config/instancia (misma API).
- [ ] Instalable vía CLI (`modularcore add media-picker`) con `.env.example` generado.
- [ ] Ningún archivo del paquete >1000 líneas.

## Red Team Hardening (aplicado)

- **AD6 — Tests de canvas reales (no phantom):** jsdom NO renderiza Canvas ni soporta `OffscreenCanvas`; un "canvas mock" no prueba el output. Los criterios de crop/compress con output de píxeles se testean en **Vitest browser-mode (Playwright)** o con el paquete `canvas` real, asertando bytes/dimensiones del Blob. Prohibido el mock para esos criterios. Guarda de entorno cuando `OffscreenCanvas` no exista.
- **SA5 — SSRF en fuente "URL remota":** `sources.ts` valida la URL antes de `fetch`: solo `https:` (http opt-in), bloquear IP privadas/link-local/loopback tras resolución DNS, revalidar/deshabilitar redirects, cap de tamaño. Documentar que el uso server-side debe mantener estas guardas.
- **SA6 — Cloudinary firmado por defecto:** el provider y los docs default a **signed** (firma server-side, mismo patrón `getUploadUrl` que S3). Si se ofrece unsigned preset, documentar restricciones obligatorias (formatos, tamaño, folder, moderación) y marcarlo dev-only.

## Risk Assessment

- **Providers cambian APIs (§16)** → adaptadores aislados por provider; contrato `StorageProvider` propio.
- **Canvas en SSR/Node** → core desacoplado; crop/compress solo en cliente, guardas de entorno.
- **Credenciales filtradas** → S3 vía presigned desde backend del usuario; descriptor solo declara envVariables.
