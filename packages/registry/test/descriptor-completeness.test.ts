import { readFile, readdir } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { selectFilesForFramework } from '../src/framework-files.js';
import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

/**
 * Un descriptor incompleto no rompe nada en el monorepo: el código sigue compilando aquí
 * porque los ficheros existen en disco. El daño aparece en el proyecto de destino, donde la
 * CLI escribe solo lo que el descriptor enumera y el consumidor recibe módulos que importan
 * ficheros que nunca se copiaron.
 *
 * Se comprueban dos direcciones, porque cada una atrapa un fallo distinto:
 *
 * 1. Descrito → descrito: todo import relativo resuelve a otro fichero incluido. Detecta el
 *    fichero que se olvidó al añadir un módulo nuevo.
 * 2. Paquete → descrito: todo fuente publicable aparece en el descriptor. Detecta la carpeta
 *    entera que se quedó fuera sin que nadie la importara desde los ficheros ya incluidos —el
 *    caso de una presentación de estilo completa.
 */
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.svelte', '.js', '.jsx', '.vue', '.css', '.php'];

/** Carpetas que un componente publica; el resto del paquete es andamiaje del monorepo. */
const PUBLISHABLE_DIRS = ['core', 'adapters', 'ui', 'snippets', 'safe'];

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;
const CSS_IMPORT_PATTERN = /@import\s+(?:url\()?\s*['"](\.[^'"]+)['"]/g;

/**
 * Solo imports estáticos: un `await import('x')` dentro de un try/catch es una carga opcional
 * por diseño —`core/sources.ts` lo hace con `undici` y documenta por qué no debe declararse— y
 * su ausencia no rompe la compilación del proyecto de destino.
 */
const BARE_IMPORT_PATTERN = /(?:from|import)\s+['"]([^.'"][^'"]*)['"]/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:'"\w])\/\/[^\n]*/g;

/** `nombre@rango` → `nombre`, respetando los paquetes con ámbito (`@scope/nombre@rango`). */
function dependencyName(spec: string): string {
  const separator = spec.lastIndexOf('@');
  return separator > 0 ? spec.slice(0, separator) : spec;
}

/** `@scope/paquete/sub/ruta` → `@scope/paquete`; `paquete/sub` → `paquete`. */
function packageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] ?? specifier);
}

/** Todo fuente que el paquete publica, mire o no el descriptor. */
async function collectSourceFiles(packageDir: string): Promise<string[]> {
  const collected: string[] = [];

  for (const dir of PUBLISHABLE_DIRS) {
    const root = join(packageDir, dir);
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true, recursive: true });
    } catch {
      continue; // El paquete no publica esa carpeta.
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const absolute = join(entry.parentPath ?? root, entry.name);
      const path = relative(packageDir, absolute).split(sep).join('/');
      if (SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension))) collected.push(path);
    }
  }

  return collected;
}

/**
 * Los ejemplos de uso dentro de un JSDoc contienen imports escritos desde el punto de vista
 * del proyecto de destino, no del fichero que los documenta; tomarlos por imports reales daría
 * un fallo falso.
 */
function stripComments(source: string): string {
  return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '$1');
}

/** Resuelve un import relativo igual que lo haría el bundler del proyecto destino. */
function resolves(specifier: string, fromPath: string, described: Set<string>): boolean {
  const target = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
  const withoutJs = target.endsWith('.js') ? target.slice(0, -'.js'.length) : target;

  const candidates = [
    target,
    ...SOURCE_EXTENSIONS.map((extension) => `${withoutJs}${extension}`),
    `${withoutJs}.svelte.ts`,
    ...SOURCE_EXTENSIONS.map((extension) => posix.join(target, `index${extension}`)),
  ];

  return candidates.some((candidate) => described.has(candidate));
}

