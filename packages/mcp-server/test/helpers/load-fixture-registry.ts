import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startTestRegistryServer } from './test-registry-server.js';

import type { TestRegistryServer } from './test-registry-server.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'registry');

/** Serves every `test/fixtures/registry/*.json` file verbatim, keyed by filename. */
export async function startFixtureRegistryServer(): Promise<TestRegistryServer> {
  const files = await readdir(fixturesDir);
  const routes: Record<string, string> = {};
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    routes[file] = await readFile(join(fixturesDir, file), 'utf8');
  }
  return startTestRegistryServer(routes);
}
