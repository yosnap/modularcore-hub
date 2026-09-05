import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Una resolución de conflicto incompleta no rompe nada que el CI mire: el markdown con marcadores
 * sigue siendo markdown válido, `*.md` está en `.prettierignore` y ningún test lee esos ficheros.
 * Así llegó a `develop` una página de la documentación con el conflicto entero dentro, publicada
 * tal cual.
 *
 * Esta prueba recorre el árbol de fuentes y falla si encuentra un marcador al principio de línea.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.turbo',
  '.svelte-kit',
  '.astro',
  'coverage',
  'registry-data',
]);

const SCANNED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.svelte',
  '.astro',
  '.css',
  '.json',
  '.md',
  '.mdx',
  '.yaml',
  '.yml',
];

/**
 * Sólo al principio de línea y con la forma exacta de git. Un `=======` suelto sería un subrayado
 * de markdown perfectamente legítimo, así que se exige el trío completo para acusar a un fichero.
 */
const MARKER_PATTERNS = [/^<<<<<<< /m, /^>>>>>>> /m];

async function collectSourceFiles(directory: string, found: string[] = []): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.changeset') continue;
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      await collectSourceFiles(fullPath, found);
      continue;
    }

    if (SCANNED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      found.push(fullPath);
    }
  }

  return found;
}

describe('marcadores de conflicto de merge', () => {
  it('ningún fichero de fuente conserva un conflicto sin resolver', async () => {
    const files = await collectSourceFiles(repoRoot);
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      // Esta misma prueba contiene los patrones que busca, así que se excluye a sí misma.
      if (file === fileURLToPath(import.meta.url)) continue;

      const contents = await readFile(file, 'utf8');
      if (MARKER_PATTERNS.some((pattern) => pattern.test(contents))) {
        offenders.push(relative(repoRoot, file));
      }
    }

    expect(offenders, 'Ficheros con un conflicto de merge sin resolver:').toEqual([]);
  });
});
