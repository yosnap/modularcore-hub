/**
 * Qué dependencias npm necesita de verdad lo que se instala.
 *
 * Los ficheros se recortan al framework del proyecto (ver `framework-files.ts`), pero las
 * dependencias no lo hacían: `media-picker` declara `bits-ui` —una librería de componentes que
 * sólo existe para Svelte— y `@radix-ui/*` —sólo para React—, así que instalarlo en un proyecto
 * React metía `bits-ui` en su `package.json` aunque ni un solo fichero de Svelte llegara a
 * escribirse. Y como esos paquetes declaran su framework como peer, la instalación podía fallar
 * con ERESOLVE justo después de que el usuario confirmara.
 *
 * La pertenencia no se declara en el descriptor: se deduce de quién importa qué, que es la
 * verdad, no una etiqueta que alguien tenga que acordarse de mantener.
 */

/** Import de un paquete npm: cualquiera que no empiece por `.` (relativo) ni sea `node:`. */
const BARE_IMPORT_PATTERN = /(?:from|import)\s+['"]([^.'"][^'"]*)['"]/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/.*$/gm;

export interface FileWithContent {
  path: string;
  content: string;
}

/** `@scope/pkg/sub/path` → `@scope/pkg`; `pkg/sub` → `pkg`. */
function packageNameOf(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]!;
}

/** Los ejemplos dentro de un JSDoc importan desde el punto de vista del proyecto de destino. */
function stripComments(source: string): string {
  return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '$1');
}

/** Paquetes npm que estos ficheros importan de forma estática. */
export function npmImportsOf(files: FileWithContent[]): Set<string> {
  const imported = new Set<string>();

  for (const file of files) {
    // Un `@import "tailwindcss"` de una hoja de estilo no es una dependencia npm del componente.
    if (file.path.endsWith('.css')) continue;

    for (const [, specifier] of stripComments(file.content).matchAll(BARE_IMPORT_PATTERN)) {
      if (!specifier || specifier.startsWith('node:')) continue;
      imported.add(packageNameOf(specifier));
    }
  }

  return imported;
}

/**
 * Recorta `dependencies` a las que hacen falta para los ficheros que se van a escribir.
 *
 * Una dependencia que **ningún** fichero del componente importa se conserva: no hay forma de
 * saber a quién sirve —puede cargarse dinámicamente, o ser una herramienta— y quitarla rompería
 * la instalación. Ante la duda, sobra una dependencia antes que falte una, igual que con los
 * ficheros.
 *
 * @param dependencies Las declaradas por el componente, con su rango (`bits-ui@^2.18.2`).
 * @param selected Los ficheros que se van a escribir, ya recortados al framework del proyecto.
 * @param all Todos los ficheros del componente, para distinguir «de otro framework» de «de nadie».
 */
export function dependenciesForFiles(
  dependencies: string[],
  selected: FileWithContent[],
  all: FileWithContent[],
): string[] {
  const neededHere = npmImportsOf(selected);
  const usedAnywhere = npmImportsOf(all);

  return dependencies.filter((dependency) => {
    const name = dependencyNameOf(dependency);
    return neededHere.has(name) || !usedAnywhere.has(name);
  });
}

/** `bits-ui@^2.18.2` → `bits-ui`; `@radix-ui/react-toggle@^1.1.18` → `@radix-ui/react-toggle`. */
export function dependencyNameOf(dependency: string): string {
  const at = dependency.lastIndexOf('@');
  return at > 0 ? dependency.slice(0, at) : dependency;
}
