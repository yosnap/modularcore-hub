import { describe, expect, it } from 'vitest';

import { findCoverageMismatches, locateUiFile, readActualCoverage } from '../src/ui-coverage.js';
import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

import type { UiCoverage } from '../src/ui-coverage.js';

describe('locateUiFile', () => {
  it('sitúa la presentación headless y las otras tres', () => {
    expect(locateUiFile('ui/react/MediaLibraryGrid.tsx')).toEqual({
      framework: 'react',
      presentation: 'headless',
      component: 'MediaLibraryGrid',
    });
    expect(locateUiFile('ui/svelte/shadcn/MediaLibraryGrid.svelte')).toEqual({
      framework: 'svelte',
      presentation: 'shadcn',
      component: 'MediaLibraryGrid',
    });
  });

  it('ignora lo que no es UI de referencia', () => {
    expect(locateUiFile('core/media-picker.ts')).toBeNull();
    expect(locateUiFile('ui/vanilla-styles.css')).toBeNull();
    expect(locateUiFile('snippets/laravel/media-picker.blade.php')).toBeNull();
    // `vanilla` como carpeta de presentación, no como framework.
    expect(locateUiFile('ui/vanilla/Algo.tsx')).toBeNull();
  });
});

describe('findCoverageMismatches', () => {
  const files = [
    { path: 'ui/react/Grid.tsx' },
    { path: 'ui/react/tailwind/Grid.tsx' },
    { path: 'ui/svelte/Grid.svelte' },
    { path: 'ui/svelte/tailwind/Grid.svelte' },
    { path: 'ui/svelte/Modal.svelte' },
    { path: 'ui/svelte/tailwind/Modal.svelte' },
  ];

  const declared: Record<string, UiCoverage> = {
    react: { presentations: ['headless', 'tailwind'], missing: ['Modal'] },
    svelte: { presentations: ['headless', 'tailwind'] },
  };

  it('acepta una brecha que está declarada con su nombre', () => {
    expect(findCoverageMismatches(declared, files, ['react', 'svelte'])).toEqual([]);
  });

  it('rechaza una brecha que nadie declaró', () => {
    const sinDeclarar = { ...declared, react: { presentations: ['headless', 'tailwind'] } };

    const problems = findCoverageMismatches(sinDeclarar as Record<string, UiCoverage>, files, [
      'react',
      'svelte',
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]?.framework).toBe('react');
    expect(problems[0]?.problem).toContain('Modal');
  });

  it('rechaza una brecha declarada que ya no existe: la deuda saldada se borra', () => {
    const conModal = [
      ...files,
      { path: 'ui/react/Modal.tsx' },
      { path: 'ui/react/tailwind/Modal.tsx' },
    ];

    const problems = findCoverageMismatches(declared, conModal, ['react', 'svelte']);

    expect(problems).toHaveLength(1);
    expect(problems[0]?.problem).toContain('en realidad le faltan [—]');
  });

  it('rechaza declarar una presentación que no está en el paquete', () => {
    const deMas: Record<string, UiCoverage> = {
      ...declared,
      react: { presentations: ['headless', 'tailwind', 'shadcn'], missing: ['Modal'] },
    };

    const problems = findCoverageMismatches(deMas, files, ['react', 'svelte']);

    expect(problems.some((p) => p.problem.includes('shadcn'))).toBe(true);
  });

  it('exige una entrada en `ui` por cada framework con UI posible', () => {
    const problems = findCoverageMismatches(declared, files, ['react', 'svelte', 'vue']);

    expect(problems).toHaveLength(1);
    expect(problems[0]?.framework).toBe('vue');
    expect(problems[0]?.problem).toContain('ausente de "ui"');
  });

  it('no pide UI a blade: se sirve con snippets', () => {
    expect(findCoverageMismatches(declared, files, ['react', 'svelte', 'blade'])).toEqual([]);
  });

  it('sí pide UI a vanilla: a diferencia de blade, puede traer la suya (la trae auth-kit)', () => {
    const problems = findCoverageMismatches(declared, files, ['react', 'svelte', 'vanilla']);

    expect(problems).toHaveLength(1);
    expect(problems[0]?.framework).toBe('vanilla');
    expect(problems[0]?.problem).toContain('ausente de "ui"');
  });

  it('caza los ficheros de un framework que no está declarado en ninguna parte', () => {
    // El agujero que esta comprobación existe para tapar: nadie instalaría esos ficheros, porque
    // ningún proyecto puede declarar un framework que el componente no soporta.
    const conVue = [...files, { path: 'ui/vue/Grid.vue' }];

    const problems = findCoverageMismatches(declared, conVue, ['react', 'svelte']);

    expect(problems).toHaveLength(1);
    expect(problems[0]?.framework).toBe('vue');
    expect(problems[0]?.problem).toContain('nadie los instalaría');
  });

  it('un componente sólo-headless en todos los frameworks no es una brecha', () => {
    // `ModernSelect` es de apoyo: vive en headless y ninguna presentación lo reviste.
    const conApoyo = [
      ...files,
      { path: 'ui/react/ModernSelect.tsx' },
      { path: 'ui/svelte/ModernSelect.svelte' },
    ];

    expect(findCoverageMismatches(declared, conApoyo, ['react', 'svelte'])).toEqual([]);
  });
});

describe('los descriptores reales del monorepo', async () => {
  const descriptors = await findWorkspaceDescriptors();

  for (const { descriptor } of descriptors) {
    it(`${descriptor.name}: la cobertura de UI declarada es la que hay`, () => {
      const problems = findCoverageMismatches(
        descriptor.ui ?? {},
        descriptor.files,
        descriptor.frameworks,
      );

      expect(
        problems.map((problem) => `${problem.framework}: ${problem.problem}`),
        `${descriptor.name} declara una cobertura de UI que no cuadra:`,
      ).toEqual([]);
    });
  }

  it('readActualCoverage sobre un descriptor real ve las cuatro presentaciones', () => {
    const mediaPicker = descriptors.find((entry) => entry.descriptor.name === 'media-picker');
    expect(mediaPicker).toBeDefined();

    const coverage = readActualCoverage(mediaPicker!.descriptor.files);

    expect([...(coverage.get('svelte')?.keys() ?? [])].sort()).toEqual([
      'headless',
      'shadcn',
      'tailwind',
      'vanilla',
    ]);
  });
});
