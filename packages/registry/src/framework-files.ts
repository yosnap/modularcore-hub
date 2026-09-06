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

/**
 * Un snippet toma el nombre del generador al que sirve, no el del eje, porque es código de
 * montaje para esa herramienta concreta.
 */
const SNIPPET_FRAMEWORKS: Record<string, string> = {
  astro: 'vanilla',
  laravel: 'blade',
};

const FRAMEWORK_ROOTS = ['adapters', 'ui'];

/**
 * Frameworks que se apoyan en el binding de otro. Blade no tiene runtime propio en el navegador:
 * sus plantillas montan el mismo código sin framework que usaría una página suelta, y de hecho el
 * snippet de Laravel de `ai-chat` importa `adapters/vanilla` directamente. Un proyecto Blade se
 * lleva por tanto los ficheros `vanilla` además de los suyos.
 */
const FRAMEWORK_BASES: Record<string, string[]> = {
  blade: ['vanilla'],
};

/**
 * El framework al que pertenece un fichero del descriptor, o `null` si sirve a todos.
 *
 * Se lee del `path` —la estructura dentro del paquete— y no del `target`, que para los snippets
 * apunta a un árbol distinto en el proyecto de destino.
 */
export function frameworkOfFile(path: string): string | null {
  const [root, second] = path.split('/');
  if (!root || !second) return null;

  // Con sólo dos segmentos el segundo es el propio fichero (`ui/vanilla-styles.css`), no un
  // directorio de framework. Ojo justamente con ese: es la presentación de estilo «CSS plano»,
  // un eje distinto, y lo comparten las cuatro presentaciones de todos los frameworks.
  if (path.split('/').length < 3) return null;

  if (root === 'snippets') return SNIPPET_FRAMEWORKS[second] ?? null;
  if (FRAMEWORK_ROOTS.includes(root)) {
    return (KNOWN_FRAMEWORKS as readonly string[]).includes(second) ? second : null;
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
): T[] {
  if (framework === AGNOSTIC_FRAMEWORK) return files;
  if (!(KNOWN_FRAMEWORKS as readonly string[]).includes(framework)) return files;

  const served = new Set([framework, ...(FRAMEWORK_BASES[framework] ?? [])]);

  return files.filter((file) => {
    const owner = frameworkOfFile(file.path);
    return owner === null || served.has(owner);
  });
}
