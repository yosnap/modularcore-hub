import { resolveWriteTargetPath, writeRegistryEntryFiles } from '@modularcore/registry';

import type { RegistryFileWithContent, WriteResult } from '@modularcore/registry';

/**
 * Anti-path-traversal clamp: resolves a registry file's `target` onto `cwd`, refusing any
 * path that escapes the project root. Callers that remap conventional target prefixes onto
 * project-specific paths (e.g. `paths.components`/`paths.lib` from `modularcore.json` — see
 * `remapTarget` below) must apply that remap to `fileTarget` themselves before calling this.
 */
export function resolveTargetPath(cwd: string, fileTarget: string): string {
  return resolveWriteTargetPath(cwd, fileTarget);
}

/**
 * Descriptor authors write conventional targets (`src/components/...`, `src/modularcore/...`);
 * every writer (CLI `add`/`diff`/`update`, MCP server `install_component`) must remap those
 * prefixes onto the project's configured `paths` from its `modularcore.json` before calling
 * `resolveTargetPath`/`writeFilesTracked` — otherwise a component installed via one writer
 * lands at a different on-disk path than the same component installed via another (Code Review
 * Finding, Critical: `install_component` previously skipped this entirely, writing to the
 * unremapped default path even in a project whose `modularcore.json` remaps `paths.lib`, so the
 * CLI's own `diff`/`update` afterward couldn't find what MCP had installed). `init`'s defaults
 * make this a no-op unless the project customized `paths`. Any other target is left untouched.
 */
export function remapTarget(target: string, paths: Record<string, string>): string {
  const remaps: Array<[string, string | undefined]> = [
    ['src/components/', paths.components],
    ['src/modularcore/', paths.lib],
  ];
  for (const [prefix, replacement] of remaps) {
    if (replacement && target.startsWith(prefix)) {
      return `${replacement}/${target.slice(prefix.length)}`;
    }
  }
  return target;
}

export interface TrackedWriteError extends Error {
  filesWritten: WriteResult[];
}

export function isTrackedWriteError(error: unknown): error is TrackedWriteError {
  return error instanceof Error && 'filesWritten' in error;
}

/**
 * Writes one file at a time (instead of delegating the whole `files[]` array to
 * `writeRegistryEntryFiles` in one call) so that on failure mid-way (disk full, bad
 * target) the caller can report exactly which files were already written instead of an
 * opaque exception — required by the "add interrumpido deja estado consistente" success
 * criterion. Still reuses `writeRegistryEntryFiles` per file for the clamp+decode logic.
 * `files` targets must already be fully resolved (remapped) by the caller if applicable.
 */
export async function writeFilesTracked(
  files: RegistryFileWithContent[],
  projectRoot: string,
): Promise<WriteResult[]> {
  const written: WriteResult[] = [];
  for (const file of files) {
    try {
      const [result] = await writeRegistryEntryFiles({ files: [file] }, projectRoot);
      if (result) written.push(result);
    } catch (error) {
      const wrapped = new Error(
        `Fallo escribiendo "${file.target}": ${(error as Error).message}`,
      ) as TrackedWriteError;
      wrapped.filesWritten = written;
      throw wrapped;
    }
  }
  return written;
}
