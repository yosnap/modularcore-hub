import { describe, expect, it } from 'vitest';

import {
  BUILTIN_FRAMEWORKS,
  buildFrameworkCatalog,
  frameworksKnownTo,
  undefinedFrameworks,
} from '../src/framework-catalog.js';
import { frameworkOfFile, selectFilesForFramework } from '../src/framework-files.js';
import { registryDescriptorSchema } from '../src/schema.zod.js';
import { findCoverageMismatches, locateUiFile } from '../src/ui-coverage.js';

/**
 * El caso que este diseño existe para permitir: alguien aporta un componente en un framework que
 * el registry no conoce, y entra sin que nadie del mantenimiento toque una línea de código. El
 * control es la revisión de su PR, no una lista blanca.
 */
const solid = {
  frameworks: ['solid'],
  frameworkDefs: {
    solid: {
      title: 'Solid',
      uiExtension: '.tsx',
      detect: { npm: 'solid-js' },
      peer: 'solid-js',
      paths: { components: 'src/components', lib: 'src/lib/modularcore' },
    },
  },
  files: [
    { path: 'core/rating.ts' },
    { path: 'adapters/solid/use-rating.ts' },
    { path: 'ui/solid/Rating.tsx' },
    { path: 'ui/solid/tailwind/Rating.tsx' },
  ],
};

describe('un componente que trae su propio framework', () => {
  it('el esquema lo acepta', () => {
    const parsed = registryDescriptorSchema.safeParse({
      name: 'rating',
      version: '0.1.0',
      title: 'Rating',
      type: 'headless-core',
      category: 'ui',
      visibility: 'public',
      peerDependencies: {},
      dependencies: [],
      registryDependencies: [],
      envVariables: [],
      frameworks: solid.frameworks,
      frameworkDefs: solid.frameworkDefs,
      files: solid.files.map((file) => ({
        path: file.path,
        target: `src/${file.path}`,
        type: 'ui',
        encoding: 'utf8',
      })),
    });

    expect(parsed.success).toBe(true);
  });

  it('sus ficheros dejan de ser «de nadie» y pasan a ser suyos', () => {
    const catalog = frameworksKnownTo(solid);

    // Sin la definición, `ui/solid/…` se tomaba por compartido y se colaba en las instalaciones
    // de React y Svelte.
    expect(frameworkOfFile('ui/solid/Rating.tsx')).toBeNull();
    expect(frameworkOfFile('ui/solid/Rating.tsx', catalog)).toBe('solid');
    expect(frameworkOfFile('adapters/solid/use-rating.ts', catalog)).toBe('solid');
  });

  it('un proyecto React no se lleva nada suyo', () => {
    const catalog = frameworksKnownTo(solid);

    const forReact = selectFilesForFramework(solid.files, 'react', catalog).map(
      (file) => file.path,
    );

    expect(forReact).toEqual(['core/rating.ts']);
  });

  it('y un proyecto Solid se lleva lo suyo y el núcleo', () => {
    const catalog = frameworksKnownTo(solid);

    const forSolid = selectFilesForFramework(solid.files, 'solid', catalog).map(
      (file) => file.path,
    );

    expect(forSolid).toEqual(solid.files.map((file) => file.path));
  });

  it('la cobertura de UI lo entiende, con la extensión que él declara', () => {
    const catalog = frameworksKnownTo(solid);

    expect(locateUiFile('ui/solid/Rating.tsx', catalog)).toEqual({
      framework: 'solid',
      presentation: 'headless',
      component: 'Rating',
    });

    const problems = findCoverageMismatches(
      { solid: { presentations: ['headless', 'tailwind'] } },
      solid.files,
      solid.frameworks,
      catalog,
    );

    expect(problems).toEqual([]);
  });

  it('declarar un framework sin definirlo se detecta', () => {
    expect(undefinedFrameworks({ frameworks: ['solid'] })).toEqual(['solid']);
    expect(undefinedFrameworks(solid)).toEqual([]);
    expect(undefinedFrameworks({ frameworks: ['react', 'agnostic'] })).toEqual([]);
  });
});

describe('buildFrameworkCatalog', () => {
  it('reúne los de casa con los aportados', () => {
    const catalog = buildFrameworkCatalog([solid]);

    expect(catalog['react']).toBeDefined();
    expect(catalog['solid']?.title).toBe('Solid');
  });

  it('un componente no puede redefinir un framework de casa', () => {
    const secuestro = {
      frameworks: ['react'],
      frameworkDefs: { react: { title: 'Mío', uiExtension: '.mio' } },
    };

    expect(buildFrameworkCatalog([secuestro])['react']).toEqual(BUILTIN_FRAMEWORKS['react']);
  });

  it('ante dos definiciones del mismo nombre gana la primera', () => {
    const otro = {
      frameworks: ['solid'],
      frameworkDefs: { solid: { title: 'Otro Solid', uiExtension: '.jsx' } },
    };

    expect(buildFrameworkCatalog([solid, otro])['solid']?.title).toBe('Solid');
  });
});
