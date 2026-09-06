import { describe, expect, it } from 'vitest';

import { findCoverageMismatches } from '../src/ui-coverage.js';

/**
 * Aportar un componente para un solo framework no es un caso degradado: es el caso normal.
 *
 * Quien contribuye trabaja con el framework que usa. Pedirle que adapte su componente a los otros
 * cinco antes de aceptarle la aportación sería un listón que nadie salta, así que la comprobación
 * no lo exige: sólo pide que el descriptor diga la verdad, para que el catálogo pueda mostrar en
 * qué frameworks está y el mantenimiento sepa qué queda por adaptar.
 */
describe('un componente aportado para un solo framework', () => {
  const soloAngular = {
    frameworks: ['angular'],
    ui: { angular: { presentations: ['headless', 'tailwind', 'shadcn', 'vanilla'] as const } },
    files: [
      { path: 'core/rating.ts' },
      { path: 'adapters/angular/rating.service.ts' },
      { path: 'ui/angular/Rating.component.ts' },
      { path: 'ui/angular/tailwind/Rating.component.ts' },
      { path: 'ui/angular/shadcn/Rating.component.ts' },
      { path: 'ui/angular/vanilla/Rating.component.ts' },
    ],
  };

  it('se acepta sin pedirle ningún otro framework', () => {
    const problems = findCoverageMismatches(
      soloAngular.ui as never,
      soloAngular.files,
      soloAngular.frameworks,
    );

    expect(problems).toEqual([]);
  });

  it('también con una sola presentación: el listón no está en cubrir las cuatro', () => {
    const minimo = {
      frameworks: ['angular'],
      ui: { angular: { presentations: ['headless' as const] } },
      files: [
        { path: 'core/rating.ts' },
        { path: 'adapters/angular/rating.service.ts' },
        { path: 'ui/angular/Rating.component.ts' },
      ],
    };

    expect(findCoverageMismatches(minimo.ui, minimo.files, minimo.frameworks)).toEqual([]);
  });

  it('cuando el mantenimiento lo adapta a React, la brecha aparece hasta que se declara', () => {
    // Al añadir React al componente, Angular pasa a tener algo que React no: ahí sí hay que
    // decirlo, porque si no el catálogo prometería una paridad que no existe.
    const conReactAMedias = {
      frameworks: ['angular', 'react'],
      ui: {
        angular: { presentations: ['headless' as const] },
        react: { presentations: ['headless' as const] },
      },
      files: [
        ...soloAngular.files.slice(0, 3),
        { path: 'adapters/react/use-rating.ts' },
        { path: 'ui/react/Rating.tsx' },
        { path: 'ui/angular/Badge.component.ts' },
      ],
    };

    const problems = findCoverageMismatches(
      conReactAMedias.ui,
      conReactAMedias.files,
      conReactAMedias.frameworks,
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]?.framework).toBe('react');
    expect(problems[0]?.problem).toContain('Badge');
  });
});
