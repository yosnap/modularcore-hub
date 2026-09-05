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

  it('detects Blade from a Laravel composer dependency', async () => {
    const project = await createTmpProject({
      composerJson: { require: { 'laravel/framework': '^11.0' } },
    });
    try {
      const { frameworks } = await detectFrameworks(project.dir);
      expect(frameworks).toEqual(['blade']);
    } finally {
      await project.cleanup();
    }
  });

  it('detects vanilla from Astro: its interactivity is plain TypeScript in a <script>', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { astro: '^5.0.0' } },
    });
    try {
      const { frameworks } = await detectFrameworks(project.dir);
      expect(frameworks).toEqual(['vanilla']);
    } finally {
      await project.cleanup();
    }
  });

  it("reports both when Astro carries React islands: choosing between them is the project's call", async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { astro: '^5.0.0', react: '^18.2.0' } },
    });
    try {
      const { frameworks } = await detectFrameworks(project.dir);
      expect(frameworks.sort()).toEqual(['react', 'vanilla']);
    } finally {
      await project.cleanup();
    }
  });

  it('does not infer vanilla from the mere absence of markers: an empty project is unknown, not frameworkless', async () => {
    const project = await createTmpProject({
      packageJson: { name: 'app', dependencies: { lodash: '^4.17.0' } },
    });
    try {
      const { frameworks } = await detectFrameworks(project.dir);
      expect(frameworks).toEqual([]);
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
