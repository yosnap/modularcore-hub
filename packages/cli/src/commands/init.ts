import { BUILTIN_FRAMEWORKS } from '@modularcore/registry';
import { createRegistryClient } from '@modularcore/registry-client';

import { detectFrameworks, detectPackageManager, isWorkspaceRoot } from '../framework-detect.js';
import { writeProjectConfig } from '../config.js';

import type { FrameworkDefinition } from '@modularcore/registry';
import type { ProjectConfig } from '../config.js';
import type { DetectedFramework } from '../framework-detect.js';
import type { PromptAdapter } from '../prompts.js';

const DEFAULT_REGISTRY_URL = 'http://localhost:5173/registry';
const FALLBACK_PATHS = { components: 'src/components', lib: 'src/lib/modularcore' };

export interface InitOptions {
  cwd: string;
  prompts: PromptAdapter;
  /**
   * De dónde sale el catálogo de frameworks. Inyectable para las pruebas, que así no dependen de
   * que haya un registry escuchando.
   */
  fetchCatalog?: (registryUrl: string) => Promise<Record<string, FrameworkDefinition>>;
}

async function fetchCatalogFromRegistry(
  registryUrl: string,
): Promise<Record<string, FrameworkDefinition>> {
  return createRegistryClient(registryUrl).getFrameworkCatalog();
}

/**
 * AD2: only auto-picks the framework when detection is unambiguous (exactly one match,
 * cwd isn't a workspace root). Anything else — 0 matches, >1 matches, or a monorepo
 * root — prompts explicitly instead of guessing.
 *
 * La URL del registry se pregunta la primera porque de ahí sale el catálogo de frameworks, y ese
 * catálogo es el que decide qué se puede detectar y ofrecer: un componente puede aportar el suyo,
 * así que la lista no vive en este código. Si el registry no responde se sigue con los frameworks
 * de casa, para que `init` funcione sin red.
 */
export async function runInit({ cwd, prompts, fetchCatalog }: InitOptions): Promise<ProjectConfig> {
  prompts.intro('modularcore init');

  const registryUrl = await prompts.text('URL del registry', DEFAULT_REGISTRY_URL);

  let catalog = BUILTIN_FRAMEWORKS;
  try {
    // Se fusiona sobre los de casa en lugar de reemplazarlos: un registry que sirva un catálogo
    // vacío o incompleto dejaría el prompt sin una sola opción que elegir.
    catalog = {
      ...BUILTIN_FRAMEWORKS,
      ...(await (fetchCatalog ?? fetchCatalogFromRegistry)(registryUrl)),
    };
  } catch {
    prompts.note(
      `No se pudo leer el catálogo de frameworks de "${registryUrl}". Se usan los conocidos por la CLI; ` +
        'un componente que aporte su propio framework no aparecerá en la lista.',
      'Registry no disponible',
    );
  }

  const [{ frameworks }, workspaceRoot, packageManager] = await Promise.all([
    detectFrameworks(cwd, catalog),
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
    framework = await prompts.select(
      '¿Qué framework usa este proyecto?',
      Object.entries(catalog).map(([value, definition]) => ({
        value,
        label: `${value} — ${definition.title}`,
      })),
    );
  }

  const defaultPaths = catalog[framework]?.paths ?? FALLBACK_PATHS;

  const componentsPath = await prompts.text(
    'Ruta para componentes (paths.components)',
    defaultPaths.components,
  );
  const libPath = await prompts.text('Ruta para librería (paths.lib)', defaultPaths.lib);

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
