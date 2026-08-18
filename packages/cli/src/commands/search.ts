import type { RegistryClient } from '../registry-client.js';
import type { RegistryIndexEntry } from '@modularcore/registry';

export async function runSearch(
  client: RegistryClient,
  query: string,
): Promise<RegistryIndexEntry[]> {
  const index = await client.getIndex();
  const needle = query.toLowerCase();
  return index.filter((entry) =>
    [entry.name, entry.title, entry.category, entry.description ?? '']
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
}
