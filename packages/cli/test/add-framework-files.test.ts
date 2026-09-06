import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runAdd } from '../src/commands/add.js';
import { writeProjectConfig } from '../src/config.js';
import { createRegistryClient } from '@modularcore/registry-client';
import { createFakePrompts } from './helpers/fake-prompts.js';
import { createTmpProject } from './helpers/tmp-project.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';

import type { TestRegistryServer } from './helpers/test-registry-server.js';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * El descriptor enumera los ficheros de todos los adaptadores porque el registry sirve un único
 * catálogo. Escribirlos todos deja en el proyecto módulos que importan runtimes que no están
 * instalados: `tsc` falla justo después de un `add` que terminó bien.
 */
describe('add escribe sólo los ficheros del framework del proyecto', () => {
  let server: TestRegistryServer;

  afterEach(async () => {
    await server?.close();
  });

  async function addTo(framework: string) {
    server = await startFixtureRegistryServer();
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: {} },
    });

    await writeProjectConfig(project.dir, {
      registryUrl: server.url,
      framework,
      paths: { components: 'src/components', lib: 'src/lib/modularcore' },
      installed: {},
    });

    const result = await runAdd('multi-adapter', {
      cwd: project.dir,
      client: createRegistryClient(server.url),
      prompts: createFakePrompts({ confirm: [true] }),
    });

    return { project, result };
  }

  it('un proyecto React no recibe el adaptador de Vue', async () => {
    const { project, result } = await addTo('react');
    try {
      const written = result.filesWritten.map((file) => file.target);

      expect(written.some((path) => path.includes(join('adapters', 'react')))).toBe(true);
      expect(written.some((path) => path.includes(join('adapters', 'vue')))).toBe(false);
      expect(written.some((path) => path.includes(join('adapters', 'vanilla')))).toBe(false);

      // Y no queda en disco por otra vía.
      expect(
        await exists(join(project.dir, 'src/modularcore/multi-adapter/adapters/vue/use-thing.ts')),
      ).toBe(false);
    } finally {
      await project.cleanup();
    }
  });

  it('un proyecto sin framework recibe su binding y ninguna UI de React', async () => {
    const { project, result } = await addTo('vanilla');
    try {
      const written = result.filesWritten.map((file) => file.target);

      expect(written.some((path) => path.includes(join('adapters', 'vanilla')))).toBe(true);
      expect(written.some((path) => path.includes(join('ui', 'react')))).toBe(false);
      expect(written.some((path) => path.includes(join('adapters', 'react')))).toBe(false);
      expect(written.some((path) => path.includes('multi-adapter-mount.ts'))).toBe(false);
    } finally {
      await project.cleanup();
    }
  });

  it('el núcleo y los estilos compartidos llegan a cualquier framework', async () => {
    const { project, result } = await addTo('vanilla');
    try {
      const written = result.filesWritten.map((file) => file.target);

      expect(written.some((path) => path.includes(join('core', 'engine.ts')))).toBe(true);
      expect(written.some((path) => path.includes('plain-styles.css'))).toBe(true);
    } finally {
      await project.cleanup();
    }
  });

  it('un proyecto Blade recibe su snippet y el binding sin framework que este importa', async () => {
    const { project, result } = await addTo('blade');
    try {
      const written = result.filesWritten.map((file) => file.target);

      expect(written.some((path) => path.includes('multi-adapter-mount.ts'))).toBe(true);
      expect(written.some((path) => path.includes(join('adapters', 'vanilla')))).toBe(true);
      expect(written.some((path) => path.includes(join('adapters', 'react')))).toBe(false);
    } finally {
      await project.cleanup();
    }
  });
});
