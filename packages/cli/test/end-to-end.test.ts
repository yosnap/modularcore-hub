import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runInit } from '../src/commands/init.js';
import { runAdd } from '../src/commands/add.js';
import { CliError, CompatibilityError, DependencyCycleError } from '../src/errors.js';
import { createRegistryClient } from '../src/registry-client.js';
import { readProjectConfig, writeProjectConfig } from '../src/config.js';
import { createFakePrompts } from './helpers/fake-prompts.js';
import { createTmpProject } from './helpers/tmp-project.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';

import type { TestRegistryServer } from './helpers/test-registry-server.js';

describe('init -> add end-to-end (KPI: well under 5 minutes)', () => {
  let server: TestRegistryServer;

  afterEach(async () => {
    await server?.close();
  });

  it('detects react, writes modularcore.json, then adds hello-core', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0' } },
      lockfile: 'pnpm-lock.yaml',
    });
    try {
      const start = Date.now();

      const config = await runInit({
        cwd: project.dir,
        prompts: createFakePrompts({ text: [], select: [] }),
      });
      expect(config.framework).toBe('react');
      expect(config.registryUrl).toBe('http://localhost:5173/registry');

      // Point the freshly-written config at the fixture server instead of the dev default.
      config.registryUrl = server.url;
      const client = createRegistryClient(config.registryUrl);
      await writeProjectConfig(project.dir, config);

      const result = await runAdd('hello-core', {
        cwd: project.dir,
        client,
        prompts: createFakePrompts({ confirm: [true] }),
      });

      const elapsedMs = Date.now() - start;
      expect(elapsedMs).toBeLessThan(5 * 60 * 1000);

      expect(result.installedComponents).toEqual(['hello-core']);
      const written = await readFile(
        join(project.dir, 'src/lib/modularcore/hello-core/hello.ts'),
        'utf8',
      );
      expect(written).toContain('hello from modularcore');

      const envExample = await readFile(join(project.dir, '.env.example'), 'utf8');
      expect(envExample).toContain('HELLO_CORE_GREETING=');

      const savedConfig = await readProjectConfig(project.dir);
      expect(savedConfig.installed).toEqual({ 'hello-core': '1.0.0' });
    } finally {
      await project.cleanup();
    }
  });

  it('aborts without writing files when the user declines confirmation', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0' } },
    });
    try {
      const client = createRegistryClient(server.url);
      await writeProjectConfig(project.dir, {
        registryUrl: server.url,
        framework: 'react',
        paths: { components: 'src/components', lib: 'src/lib/modularcore' },
        installed: {},
      });

      await expect(
        runAdd('hello-core', {
          cwd: project.dir,
          client,
          prompts: createFakePrompts({ confirm: [false] }),
        }),
      ).rejects.toThrow(CliError);

      await expect(
        readFile(join(project.dir, 'src/lib/modularcore/hello-core/hello.ts'), 'utf8'),
      ).rejects.toThrow();
    } finally {
      await project.cleanup();
    }
  });

  it('AD2 rejects an incompatible framework before writing anything', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0' } },
    });
    try {
      const client = createRegistryClient(server.url);
      await writeProjectConfig(project.dir, {
        registryUrl: server.url,
        framework: 'react',
        paths: { components: 'src/components', lib: 'src/lib/modularcore' },
        installed: {},
      });

      await expect(
        runAdd('vue-only', {
          cwd: project.dir,
          client,
          prompts: createFakePrompts({ confirm: [true] }),
        }),
      ).rejects.toThrow(CompatibilityError);
    } finally {
      await project.cleanup();
    }
  });

  it('rejects add of a component with a registryDependencies cycle', async () => {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0' } },
    });
    try {
      const client = createRegistryClient(server.url);
      await writeProjectConfig(project.dir, {
        registryUrl: server.url,
        framework: 'react',
        paths: { components: 'src/components', lib: 'src/lib/modularcore' },
        installed: {},
      });

      await expect(
        runAdd('cycle-a', {
          cwd: project.dir,
          client,
          prompts: createFakePrompts({ confirm: [true] }),
        }),
      ).rejects.toThrow(DependencyCycleError);
    } finally {
      await project.cleanup();
    }
  });
});
