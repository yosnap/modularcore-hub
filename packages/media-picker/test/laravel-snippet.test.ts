import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('Laravel Media Picker snippets', () => {
  it('mounts through the copied Vite entry instead of an unserved inline import', async () => {
    const [blade, entry] = await Promise.all([
      readFile(join(packageRoot, 'snippets/laravel/media-picker.blade.php'), 'utf8'),
      readFile(join(packageRoot, 'snippets/laravel/media-picker-entry.ts'), 'utf8'),
    ]);

    expect(blade).not.toContain('<script type="module">');
    expect(blade).toContain("Import ./modularcore/media-picker/entry from resources/js/app.js");
    expect(entry).toContain("from './core/providers/azure-blob.js'");
  });

  it('inherits Laravel authorization support in the SAS controller', async () => {
    const controller = await readFile(
      join(packageRoot, 'snippets/laravel/azure-blob-sas-controller.php'),
      'utf8',
    );

    expect(controller).toContain('extends Controller');
  });
});
