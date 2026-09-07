import { describe, expect, it } from 'vitest';

import { runInit } from '../src/commands/init.js';
import { detectFrameworks } from '../src/framework-detect.js';
import { createTmpProject } from './helpers/tmp-project.js';

import type { FrameworkDefinition } from '@modularcore/registry';
import type { PromptAdapter } from '../src/prompts.js';

/** El catálogo que serviría un registry donde alguien ha aportado un componente en Solid. */
const catalogWithSolid: Record<string, FrameworkDefinition> = {
  react: {
    title: 'React',
    uiExtension: '.tsx',
    detect: { npm: 'react' },
    paths: { components: 'src/components', lib: 'src/lib/modularcore' },
  },
  solid: {
    title: 'Solid',
    uiExtension: '.tsx',
    detect: { npm: 'solid-js' },
    peer: 'solid-js',
    paths: { components: 'src/ui', lib: 'src/lib/modularcore' },
  },
};

function recordingPrompts(answers: { select?: string } = {}) {
  const seen = { options: [] as string[], notes: [] as string[] };
  const prompts: PromptAdapter = {
    intro() {},
    outro() {},
    note(message) {
      seen.notes.push(message);
    },
    async confirm() {
      return true;
    },
    async text(_message, defaultValue) {
      return defaultValue ?? '';
    },
    async select(_message, options) {
      seen.options = options.map((option) => option.value);
      return answers.select ?? options[0]!.value;
    },
  };
  return { prompts, seen };
}

describe('un proyecto de un framework aportado', () => {
  it('se detecta con la definición que trae el catálogo', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { 'solid-js': '^1.9.0' } },
    });
    try {
      // Sin el catálogo, la CLI no sabe qué es Solid y no detecta nada.
      expect((await detectFrameworks(project.dir)).frameworks).toEqual([]);
      expect((await detectFrameworks(project.dir, catalogWithSolid)).frameworks).toEqual(['solid']);
    } finally {
      await project.cleanup();
    }
  });

  it('init lo elige solo y usa las rutas que su definición propone', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { 'solid-js': '^1.9.0' } },
    });
    try {
      const { prompts } = recordingPrompts();

      const config = await runInit({
        cwd: project.dir,
        prompts,
        fetchCatalog: async () => catalogWithSolid,
      });

      expect(config.framework).toBe('solid');
      expect(config.paths.components).toBe('src/ui');
    } finally {
      await project.cleanup();
    }
  });

  it('y aparece entre las opciones cuando hay que elegir a mano', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { lodash: '^4.17.0' } },
    });
    try {
      const { prompts, seen } = recordingPrompts({ select: 'solid' });

      const config = await runInit({
        cwd: project.dir,
        prompts,
        fetchCatalog: async () => catalogWithSolid,
      });

      expect(seen.options).toContain('solid');
      expect(config.framework).toBe('solid');
    } finally {
      await project.cleanup();
    }
  });

  it('sin registry disponible sigue funcionando con los frameworks de casa', async () => {
    // `init` no puede depender de que haya red: avisa y sigue con lo que la CLI conoce.
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0' } },
    });
    try {
      const { prompts, seen } = recordingPrompts();

      const config = await runInit({
        cwd: project.dir,
        prompts,
        fetchCatalog: async () => {
          throw new Error('registry caído');
        },
      });

      expect(config.framework).toBe('react');
      expect(seen.notes.join(' ')).toContain('No se pudo leer el catálogo');
    } finally {
      await project.cleanup();
    }
  });
});
