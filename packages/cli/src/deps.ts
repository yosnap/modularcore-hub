import semver from 'semver';

import { CompatibilityError, DependencyCycleError } from './errors.js';

import type { RegistryClient } from './registry-client.js';
import type { RegistryEntry } from '@modularcore/registry';

/**
 * AD2: rejects before any file is written if the project's framework isn't declared
 * by the component, or if an installed peer (React/Svelte/...) doesn't satisfy the
 * semver range the component requires.
 */
export function assertCompatible(
  entry: RegistryEntry,
  projectFramework: string,
  installedPeerVersion: (peerName: string) => string | undefined,
): void {
  if (!entry.frameworks.includes(projectFramework)) {
    throw new CompatibilityError(
      `"${entry.name}" no soporta el framework de este proyecto ("${projectFramework}"). ` +
        `Frameworks soportados: ${entry.frameworks.join(', ')}.`,
    );
  }
  for (const [peerName, range] of Object.entries(entry.peerDependencies)) {
    const installedRange = installedPeerVersion(peerName);
    if (!installedRange) {
      throw new CompatibilityError(
        `"${entry.name}" requiere el peer dependency "${peerName}" (${range}), ` +
          `pero no está declarado en el package.json de este proyecto.`,
      );
    }
    const satisfiable =
      semver.validRange(installedRange) !== null &&
      semver.intersects(installedRange, range, { includePrerelease: true });
    if (!satisfiable) {
      throw new CompatibilityError(
        `"${entry.name}" requiere "${peerName}" ${range}, pero este proyecto declara "${peerName}" ${installedRange}.`,
      );
    }
  }
}

/**
 * Recursively resolves `registryDependencies`, depth-first, detecting cycles explicitly
 * (rather than looping forever or silently dropping the second visit). Returns entries
 * ordered dependencies-first so files can be written in a safe order, deduplicated by name.
 */
export async function resolveRegistryDependencies(
  client: RegistryClient,
  rootName: string,
): Promise<RegistryEntry[]> {
  const resolved = new Map<string, RegistryEntry>();
  const order: string[] = [];

  async function visit(name: string, chain: string[]): Promise<void> {
    if (chain.includes(name)) {
      throw new DependencyCycleError(
        `Ciclo detectado en registryDependencies: ${[...chain, name].join(' -> ')}`,
      );
    }
    if (resolved.has(name)) return;
    const entry = await client.getDescriptor(name);
    for (const dep of entry.registryDependencies) {
      await visit(dep, [...chain, name]);
    }
    if (!resolved.has(name)) {
      resolved.set(name, entry);
      order.push(name);
    }
  }

  await visit(rootName, []);
  return order.map((name) => resolved.get(name)!);
}

export interface NpmDependencySpec {
  name: string;
  version: string;
  raw: string;
}

/**
 * SA2: the descriptor's `dependencies` are plain strings, so a pinned/semver version is
 * enforced by convention (`name@range`) rather than the schema. Rejects bare package
 * names (no `@range`) so `add` never installs an unpinned, unreviewed version.
 */
export function parseNpmDependencySpec(raw: string): NpmDependencySpec {
  const separatorIndex = raw.lastIndexOf('@');
  if (separatorIndex <= 0) {
    throw new CompatibilityError(
      `Dependencia "${raw}" no declara versión pineada/semver (formato esperado "nombre@rango").`,
    );
  }
  const name = raw.slice(0, separatorIndex);
  const version = raw.slice(separatorIndex + 1);
  if (!semver.validRange(version)) {
    throw new CompatibilityError(
      `Dependencia "${raw}" tiene un rango semver inválido: "${version}".`,
    );
  }
  return { name, version, raw };
}

/**
 * SA2 allowlist (single-maintainer MVP): the only "allowlist" that exists is the set of
 * `dependencies` the registry descriptor itself declares — the descriptor is authored and
 * reviewed as part of this monorepo's `packages/*`, so no separate external allowlist file
 * exists yet. The real gate is that `add` never installs anything beyond what the fetched
 * descriptor(s) declare, and always asks for explicit user confirmation before invoking the
 * package manager (see commands/add.ts). This function also fails loudly on a same-name
 * conflicting version range across entries instead of silently picking one.
 */
export function collectNpmDependencies(entries: RegistryEntry[]): NpmDependencySpec[] {
  const byName = new Map<string, NpmDependencySpec>();
  for (const entry of entries) {
    for (const raw of entry.dependencies) {
      const spec = parseNpmDependencySpec(raw);
      const existing = byName.get(spec.name);
      if (existing && existing.version !== spec.version) {
        throw new CompatibilityError(
          `Conflicto de versiones para "${spec.name}": "${existing.version}" vs "${spec.version}" ` +
            `entre componentes resueltos. Resuélvelo manualmente en los descriptores.`,
        );
      }
      byName.set(spec.name, spec);
    }
  }
  return [...byName.values()];
}
