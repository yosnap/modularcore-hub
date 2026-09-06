/**
 * Qué frameworks existen, y qué sabe el registry de cada uno.
 *
 * Los seis de casa vienen definidos aquí, pero **la lista no es cerrada**: un componente puede
 * traer el suyo en `frameworkDefs` y el registry lo entiende sin que nadie toque este fichero.
 * Alguien que aporte un componente en Solid o Qwik no se topa con una lista blanca que sólo el
 * mantenimiento puede ampliar; la revisión de su PR es el control, no el código.
 *
 * Lo que una definición aporta es lo que el registry y la CLI no pueden adivinar: en qué fichero
 * se escribe su UI, cómo se reconoce un proyecto suyo, y dónde van las cosas al instalar.
 */

export interface FrameworkDefinition {
  /** Nombre para mostrar en el catálogo y en los prompts. */
  title: string;
  /**
   * Extensión de sus componentes de UI (`.tsx`, `.svelte`). Omitida, el framework no tiene UI de
   * referencia propia y se sirve con snippets, como `blade` y `vanilla`.
   */
  uiExtension?: string;
  /** Dependencia que delata un proyecto suyo: `solid-js` para Solid, `react` para React. */
  detect?: { npm?: string; composer?: string };
  /** Peer que `add` exigirá al instalar en un proyecto suyo. */
  peer?: string;
  /** Rutas por defecto que `init` propone. */
  paths?: { components: string; lib: string };
  /**
   * Framework cuyo *binding* hereda. `blade` se apoya en `vanilla` porque sus plantillas montan
   * ese mismo código. Alcanza a `adapters/`, nunca a `snippets/`.
   */
  basedOn?: string;
  /**
   * Directorio bajo `snippets/` que le pertenece, cuando no coincide con su nombre: la isla de
   * Astro vive en `snippets/astro/` y sirve al framework `vanilla`.
   */
  snippetDirectory?: string;
}

/** Los que trae el registry de fábrica. Un componente puede añadir los suyos. */
export const BUILTIN_FRAMEWORKS: Record<string, FrameworkDefinition> = {
  react: {
    title: 'React',
    uiExtension: '.tsx',
    detect: { npm: 'react' },
    peer: 'react',
    paths: { components: 'src/components', lib: 'src/lib/modularcore' },
  },
  svelte: {
    title: 'Svelte',
    uiExtension: '.svelte',
    detect: { npm: 'svelte' },
    peer: 'svelte',
    paths: { components: 'src/components', lib: 'src/lib/modularcore' },
  },
  vue: {
    title: 'Vue',
    uiExtension: '.vue',
    detect: { npm: 'vue' },
    peer: 'vue',
    paths: { components: 'src/components', lib: 'src/lib/modularcore' },
  },
  angular: {
    title: 'Angular',
    uiExtension: '.component.ts',
    detect: { npm: '@angular/core' },
    peer: '@angular/core',
    paths: { components: 'src/components', lib: 'src/lib/modularcore' },
  },
  blade: {
    title: 'Blade',
    detect: { composer: 'laravel/framework' },
    basedOn: 'vanilla',
    snippetDirectory: 'laravel',
    paths: { components: 'resources/views/components', lib: 'resources/js/modularcore' },
  },
  vanilla: {
    title: 'Sin framework (Astro, HTMX, Rails…)',
    detect: { npm: 'astro' },
    snippetDirectory: 'astro',
    paths: { components: 'src/components', lib: 'src/lib/modularcore' },
  },
};

/** Sirve a cualquier proyecto: `assertCompatible` lo trata como comodín. */
export const AGNOSTIC_FRAMEWORK = 'agnostic';

export interface DescriptorWithFrameworks {
  frameworks: string[];
  frameworkDefs?: Record<string, FrameworkDefinition>;
}

/**
 * Reúne los frameworks de casa con los que declaren los componentes.
 *
 * Ante dos definiciones del mismo nombre gana la primera, y las de casa ganan siempre: un
 * componente no puede redefinir qué es React para todo el catálogo. La revisión de la PR es donde
 * se detecta que alguien lo intente.
 */
export function buildFrameworkCatalog(
  descriptors: DescriptorWithFrameworks[],
): Record<string, FrameworkDefinition> {
  const catalog: Record<string, FrameworkDefinition> = { ...BUILTIN_FRAMEWORKS };

  for (const descriptor of descriptors) {
    for (const [name, definition] of Object.entries(descriptor.frameworkDefs ?? {})) {
      if (catalog[name]) continue;
      catalog[name] = definition;
    }
  }

  return catalog;
}

/**
 * Los frameworks que este descriptor puede usar: los de casa más los que él mismo declara. Es lo
 * que necesita el recorte de ficheros para saber que `ui/solid/` es de alguien.
 */
export function frameworksKnownTo(
  descriptor: DescriptorWithFrameworks,
): Record<string, FrameworkDefinition> {
  return buildFrameworkCatalog([descriptor]);
}

/** Frameworks declarados que nadie define: ni de casa, ni en el propio descriptor. */
export function undefinedFrameworks(descriptor: DescriptorWithFrameworks): string[] {
  const known = frameworksKnownTo(descriptor);
  return descriptor.frameworks.filter(
    (framework) => framework !== AGNOSTIC_FRAMEWORK && !known[framework],
  );
}
