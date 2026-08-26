#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { runAdd } from './commands/add.js';
import { runDiff, formatDiffLines } from './commands/diff.js';
import { runInit } from './commands/init.js';
import { formatIndexEntries, runList } from './commands/list.js';
import { runSearch } from './commands/search.js';
import { runUpdate } from './commands/update.js';
import { readProjectConfig } from './config.js';
import { formatCliTopLevelError } from './format-error.js';
import { clackPromptAdapter } from './prompts.js';
import { createRegistryClient } from '@modularcore/registry-client';

/**
 * AD7: Node < 18 has no global `fetch`; fail fast with an actionable message instead of
 * an opaque `fetch is not defined` deep inside `@modularcore/registry-client`.
 */
if (typeof fetch !== 'function') {
  console.error(
    '[modularcore] Este CLI requiere Node.js >=18 (con `fetch` global). Actualiza tu versión de Node.',
  );
  process.exit(1);
}

async function readCliVersion(): Promise<string> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const raw = await readFile(join(scriptDir, '..', 'package.json'), 'utf8');
  return (JSON.parse(raw) as { version: string }).version;
}

async function clientForCwd(cwd: string) {
  const config = await readProjectConfig(cwd);
  return { client: createRegistryClient(config.registryUrl), config };
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name('modularcore')
    .description('CLI thin client for the ModularCore component registry')
    .version(await readCliVersion());

  program
    .command('init')
    .description('Detect framework/package manager and write modularcore.json')
    .action(async () => {
      await runInit({ cwd: process.cwd(), prompts: clackPromptAdapter });
    });

  program
    .command('add <name>')
    .description('Fetch a component, resolve its dependencies, and write its files')
    .action(async (name: string) => {
      const cwd = process.cwd();
      const { client } = await clientForCwd(cwd);
      const result = await runAdd(name, { cwd, client, prompts: clackPromptAdapter });
      console.log(
        `Instalado: ${result.installedComponents.join(', ')}\n` +
          `Archivos escritos: ${result.filesWritten.length}\n` +
          (result.envKeysAdded.length > 0
            ? `.env.example: agregadas ${result.envKeysAdded.join(', ')}`
            : '.env.example: sin cambios'),
      );
    });

  program
    .command('list')
    .description('List public components in the registry')
    .action(async () => {
      const cwd = process.cwd();
      const { client } = await clientForCwd(cwd);
      console.log(formatIndexEntries(await runList(client)));
    });

  program
    .command('search <query>')
    .description('Search public components by name/title/category/description')
    .action(async (query: string) => {
      const cwd = process.cwd();
      const { client } = await clientForCwd(cwd);
      console.log(formatIndexEntries(await runSearch(client, query)));
    });

  program
    .command('diff <name>')
    .description('Show differences between the local files and the registry version')
    .action(async (name: string) => {
      const cwd = process.cwd();
      const { client } = await clientForCwd(cwd);
      const result = await runDiff(client, name, cwd);
      for (const file of result.files) {
        console.log(`--- ${file.target} (${file.status})`);
        if (file.lines) console.log(formatDiffLines(file.lines));
      }
    });

  program
    .command('update [name]')
    .description('Re-inject files with per-file confirmation and .orig backups')
    .action(async (name: string | undefined) => {
      const cwd = process.cwd();
      const { client } = await clientForCwd(cwd);
      const results = await runUpdate(name, { cwd, client, prompts: clackPromptAdapter });
      for (const result of results) {
        for (const file of result.files) {
          console.log(
            `${file.action}${file.backedUp ? ' (backup .orig creado)' : ''}: ${file.target}`,
          );
        }
      }
    });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const formatted = formatCliTopLevelError(error);
    if (formatted !== undefined) {
      console.error(formatted);
      process.exit(1);
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error('[modularcore] Unexpected error:', error);
  process.exit(1);
});
