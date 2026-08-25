import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { isTrackedWriteError, resolveTargetPath, writeFilesTracked } from '../src/files.js';

import type { RegistryFileWithContent } from '@modularcore/registry';

interface TmpProject {
  dir: string;
  cleanup(): Promise<void>;
}

async function createTmpProject(): Promise<TmpProject> {
  const dir = await mkdtemp(join(tmpdir(), 'modularcore-registry-client-test-'));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

function textFile(target: string, content: string): RegistryFileWithContent {
  return { target, content, encoding: 'utf8' };
}

describe('resolveTargetPath (anti path-traversal clamp)', () => {
  it('rejects a target that escapes the project root', async () => {
    const project = await createTmpProject();
    try {
      expect(() => resolveTargetPath(project.dir, '../../escaped/hello.ts')).toThrow(
        /Refusing to write outside target root/,
      );
    } finally {
      await project.cleanup();
    }
  });

  it('rejects an absolute target', async () => {
    const project = await createTmpProject();
    try {
      expect(() => resolveTargetPath(project.dir, '/etc/hello.ts')).toThrow(
        /Refusing to write outside target root/,
      );
    } finally {
      await project.cleanup();
    }
  });

  it('resolves a normal target inside the project root', async () => {
    const project = await createTmpProject();
    try {
      const resolved = resolveTargetPath(project.dir, 'src/lib/modularcore/hello-core/hello.ts');
      expect(resolved).toBe(join(project.dir, 'src/lib/modularcore/hello-core/hello.ts'));
    } finally {
      await project.cleanup();
    }
  });
});

describe('writeFilesTracked', () => {
  let project: TmpProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it('writes every file and returns the write results', async () => {
    project = await createTmpProject();
    const results = await writeFilesTracked(
      [textFile('a.ts', 'export const a = 1;'), textFile('b.ts', 'export const b = 2;')],
      project.dir,
    );
    expect(results).toHaveLength(2);
    const written = await readFile(join(project.dir, 'a.ts'), 'utf8');
    expect(written).toBe('export const a = 1;');
  });

  it('on partial failure, reports exactly which files were already written (isTrackedWriteError)', async () => {
    project = await createTmpProject();
    const files: RegistryFileWithContent[] = [
      textFile('ok.ts', 'export const ok = 1;'),
      textFile('/etc/blocked.ts', 'export const nope = 1;'),
      textFile('never-reached.ts', 'export const unreachable = 1;'),
    ];

    await expect(writeFilesTracked(files, project.dir)).rejects.toSatisfy((error: unknown) => {
      expect(isTrackedWriteError(error)).toBe(true);
      if (!isTrackedWriteError(error)) return false;
      expect(error.filesWritten.map((result) => result.target)).toEqual([
        join(project.dir, 'ok.ts'),
      ]);
      return true;
    });

    const written = await readFile(join(project.dir, 'ok.ts'), 'utf8');
    expect(written).toBe('export const ok = 1;');
  });
});
