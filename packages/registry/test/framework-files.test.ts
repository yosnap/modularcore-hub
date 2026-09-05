import { describe, expect, it } from 'vitest';

import { frameworkOfFile, selectFilesForFramework } from '../src/framework-files.js';
import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

describe('frameworkOfFile', () => {
  it('lee el framework del directorio bajo adapters/ y ui/', () => {
    expect(frameworkOfFile('adapters/vue/use-chat.ts')).toBe('vue');
    expect(frameworkOfFile('adapters/vanilla/create-media-picker-store.ts')).toBe('vanilla');
    expect(frameworkOfFile('ui/react/MediaLibraryGrid.tsx')).toBe('react');
  });

  it('la presentación de estilo no cambia el framework: sigue siendo el segundo segmento', () => {
    expect(frameworkOfFile('ui/svelte/shadcn/MediaLibraryGrid.svelte')).toBe('svelte');
    expect(frameworkOfFile('ui/react/vanilla/FolderSelect.tsx')).toBe('react');
  });

  it('traduce el snippet al eje: el directorio nombra la herramienta, no el framework', () => {
    expect(frameworkOfFile('snippets/astro/media-picker-island.ts')).toBe('vanilla');
    expect(frameworkOfFile('snippets/laravel/media-picker.blade.php')).toBe('blade');
  });

  it('el núcleo no pertenece a ningún framework', () => {
    expect(frameworkOfFile('core/media-picker.ts')).toBeNull();
    expect(frameworkOfFile('core/canvas/variants.ts')).toBeNull();
  });

  it('un CSS suelto en ui/ es compartido, no el framework "vanilla-styles"', () => {
    // `ui/vanilla-styles.css` es la presentación «CSS plano», un eje distinto, y lo usan las
    // cuatro presentaciones de todos los frameworks.
    expect(frameworkOfFile('ui/vanilla-styles.css')).toBeNull();
    expect(frameworkOfFile('ui/modern-select.css')).toBeNull();
    expect(frameworkOfFile('ui/shadcn-theme.css')).toBeNull();
  });

  it('ante una ruta que no sigue la convención, compartido: sobra un fichero antes que falte', () => {
    expect(frameworkOfFile('adapters/preact/use-chat.ts')).toBeNull();
    expect(frameworkOfFile('snippets/rails/mount.rb')).toBeNull();
    expect(frameworkOfFile('README.md')).toBeNull();
    expect(frameworkOfFile('')).toBeNull();
  });
});

describe('selectFilesForFramework', () => {
  const files = [
    { path: 'core/chat.ts' },
    { path: 'adapters/react/use-chat.ts' },
    { path: 'adapters/vue/use-chat.ts' },
    { path: 'adapters/vanilla/chat-element.ts' },
    { path: 'snippets/laravel/entry.ts' },
    { path: 'ui/vanilla-styles.css' },
  ];

  it('entrega el núcleo y sólo el adaptador del proyecto', () => {
    expect(selectFilesForFramework(files, 'react').map((f) => f.path)).toEqual([
      'core/chat.ts',
      'adapters/react/use-chat.ts',
      'ui/vanilla-styles.css',
    ]);
  });

  it('un proyecto sin framework recibe su binding, no los de React o Vue', () => {
    expect(selectFilesForFramework(files, 'vanilla').map((f) => f.path)).toEqual([
      'core/chat.ts',
      'adapters/vanilla/chat-element.ts',
      'ui/vanilla-styles.css',
    ]);
  });

  it('un proyecto Blade se lleva el snippet de Laravel y el binding sin framework en el que se apoya', () => {
    // Blade no tiene runtime propio en el navegador: su snippet monta el mismo código que usaría
    // una página suelta, y lo importa directamente.
    expect(selectFilesForFramework(files, 'blade').map((f) => f.path)).toEqual([
      'core/chat.ts',
      'adapters/vanilla/chat-element.ts',
      'snippets/laravel/entry.ts',
      'ui/vanilla-styles.css',
    ]);
  });

  it('la relación no es recíproca: un proyecto sin framework no se lleva los snippets de Laravel', () => {
    expect(selectFilesForFramework(files, 'vanilla').map((f) => f.path)).not.toContain(
      'snippets/laravel/entry.ts',
    );
  });

  it('no filtra con un framework desconocido: mejor de más que dejarlo sin lo que necesita', () => {
    expect(selectFilesForFramework(files, 'preact')).toHaveLength(files.length);
    expect(selectFilesForFramework(files, 'agnostic')).toHaveLength(files.length);
  });
});

describe('los descriptores reales del monorepo', async () => {
  const descriptors = await findWorkspaceDescriptors();

  for (const { descriptor } of descriptors) {
    it(`${descriptor.name}: cada framework declarado recibe al menos un fichero propio o el paquete entero`, () => {
      for (const framework of descriptor.frameworks) {
        const selected = selectFilesForFramework(descriptor.files, framework);
        expect(selected.length, `${descriptor.name} deja vacío a ${framework}`).toBeGreaterThan(0);
      }
    });
  }

  it('media-picker: un proyecto vanilla no se lleva ningún adaptador ni UI de otro framework', () => {
    const mediaPicker = descriptors.find((d) => d.descriptor.name === 'media-picker');
    expect(mediaPicker).toBeDefined();

    const selected = selectFilesForFramework(mediaPicker!.descriptor.files, 'vanilla');
    const foreign = selected.filter((file) =>
      ['adapters/react/', 'adapters/vue/', 'adapters/angular/', 'ui/react/', 'ui/svelte/'].some(
        (prefix) => file.path.startsWith(prefix),
      ),
    );

    expect(foreign.map((file) => file.path)).toEqual([]);
    expect(selected.some((file) => file.path.startsWith('adapters/vanilla/'))).toBe(true);
  });
});
