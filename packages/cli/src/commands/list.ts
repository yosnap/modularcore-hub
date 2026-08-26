import type { RegistryClient } from '@modularcore/registry-client';
import type { RegistryIndexEntry } from '@modularcore/registry';

export async function runList(client: RegistryClient): Promise<RegistryIndexEntry[]> {
  return client.getIndex();
}

export function formatIndexEntries(entries: RegistryIndexEntry[]): string {
  if (entries.length === 0) return '(sin componentes públicos)';
  return entries
    .map((entry) => `${entry.name}@${entry.version}  [${entry.category}]  ${entry.title}`)
    .join('\n');
}
