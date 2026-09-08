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
    // A diferencia de `blade`, `vanilla` sí puede traer UI de referencia propia (DOM imperativo,
    // sin JSX/plantillas) — la trae `auth-kit`. Sin esta extensión, `ui/vanilla/…` se confunde con
    // la presentación «CSS plano» de los demás frameworks y se trata como fichero compartido: se
    // escribía en toda instalación, incluida una de React, arrastrando un adaptador que esa
    // instalación no tiene.
    uiExtension: '.ts',
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

export class FrameworkConflictError extends Error {}

/** `Object.hasOwn` y no un acceso directo: `catalog['constructor']` sería siempre verdadero. */
export function isDefined(catalog: Record<string, FrameworkDefinition>, name: string): boolean {
  return Object.hasOwn(catalog, name);
}

/**
 * Reúne los frameworks de casa con los que declaren los componentes.
 *
 * Las definiciones de casa mandan siempre: un componente no puede redefinir qué es React para
 * todo el catálogo. Entre dos aportadas, en cambio, una discrepancia es un conflicto y se
 * denuncia, porque resolverla por orden de llegada dejaría al perdedor con sus ficheros sin dueño.
 */
export function buildFrameworkCatalog(
  descriptors: DescriptorWithFrameworks[],
): Record<string, FrameworkDefinition> {
  // Sin prototipo: así `catalog['toString']` no devuelve una función heredada y un descriptor no
  // puede colar `constructor` como si fuera un framework definido.
  const catalog: Record<string, FrameworkDefinition> = Object.assign(
    Object.create(null),
    BUILTIN_FRAMEWORKS,
  );
  // Los de casa reservan ya su carpeta: un framework aportado no puede quedarse con `laravel`
  // ni con `astro`, que perderían sus snippets en favor de Blade o de `vanilla`.
  const snippetOwners = new Map<string, string>();
  // Dos frameworks con el mismo marcador de detección hacen que `init` deje de auto-detectar y
  // pregunte siempre; con el mismo peer, `assertCompatible` no sabría a cuál corresponde.
  const markerOwners = new Map<string, string>();
  for (const [name, definition] of Object.entries(BUILTIN_FRAMEWORKS)) {
    snippetOwners.set(definition.snippetDirectory ?? name, name);
    for (const marker of [definition.detect?.npm, definition.detect?.composer, definition.peer]) {
      if (marker) markerOwners.set(marker, name);
    }
  }

  for (const descriptor of descriptors) {
    for (const [name, definition] of Object.entries(descriptor.frameworkDefs ?? {})) {
      // Un componente no redefine uno de casa: la definición de React es la misma para todos.
      if (Object.hasOwn(BUILTIN_FRAMEWORKS, name)) continue;

      const previous = catalog[name];
      if (previous) {
        // Dos componentes definiendo el mismo framework de forma distinta es un conflicto real,
        // no algo que resolver en silencio por orden de llegada: el que pierda vería sus
        // ficheros sin dueño y su UI dada por no cubierta.
        if (JSON.stringify(previous) !== JSON.stringify(definition)) {
          throw new FrameworkConflictError(
            `Dos componentes definen "${name}" de forma distinta. Unifica la definición en ambos descriptores.`,
          );
        }
        continue;
      }

      const directory = definition.snippetDirectory ?? name;
      const owner = snippetOwners.get(directory);
      if (owner) {
        throw new FrameworkConflictError(
          `"${name}" y "${owner}" reclaman los snippets de "${directory}". Cada carpeta de snippets tiene un solo dueño.`,
        );
      }
      snippetOwners.set(directory, name);

      for (const marker of [definition.detect?.npm, definition.detect?.composer, definition.peer]) {
        if (!marker) continue;
        const markerOwner = markerOwners.get(marker);
        // Que un framework use el mismo paquete para detectarse y como peer es lo normal
        // —Solid se reconoce por `solid-js` y lo exige como peer—, así que sólo choca con otros.
        if (markerOwner && markerOwner !== name) {
          throw new FrameworkConflictError(
            `"${name}" y "${markerOwner}" usan ambos "${marker}" para detectarse o como peer. Cada marcador identifica a un solo framework.`,
          );
        }
        markerOwners.set(marker, name);
      }

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
    (framework) => framework !== AGNOSTIC_FRAMEWORK && !isDefined(known, framework),
  );
}
