/**
 * Server-only loader for per-component docs. Docs live as a single `README.md` inside each
 * package (`packages/{name}/README.md`) — this is the one source of truth the website reads at
 * build time via `import.meta.glob`, so the site can never drift from what ships in the package.
 * Import this only from `+page.server.ts`/`+server.ts` files: `import.meta.glob` here resolves
 * paths outside `apps/web`, which only Vite's server/build graph (not the client bundle) needs.
 */
const readmeModules = import.meta.glob('../../../../packages/*/README.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const PACKAGE_NAME_PATTERN = /packages\/([^/]+)\/README\.md$/;

const docsByComponent = new Map<string, string>();
for (const [path, content] of Object.entries(readmeModules)) {
  const match = PACKAGE_NAME_PATTERN.exec(path);
  if (match?.[1]) docsByComponent.set(match[1], content);
}

/** Returns the raw Markdown README for a component, or `null` if the package has none. */
export function getComponentDocsMarkdown(name: string): string | null {
  return docsByComponent.get(name) ?? null;
}
