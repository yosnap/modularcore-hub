import { assertCompatible, collectNpmDependencies, resolveRegistryDependencies } from '../deps.js';
import { readProjectConfig, writeProjectConfig } from '../config.js';
import {
  detectPackageManager,
  installedPeerVersion,
  readPackageJson,
} from '../framework-detect.js';
import { appendEnvExample, isTrackedWriteError, writeFilesTracked } from '../files.js';
import { installNpmDependencies } from '../install.js';
import { CliError } from '../errors.js';

import type { RegistryClient } from '../registry-client.js';
import type { PromptAdapter } from '../prompts.js';
import type { WriteResult } from '@modularcore/registry';

export interface AddOptions {
  cwd: string;
  client: RegistryClient;
  prompts: PromptAdapter;
}

export interface AddResult {
  installedComponents: string[];
  filesWritten: WriteResult[];
  envKeysAdded: string[];
}

export async function runAdd(
  name: string,
  { cwd, client, prompts }: AddOptions,
): Promise<AddResult> {
  const config = await readProjectConfig(cwd);
  const packageManager = await detectPackageManager(cwd);
  const projectPackageJson = await readPackageJson(cwd);

  const entries = await resolveRegistryDependencies(client, name);
  for (const entry of entries) {
    assertCompatible(entry, config.framework, (peerName) =>
      installedPeerVersion(projectPackageJson, peerName),
    );
  }

  const npmDeps = collectNpmDependencies(entries);
  if (npmDeps.length > 0) {
    prompts.note(
      npmDeps.map((dep) => `${dep.name}@${dep.version}`).join('\n'),
      'Se instalarán las siguientes dependencias npm (--ignore-scripts)',
    );
    const confirmed = await prompts.confirm(
      `¿Instalar ${npmDeps.length} dependencia(s) con ${packageManager} y escribir los archivos de "${name}"?`,
    );
    if (!confirmed) {
      throw new CliError('Operación cancelada por el usuario. No se escribió ningún archivo.');
    }
  } else {
    const confirmed = await prompts.confirm(
      `¿Escribir los archivos de "${name}" en este proyecto?`,
    );
    if (!confirmed) {
      throw new CliError('Operación cancelada por el usuario. No se escribió ningún archivo.');
    }
  }

  await installNpmDependencies(cwd, packageManager, npmDeps);

  const filesWritten: WriteResult[] = [];
  try {
    for (const entry of entries) {
      const written = await writeFilesTracked(entry.files, cwd, config.paths);
      filesWritten.push(...written);
    }
  } catch (error) {
    if (isTrackedWriteError(error)) {
      filesWritten.push(...error.filesWritten);
      throw new CliError(
        `${error.message}\nArchivos ya escritos antes del fallo:\n${filesWritten
          .map((result) => `- ${result.target}`)
          .join('\n')}`,
      );
    }
    throw error;
  }

  const envKeysAdded: string[] = [];
  for (const entry of entries) {
    const { added } = await appendEnvExample(cwd, entry.envVariables);
    envKeysAdded.push(...added);
  }

  for (const entry of entries) {
    config.installed[entry.name] = entry.version;
  }
  await writeProjectConfig(cwd, config);

  return {
    installedComponents: entries.map((entry) => entry.name),
    filesWritten,
    envKeysAdded,
  };
}
