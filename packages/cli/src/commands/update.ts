import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  backupExisting,
  decodeFileContent,
  diffLines,
  readLocalFileBuffer,
  remapTarget,
} from '../files.js';
import { readProjectConfig, writeProjectConfig } from '../config.js';
import { formatDiffLines } from './diff.js';
import { resolveTargetPath } from '@modularcore/registry-client';
import { selectFilesForFramework } from '@modularcore/registry';

import type { RegistryClient } from '@modularcore/registry-client';
import type { PromptAdapter } from '../prompts.js';

export interface UpdateOptions {
  cwd: string;
  client: RegistryClient;
  prompts: PromptAdapter;
}

export interface UpdateFileOutcome {
  target: string;
  action: 'written' | 'skipped' | 'unchanged';
  backedUp: boolean;
}

export interface UpdateResult {
  name: string;
  version: string;
  files: UpdateFileOutcome[];
}

/**
 * Re-injects a single component's files with per-file confirmation: shows a diff before
 * each overwrite, backs up the pre-existing file to `.orig`, and only writes when the
 * user confirms — never silently clobbers local edits.
 */
async function updateComponent(
  name: string,
  { cwd, client, prompts }: UpdateOptions,
  paths: Record<string, string>,
  framework: string,
): Promise<UpdateResult> {
  const entry = await client.getDescriptor(name);
  const outcomes: UpdateFileOutcome[] = [];
  // Mismo recorte que en `add`: un update no debe reintroducir los adaptadores que `add` omitió.
  for (const file of selectFilesForFramework(entry.files, framework)) {
    const localPath = resolveTargetPath(cwd, remapTarget(file.target, paths));
    const localBuffer = await readLocalFileBuffer(localPath);
    const registryBuffer = decodeFileContent(file);

    if (localBuffer !== undefined && registryBuffer.equals(localBuffer)) {
      outcomes.push({ target: localPath, action: 'unchanged', backedUp: false });
      continue;
    }

    if (localBuffer !== undefined && file.encoding !== 'base64') {
      prompts.note(
        formatDiffLines(diffLines(localBuffer.toString('utf8'), registryBuffer.toString('utf8'))),
        localPath,
      );
    } else {
      prompts.note(
        localBuffer === undefined ? '(archivo nuevo)' : '(contenido binario cambiado)',
        localPath,
      );
    }

    const confirmed = await prompts.confirm(`¿Sobrescribir "${localPath}"?`, false);
    if (!confirmed) {
      outcomes.push({ target: localPath, action: 'skipped', backedUp: false });
      continue;
    }

    const backedUp = await backupExisting(localPath);
    await mkdir(dirname(localPath), { recursive: true });
    await writeFile(localPath, registryBuffer);
    outcomes.push({ target: localPath, action: 'written', backedUp });
  }
  return { name: entry.name, version: entry.version, files: outcomes };
}

export async function runUpdate(
  name: string | undefined,
  options: UpdateOptions,
): Promise<UpdateResult[]> {
  const config = await readProjectConfig(options.cwd);
  const targets = name ? [name] : Object.keys(config.installed);
  if (targets.length === 0) {
    return [];
  }
  const results: UpdateResult[] = [];
  for (const target of targets) {
    const result = await updateComponent(target, options, config.paths, config.framework);
    results.push(result);
    config.installed[result.name] = result.version;
  }
  await writeProjectConfig(options.cwd, config);
  return results;
}
