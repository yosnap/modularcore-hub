import { describe, expect, it } from 'vitest';

import {
  detectFrameworks,
  detectPackageManager,
  installedPeerVersion,
  isWorkspaceRoot,
  readPackageJson,
} from '../src/framework-detect.js';
import { createTmpProject } from './helpers/tmp-project.js';

describe('framework-detect', () => {
  it('detects react from dependencies', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0' } },
    });
    try {
      const { frameworks } = await detectFrameworks(project.dir);
      expect(frameworks).toEqual(['react']);
    } finally {
      await project.cleanup();
    }
  });

  it('returns no frameworks when package.json is missing', async () => {
    const project = await createTmpProject({});
    try {
      const { frameworks } = await detectFrameworks(project.dir);
      expect(frameworks).toEqual([]);
    } finally {
      await project.cleanup();
    }
  });

  it('detects multiple frameworks as ambiguous', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0', vue: '^3.4.0' } },
    });
    try {
      const { frameworks } = await detectFrameworks(project.dir);
      expect(frameworks.sort()).toEqual(['react', 'vue']);
    } finally {
      await project.cleanup();
    }
  });

  it('flags a package.json with "workspaces" as a workspace root', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'root', workspaces: ['packages/*'] },
    });
    try {
      expect(await isWorkspaceRoot(project.dir)).toBe(true);
    } finally {
      await project.cleanup();
    }
  });

  it('detects pnpm from pnpm-lock.yaml', async () => {
    const project = await createTmpProject({ lockfile: 'pnpm-lock.yaml' });
    try {
      expect(await detectPackageManager(project.dir)).toBe('pnpm');
    } finally {
      await project.cleanup();
    }
  });

  it('falls back to npm when no lockfile is present', async () => {
    const project = await createTmpProject({});
    try {
      expect(await detectPackageManager(project.dir)).toBe('npm');
    } finally {
      await project.cleanup();
    }
  });

  it('reads the installed peer version from dependencies', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { react: '^18.2.0' } },
    });
    try {
      const pkg = await readPackageJson(project.dir);
      expect(installedPeerVersion(pkg, 'react')).toBe('^18.2.0');
      expect(installedPeerVersion(pkg, 'svelte')).toBeUndefined();
    } finally {
      await project.cleanup();
    }
  });
});
