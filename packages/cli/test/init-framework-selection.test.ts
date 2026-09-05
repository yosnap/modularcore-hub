import { describe, expect, it } from 'vitest';

import { runInit } from '../src/commands/init.js';
import { createTmpProject } from './helpers/tmp-project.js';

import type { PromptAdapter } from '../src/prompts.js';

function recordingPrompts(answer: string) {
  const seen: { selectCalled: boolean; options: string[]; notes: string[] } = {
    selectCalled: false,
    options: [],
    notes: [],
  };
  const prompts: PromptAdapter = {
    intro() {},
    outro() {},
    note(message) {
      seen.notes.push(message);
    },
    async confirm() {
      return true;
    },
    async text(_m, d) {
      return d ?? '';
    },
    async select(_m, options) {
      seen.selectCalled = true;
      seen.options = options.map((o) => o.value);
      return answer;
    },
  };
  return { prompts, seen };
}

describe('init: selección de framework en proyectos sin framework', () => {
  it('Astro puro: auto-selecciona vanilla sin preguntar', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { astro: '^5.0.0' } },
    });
    try {
      const { prompts, seen } = recordingPrompts('react');
      const config = await runInit({ cwd: project.dir, prompts });
      expect(config.framework).toBe('vanilla');
      expect(seen.selectCalled).toBe(false);
      expect(config.paths.components).toBe('src/components');
    } finally {
      await project.cleanup();
    }
  });

  it('Astro + React: pregunta y ofrece vanilla entre las opciones', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { astro: '^5.0.0', react: '^18.2.0' } },
    });
    try {
      const { prompts, seen } = recordingPrompts('vanilla');
      const config = await runInit({ cwd: project.dir, prompts });
      expect(seen.selectCalled).toBe(true);
      expect(seen.options).toContain('vanilla');
      expect(config.framework).toBe('vanilla');
    } finally {
      await project.cleanup();
    }
  });

  it('proyecto sin marcadores: sigue preguntando, no deduce vanilla', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { lodash: '^4.17.0' } },
    });
    try {
      const { prompts, seen } = recordingPrompts('vanilla');
      await runInit({ cwd: project.dir, prompts });
      expect(seen.selectCalled).toBe(true);
      expect(seen.notes.join(' ')).toContain('no se detectó ningún framework');
    } finally {
      await project.cleanup();
    }
  });
});
