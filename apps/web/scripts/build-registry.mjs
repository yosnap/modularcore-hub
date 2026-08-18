#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRegistry } from '@modularcore/registry';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packagesRoot = resolve(scriptDir, '..', '..', '..', 'packages');
const outputDir = resolve(scriptDir, '..', 'static', 'registry');

const summary = await buildRegistry({ packagesRoot, outputDir });
console.log(`[build:registry] wrote ${summary.componentNames.length} component(s) to ${summary.outputDir}`);
console.log(`[build:registry] public index: ${summary.publicIndex.map((entry) => entry.name).join(', ') || '(none)'}`);
