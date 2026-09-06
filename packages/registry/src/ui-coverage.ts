import { BUILTIN_FRAMEWORKS } from './framework-catalog.js';

import type { FrameworkDefinition } from './framework-catalog.js';

/**
 * Cobertura de la UI de referencia por framework.
 *
 * Un componente puede instalarse en cualquier framework que declare en `frameworks` —eso sólo
 * exige núcleo y adaptador—, pero la UI de referencia es otra cosa: se escribe una vez por
 * framework y por presentación, y es justo donde el trabajo se queda a medias sin que nada lo
 * note. Así se declaró `vue` durante meses sin un solo componente de interfaz.
 *
 * `ui` en el descriptor declara esa cobertura, y las brechas conocidas van escritas con nombre y
 * apellido. La comprobación no exige paridad completa —un colaborador entrega los frameworks que
 * puede y el mantenimiento completa el resto— sino que lo declarado sea exactamente lo que hay:
 * una brecha nueva que nadie declare hace fallar la comprobación.
 */

/** Las cuatro presentaciones en las que se escribe cada componente de UI. */
export const PRESENTATIONS = ['headless', 'tailwind', 'shadcn', 'vanilla'] as const;

export type Presentation = (typeof PRESENTATIONS)[number];

export interface UiCoverage {
  /** Presentaciones que este framework cubre. Vacío: el framework no trae UI de referencia. */
  presentations: Presentation[];
  /**
   * Componentes que otros frameworks sí tienen y este todavía no, por nombre. Es deuda del
   * mantenimiento, no un rechazo al colaborador que aportó el resto.
   */
  missing?: string[];
}

/** Extensiones de la UI de referencia, tomadas del catálogo: un framework aportado trae la suya. */
function uiExtensionsOf(catalog: Record<string, FrameworkDefinition>): Record<string, string> {
  const extensions: Record<string, string> = {};
  for (const [name, definition] of Object.entries(catalog)) {
    if (definition.uiExtension) extensions[name] = definition.uiExtension;
  }
  return extensions;
}

export interface DescribedFile {
  path: string;
}

export interface ComponentLocation {
  framework: string;
  presentation: Presentation;
  component: string;
}

/**
 * Sitúa un fichero de UI en el eje framework × presentación × componente, o devuelve `null` si no
 * es UI de referencia (el núcleo, una hoja de estilos suelta, un snippet).
 *
 * `ui/<framework>/<Componente>` es la presentación headless; `ui/<framework>/<presentación>/…` es
 * cada una de las otras tres.
 */
export function locateUiFile(
  path: string,
  catalog: Record<string, FrameworkDefinition> = BUILTIN_FRAMEWORKS,
): ComponentLocation | null {
  const segments = path.split('/');
  if (segments[0] !== 'ui' || segments.length < 3) return null;

  const framework = segments[1];
  const extensions = uiExtensionsOf(catalog);
  if (!framework || !(framework in extensions)) return null;

  const extension = extensions[framework]!;
  const last = segments[segments.length - 1]!;
  if (!last.endsWith(extension)) return null;

  const component = last.slice(0, -extension.length);

  if (segments.length === 3) return { framework, presentation: 'headless', component };

  const presentation = segments[2];
  if (!PRESENTATIONS.includes(presentation as Presentation)) return null;

  return { framework, presentation: presentation as Presentation, component };
}

export type ActualCoverage = Map<string, Map<Presentation, Set<string>>>;

/** Cobertura real que se desprende de los ficheros que el descriptor enumera. */
export function readActualCoverage(
  files: DescribedFile[],
  catalog: Record<string, FrameworkDefinition> = BUILTIN_FRAMEWORKS,
): ActualCoverage {
  const coverage: ActualCoverage = new Map();

  for (const file of files) {
    const located = locateUiFile(file.path, catalog);
    if (!located) continue;

    const byPresentation = coverage.get(located.framework) ?? new Map();
    const components = byPresentation.get(located.presentation) ?? new Set<string>();
    components.add(located.component);
    byPresentation.set(located.presentation, components);
    coverage.set(located.framework, byPresentation);
  }

  return coverage;
}

