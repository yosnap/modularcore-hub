import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runDiff } from '../src/commands/diff.js';
import { runUpdate } from '../src/commands/update.js';
import { createRegistryClient } from '@modularcore/registry-client';
import { writeProjectConfig } from '../src/config.js';
import { createFakePrompts } from './helpers/fake-prompts.js';
import { createTmpProject } from './helpers/tmp-project.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';

import type { TestRegistryServer } from './helpers/test-registry-server.js';

const PATHS = { components: 'src/components', lib: 'src/lib/modularcore' };

describe('diff / update', () => {
  let server: TestRegistryServer;

  afterEach(async () => {
    await server?.close();
  });

  it('diff reports "missing-locally" before the component is installed', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({});
    try {
      await writeProjectConfig(project.dir, {
        registryUrl: server.url,
        framework: 'react',
        paths: PATHS,
        installed: {},
      });
      const client = createRegistryClient(server.url);
      const result = await runDiff(client, 'hello-core', project.dir);
      expect(result.files[0]?.status).toBe('missing-locally');
    } finally {
      await project.cleanup();
    }
  });

  it('diff reports "changed" when the local file was edited', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({});
    try {
      await writeProjectConfig(project.dir, {
        registryUrl: server.url,
        framework: 'react',
        paths: PATHS,
        installed: {},
      });
      const target = join(project.dir, 'src/lib/modularcore/hello-core/hello.ts');
      await mkdir(join(project.dir, 'src/lib/modularcore/hello-core'), { recursive: true });
      await writeFile(target, 'export const modified = true;\n', 'utf8');

      const client = createRegistryClient(server.url);
      const result = await runDiff(client, 'hello-core', project.dir);
      expect(result.files[0]?.status).toBe('changed');
      expect(result.files[0]?.lines?.some((line) => line.kind === 'added')).toBe(true);
    } finally {
      await project.cleanup();
    }
  });

  it('update backs up the existing file to ".orig" and overwrites on confirmation', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({});
    try {
      await writeProjectConfig(project.dir, {
        registryUrl: server.url,
        framework: 'react',
        paths: PATHS,
        installed: { 'hello-core': '0.9.0' },
      });
      const targetDir = join(project.dir, 'src/lib/modularcore/hello-core');
      const target = join(targetDir, 'hello.ts');
      await mkdir(targetDir, { recursive: true });
      await writeFile(target, 'export const oldContent = true;\n', 'utf8');

      const client = createRegistryClient(server.url);
      const results = await runUpdate('hello-core', {
        cwd: project.dir,
        client,
        prompts: createFakePrompts({ confirm: [true] }),
      });

      expect(results[0]?.files[0]?.action).toBe('written');
      expect(results[0]?.files[0]?.backedUp).toBe(true);

      const backup = await readFile(`${target}.orig`, 'utf8');
      expect(backup).toContain('oldContent');
      const updated = await readFile(target, 'utf8');
      expect(updated).toContain('hello from modularcore');
    } finally {
      await project.cleanup();
    }
  });

  it('update skips the file (no backup) when the user declines the overwrite', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({});
    try {
      await writeProjectConfig(project.dir, {
        registryUrl: server.url,
        framework: 'react',
        paths: PATHS,
        installed: { 'hello-core': '0.9.0' },
      });
      const targetDir = join(project.dir, 'src/lib/modularcore/hello-core');
      const target = join(targetDir, 'hello.ts');
      await mkdir(targetDir, { recursive: true });
      await writeFile(target, 'export const oldContent = true;\n', 'utf8');

      const client = createRegistryClient(server.url);
      const results = await runUpdate('hello-core', {
        cwd: project.dir,
        client,
        prompts: createFakePrompts({ confirm: [false] }),
      });

      expect(results[0]?.files[0]?.action).toBe('skipped');
      await expect(stat(`${target}.orig`)).rejects.toThrow();
      const untouched = await readFile(target, 'utf8');
      expect(untouched).toContain('oldContent');
    } finally {
      await project.cleanup();
    }
  });
});
