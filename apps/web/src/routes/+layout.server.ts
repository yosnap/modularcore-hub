import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RegistryIndexEntry } from '@modularcore/registry';
import type { LayoutServerLoad } from './$types';

// Expose the registry index to the global shell (sidebar "Componentes" group + command palette).
// Reads the same static `registry-data/index.json` the catalog page uses, so it stays
// prerenderable alongside the rest of the site.
export const load: LayoutServerLoad = async () => {
  const indexPath = resolve(process.cwd(), 'registry-data', 'index.json');
  const components = JSON.parse(readFileSync(indexPath, 'utf8')) as RegistryIndexEntry[];
  return { components };
};
