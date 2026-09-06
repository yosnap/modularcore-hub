import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packagesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export interface WorkspaceDescriptor {
  name: string;
  frameworks: string[];
  files: { path: string; target: string }[];
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
    try {
      const raw = await readFile(join(packageDir, 'modularcore.json'), 'utf8');
      found.push({ packageDir, descriptor: JSON.parse(raw) as WorkspaceDescriptor });
    } catch {
      // Un paquete sin descriptor (registry, cli, mcp-server…) no publica componentes.
    }
  }

  return found;
}
