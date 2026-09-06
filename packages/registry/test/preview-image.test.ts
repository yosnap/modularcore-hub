import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildRegistry } from '../src/build-registry.js';

/** PNG de 1×1 real: el build copia bytes, así que el fichero tiene que serlo de verdad. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let roots: string[] = [];

async function componentWithPreview(preview: unknown, imageName = 'shot.png'): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'modularcore-preview-'));
  roots.push(root);

  const componentDir = join(root, 'widget');
  await mkdir(join(componentDir, 'preview'), { recursive: true });
  await mkdir(join(componentDir, 'src'), { recursive: true });
  await writeFile(join(componentDir, 'src', 'widget.ts'), 'export const widget = 1;\n', 'utf8');
  await writeFile(join(componentDir, 'preview', imageName), PNG_1X1);

  await writeFile(
    join(componentDir, 'modularcore.json'),
    JSON.stringify({
      name: 'widget',
      version: '1.0.0',
      title: 'Widget',
      type: 'snippet',
      category: 'test-fixture',
      frameworks: ['react'],
      visibility: 'public',
      ...(preview === undefined ? {} : { preview }),
      files: [
        { path: 'src/widget.ts', target: 'src/widget.ts', type: 'component', encoding: 'utf8' },
      ],
    }),
    'utf8',
  );

  return root;
}

afterEach(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
  roots = [];
});

describe('captura del componente', () => {
  it('la copia junto a los artefactos y publica su URL servible', async () => {
    const packagesRoot = await componentWithPreview({
      image: 'preview/shot.png',
      alt: 'La cuadrícula de la biblioteca',
    });
    const outputDir = join(packagesRoot, 'out');

    const summary = await buildRegistry({ packagesRoot, outputDir });

    // El fichero está donde el endpoint del registry lo sirve.
    const copied = await readFile(join(outputDir, 'widget-preview.png'));
    expect(copied.equals(PNG_1X1)).toBe(true);

    // Y el índice apunta a él por URL, no por la ruta que tenía dentro del paquete.
    expect(summary.publicIndex[0]?.preview).toEqual({
      image: '/registry/widget-preview.png',
      alt: 'La cuadrícula de la biblioteca',
    });
  });

  it('no la mete en los ficheros que se copian al proyecto de quien instala', async () => {
    const packagesRoot = await componentWithPreview({ image: 'preview/shot.png', alt: 'Captura' });
    const outputDir = join(packagesRoot, 'out');

    await buildRegistry({ packagesRoot, outputDir });

    const entry = JSON.parse(await readFile(join(outputDir, 'widget.json'), 'utf8'));
    expect(entry.files.map((file: { path: string }) => file.path)).toEqual(['src/widget.ts']);
  });

  it('rechaza SVG: servido con su Content-Type ejecutaría el script que lleve dentro', async () => {
    const packagesRoot = await componentWithPreview(
      { image: 'preview/shot.svg', alt: 'Captura' },
      'shot.svg',
    );

    await expect(
      buildRegistry({ packagesRoot, outputDir: join(packagesRoot, 'out') }),
    ).rejects.toThrow(/\.svg/);
  });

  it('rechaza una captura que no existe en el paquete', async () => {
    const packagesRoot = await componentWithPreview({ image: 'preview/no-esta.png', alt: 'X' });

    await expect(
      buildRegistry({ packagesRoot, outputDir: join(packagesRoot, 'out') }),
    ).rejects.toThrow(/not found|unreadable/i);
  });

  it('un componente sin captura sigue construyéndose', async () => {
    const packagesRoot = await componentWithPreview(undefined);
    const outputDir = join(packagesRoot, 'out');

    const summary = await buildRegistry({ packagesRoot, outputDir });

    expect(summary.publicIndex[0]?.preview).toBeUndefined();
  });
});
