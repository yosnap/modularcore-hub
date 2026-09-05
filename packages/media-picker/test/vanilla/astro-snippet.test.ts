import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const snippetPath = join(packageRoot, 'snippets/astro/media-picker-island.ts');

/**
 * El snippet se copia tal cual en proyectos ajenos, así que estas comprobaciones cubren los
 * fallos que solo aparecen navegando por una web ya publicada y que ninguna prueba unitaria
 * del núcleo puede ver.
 */
describe('snippet de montaje para Astro', () => {
  it('monta en astro:page-load, no solo al cargar el módulo', async () => {
    // Astro no vuelve a ejecutar un módulo ya cargado tras una navegación con View
    // Transitions: montar solo al cargar dejaría el picker muerto al volver a la página.
    const source = await readFile(snippetPath, 'utf8');

    expect(source).toContain("document.addEventListener('astro:page-load', mountMediaPickers)");
  });

  it('se limpia en astro:before-swap para no dejar oyentes sobre nodos que se van', async () => {
    const source = await readFile(snippetPath, 'utf8');

    expect(source).toContain("'astro:before-swap'");
    expect(source).toContain('store.destroy()');
  });

  it('no vuelve a montar un nodo ya montado', async () => {
    // Montar dos veces engancharía un segundo listener de `change` y cada selección subiría
    // el archivo por duplicado.
    const source = await readFile(snippetPath, 'utf8');

    expect(source).toMatch(/if \(root\.dataset\[MOUNTED\] === 'true'\) return null;/);
  });

  it('captura el fallo de subida en lugar de dejar la promesa sin gestionar', async () => {
    // `upload` relanza tras registrar el error en el estado; sin captura, un endpoint de firma
    // caído llena la consola del proyecto con un unhandledrejection.
    const source = await readFile(snippetPath, 'utf8');

    expect(source).toMatch(/try \{\s*await store\.upload\(provider\);\s*\} catch \{/);
  });

  it('vacía el input antes de subir para permitir reintentar con el mismo archivo', async () => {
    const source = await readFile(snippetPath, 'utf8');

    expect(source).toContain("fileInput.value = ''");
  });
});
