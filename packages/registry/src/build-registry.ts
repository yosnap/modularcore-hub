import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { registryDescriptorSchema } from './schema.zod.js';
import { buildTarball } from './tarball.js';

import type { RegistryDescriptorParsed } from './schema.zod.js';
import type { RegistryEntry, RegistryFileWithContent, RegistryIndexEntry } from './schema.js';

export interface BuildRegistryOptions {
  packagesRoot: string;
  outputDir: string;
}

export interface BuildRegistrySummary {
  outputDir: string;
  publicIndex: RegistryIndexEntry[];
  componentNames: string[];
}

async function findComponentDirs(packagesRoot: string): Promise<string[]> {
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  const dirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const descriptorPath = join(packagesRoot, entry.name, 'modularcore.json');
    try {
      await stat(descriptorPath);
      dirs.push(join(packagesRoot, entry.name));
    } catch {
      // No descriptor in this package: it is a plain package, not a registry component.
    }
  }
  return dirs;
}

async function loadDescriptor(componentDir: string): Promise<RegistryDescriptorParsed> {
  const descriptorPath = join(componentDir, 'modularcore.json');
  const raw = await readFile(descriptorPath, 'utf8');
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${descriptorPath}: ${(error as Error).message}`);
  }
  const parsed = registryDescriptorSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid descriptor ${descriptorPath}: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * SA1: the zod schema already rejects ".." and absolute paths, but a symlink inside the
 * package could still resolve outside it. This resolves the real path and re-asserts
 * containment before any file content is read into the public registry output.
 */
async function assertSafeSourcePath(componentRealDir: string, filePath: string): Promise<string> {
  const candidate = resolve(componentRealDir, filePath);
  let real: string;
  try {
    real = await realpath(candidate);
  } catch (error) {
    throw new Error(`File not found or unreadable: ${candidate} (${(error as Error).message})`);
  }
  const prefix = componentRealDir.endsWith(sep) ? componentRealDir : componentRealDir + sep;
  if (real !== componentRealDir && !real.startsWith(prefix)) {
    throw new Error(`Refusing to read outside package root: "${filePath}" escapes ${componentRealDir}`);
  }
  return real;
}

/**
 * AD3: `encoding` is author-declared, not trusted blindly. If a file is declared `utf8`
 * but its bytes don't round-trip losslessly through UTF-8 (i.e. it's actually binary),
 * `Buffer.toString('utf8')` would silently replace invalid sequences with U+FFFD instead
 * of failing — corrupting the registry output without any build error. Detect that case
 * and fail loud instead of guessing.
 */
function isValidUtf8(buffer: Buffer): boolean {
  return buffer.equals(Buffer.from(buffer.toString('utf8'), 'utf8'));
}

async function readEntryFile(
  componentRealDir: string,
  file: RegistryDescriptorParsed['files'][number],
): Promise<RegistryFileWithContent> {
  const realFilePath = await assertSafeSourcePath(componentRealDir, file.path);
  const buffer = await readFile(realFilePath);
  if (file.encoding === 'utf8' && !isValidUtf8(buffer)) {
    throw new Error(
      `File "${file.path}" is declared encoding:"utf8" but contains binary/invalid UTF-8 content. ` +
        `Declare it as encoding:"base64" in modularcore.json instead.`,
    );
  }
  const content = file.encoding === 'base64' ? buffer.toString('base64') : buffer.toString('utf8');
  return { ...file, content };
}

async function buildEntry(descriptor: RegistryDescriptorParsed, componentDir: string): Promise<RegistryEntry> {
  const componentRealDir = await realpath(componentDir);
  const files: RegistryFileWithContent[] = [];
  for (const file of descriptor.files) {
    files.push(await readEntryFile(componentRealDir, file));
  }
  return { ...descriptor, files };
}

function toIndexEntry(descriptor: RegistryDescriptorParsed): RegistryIndexEntry {
  return {
    name: descriptor.name,
    title: descriptor.title,
    category: descriptor.category,
    version: descriptor.version,
    frameworks: descriptor.frameworks,
    description: descriptor.description,
  };
}

/**
 * FMA6: cross-checks every emitted component (public AND internal — internal entries are
 * still read locally by the inject spike / future CLI dev flows) has a non-empty
 * `{name}.json` and `{name}.tar.gz`.
 */
async function validateBuildOutput(dir: string, componentNames: string[]): Promise<void> {
  for (const name of componentNames) {
    const jsonPath = join(dir, `${name}.json`);
    const tarPath = join(dir, `${name}.tar.gz`);
    const [jsonStat, tarStat] = await Promise.all([stat(jsonPath), stat(tarPath)]);
    if (jsonStat.size === 0) throw new Error(`Post-build validation failed: ${jsonPath} is empty`);
    if (tarStat.size === 0) throw new Error(`Post-build validation failed: ${tarPath} is empty`);
  }
}

/**
 * Scans `packages/*\/modularcore.json`, validates each descriptor, reads its `files[]`
 * content, and emits `index.json` + `{name}.json` + `{name}.tar.gz` per component.
 * `internal` components are built (so the local spike can read them) but excluded from
 * `index.json` (FMA2). Output is staged in a temp dir and moved into place with a single
 * `rename` (FMA6) so partial builds are never visible at `outputDir`.
 */
export async function buildRegistry({ packagesRoot, outputDir }: BuildRegistryOptions): Promise<BuildRegistrySummary> {
  const componentDirs = await findComponentDirs(packagesRoot);
  if (componentDirs.length === 0) {
    throw new Error(`No components with modularcore.json found under ${packagesRoot}`);
  }

  const entries: RegistryEntry[] = [];
  const seenNames = new Set<string>();
  for (const componentDir of componentDirs) {
    const descriptor = await loadDescriptor(componentDir);
    if (seenNames.has(descriptor.name)) {
      throw new Error(`Duplicate component name "${descriptor.name}" across packages/*`);
    }
    seenNames.add(descriptor.name);
    entries.push(await buildEntry(descriptor, componentDir));
  }

  // Stage on the same filesystem/volume as `outputDir` (not the OS tmpdir): the final
  // `rename` must be an atomic same-device move, and cross-device renames (EXDEV) fail
  // outright — a real risk here since the project can live on a different volume than /tmp.
  const outputParent = dirname(outputDir);
  await mkdir(outputParent, { recursive: true });
  const tmpRoot = await mkdtemp(join(outputParent, `.modularcore-registry-${randomUUID()}-`));
  try {
    const publicIndex: RegistryIndexEntry[] = [];
    for (const entry of entries) {
      await writeFile(join(tmpRoot, `${entry.name}.json`), JSON.stringify(entry, null, 2), 'utf8');
      const tarball = await buildTarball(entry.files);
      await writeFile(join(tmpRoot, `${entry.name}.tar.gz`), tarball);
      if (entry.visibility === 'public') {
        publicIndex.push(toIndexEntry(entry));
      }
    }
    await writeFile(join(tmpRoot, 'index.json'), JSON.stringify(publicIndex, null, 2), 'utf8');

    await validateBuildOutput(
      tmpRoot,
      entries.map((entry) => entry.name),
    );

    await rm(outputDir, { recursive: true, force: true });
    await rename(tmpRoot, outputDir);

    return {
      outputDir,
      publicIndex,
      componentNames: entries.map((entry) => entry.name),
    };
  } catch (error) {
    await rm(tmpRoot, { recursive: true, force: true });
    throw error;
  }
}
