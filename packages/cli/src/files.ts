import { copyFile, readFile, writeFile } from 'node:fs/promises';

import { CliError } from './errors.js';

import type { EnvVariableDescriptor, RegistryFileWithContent } from '@modularcore/registry';

// `remapTarget` now lives in `@modularcore/registry-client` (shared by the CLI and the MCP
// server's `install_component`, which previously skipped it entirely — Code Review Finding,
// Critical) — re-exported here so `add.ts`/`diff.ts`/`update.ts` don't need an import-path change.
export { remapTarget } from '@modularcore/registry-client';

export function decodeFileContent(file: RegistryFileWithContent): Buffer {
  return file.encoding === 'base64'
    ? Buffer.from(file.content, 'base64')
    : Buffer.from(file.content, 'utf8');
}

function parseEnvExampleKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line.trim());
    if (match?.[1]) keys.add(match[1]);
  }
  return keys;
}

/** Idempotent by key: re-running `add`/`update` never duplicates an existing `.env.example` entry. */
export async function appendEnvExample(
  projectRoot: string,
  envVariables: EnvVariableDescriptor[],
): Promise<{ added: string[] }> {
  if (envVariables.length === 0) return { added: [] };
  const path = `${projectRoot}/.env.example`;
  let existing = '';
  try {
    existing = await readFile(path, 'utf8');
  } catch {
    existing = '';
  }
  const existingKeys = parseEnvExampleKeys(existing);
  const additions: string[] = [];
  const added: string[] = [];
  for (const variable of envVariables) {
    if (existingKeys.has(variable.key)) continue;
    const requiredNote = variable.required ? 'required' : 'optional';
    additions.push(`# ${variable.description} (${requiredNote})\n${variable.key}=`);
    added.push(variable.key);
  }
  if (additions.length === 0) return { added: [] };
  const normalizedExisting =
    existing.length > 0 && !existing.endsWith('\n') ? `${existing}\n` : existing;
  const next = `${normalizedExisting}${normalizedExisting.length > 0 ? '\n' : ''}${additions.join('\n\n')}\n`;
  await writeFile(path, next, 'utf8');
  return { added };
}

export async function readLocalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

/** Raw-byte read used for equality checks (`base64`-encoded/binary files must never be compared as decoded utf8 text). */
export async function readLocalFileBuffer(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch {
    return undefined;
  }
}

/** `update` backs up the pre-overwrite content so a bad update can be manually recovered. */
export async function backupExisting(path: string): Promise<boolean> {
  try {
    await copyFile(path, `${path}.orig`);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw new CliError(`No se pudo crear backup ".orig" de "${path}": ${(error as Error).message}`);
  }
}

export interface DiffLine {
  kind: 'same' | 'added' | 'removed';
  text: string;
}

/**
 * Minimal LCS-based line diff. Deliberately hand-rolled instead of adding a `diff`
 * dependency — the CLI only needs a readable +/- listing for `diff`/`update`, not a
 * general-purpose diff algorithm.
 */
export function diffLines(oldContent: string, newContent: string): DiffLine[] {
  const a = oldContent.split('\n');
  const b = newContent.split('\n');
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ kind: 'same', text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      result.push({ kind: 'removed', text: a[i]! });
      i++;
    } else {
      result.push({ kind: 'added', text: b[j]! });
      j++;
    }
  }
  while (i < m) {
    result.push({ kind: 'removed', text: a[i]! });
    i++;
  }
  while (j < n) {
    result.push({ kind: 'added', text: b[j]! });
    j++;
  }
  return result;
}
