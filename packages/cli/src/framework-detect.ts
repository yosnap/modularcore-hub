import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type DetectedFramework = 'react' | 'svelte' | 'vue' | 'angular';
export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';

export interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: unknown;
}

const FRAMEWORK_MARKERS: Record<DetectedFramework, string> = {
  react: 'react',
  svelte: 'svelte',
  vue: 'vue',
  angular: '@angular/core',
};

export async function readPackageJson(cwd: string): Promise<PackageJsonShape | undefined> {
  try {
    const raw = await readFile(join(cwd, 'package.json'), 'utf8');
    return JSON.parse(raw) as PackageJsonShape;
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
  const pkg = await readPackageJson(cwd);
  if (!pkg) return { frameworks: [], packageJson: undefined };
  const deps = allDeclaredDeps(pkg);
  const frameworks = (Object.keys(FRAMEWORK_MARKERS) as DetectedFramework[]).filter(
    (framework) => FRAMEWORK_MARKERS[framework] in deps,
  );
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
