import { describe, expect, it } from 'vitest';

import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

/**
 * El esquema deja `frameworks` como texto libre a propósito, para que un componente de terceros
 * pueda declarar un valor que este repositorio no conoce. El precio es que un error de dedo pasa
 * inadvertido: así fue como el mismo concepto acabó llamándose `vanilla` en un componente y `web`
 * en otro.
 *
 * Un valor que la CLI no puede asignar a ningún proyecto deja el componente ininstalable sin que
 * el usuario pueda hacer nada —`assertCompatible` compara la cadena tal cual—, así que los
 * descriptores de este monorepo sí se atienen al vocabulario conocido.
 */
const KNOWN_FRAMEWORKS = [
  'react',
  'svelte',
  'vue',
  'angular',
  'blade',
  // Páginas sin framework (Astro, HTMX, Rails…). El nombre canónico del eje: no `web`, no `astro`.
  'vanilla',
  // Sin UI: sirve a cualquier proyecto. `assertCompatible` lo trata como comodín.
  'agnostic',
];

describe('vocabulario de frameworks de los descriptores', async () => {
  const descriptors = await findWorkspaceDescriptors();

  it('encuentra al menos un componente que validar', () => {
    expect(descriptors.length).toBeGreaterThan(0);
  });

  for (const { descriptor } of descriptors) {
    it(`${descriptor.name}: declara sólo frameworks que la CLI sabe asignar`, () => {
      const unknown = descriptor.frameworks.filter(
        (framework) => !KNOWN_FRAMEWORKS.includes(framework),
      );

      expect(unknown, `${descriptor.name} declara frameworks desconocidos:`).toEqual([]);
    });
  }
});
