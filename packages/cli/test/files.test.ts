import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveTargetPath } from '@modularcore/registry-client';

import { appendEnvExample, diffLines, remapTarget } from '../src/files.js';
import { createTmpProject } from './helpers/tmp-project.js';

const DEFAULT_PATHS = { components: 'src/components', lib: 'src/lib/modularcore' };

describe('remapTarget', () => {
  it('remaps the conventional "src/modularcore/" prefix onto paths.lib', () => {
    expect(remapTarget('src/modularcore/hello-core/hello.ts', DEFAULT_PATHS)).toBe(
      'src/lib/modularcore/hello-core/hello.ts',
    );
  });

  it('remaps the conventional "src/components/" prefix onto paths.components', () => {
    expect(remapTarget('src/components/widget/widget.tsx', DEFAULT_PATHS)).toBe(
      'src/components/widget/widget.tsx',
    );
  });

  it('leaves unrecognized targets untouched', () => {
    expect(remapTarget('other/place/file.ts', DEFAULT_PATHS)).toBe('other/place/file.ts');
  });

  it('composes with @modularcore/registry-client\'s resolveTargetPath (anti path-traversal clamp)', async () => {
    const project = await createTmpProject({});
    try {
      // A malicious paths.lib escaping the project root is still caught by the clamp,
      // even though remapping itself now happens in the CLI before calling resolveTargetPath.
      expect(() =>
        resolveTargetPath(
          project.dir,
          remapTarget('src/modularcore/hello.ts', { ...DEFAULT_PATHS, lib: '../../escaped' }),
        ),
      ).toThrow(/Refusing to write outside target root/);

      const resolved = resolveTargetPath(
        project.dir,
        remapTarget('src/modularcore/hello-core/hello.ts', DEFAULT_PATHS),
      );
      expect(resolved).toBe(join(project.dir, 'src/lib/modularcore/hello-core/hello.ts'));
    } finally {
      await project.cleanup();
    }
  });
});

describe('appendEnvExample', () => {
  it('creates .env.example with the declared keys', async () => {
    const project = await createTmpProject({});
    try {
      const { added } = await appendEnvExample(project.dir, [
        { key: 'FOO', description: 'foo var', required: true },
      ]);
      expect(added).toEqual(['FOO']);
      const content = await readFile(join(project.dir, '.env.example'), 'utf8');
      expect(content).toContain('FOO=');
    } finally {
      await project.cleanup();
    }
  });

  it('is idempotent: re-running does not duplicate an existing key', async () => {
    const project = await createTmpProject({});
    try {
      const vars = [{ key: 'FOO', description: 'foo var', required: true }];
      await appendEnvExample(project.dir, vars);
      const second = await appendEnvExample(project.dir, vars);
      expect(second.added).toEqual([]);
      const content = await readFile(join(project.dir, '.env.example'), 'utf8');
      expect(content.match(/FOO=/g)).toHaveLength(1);
    } finally {
      await project.cleanup();
    }
  });

  it('appends only the missing keys alongside pre-existing content', async () => {
    const project = await createTmpProject({});
    try {
      await writeFile(join(project.dir, '.env.example'), 'EXISTING=value\n', 'utf8');
      const { added } = await appendEnvExample(project.dir, [
        { key: 'EXISTING', description: 'already there', required: true },
        { key: 'NEW_KEY', description: 'new one', required: false },
      ]);
      expect(added).toEqual(['NEW_KEY']);
      const content = await readFile(join(project.dir, '.env.example'), 'utf8');
      expect(content).toContain('EXISTING=value');
      expect(content).toContain('NEW_KEY=');
    } finally {
      await project.cleanup();
    }
  });
});

describe('diffLines', () => {
  it('marks unchanged lines as "same" and highlights the changed line', () => {
    const result = diffLines('a\nb\nc', 'a\nX\nc');
    expect(result.map((line) => line.kind)).toEqual(['same', 'removed', 'added', 'same']);
  });
});
