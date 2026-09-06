import { describe, expect, it } from 'vitest';

import { dependenciesForFiles, dependencyNameOf, npmImportsOf } from '../src/dependency-usage.js';
import { selectFilesForFramework } from '../src/framework-files.js';
import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

const files = [
  { path: 'core/engine.ts', content: "import { z } from 'zod';\n" },
  {
    path: 'ui/react/shadcn/Grid.tsx',
    content: "import * as Toggle from '@radix-ui/react-toggle';\n",
  },
  { path: 'ui/svelte/shadcn/Grid.svelte', content: "import { Toggle } from 'bits-ui';\n" },
  { path: 'ui/vanilla-styles.css', content: "@import 'tailwindcss';\n" },
];

const declared = ['zod@^3.23.8', '@radix-ui/react-toggle@^1.1.18', 'bits-ui@^2.18.2'];

describe('dependencyNameOf', () => {
  it('separa el nombre del rango, también con scope', () => {
    expect(dependencyNameOf('bits-ui@^2.18.2')).toBe('bits-ui');
    expect(dependencyNameOf('@radix-ui/react-toggle@^1.1.18')).toBe('@radix-ui/react-toggle');
    expect(dependencyNameOf('zod')).toBe('zod');
  });
});

describe('npmImportsOf', () => {
  it('recoge los paquetes importados y descarta lo relativo y node:', () => {
    const imports = npmImportsOf([
      { path: 'a.ts', content: "import { x } from './local.js';\nimport { z } from 'zod';\n" },
      { path: 'b.ts', content: "import { readFile } from 'node:fs/promises';\n" },
    ]);

    expect([...imports]).toEqual(['zod']);
  });

  it('no toma por dependencia el @import de una hoja de estilo', () => {
    expect(npmImportsOf([{ path: 'ui/x.css', content: "@import 'tailwindcss';\n" }]).size).toBe(0);
  });

  it('ignora los imports que sólo aparecen en un comentario de ejemplo', () => {
    const imports = npmImportsOf([
      { path: 'a.ts', content: "/** import { algo } from 'paquete-de-ejemplo'; */\nexport {};\n" },
    ]);

    expect(imports.size).toBe(0);
  });
});

describe('dependenciesForFiles', () => {
  it('un proyecto React no se lleva la librería que sólo usa Svelte', () => {
    const forReact = selectFilesForFramework(files, 'react');

    expect(dependenciesForFiles(declared, forReact, files)).toEqual([
      'zod@^3.23.8',
      '@radix-ui/react-toggle@^1.1.18',
    ]);
  });

  it('y un proyecto Svelte no se lleva la de React', () => {
    const forSvelte = selectFilesForFramework(files, 'svelte');

    expect(dependenciesForFiles(declared, forSvelte, files)).toEqual([
      'zod@^3.23.8',
      'bits-ui@^2.18.2',
    ]);
  });

  it('un proyecto sin framework se queda con lo del núcleo y nada más', () => {
    const forVanilla = selectFilesForFramework(files, 'vanilla');

    expect(dependenciesForFiles(declared, forVanilla, files)).toEqual(['zod@^3.23.8']);
  });

  it('conserva una dependencia que nadie importa: no se sabe a quién sirve', () => {
    // Puede cargarse dinámicamente o ser una herramienta; quitarla rompería la instalación.
    const conHuerfana = [...declared, 'algo-suelto@^1.0.0'];

    expect(dependenciesForFiles(conHuerfana, [], files)).toEqual(['algo-suelto@^1.0.0']);
  });
});

describe('sobre los descriptores reales', async () => {
  const descriptors = await findWorkspaceDescriptors();

  it('media-picker en React no instala bits-ui', async () => {
    const mediaPicker = descriptors.find((entry) => entry.descriptor.name === 'media-picker');
    expect(mediaPicker).toBeDefined();

    // El descriptor del workspace no lleva el contenido de los ficheros; se leen del paquete.
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const withContent = await Promise.all(
      mediaPicker!.descriptor.files.map(async (file) => ({
        path: file.path,
        content: await readFile(join(mediaPicker!.packageDir, file.path), 'utf8').catch(() => ''),
      })),
    );

    const forReact = dependenciesForFiles(
      mediaPicker!.descriptor.dependencies,
      selectFilesForFramework(withContent, 'react'),
      withContent,
    );

    expect(forReact.some((dependency) => dependency.startsWith('bits-ui'))).toBe(false);
    expect(forReact.some((dependency) => dependency.startsWith('@radix-ui/'))).toBe(true);
  });
});
