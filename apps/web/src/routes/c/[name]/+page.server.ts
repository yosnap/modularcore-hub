import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { error } from '@sveltejs/kit';
import { renderDocsMarkdown } from '$lib/render-docs';

import { getComponentDocsMarkdown } from '$lib/docs';

import { BUILTIN_FRAMEWORKS } from '@modularcore/registry';

import type { FrameworkDefinition, RegistryEntry, RegistryIndexEntry } from '@modularcore/registry';
import type { PageServerLoad } from './$types';

// Prerenderable: the registry is generated at build time (`build:registry`) and is the single
// source of truth read here, so every component detail page can be a static build output.
export const prerender = true;

export async function entries(): Promise<Array<{ name: string }>> {
  // `entries()` only runs in Node during the prerender build step, with `process.cwd()` set to
  // the `apps/web` package root (not to the bundled output location, which varies) — resolving
  // against `import.meta.url` breaks once SvelteKit relocates this module under
  // `.svelte-kit/output/server/entries/...` for the actual build.
  const indexPath = resolve(process.cwd(), 'registry-data', 'index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as RegistryIndexEntry[];
  return index.map((component) => ({ name: component.name }));
}

export const load: PageServerLoad = async ({ params }) => {
  // Reads `registry-data/{name}.json` directly (same file `/registry/{name}.json` serves at
  // runtime — see `src/routes/registry/[file]/+server.ts`) instead of an internal `fetch`, so
  // this page stays prerenderable even though that endpoint itself deliberately is not.
  const descriptorPath = resolve(process.cwd(), 'registry-data', `${params.name}.json`);
  let descriptor: RegistryEntry;
  try {
    descriptor = JSON.parse(readFileSync(descriptorPath, 'utf8')) as RegistryEntry;
  } catch {
    throw error(404, `Component "${params.name}" not found in the registry.`);
  }

  const docsMarkdown = getComponentDocsMarkdown(params.name);
  const docsHtml = docsMarkdown ? renderDocsMarkdown(docsMarkdown) : null;

  // El catálogo que publica el build: sin él, un framework aportado por este mismo componente no
  // tendría dueño y sus ficheros aparecerían en la pestaña de todos los demás.
  let catalog: Record<string, FrameworkDefinition> = BUILTIN_FRAMEWORKS;
  try {
    const catalogPath = resolve(process.cwd(), 'registry-data', 'frameworks.json');
    catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as Record<string, FrameworkDefinition>;
  } catch {
    // Un registry sin `frameworks.json` (build anterior) sigue mostrando los de casa.
  }

  return { descriptor, docsHtml, catalog };
};
