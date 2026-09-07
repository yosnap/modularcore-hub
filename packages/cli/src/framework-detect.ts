import { BUILTIN_FRAMEWORKS } from '@modularcore/registry';

import type { FrameworkDefinition } from '@modularcore/registry';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * El nombre de un framework. Ya no es una unión cerrada: un componente puede aportar el suyo en
 * `frameworkDefs`, así que la CLI trabaja con lo que el catálogo del registry le diga.
 */
export type DetectedFramework = string;
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

/**
 * Los frameworks que este proyecto declara usar, según el catálogo que se le pase.
 *
 * Cada definición dice cómo se reconoce un proyecto suyo (`detect`), así que un framework
 * aportado por un componente se detecta igual que los de casa, sin nada cableado aquí.
 */
export async function detectFrameworks(
  cwd: string,
  catalog: Record<string, FrameworkDefinition> = BUILTIN_FRAMEWORKS,
): Promise<FrameworkDetectionResult> {
  const [pkg, composer] = await Promise.all([readPackageJson(cwd), readComposerJson(cwd)]);
  const deps = pkg ? allDeclaredDeps(pkg) : {};
  const composerDeps = composer?.require ?? {};

  const frameworks = Object.entries(catalog)
    .filter(([, definition]) => {
      const npm = definition.detect?.npm;
      const composerPackage = definition.detect?.composer;
      // `Object.hasOwn` y no `in`: los marcadores los aporta quien contribuye, y un
      // `detect: { npm: 'constructor' }` casaría con todos los proyectos por el prototipo.
      return (
        (npm !== undefined && Object.hasOwn(deps, npm)) ||
        (composerPackage !== undefined && Object.hasOwn(composerDeps, composerPackage))
      );
    })
    .map(([name]) => name);

  return { frameworks, packageJson: pkg };
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