export interface CoverageMismatch {
  framework: string;
  problem: string;
}

/**
 * Compara lo declarado en `ui` con lo que hay, y describe cada discrepancia en una línea legible.
 *
 * Un componente presente sólo en la presentación headless de *todos* los frameworks —los de
 * apoyo, como `ModernSelect`— no cuenta como brecha: la comparación se hace presentación a
 * presentación, así que sólo salta cuando un framework se queda atrás respecto de otro en la
 * misma presentación.
 */
export function findCoverageMismatches(
  declared: Record<string, UiCoverage>,
  files: DescribedFile[],
  frameworks: string[],
  catalog: Record<string, FrameworkDefinition> = BUILTIN_FRAMEWORKS,
): CoverageMismatch[] {
  const actual = readActualCoverage(files, catalog);
  const extensions = uiExtensionsOf(catalog);
  const mismatches: CoverageMismatch[] = [];

  for (const framework of frameworks) {
    if (!extensions[framework]) continue; // blade y vanilla se sirven con snippets, no con UI.
    if (!declared[framework]) {
      mismatches.push({
        framework,
        problem: `declarado en "frameworks" pero ausente de "ui": di qué cobertura tiene, aunque sea ninguna`,
      });
    }
  }

  // Un framework con ficheros de UI y sin entrada en `ui` no lo veía ninguna de las
  // comprobaciones siguientes, que recorren lo declarado: la brecha se colaba justo por donde este
  // módulo promete no dejar pasar ninguna. Y esos ficheros no se instalan en ningún sitio, porque
  // ningún proyecto puede declarar un framework que el componente no soporta.
  for (const framework of actual.keys()) {
    if (declared[framework]) continue;
    mismatches.push({
      framework,
      problem: `hay ficheros en ui/${framework}/ y el descriptor no lo declara ni en "frameworks" ni en "ui": nadie los instalaría`,
    });
  }

  for (const [framework, coverage] of Object.entries(declared)) {
    const byPresentation = actual.get(framework) ?? new Map<Presentation, Set<string>>();

    const present = PRESENTATIONS.filter((p) => (byPresentation.get(p)?.size ?? 0) > 0);
    const declaredPresentations = [...coverage.presentations].sort();
    if (JSON.stringify(present.slice().sort()) !== JSON.stringify(declaredPresentations)) {
      mismatches.push({
        framework,
        problem: `declara las presentaciones [${declaredPresentations.join(', ')}] y en el paquete hay [${present.join(', ')}]`,
      });
    }
  }

  // Una brecha es un componente que otro framework sí tiene en esa misma presentación.
  for (const [framework, coverage] of Object.entries(declared)) {
    if (coverage.presentations.length === 0) continue;

    const byPresentation = actual.get(framework) ?? new Map<Presentation, Set<string>>();
    const gaps = new Set<string>();

    for (const presentation of coverage.presentations) {
      const mine = byPresentation.get(presentation) ?? new Set<string>();

      for (const [other, otherCoverage] of actual) {
        if (other === framework) continue;
        if (!declared[other]?.presentations.includes(presentation)) continue;

        for (const component of otherCoverage.get(presentation) ?? []) {
          if (!mine.has(component)) gaps.add(component);
        }
      }
    }

    const declaredMissing = [...(coverage.missing ?? [])].sort();
    const actualMissing = [...gaps].sort();
    if (JSON.stringify(declaredMissing) !== JSON.stringify(actualMissing)) {
      mismatches.push({
        framework,
        problem: `declara que le faltan [${declaredMissing.join(', ') || '—'}] y en realidad le faltan [${actualMissing.join(', ') || '—'}]`,
      });
    }
  }

  return mismatches;
}
