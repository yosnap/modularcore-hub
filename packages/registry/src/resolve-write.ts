import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

import type { RegistryEntry, RegistryFileWithContent } from './schema.js';

export interface WriteResult {
  target: string;
  bytesWritten: number;
}

/**
 * Shared by the spike injector (`scripts/inject-spike.mjs`) and the future CLI (Phase 3),
 * so path-clamp and decoding logic has a single source of truth instead of being
 * reimplemented per consumer.
 */
export function resolveWriteTargetPath(projectRoot: string, fileTarget: string): string {
  if (isAbsolute(fileTarget)) {
    throw new Error(`Refusing to write outside target root: "${fileTarget}" is an absolute path`);
  }
  const root = resolve(projectRoot);
  const resolved = resolve(root, fileTarget);
  const rootWithSep = root.endsWith('/') ? root : `${root}/`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(
      `Refusing to write outside target root: "${fileTarget}" escapes "${projectRoot}"`,
    );
  }
  return resolved;
}

function decodeFileContent(file: RegistryFileWithContent): Buffer {
  return file.encoding === 'base64'
    ? Buffer.from(file.content, 'base64')
    : Buffer.from(file.content, 'utf8');
}

/**
 * Writes every `files[]` entry of a validated registry entry into `projectRoot`, honoring
 * each file's `target` and `encoding`. Pure I/O helper: no fetch, no CLI concerns.
 */
export async function writeRegistryEntryFiles(
  entry: Pick<RegistryEntry, 'files'>,
  projectRoot: string,
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  for (const file of entry.files) {
    const destination = resolveWriteTargetPath(projectRoot, file.target);
    const content = decodeFileContent(file);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
    results.push({ target: destination, bytesWritten: content.byteLength });
  }
  return results;
}
