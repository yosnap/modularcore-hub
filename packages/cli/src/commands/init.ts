import { detectFrameworks, detectPackageManager, isWorkspaceRoot } from '../framework-detect.js';
import { writeProjectConfig } from '../config.js';

import type { ProjectConfig } from '../config.js';
import type { DetectedFramework } from '../framework-detect.js';
import type { PromptAdapter } from '../prompts.js';

const FRAMEWORK_OPTIONS: DetectedFramework[] = [
  'react',
  'svelte',
  'vue',
  'angular',
  'blade',
  'vanilla',
];
const FRAMEWORK_LABELS: Record<DetectedFramework, string> = {
  react: 'react',
  svelte: 'svelte',
  vue: 'vue',
  angular: 'angular',
  blade: 'blade',
  vanilla: 'vanilla (sin framework: Astro, HTMX, Rails…)',
};
const DEFAULT_REGISTRY_URL = 'http://localhost:5173/registry';
const DEFAULT_PATHS: Record<DetectedFramework, Record<string, string>> = {
  blade: { components: 'resources/views/components', lib: 'resources/js/modularcore' },
  react: { components: 'src/components', lib: 'src/lib/modularcore' },
  svelte: { components: 'src/components', lib: 'src/lib/modularcore' },
  vue: { components: 'src/components', lib: 'src/lib/modularcore' },
  angular: { components: 'src/components', lib: 'src/lib/modularcore' },
  vanilla: { components: 'src/components', lib: 'src/lib/modularcore' },
};

export interface InitOptions {
  cwd: string;
  prompts: PromptAdapter;
}

/**
 * AD2: only auto-picks the framework when detection is unambiguous (exactly one match,
 * cwd isn't a workspace root). Anything else — 0 matches, >1 matches, or a monorepo
 * root — prompts explicitly instead of guessing.
 */
export async function runInit({ cwd, prompts }: InitOptions): Promise<ProjectConfig> {
  prompts.intro('modularcore init');

  const [{ frameworks }, workspaceRoot, packageManager] = await Promise.all([
    detectFrameworks(cwd),
    isWorkspaceRoot(cwd),
    detectPackageManager(cwd),
  ]);

  let framework: DetectedFramework;
  if (frameworks.length === 1 && !workspaceRoot) {
    framework = frameworks[0]!;
    prompts.note(`Framework detectado: ${framework}`, 'Detección');
  } else {
    const reason = workspaceRoot
      ? 'este directorio parece la raíz de un workspace'
      : frameworks.length === 0
        ? 'no se detectó ningún framework soportado'
        : `se detectaron varios frameworks (${frameworks.join(', ')})`;
    prompts.note(reason, 'Selección manual requerida');
    framework = (await prompts.select(
      '¿Qué framework usa este proyecto?',
      FRAMEWORK_OPTIONS.map((value) => ({ value, label: FRAMEWORK_LABELS[value] })),
    )) as DetectedFramework;
  }

  const defaultPaths = DEFAULT_PATHS[framework];

  const componentsPath = await prompts.text(
    'Ruta para componentes (paths.components)',
    defaultPaths.components,
  );
  const libPath = await prompts.text('Ruta para librería (paths.lib)', defaultPaths.lib);
  const registryUrl = await prompts.text('URL del registry', DEFAULT_REGISTRY_URL);

  const config: ProjectConfig = {
    registryUrl,
    framework,
    paths: { components: componentsPath, lib: libPath },
    installed: {},
  };
  await writeProjectConfig(cwd, config);

  prompts.outro(`modularcore.json escrito. Package manager detectado: ${packageManager}.`);
  return config;
}
