import { readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findWorkspaceDescriptors } from './helpers/workspace-descriptors.js';

/**
 * Un descriptor incompleto no rompe nada en el monorepo: el código sigue compilando aquí
 * porque los ficheros existen en disco. El daño aparece en el proyecto de destino, donde la
 * CLI escribe solo lo que el descriptor enumera y el consumidor recibe módulos que importan
 * ficheros que nunca se copiaron.
 *
 * Esta prueba recorre cada `modularcore.json` real del monorepo y comprueba que todo import
 * relativo de un fichero descrito resuelve a otro fichero descrito.
 */
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.svelte', '.js', '.jsx', '.css'];
const IMPORT_PATTERN = /(?:from|import)\s+['"](\.[^'"]+)['"]/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/.*$/gm;

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
    posix.join(target, 'index.ts'),
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
        for (const [, specifier] of contents.matchAll(IMPORT_PATTERN)) {
          if (specifier && !resolves(specifier, file.target, described)) {
            unresolved.push(`${file.path} → ${specifier}`);
          }
        }
      }

      expect(unresolved, `El descriptor de ${descriptor.name} no incluye:`).toEqual([]);
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
  }
});
