import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface TmpProject {
  dir: string;
  cleanup(): Promise<void>;
}

export async function createTmpProject(options?: {
  files?: Record<string, string>;
}): Promise<TmpProject> {
  const dir = await mkdtemp(join(tmpdir(), 'modularcore-mcp-server-test-'));
  for (const [relativePath, content] of Object.entries(options?.files ?? {})) {
    const fullPath = join(dir, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf8');
  }
  return {
    dir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
