import { BUILTIN_FRAMEWORKS } from './framework-catalog.js';

import type { FrameworkDefinition } from './framework-catalog.js';

/**
 * Un descriptor enumera los ficheros de todos sus adaptadores a la vez, porque el registry sirve
 * un único catálogo para cualquier proyecto. Al instalar, en cambio, sólo tienen sentido los del
 * framework elegido: escribir los demás deja en el proyecto módulos que importan runtimes que no
 * están instalados, y el `tsc` del consumidor falla justo después de un `add` que terminó bien.
 *
 * Qué framework sirve cada fichero se deduce de la convención de rutas del monorepo, que los cinco
 * descriptores actuales siguen sin excepción. Un fichero que no encaje en ninguna regla se
 * considera compartido y se escribe siempre: ante la duda, sobra un fichero antes que falte uno.
 */

/** Vocabulario del eje `frameworks` de un descriptor. `agnostic` es el comodín: sirve a cualquiera. */
export const KNOWN_FRAMEWORKS = [
  'react',
  'svelte',
  'vue',
  'angular',
  'blade',
  /** Páginas sin framework (Astro, HTMX, Rails…): el nombre canónico del eje. */
  'vanilla',
] as const;

export const AGNOSTIC_FRAMEWORK = 'agnostic';

const FRAMEWORK_ROOTS = ['adapters', 'ui'];

/**
 * El framework al que pertenece un fichero del descriptor, o `null` si sirve a todos.
 *
 * Se lee del `path` —la estructura dentro del paquete— y no del `target`, que para los snippets
 * apunta a un árbol distinto en el proyecto de destino.
 */
export function frameworkOfFile(
  path: string,
  catalog: Record<string, FrameworkDefinition> = BUILTIN_FRAMEWORKS,
): string | null {
  const [root, second] = path.split('/');
  if (!root || !second) return null;

  // Con sólo dos segmentos el segundo es el propio fichero (`ui/vanilla-styles.css`), no un
  // directorio de framework. Ojo justamente con ese: es la presentación de estilo «CSS plano»,
  // un eje distinto, y lo comparten las cuatro presentaciones de todos los frameworks.
  if (path.split('/').length < 3) return null;

  if (root === 'snippets') {
    // Un snippet toma el nombre de la herramienta a la que sirve —`snippets/laravel/` para
    // Blade, `snippets/astro/` para una página sin framework—, así que el dueño se busca por
    // ese directorio y no por el nombre del framework.
    const owner = Object.entries(catalog).find(
      ([name, definition]) => (definition.snippetDirectory ?? name) === second,
    );
    return owner?.[0] ?? null;
  }

  // `vanilla` nombra dos ejes distintos: un framework (una página sin ninguno) y una presentación
  // de estilo (CSS plano). Bajo `ui/` manda el segundo, así que `ui/vanilla/…` es marcado
  // compartido y no el framework: tratarlo como framework lo borraría de toda instalación de
  // React o Svelte, que es justo donde se usa.
  if (root === 'ui') {
    // Sólo cuenta como framework quien tiene UI propia. `vanilla` no la tiene, así que
    // `ui/vanilla/` es la presentación de CSS plano y no el framework sin framework.
    return catalog[second]?.uiExtension ? second : null;
  }
  if (FRAMEWORK_ROOTS.includes(root)) {
    return catalog[second] ? second : null;
  }

  return null;
}

/**
 * Los ficheros que un proyecto de `framework` necesita: los compartidos más los suyos.
 *
 * Un componente `agnostic` no tiene adaptadores que separar, y un proyecto cuyo framework no
 * conocemos recibe el descriptor entero: filtrar con información incompleta arriesga dejarlo sin
 * ficheros que sí necesita.
 */
export function selectFilesForFramework<T extends { path: string }>(
  files: T[],
  framework: string,
  catalog: Record<string, FrameworkDefinition> = BUILTIN_FRAMEWORKS,
): T[] {
  if (framework === AGNOSTIC_FRAMEWORK) return files;
  // Un framework que este catálogo no conoce recibe el descriptor entero: recortar con
  // información incompleta arriesga dejarlo sin ficheros que sí necesita.
  if (!catalog[framework]) return files;

  const base = catalog[framework].basedOn;
  const bases = new Set(base ? [base] : []);

  return files.filter((file) => {
    const owner = frameworkOfFile(file.path, catalog);
    if (owner === null || owner === framework) return true;
    // Lo heredado se limita a los adaptadores del framework base.
    return bases.has(owner) && file.path.startsWith('adapters/');
  });
}
