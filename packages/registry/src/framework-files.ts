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
 * Los únicos frameworks con UI de referencia propia. `blade` y `vanilla` se sirven con snippets, y
 * `vanilla` además nombra una presentación de estilo, así que bajo `ui/` nunca es un framework.
 */
const UI_CAPABLE_FRAMEWORKS = ['react', 'svelte', 'vue', 'angular'];

/**
 * Frameworks que se apoyan en el *binding* de otro. Blade no tiene runtime propio en el navegador:
 * sus plantillas montan el mismo código sin framework que usaría una página suelta, y de hecho el
 * snippet de Laravel de `ai-chat` importa `adapters/vanilla` directamente.
 *
 * La herencia alcanza a los adaptadores y no a los snippets: aquéllos son el binding que la
 * plantilla monta, mientras que un snippet es código de montaje para una herramienta concreta.
 * Sin ese límite, un proyecto Laravel se llevaba la isla de Astro, cuyo único punto de entrada
 * escucha `astro:page-load` y no se dispara jamás fuera de Astro.
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

  // `vanilla` nombra dos ejes distintos: un framework (una página sin ninguno) y una presentación
  // de estilo (CSS plano). Bajo `ui/` manda el segundo, así que `ui/vanilla/…` es marcado
  // compartido y no el framework: tratarlo como framework lo borraría de toda instalación de
  // React o Svelte, que es justo donde se usa.
  if (root === 'ui') {
    return UI_CAPABLE_FRAMEWORKS.includes(second) ? second : null;
  }
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

  const bases = new Set(FRAMEWORK_BASES[framework] ?? []);

  return files.filter((file) => {
    const owner = frameworkOfFile(file.path);
    if (owner === null || owner === framework) return true;
    // Lo heredado se limita a los adaptadores del framework base.
    return bases.has(owner) && file.path.startsWith('adapters/');
  });
}
