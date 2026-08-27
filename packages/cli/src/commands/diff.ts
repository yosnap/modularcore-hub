import { decodeFileContent, diffLines, readLocalFileBuffer, remapTarget } from '../files.js';
import { readProjectConfig } from '../config.js';
import { resolveTargetPath } from '@modularcore/registry-client';

import type { DiffLine } from '../files.js';
import type { RegistryClient } from '@modularcore/registry-client';

export interface FileDiffResult {
  target: string;
  status: 'missing-locally' | 'unchanged' | 'changed' | 'binary-changed';
  lines?: DiffLine[];
}

export interface DiffResult {
  name: string;
  files: FileDiffResult[];
}

export async function runDiff(
  client: RegistryClient,
  name: string,
  cwd: string,
): Promise<DiffResult> {
  const config = await readProjectConfig(cwd);
  const entry = await client.getDescriptor(name);
  const files: FileDiffResult[] = [];
  for (const file of entry.files) {
    const localPath = resolveTargetPath(cwd, remapTarget(file.target, config.paths));
    const localBuffer = await readLocalFileBuffer(localPath);
    if (localBuffer === undefined) {
      files.push({ target: localPath, status: 'missing-locally' });
      continue;
    }
    const registryBuffer = decodeFileContent(file);
    if (registryBuffer.equals(localBuffer)) {
      files.push({ target: localPath, status: 'unchanged' });
      continue;
    }
    if (file.encoding === 'base64') {
      files.push({ target: localPath, status: 'binary-changed' });
      continue;
    }
    files.push({
      target: localPath,
      status: 'changed',
      lines: diffLines(localBuffer.toString('utf8'), registryBuffer.toString('utf8')),
    });
  }
  return { name: entry.name, files };
}

export function formatDiffLines(lines: DiffLine[]): string {
  return lines
    .map((line) => {
      const prefix = line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' ';
      return `${prefix} ${line.text}`;
    })
    .join('\n');
}
