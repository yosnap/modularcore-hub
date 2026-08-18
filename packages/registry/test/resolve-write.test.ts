import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveWriteTargetPath, writeRegistryEntryFiles } from '../src/resolve-write.js';

describe('resolveWriteTargetPath', () => {
  it('resolves a target path inside the project root', () => {
    const resolved = resolveWriteTargetPath('/tmp/project', 'src/out.ts');
    expect(resolved).toBe('/tmp/project/src/out.ts');
  });

  it('rejects a target path that escapes the project root', () => {
    expect(() => resolveWriteTargetPath('/tmp/project', '../../etc/passwd')).toThrow(/escapes/);
  });

  it('rejects an absolute target path', () => {
    expect(() => resolveWriteTargetPath('/tmp/project', '/etc/passwd')).toThrow(/absolute/);
  });
});

describe('writeRegistryEntryFiles', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'modularcore-resolve-write-'));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('decodes utf8 and base64 content and writes it under the project root', async () => {
    const results = await writeRegistryEntryFiles(
      {
        files: [
          { path: 'src/hello.ts', target: 'src/hello.ts', type: 'component', encoding: 'utf8', content: 'export const x = 1;\n' },
          {
            path: 'assets/logo.png',
            target: 'assets/logo.png',
            type: 'asset',
            encoding: 'base64',
            content: Buffer.from('binary-data').toString('base64'),
          },
        ],
      },
      projectRoot,
    );

    expect(results).toHaveLength(2);
    const written = await readFile(join(projectRoot, 'src/hello.ts'), 'utf8');
    expect(written).toBe('export const x = 1;\n');
    const writtenAsset = await readFile(join(projectRoot, 'assets/logo.png'));
    expect(writtenAsset.toString('utf8')).toBe('binary-data');
  });
});
