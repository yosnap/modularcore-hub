import { describe, expect, it } from 'vitest';

import { frameworkOfFile, selectFilesForFramework } from '../src/framework-files.js';
import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

describe('herencia entre frameworks', () => {
  const files = [
    { path: 'core/engine.ts' },
    { path: 'adapters/vanilla/store.ts' },
    { path: 'adapters/react/use-thing.ts' },
    { path: 'snippets/astro/island.ts' },
    { path: 'snippets/laravel/mount.blade.php' },
  ];

  it('blade hereda el adaptador sin framework, que es lo que su plantilla monta', () => {
    const selected = selectFilesForFramework(files, 'blade').map((file) => file.path);

    expect(selected).toContain('adapters/vanilla/store.ts');
    expect(selected).toContain('snippets/laravel/mount.blade.php');
  });

  it('blade no hereda los snippets de otra herramienta', () => {
    // La isla de Astro sólo se engancha a `astro:page-load`, que no se dispara nunca fuera de
    // Astro: en un proyecto Laravel es un fichero muerto que alguien intentará usar.
    const selected = selectFilesForFramework(files, 'blade').map((file) => file.path);

    expect(selected).not.toContain('snippets/astro/island.ts');
  });

  it('la herencia no es recíproca: vanilla no se lleva lo de blade', () => {
    const selected = selectFilesForFramework(files, 'vanilla').map((file) => file.path);

    expect(selected).toContain('snippets/astro/island.ts');
    expect(selected).not.toContain('snippets/laravel/mount.blade.php');
  });
});

describe('`vanilla` bajo ui/ es una presentación, no un framework', () => {
  it('no clasifica ui/vanilla/ como framework', () => {
    // Si lo hiciera, esos ficheros desaparecerían de toda instalación de React o Svelte, que es
    // exactamente donde se usan.
    expect(frameworkOfFile('ui/vanilla/Algo.tsx')).toBeNull();
    expect(frameworkOfFile('ui/react/vanilla/FolderSelect.tsx')).toBe('react');
  });

  it('bajo adapters/ sí es el framework sin framework', () => {
    expect(frameworkOfFile('adapters/vanilla/create-store.ts')).toBe('vanilla');
  });
});

describe('los descriptores reales del monorepo', async () => {
  const descriptors = await findWorkspaceDescriptors();

  it('un proyecto Laravel no recibe la isla de Astro de media-picker', () => {
    const mediaPicker = descriptors.find((entry) => entry.descriptor.name === 'media-picker');
    expect(mediaPicker).toBeDefined();

    const selected = selectFilesForFramework(mediaPicker!.descriptor.files, 'blade').map(
      (file) => file.path,
    );

    expect(selected.filter((path) => path.startsWith('snippets/astro/'))).toEqual([]);
    expect(selected.some((path) => path.startsWith('snippets/laravel/'))).toBe(true);
    expect(selected.some((path) => path.startsWith('adapters/vanilla/'))).toBe(true);
  });

  it('un proyecto sin framework sigue recibiendo su binding y su isla', () => {
    const mediaPicker = descriptors.find((entry) => entry.descriptor.name === 'media-picker');

    const selected = selectFilesForFramework(mediaPicker!.descriptor.files, 'vanilla').map(
      (file) => file.path,
    );

    expect(selected.some((path) => path.startsWith('adapters/vanilla/'))).toBe(true);
    expect(selected.some((path) => path.startsWith('snippets/astro/'))).toBe(true);
  });

  it('las hojas de estilo de la presentación CSS plano llegan a React y a Svelte', () => {
    const mediaPicker = descriptors.find((entry) => entry.descriptor.name === 'media-picker');

    for (const framework of ['react', 'svelte']) {
      const selected = selectFilesForFramework(mediaPicker!.descriptor.files, framework).map(
        (file) => file.path,
      );

      expect(selected, `${framework} pierde vanilla-styles.css`).toContain('ui/vanilla-styles.css');
    }
  });
});
