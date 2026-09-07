import { describe, expect, it } from 'vitest';

import { undefinedFrameworks } from '../src/framework-catalog.js';
import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

/**
 * El vocabulario de `frameworks` no es cerrado: un componente puede traer el suyo en
 * `frameworkDefs` y el registry lo entiende sin que nadie del mantenimiento toque código. Pero
 * **declarar un framework sin definirlo** deja el componente ininstalable sin que el usuario pueda
 * hacer nada: `assertCompatible` compara la cadena tal cual, y sus ficheros no tendrían dueño, así
 * que se colarían en las instalaciones de todos los demás.
 *
 * Eso es lo que se comprueba aquí: que todo framework declarado esté definido, de casa o por el
 * propio componente. Una errata —`sold` por `solid`— salta como lo que es.
 */
describe('los frameworks declarados están definidos', async () => {
  const descriptors = await findWorkspaceDescriptors();

  it('encuentra al menos un componente que validar', () => {
    expect(descriptors.length).toBeGreaterThan(0);
  });

  for (const { descriptor } of descriptors) {
    it(`${descriptor.name}: no declara ningún framework sin definición`, () => {
      expect(
        undefinedFrameworks(descriptor),
        `${descriptor.name} declara frameworks que nadie define (ni de casa, ni en su propio "frameworkDefs"):`,
      ).toEqual([]);
    });
  }
});
