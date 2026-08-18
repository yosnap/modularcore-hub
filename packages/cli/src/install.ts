import { spawn } from 'node:child_process';

import { CliError } from './errors.js';

import type { PackageManager } from './framework-detect.js';
import type { NpmDependencySpec } from './deps.js';

const ADD_COMMAND: Record<PackageManager, string> = {
  pnpm: 'add',
  npm: 'install',
  yarn: 'add',
  bun: 'add',
};

/**
 * SA2: every package manager invocation runs with `--ignore-scripts` by default. A
 * malicious/compromised npm package's `postinstall` is a common RCE vector; the CLI never
 * needs build scripts to run for a component's plain `dependencies`, so this is disabled
 * unconditionally rather than exposed as an opt-out flag.
 */
export async function installNpmDependencies(
  cwd: string,
  manager: PackageManager,
  specs: NpmDependencySpec[],
): Promise<void> {
  if (specs.length === 0) return;
  const args = [
    ADD_COMMAND[manager],
    ...specs.map((spec) => `${spec.name}@${spec.version}`),
    '--ignore-scripts',
  ];
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(manager, args, { cwd, stdio: 'inherit' });
    child.on('error', (error) => {
      reject(new CliError(`No se pudo ejecutar "${manager} ${args.join(' ')}": ${error.message}`));
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new CliError(`"${manager} ${args.join(' ')}" terminó con código ${code}.`));
      }
    });
  });
}
