import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
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
  '.claude',
  'coverage',
  'registry-data',
]);

/**
 * Planes e informes son documentos de trabajo, y uno que analice un conflicto de merge cita sus
 * marcadores al principio de línea. Escanearlos convertiría ese informe en un fallo de la suite
 * sin que haya ningún conflicto real.
 */
const IGNORED_ROOTS = ['plans'];

/**
 * Incluye lo que se envía al consumidor (`.php` de los snippets de Laravel) y lo que gobierna los
 * builds (`.mjs`, `.html`, workflows): un conflicto sin resolver ahí se publica o rompe el CI
 * igual que el de la página de documentación.
 */
const SCANNED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.svelte',
  '.astro',
  '.php',
  '.html',
  '.css',
  '.json',
  '.md',
  '.mdx',
  '.yaml',
  '.yml',
];

/**
 * Sólo al principio de línea y con la forma exacta de git. Un `=======` suelto sería un subrayado
 * de markdown perfectamente legítimo, así que se exige un marcador de apertura o de cierre para
 * acusar a un fichero.
 */
const MARKER_PATTERNS = [/^<<<<<<< /m, /^>>>>>>> /m];

async function collectSourceFiles(directory: string, found: string[] = []): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      // `.github` y `.changeset` sí se escanean: los workflows y los changesets son fuente.
      if (IGNORED_ROOTS.includes(relative(repoRoot, fullPath))) continue;
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

  it('cubre lo que se publica y lo que gobierna el CI', async () => {
    const scanned = (await collectSourceFiles(repoRoot)).map((file) => relative(repoRoot, file));

    // Snippets que la CLI copia al proyecto del consumidor.
    expect(scanned).toContain(
      join('packages', 'ai-chat', 'snippets', 'laravel', 'ai-chat.blade.php'),
    );
    // Workflows: viven bajo un directorio con punto y aun así son fuente.
    expect(scanned.some((file) => file.startsWith(`.github${sep}`))).toBe(true);
    // Scripts de build fuera de TypeScript.
    expect(scanned).toContain(join('apps', 'web', 'scripts', 'build-registry.mjs'));
    // Y los planes e informes quedan fuera: citan marcadores sin que haya conflicto alguno.
    expect(scanned.some((file) => file.startsWith(`plans${sep}`))).toBe(false);
  });
});
