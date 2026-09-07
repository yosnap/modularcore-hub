/**
 * Server-only loader for per-component docs.
 *
 * Se prefiere la referencia de `apps/docs`, que está escrita en español y para quien va a usar el
 * componente. El `README.md` del paquete queda de respaldo: está en inglés y dirigido a quien
 * trabaja dentro del monorepo, así que la ficha mostraba una documentación en otro idioma y con
 * enlaces a rutas del repositorio que desde la web no llevan a ninguna parte.
 *
 * Import this only from `+page.server.ts`/`+server.ts` files: `import.meta.glob` here resolves
 * paths outside `apps/web`, which only Vite's server/build graph (not the client bundle) needs.
 */
const readmeModules = import.meta.glob('../../../../packages/*/README.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const referenceModules = import.meta.glob(
  '../../../docs/src/content/docs/referencia/componentes/*.md',
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

const PACKAGE_NAME_PATTERN = /packages\/([^/]+)\/README\.md$/;
const REFERENCE_NAME_PATTERN = /componentes\/([^/]+)\.md$/;

const readmeByComponent = new Map<string, string>();
for (const [path, content] of Object.entries(readmeModules)) {
  const match = PACKAGE_NAME_PATTERN.exec(path);
  if (match?.[1]) readmeByComponent.set(match[1], content);
}

const referenceByComponent = new Map<string, string>();
for (const [path, content] of Object.entries(referenceModules)) {
  const match = REFERENCE_NAME_PATTERN.exec(path);
  if (match?.[1] && match[1] !== 'index') referenceByComponent.set(match[1], content);
}

/**
 * Devuelve el Markdown de un componente: su referencia en español si existe, y si no el README
 * del paquete. `null` cuando no hay ninguna de las dos.
 */
export function getComponentDocsMarkdown(name: string): string | null {
  return referenceByComponent.get(name) ?? readmeByComponent.get(name) ?? null;
}
