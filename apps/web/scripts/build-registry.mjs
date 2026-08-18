#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRegistry } from '@modularcore/registry';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packagesRoot = resolve(scriptDir, '..', '..', '..', 'packages');
// Deliberately NOT under `static/`: adapter-node's static file server (sirv) unconditionally
// treats any asset whose name ends in `.gz` as a precompressed sibling of the same name minus
// `.gz` — for `{name}.tar.gz` that strips down to `{name}.tar`, which has no known mime type, so
// sirv serves the tarball with an empty Content-Type and a spurious `Content-Encoding: gzip`.
// Keeping the generated files out of `static/` and serving them via
// `src/routes/registry/[file]/+server.ts` instead gives full control over headers.
const outputDir = resolve(scriptDir, '..', 'registry-data');

const summary = await buildRegistry({ packagesRoot, outputDir });
console.log(
  `[build:registry] wrote ${summary.componentNames.length} component(s) to ${summary.outputDir}`,
);
console.log(
  `[build:registry] public index: ${summary.publicIndex.map((entry) => entry.name).join(', ') || '(none)'}`,
);
