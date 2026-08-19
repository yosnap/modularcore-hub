# Code Review — RemoteUrlLoader UI + demo playground wiring

Branch: `feat/0.8.0-media-picker-remote-url-ui-and-playground` (working tree sin commitear)

## Scope
- `packages/media-picker/ui/react/RemoteUrlLoader.tsx` (nuevo)
- `packages/media-picker/ui/svelte/RemoteUrlLoader.svelte` (nuevo)
- `packages/media-picker/package.json`, `modularcore.json` (registro de exports/files)
- `apps/web/src/lib/demo-storage-provider.ts`
- `apps/web/src/routes/playground/media-picker/+page.svelte`
- `.changeset/media-picker-remote-url-loader-ui.md`

## Verificación independiente
- `npx turbo run typecheck --force`: OK (9/9, sin cache).
- `npx turbo run lint build test --force`: OK (12/12, sin cache). Build de `web` genera correctamente `/playground/media-picker` con el nuevo markup.
- Único warning de build (`FolderSelect.svelte:18` — `state_referenced_locally`) es **preexistente**, no tocado en este diff (`git diff HEAD -- packages/media-picker/ui/svelte/FolderSelect.svelte` vacío).

## Hallazgos

### High — Colisión de `key` sobrescribe uploads dentro de la misma carpeta
`apps/web/src/routes/playground/media-picker/+page.svelte` (`handleUpload`):
```ts
await picker.upload(demoProvider, { key: folder ? `${folder}/upload` : undefined });
```
Cuando hay una carpeta seleccionada, la key es **siempre el mismo string literal** `"{folderId}/upload"`, sin importar el archivo. En `demo-storage-provider.ts`, `upload()` hace `store.set(key, ...)` con esa key — cada nuevo upload a la misma carpeta pisa la entrada anterior en el `Map`.

Efecto observable: subir dos imágenes distintas a la misma carpeta deja solo la última visible en `MediaLibraryGrid` tras `refreshLibrary()`; la primera desaparece silenciosamente. Además, el `Blob` URL de la entrada pisada (`URL.createObjectURL`) nunca se revoca — queda huérfano y fuga memoria en cada colisión (el código ya no tenía revoke antes tampoco, pero antes de este diff cada upload recibía una key única vía `generateKey()`, por lo que la colisión es nueva).

No hay ningún test que cubra `demo-storage-provider.ts` ni este flujo (`find apps/web -iname "*demo-storage*"` solo devuelve el propio archivo fuente), así que el build/test en verde no dice nada sobre este bug.

Fix sugerido: en el playground, no pasar una key fija — dejar que `upload()` derive folderId sí, pero generar el resto vía `generateKey(folderId)` incluso cuando `options.key` viene seteado, o simplemente no pasar `key` desde el playground (`{ folder }` si el provider lo soportara) y dejar que `generateKey()` en el provider sea la única fuente de unicidad.

### High — `RemoteUrlLoader`: el botón NO se deshabilita durante el fetch remoto
En ambas variantes (`RemoteUrlLoader.tsx:25`, `RemoteUrlLoader.svelte:11-15`):
```ts
const busy = status === 'uploading' || status === 'compressing' || status === 'cropping';
```
Pero `MediaPicker.loadFromUrl()` ejecuta `this.run('idle', () => this.deps.fromRemoteUrl(...))` (`packages/media-picker/core/media-picker.ts:158-161`) — el `status` se fija en `'idle'` (no cambia) durante toda la duración del fetch con guard SSRF. No existe un status tipo `'loading'` para esta operación en `MediaPickerStatus` (`'idle' | 'cropping' | 'compressing' | 'uploading' | 'done' | 'error'`).

Consecuencia directa: `busy` es siempre `false` mientras `loadFromUrl` está en curso, así que el botón "Load from URL" nunca se deshabilita durante la petición. Un doble click dispara dos fetches SSRF-guardeados concurrentes (DNS lookup + fetch cada uno); el generation-guard interno evita que el resultado más viejo corrompa el estado, pero no evita el desperdicio de red ni comunica al usuario que hay una operación en curso.

Esto responde directamente a la pregunta del brief: no, no se deshabilita correctamente.

Fix sugerido: cualquiera de:
- Añadir un estado local `loading` en el componente (`setUrl` + `isLoading` propio) envolviendo el `await picker.loadFromUrl(...)`, en vez de depender de `picker.state.status`.
- O exponer un status intermedio en el core (p. ej. reusar `'uploading'` como genérico "fetching", o añadir `'loading'` al union) — cambio de mayor alcance, fuera del scope de este componente puntual.
La opción local (primer punto) es la más acorde a YAGNI/scope del componente.

### Medium — Sin cobertura de test para `RemoteUrlLoader` (react/svelte)
Consistente con el resto de componentes UI v2 (solo existe `test/ui/image-editor-zoom.test.ts` en todo el paquete), pero es la razón concreta por la que el bug de `busy` de arriba no se detectó. No es una regresión de este diff per se, pero al ser el componente más nuevo, un test mínimo (mock de un `fromRemoteUrl` que no resuelve inmediatamente, click doble, assert de una sola invocación) habría atrapado el bug.

### Low — Referencia a "Fase 4" en el changeset
`.changeset/media-picker-remote-url-loader-ui.md` menciona "shipped in Fase 4". Es texto de release notes, no código/comentario/nombre de test, así que es fronterizo respecto a la regla de no incrustar labels de fases/planes en artefactos versionados — pero al ser un changeset (que sí se publica en el CHANGELOG del paquete), mejor describir el gap directamente ("loadFromUrl existía en core pero no tenía UI") sin la etiqueta de fase.

## Verificaciones positivas (sin hallazgos)
- Cambio de filtro `list()` de `key.startsWith(folder)` a `entry.folderId !== options.folder`: confirmado seguro — `createDemoStorageProvider` solo se usa en `apps/web/src/routes/playground/media-picker/+page.svelte` (único call site vía `grep -rl`), ningún otro código depende del prefijo de key.
- `modularcore.json`/`package.json`: las nuevas entradas para `RemoteUrlLoader` (react export con `types`+`default`, entrada de `files[]` con `path`/`target`/`type: "ui"`/`encoding: "utf8"`) siguen exactamente el mismo patrón que las entradas vecinas (`BulkActionsBar`, etc.) — sin desviaciones.
- `RemoteUrlLoader` en sí no tiene lógica de negocio propia: solo `trim()` + guard de vacío + forward a `picker.loadFromUrl(trimmed, { allowHttp, maxBytes })`. Correcto conforme al comentario del propio componente.
- No hay `console.log` con datos sensibles; el único `console.log('Selección confirmada', items)` expone únicamente `key`/`url` de blobs demo in-memory, sin credenciales.
- Botón "Subir" se deshabilita correctamente durante `status === 'uploading'` y solo se renderiza cuando hay `blob` cargado.

## Recomendaciones priorizadas
1. Corregir la colisión de `key` en `handleUpload` del playground (o en `demo-storage-provider.ts`) para que cada upload a una misma carpeta obtenga una key única — bug funcional visible en la demo que se está mostrando como ejemplo de referencia para consumidores del paquete.
2. Corregir el cálculo de `busy` en `RemoteUrlLoader` (react + svelte) para reflejar el fetch remoto en curso, ya que el `status` del core no lo expone.
3. Opcional: agregar un test mínimo para `RemoteUrlLoader` que cubra el estado "busy" tras el fix.
4. Opcional: quitar la referencia a "Fase 4" del texto del changeset.

## Preguntas sin resolver
Ninguna.
