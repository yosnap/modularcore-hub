import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TmpProject {
  dir: string;
  cleanup(): Promise<void>;
}

export async function createTmpProject(options: {
  packageJson?: Record<string, unknown>;
  composerJson?: Record<string, unknown>;
  lockfile?: string;
}): Promise<TmpProject> {
  const dir = await mkdtemp(join(tmpdir(), 'modularcore-cli-test-'));
  if (options.packageJson) {
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify(options.packageJson, null, 2),
      'utf8',
    );
  }
  if (options.composerJson) {
    await writeFile(
      join(dir, 'composer.json'),
      JSON.stringify(options.composerJson, null, 2),
      'utf8',
    );
  }
  if (options.lockfile) {
    await writeFile(join(dir, options.lockfile), '', 'utf8');
  }
  return {
    dir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
