import { describe, expect, it } from 'vitest';

import { collectNpmDependencies } from '../src/deps.js';
import { CompatibilityError } from '../src/errors.js';

import type { RegistryEntry } from '@modularcore/registry';

/**
 * Se prueba contra `collectNpmDependencies` y no a través de `runAdd`: aquello instala los
 * paquetes de verdad, así que meter dependencias reales en un fixture ataría la suite a tener
 * red y a que el registro de npm esté disponible.
 */
function entry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    name: 'widget',
    version: '1.0.0',
    title: 'Widget',
    type: 'headless-core',
    category: 'test',
    frameworks: ['react', 'svelte'],
    visibility: 'public',
    peerDependencies: {},
    dependencies: ['@radix-ui/react-toggle@^1.1.18', 'bits-ui@^2.18.2'],
    registryDependencies: [],
    envVariables: [],
    files: [
      {
        path: 'ui/react/Grid.tsx',
        target: 'src/Grid.tsx',
        type: 'ui',
        encoding: 'utf8',
        content: "import * as Toggle from '@radix-ui/react-toggle';\n",
      },
      {
        path: 'ui/svelte/Grid.svelte',
        target: 'src/Grid.svelte',
        type: 'ui',
        encoding: 'utf8',
        content: "<script>import { Toggle } from 'bits-ui';</script>\n",
      },
    ],
    ...overrides,
  } as RegistryEntry;
}

describe('dependencias npm por framework', () => {
  it('un proyecto React no se lleva la librería que sólo usa Svelte', () => {
    const names = collectNpmDependencies([entry()], 'react').map((spec) => spec.name);

    expect(names).toEqual(['@radix-ui/react-toggle']);
  });

  it('y un proyecto Svelte no se lleva la de React', () => {
    const names = collectNpmDependencies([entry()], 'svelte').map((spec) => spec.name);

    expect(names).toEqual(['bits-ui']);
  });

  it('sin framework se toman todas, para quien llame fuera del flujo de instalación', () => {
    expect(collectNpmDependencies([entry()])).toHaveLength(2);
  });

  it('valida también las declaraciones que este proyecto no va a instalar', () => {
    // Filtrar antes de validar dejaría pasar en silencio una declaración rota de otro framework,
    // que sólo estallaría para quien sí la usa.
    const rota = entry({ dependencies: ['@radix-ui/react-toggle@^1.1.18', 'bits-ui'] });

    expect(() => collectNpmDependencies([rota], 'react')).toThrow(CompatibilityError);
  });

  it('detecta un conflicto de versiones aunque venga de otro framework', () => {
    const otro = entry({ name: 'otro', dependencies: ['bits-ui@^1.0.0'] });

    expect(() => collectNpmDependencies([entry(), otro], 'react')).toThrow(
      /Conflicto de versiones/,
    );
  });
});
