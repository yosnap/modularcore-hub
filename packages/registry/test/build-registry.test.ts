import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildRegistry } from '../src/build-registry.js';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixturesPackagesRoot = join(testDir, 'fixtures', 'packages');

describe('buildRegistry', () => {
  let outputDir: string;

  beforeEach(async () => {
    const workDir = await mkdtemp(join(tmpdir(), 'modularcore-build-registry-'));
    outputDir = join(workDir, 'registry');
  });

  afterEach(async () => {
    await rm(dirname(outputDir), { recursive: true, force: true });
  });

  it('emits index.json, {name}.json and {name}.tar.gz for public components', async () => {
    const summary = await buildRegistry({ packagesRoot: fixturesPackagesRoot, outputDir });

    expect(summary.componentNames.sort()).toEqual(['internal-hello', 'public-widget']);

    const index = JSON.parse(await readFile(join(outputDir, 'index.json'), 'utf8'));
    expect(index).toEqual([
      expect.objectContaining({ name: 'public-widget', category: 'test-fixture', version: '1.0.0' }),
    ]);

    const widgetEntry = JSON.parse(await readFile(join(outputDir, 'public-widget.json'), 'utf8'));
    expect(widgetEntry.files[0].content).toContain('export function Widget');

    const tarStat = await stat(join(outputDir, 'public-widget.tar.gz'));
    expect(tarStat.size).toBeGreaterThan(0);
  });

  it('excludes internal-visibility components from index.json but still emits their descriptor and tarball', async () => {
    await buildRegistry({ packagesRoot: fixturesPackagesRoot, outputDir });

    const index = JSON.parse(await readFile(join(outputDir, 'index.json'), 'utf8'));
    expect(index.some((entry: { name: string }) => entry.name === 'internal-hello')).toBe(false);

    const internalEntry = JSON.parse(await readFile(join(outputDir, 'internal-hello.json'), 'utf8'));
    expect(internalEntry.visibility).toBe('internal');
    const tarStat = await stat(join(outputDir, 'internal-hello.tar.gz'));
    expect(tarStat.size).toBeGreaterThan(0);
  });

  it('replaces a pre-existing output directory atomically instead of merging with it', async () => {
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, 'stale-file.json'), '{}', 'utf8');

    await buildRegistry({ packagesRoot: fixturesPackagesRoot, outputDir });

    await expect(stat(join(outputDir, 'stale-file.json'))).rejects.toThrow();
  });

  it('fails with a clear error when a descriptor is invalid', async () => {
    const invalidRoot = await mkdtemp(join(tmpdir(), 'modularcore-invalid-packages-'));
    const componentDir = join(invalidRoot, 'broken');
    await mkdir(componentDir, { recursive: true });
    await writeFile(join(componentDir, 'modularcore.json'), JSON.stringify({ name: 'broken' }), 'utf8');

    await expect(buildRegistry({ packagesRoot: invalidRoot, outputDir })).rejects.toThrow(/Invalid descriptor/);

    await rm(invalidRoot, { recursive: true, force: true });
  });

  it('fails when a descriptor references a file that escapes the package root via a symlink', async () => {
    const escapeRoot = await mkdtemp(join(tmpdir(), 'modularcore-escape-packages-'));
    const secretDir = await mkdtemp(join(tmpdir(), 'modularcore-secret-'));
    await writeFile(join(secretDir, '.env'), 'SECRET=leak', 'utf8');

    const componentDir = join(escapeRoot, 'escaper');
    await mkdir(join(componentDir, 'src'), { recursive: true });
    const { symlink } = await import('node:fs/promises');
    await symlink(join(secretDir, '.env'), join(componentDir, 'src', 'linked.ts'));
    await writeFile(
      join(componentDir, 'modularcore.json'),
      JSON.stringify({
        name: 'escaper',
        version: '1.0.0',
        title: 'Escaper',
        type: 'snippet',
        category: 'test-fixture',
        frameworks: ['react'],
        visibility: 'public',
        files: [{ path: 'src/linked.ts', target: 'src/linked.ts', type: 'component', encoding: 'utf8' }],
      }),
      'utf8',
    );

    await expect(buildRegistry({ packagesRoot: escapeRoot, outputDir })).rejects.toThrow(/escapes/);

    await rm(escapeRoot, { recursive: true, force: true });
    await rm(secretDir, { recursive: true, force: true });
  });

  it('fails when a file declared encoding:"utf8" actually contains binary content', async () => {
    const binaryRoot = await mkdtemp(join(tmpdir(), 'modularcore-binary-packages-'));
    const componentDir = join(binaryRoot, 'binary-mismatch');
    await mkdir(join(componentDir, 'src'), { recursive: true });
    // Invalid UTF-8 byte sequence (lone continuation byte) — cannot round-trip through
    // Buffer.toString('utf8') without silent U+FFFD substitution.
    await writeFile(join(componentDir, 'src', 'asset.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe]));
    await writeFile(
      join(componentDir, 'modularcore.json'),
      JSON.stringify({
        name: 'binary-mismatch',
        version: '1.0.0',
        title: 'Binary Mismatch',
        type: 'snippet',
        category: 'test-fixture',
        frameworks: ['react'],
        visibility: 'public',
        files: [{ path: 'src/asset.bin', target: 'src/asset.bin', type: 'asset', encoding: 'utf8' }],
      }),
      'utf8',
    );

    await expect(buildRegistry({ packagesRoot: binaryRoot, outputDir })).rejects.toThrow(/binary\/invalid UTF-8/);

    await rm(binaryRoot, { recursive: true, force: true });
  });
});
