import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RegistryIndexEntry } from '@modularcore/registry';
import type { PageServerLoad } from './$types';

// Prerenderable: reads `registry-data/index.json` directly (the same file `/registry/index.json`
// serves at runtime — see `src/routes/registry/[file]/+server.ts`) instead of an internal
// `fetch`, so the catalog stays a static build output even though that endpoint itself
// deliberately is not (adapter-node's static file server mishandles a prerendered `.tar.gz`
// sibling, so the whole `/registry/*` family runs live instead).
export const prerender = true;

export const load: PageServerLoad = async () => {
  const indexPath = resolve(process.cwd(), 'registry-data', 'index.json');
  const components = JSON.parse(readFileSync(indexPath, 'utf8')) as RegistryIndexEntry[];
  return { components };
};
