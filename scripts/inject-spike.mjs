#!/usr/bin/env node
/**
 * Go/no-go spike (Phase 2): reads the already-built registry directly from
 * `apps/web/static/registry/*.json` on disk (no HTTP server required — simpler and
 * deterministic for CI/local runs) and writes `hello-core`'s files into the two
 * fixture apps, reusing the same resolve+write module the future CLI will use.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registryEntrySchema, writeRegistryEntryFiles } from '@modularcore/registry';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const registryDir = resolve(repoRoot, 'apps', 'web', 'static', 'registry');
const componentName = 'hello-core';

const targets = [
  resolve(repoRoot, 'fixtures', 'vite-react'),
  resolve(repoRoot, 'fixtures', 'svelte'),
];

async function loadEntry() {
  const raw = await readFile(resolve(registryDir, `${componentName}.json`), 'utf8');
  const parsed = registryEntrySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Registry entry for "${componentName}" is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

const entry = await loadEntry();

for (const target of targets) {
  const results = await writeRegistryEntryFiles(entry, target);
  for (const result of results) {
    console.log(`[inject-spike] wrote ${result.bytesWritten}B -> ${result.target}`);
  }
}

console.log(`[inject-spike] injected "${componentName}" into ${targets.length} fixture app(s)`);
