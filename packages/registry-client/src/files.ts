import { resolveWriteTargetPath, writeRegistryEntryFiles } from '@modularcore/registry';

import type { RegistryFileWithContent, WriteResult } from '@modularcore/registry';

/**
 * Anti-path-traversal clamp: resolves a registry file's `target` onto `cwd`, refusing any
 * path that escapes the project root. Callers that remap conventional target prefixes onto
 * project-specific paths (e.g. the CLI's `paths.components`/`paths.lib` from
 * `modularcore.json`) must apply that remap to `fileTarget` themselves before calling this —
 * that remapping is a caller-specific concept this package does not know about.
 */
export function resolveTargetPath(cwd: string, fileTarget: string): string {
  return resolveWriteTargetPath(cwd, fileTarget);
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
