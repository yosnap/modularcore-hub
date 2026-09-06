/**
 * `StorageProvider` is the single seam between the headless core and any storage
 * backend. It intentionally never exposes a place to pass long-lived secrets
 * (`accessKey`/`secretKey`/API secrets): the core runs in the browser, so any
 * implementation that needs a secret must obtain short-lived, scoped credentials
 * (a presigned URL, a signed upload payload) from a backend the *user* controls.
 * See `core/providers/s3-compatible.ts` and `core/providers/cloudinary.ts`.
 */
export interface UploadOptions {
  /** Desired storage key/path. Providers may ignore or namespace this. */
  key?: string;
  /**
   * When set, upload to this EXACT existing key instead of minting a new one — the real
   * "Sobreescribir" (overwrite) contract, distinct from `key` above (a namespace hint a
   * provider may ignore). Callers must source this only from a key the storage backend
   * already returned (e.g. `ListedObject.key`), never from user-editable display text — a
   * signing endpoint that trusts a client-supplied key turns a careless wiring mistake into an
   * arbitrary-object-overwrite primitive, the same trust boundary as `scope`/`query` above.
   * `core/providers/s3-compatible.ts` forwards this to `getUploadUrl(file, options)` (no
   * signature change needed, it already receives the full `options`).
   * `core/providers/cloudinary.ts` does NOT support this field — `getSignedParams(file)` has no
   * `options` parameter, so "Sobreescribir" against a Cloudinary-backed picker always mints a
   * new `public_id`, same as "Guardar como nuevo" (see `docs/cloudinary-signing-endpoint-example.md`).
   */
  overwriteKey?: string;
  contentType?: string;
  /**
   * Marca esta subida como un tamaño derivado del objeto identificado por `variantOf`, con la
   * etiqueta `variantLabel`. El núcleo no persiste nada: se limita a transportar ambos campos
   * hasta el proveedor, que decide cómo relacionarlos (una columna en tu base de datos, un
   * prefijo en la clave, metadatos del objeto…). Un proveedor que los ignore sigue siendo una
   * implementación válida de esta interfaz; simplemente no ofrecerá variantes.
   */
  variantOf?: string;
  variantLabel?: string;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

/** Un tamaño derivado que el proveedor guarda junto al original. */
export interface ObjectVariant {
  /** La misma etiqueta con la que se subió (`UploadOptions.variantLabel`). */
  label: string;
  key: string;
  url: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ListedObject {
  key: string;
  url: string;
  size: number;
  lastModified?: Date;
  mimeType?: string;
  width?: number;
  height?: number;
  /**
   * Tamaños derivados de este objeto, si el proveedor los guarda. Un listado solo devuelve
   * originales: las variantes viajan aquí, nunca como entradas propias, para que la biblioteca
   * no muestre cinco copias de la misma imagen.
   */
  variants?: ObjectVariant[];
}

/**
 * `scope` is UX-only: the client passes `'mine' | 'all'` purely to drive a filter toggle in
 * the UI. The core never decides who may see what — the SAME trust boundary as
 * `getUploadUrl` (see `providers/s3-compatible.ts`/`providers/cloudinary.ts`): a real
 * authorization decision requires the caller's identity, which only the user's own backend
 * (behind the `list` hook) can verify. A provider that ignores `scope` entirely is a valid
 * implementation of this interface.
 *
 * `query`/`sort` carry the same trust boundary as `scope`: they are forwarded verbatim to
 * whatever `list` hook the consuming application wires up (see `providers/s3-compatible.ts`/
 * `providers/cloudinary.ts` and `docs/s3-presign-endpoint-example.md`/
 * `docs/cloudinary-signing-endpoint-example.md`). Two things a provider author must handle on
 * their own backend, NOT this package:
 * - `query` is free-text from the end user — never string-interpolate it into a backend
 *   filter/search expression (e.g. an S3 prefix filter or a Cloudinary Admin API search
 *   expression) without parameterization, or it becomes a filter-injection vector.
 * - `sort` is a request, not a guarantee — a provider that ignores it (same as `scope` today)
 *   is still a valid implementation; real backends may not support every sort order server-side.
 */
export interface ListOptions {
  folder?: string;
  scope?: 'mine' | 'all';
  mimeTypes?: string[];
  /** Free-text search. See the trust-boundary note above — never interpolate this unparameterized into a backend query. */
  query?: string;
  /** Requested sort order. Not guaranteed to be honored by every provider — see the trust-boundary note above. */
  sort?: 'newest' | 'oldest' | 'name' | 'size';
  /**
   * Conserva únicamente los originales que tengan el tamaño derivado indicado (`'thumb'`,
   * `'large'`…), o los que no tengan ninguno con `'none'`. Como `scope`, `query` y `sort`, se
   * reenvía tal cual al hook `list` del consumidor: el núcleo no filtra nada por su cuenta y un
   * proveedor que lo ignore sigue siendo válido.
   */
  variant?: string;
  cursor?: string;
  limit?: number;
}

/** Cursor-based pagination: `nextCursor` is `undefined` once there is nothing more to page. */
export interface ListPage {
  items: ListedObject[];
  nextCursor?: string;
}

export interface StorageFolder {
  id: string;
  name: string;
}

export interface StorageProvider {
  upload(file: Blob, options?: UploadOptions): Promise<UploadResult>;
  list(options?: ListOptions): Promise<ListPage>;
  remove(key: string): Promise<void>;
  getUrl(key: string): string;
  /** Folders are a flat list (no nesting/tree) — matches the reference UX this v2 is based on. */
  listFolders?(): Promise<StorageFolder[]>;
  createFolder?(name: string): Promise<StorageFolder>;
}
