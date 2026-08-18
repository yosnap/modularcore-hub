import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CliError } from './errors.js';

export const PROJECT_CONFIG_FILENAME = 'modularcore.json';

export interface ProjectConfig {
  registryUrl: string;
  framework: string;
  paths: Record<string, string>;
  installed: Record<string, string>;
}

function isProjectConfig(value: unknown): value is ProjectConfig {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.registryUrl === 'string' &&
    typeof record.framework === 'string' &&
    typeof record.paths === 'object' &&
    record.paths !== null &&
    typeof record.installed === 'object' &&
    record.installed !== null
  );
}

export function projectConfigPath(cwd: string): string {
  return join(cwd, PROJECT_CONFIG_FILENAME);
}

export async function readProjectConfig(cwd: string): Promise<ProjectConfig> {
  const path = projectConfigPath(cwd);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new CliError(
      `No se encontró "${PROJECT_CONFIG_FILENAME}" en ${cwd}. Corre \`modularcore init\` primero.`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new CliError(`"${path}" no es JSON válido: ${(error as Error).message}`);
  }
  if (!isProjectConfig(parsed)) {
    throw new CliError(
      `"${path}" no tiene el formato esperado (registryUrl/framework/paths/installed).`,
    );
  }
  return parsed;
}

export async function writeProjectConfig(cwd: string, config: ProjectConfig): Promise<void> {
  const path = projectConfigPath(cwd);
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function projectConfigExists(cwd: string): Promise<boolean> {
  try {
    await readFile(projectConfigPath(cwd), 'utf8');
    return true;
  } catch {
    return false;
  }
}
