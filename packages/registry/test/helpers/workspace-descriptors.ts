import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { UiCoverage } from '../../src/ui-coverage.js';

const packagesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export interface WorkspaceDescriptor {
  name: string;
  frameworks: string[];
  /** Cobertura de la UI de referencia por framework — ver `src/ui-coverage.ts`. */
  ui?: Record<string, UiCoverage>;
  files: { path: string; target: string }[];
  dependencies: string[];
  peerDependencies: Record<string, string>;
}

export interface FoundDescriptor {
  packageDir: string;
  descriptor: WorkspaceDescriptor;
}

/** Recorre los `modularcore.json` reales del monorepo. Un paquete sin descriptor no publica componentes. */
export async function findWorkspaceDescriptors(): Promise<FoundDescriptor[]> {
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  const found: FoundDescriptor[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageDir = join(packagesRoot, entry.name);

    let raw: string;
    try {
      raw = await readFile(join(packageDir, 'modularcore.json'), 'utf8');
    } catch (error) {
      // Un paquete sin descriptor (registry, cli, mcp-server…) no publica componentes: ese es
      // el único motivo aceptable para saltárselo. Cualquier otro error se propaga, porque
      // tragarlo dejaría el paquete sin validar para siempre y en silencio.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }

    // Un JSON mal formado rompe la prueba en lugar de excluir el paquete de la validación.
    found.push({ packageDir, descriptor: JSON.parse(raw) as WorkspaceDescriptor });
  }

  return found;
}