describe('integridad de los descriptores de componentes', async () => {
  const descriptors = await findWorkspaceDescriptors();

  it('encuentra al menos un componente que validar', () => {
    expect(descriptors.length).toBeGreaterThan(0);
  });

  for (const { packageDir, descriptor } of descriptors) {
    it(`${descriptor.name}: todo import relativo apunta a un fichero incluido`, async () => {
      // Se resuelve contra `target`: es la ruta que el fichero tendrá en el proyecto de
      // destino, y algunos ficheros (los snippets de Laravel, por ejemplo) se escriben en un
      // árbol distinto al que ocupan dentro del paquete.
      const described = new Set(descriptor.files.map((file) => file.target));
      const unresolved: string[] = [];

      for (const file of descriptor.files) {
        if (!SOURCE_EXTENSIONS.some((extension) => file.path.endsWith(extension))) continue;

        const contents = stripComments(await readFile(join(packageDir, file.path), 'utf8'));
        const specifiers = [
          ...contents.matchAll(IMPORT_PATTERN),
          ...contents.matchAll(CSS_IMPORT_PATTERN),
        ];

        for (const [, specifier] of specifiers) {
          if (specifier && !resolves(specifier, file.target, described)) {
            unresolved.push(`${file.path} → ${specifier}`);
          }
        }
      }

      expect(unresolved, `El descriptor de ${descriptor.name} no incluye:`).toEqual([]);
    });

    it(`${descriptor.name}: lo que se instala por framework se sostiene solo`, async () => {
      // `add` no escribe el descriptor entero, sino el recorte del framework del proyecto. Ese
      // recorte tiene que seguir cerrado: si deja fuera un fichero que otro del lote importa, la
      // instalación queda rota igual que cuando el descriptor estaba incompleto, sólo que ahora
      // por exceso de celo al filtrar.
      const broken: string[] = [];

      for (const framework of descriptor.frameworks) {
        const selected = selectFilesForFramework(descriptor.files, framework);
        const reachable = new Set(selected.map((file) => file.target));

        for (const file of selected) {
          if (!SOURCE_EXTENSIONS.some((extension) => file.path.endsWith(extension))) continue;

          const contents = stripComments(await readFile(join(packageDir, file.path), 'utf8'));
          for (const [, specifier] of contents.matchAll(IMPORT_PATTERN)) {
            if (specifier && !resolves(specifier, file.target, reachable)) {
              broken.push(`[${framework}] ${file.path} → ${specifier}`);
            }
          }
        }
      }

      expect(broken, `El recorte por framework de ${descriptor.name} rompe imports:`).toEqual([]);
    });

    it(`${descriptor.name}: los ficheros descritos existen en el paquete`, async () => {
      const missing: string[] = [];

      for (const file of descriptor.files) {
        try {
          await readFile(join(packageDir, file.path));
        } catch {
          missing.push(file.path);
        }
      }

      expect(missing, `${descriptor.name} describe ficheros inexistentes:`).toEqual([]);
    });

    it(`${descriptor.name}: declara todo paquete npm que importa el código entregado`, async () => {
      // Entregar un fichero que importa un paquete no declarado deja al consumidor con el
      // mismo síntoma que un fichero ausente: la instalación no compila.
      const declared = new Set([
        ...descriptor.dependencies.map(dependencyName),
        ...Object.keys(descriptor.peerDependencies),
      ]);
      const undeclared = new Map<string, string>();

      for (const file of descriptor.files) {
        if (!SOURCE_EXTENSIONS.some((extension) => file.path.endsWith(extension))) continue;

        const contents = stripComments(await readFile(join(packageDir, file.path), 'utf8'));
        for (const [, specifier] of contents.matchAll(BARE_IMPORT_PATTERN)) {
          if (!specifier || specifier.startsWith('node:')) continue;
          const name = packageName(specifier);
          if (!declared.has(name) && !undeclared.has(name)) undeclared.set(name, file.path);
        }
      }

      expect(
        [...undeclared].map(([name, file]) => `${name} (usado en ${file})`),
        `${descriptor.name} no declara:`,
      ).toEqual([]);
    });

    it(`${descriptor.name}: ningún fuente publicable queda fuera del descriptor`, async () => {
      const described = new Set(descriptor.files.map((file) => file.path));
      const undelivered = (await collectSourceFiles(packageDir)).filter(
        (path) => !described.has(path),
      );

      expect(undelivered, `${descriptor.name} no entrega:`).toEqual([]);
    });
  }
});
