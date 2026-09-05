import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type DetectedFramework = 'react' | 'svelte' | 'vue' | 'angular' | 'blade' | 'vanilla';
export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';

export interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: unknown;
}

interface ComposerJsonShape {
  require?: Record<string, string>;
}

/**
 * `vanilla` no aparece aquí: no es un runtime que un proyecto declare como dependencia, sino la
 * ausencia de uno. Se deduce en `detectFrameworks` a partir de VANILLA_MARKERS.
 */
const FRAMEWORK_MARKERS: Record<Exclude<DetectedFramework, 'vanilla'>, string> = {
  react: 'react',
  svelte: 'svelte',
  vue: 'vue',
  angular: '@angular/core',
  blade: 'laravel/framework',
};

/**
 * Generadores cuya interactividad es TypeScript plano en un `<script>`, sin runtime reactivo
 * propio: consumen el binding `vanilla`. Un Astro con islas de React declara además `react`, así
 * que se detectan ambos y `init` pregunta — la elección entre la isla y el script plano es del
 * proyecto, no nuestra.
 */
const VANILLA_MARKERS = ['astro'];

export async function readPackageJson(cwd: string): Promise<PackageJsonShape | undefined> {
  try {
    const raw = await readFile(join(cwd, 'package.json'), 'utf8');
    return JSON.parse(raw) as PackageJsonShape;
  } catch {
    return undefined;
  }
}

async function readComposerJson(cwd: string): Promise<ComposerJsonShape | undefined> {
  try {
    const raw = await readFile(join(cwd, 'composer.json'), 'utf8');
    return JSON.parse(raw) as ComposerJsonShape;
  } catch {
    return undefined;
  }
}

/** Merges dependencies + devDependencies: a framework used only in dev (e.g. via a meta-framework) still counts as detected. */
function allDeclaredDeps(pkg: PackageJsonShape): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

export interface FrameworkDetectionResult {
  frameworks: DetectedFramework[];
  packageJson: PackageJsonShape | undefined;
}

export async function detectFrameworks(cwd: string): Promise<FrameworkDetectionResult> {
  const [pkg, composer] = await Promise.all([readPackageJson(cwd), readComposerJson(cwd)]);
  const deps = pkg ? allDeclaredDeps(pkg) : {};
  const frameworks = (
    Object.keys(FRAMEWORK_MARKERS) as Exclude<DetectedFramework, 'vanilla'>[]
  ).filter((framework) =>
    framework === 'blade'
      ? FRAMEWORK_MARKERS.blade in (composer?.require ?? {})
      : FRAMEWORK_MARKERS[framework] in deps,
  );

  // Sólo con señal positiva. La ausencia de todo marcador no es un proyecto sin framework: es un
  // proyecto del que no sabemos nada —quizá aún no ha instalado el suyo— y ahí AD2 manda
  // preguntar, ahora con `vanilla` entre las opciones de `init`.
  const frameworkless = VANILLA_MARKERS.some((marker) => marker in deps);

  return { frameworks: frameworkless ? [...frameworks, 'vanilla'] : frameworks, packageJson: pkg };
}

/**
 * AD2: a bare `package.json` with a `workspaces` field (npm/yarn workspaces) is a
 * monorepo root, not a single-framework app — detection from its own deps is
 * meaningless there, so `init` must prompt instead of guessing.
 */
export async function isWorkspaceRoot(cwd: string): Promise<boolean> {
  const pkg = await readPackageJson(cwd);
  if (pkg?.workspaces !== undefined) return true;
  try {
    await readFile(join(cwd, 'pnpm-workspace.yaml'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

const LOCKFILE_BY_MANAGER: Array<[string, PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
];

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  for (const [lockfile, manager] of LOCKFILE_BY_MANAGER) {
    try {
      await readFile(join(cwd, lockfile), 'utf8');
      return manager;
    } catch {
      // try next lockfile
    }
  }
  return 'npm';
}

export function installedPeerVersion(
  pkg: PackageJsonShape | undefined,
  peerName: string,
): string | undefined {
  if (!pkg) return undefined;
  return allDeclaredDeps(pkg)[peerName];
}
