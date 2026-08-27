import { registryEntrySchema, registryIndexEntrySchema } from '@modularcore/registry';
import { z } from 'zod';

import { RegistryClientError } from './errors.js';

import type { RegistryEntry, RegistryIndexEntry } from '@modularcore/registry';

const registryIndexSchema = z.array(registryIndexEntrySchema);

const NOT_GENERATED_HINT =
  'Corre `pnpm build:registry` en el repo del registry (o verifica `registryUrl`).';

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmedBase}/${path}`;
}

async function fetchJson(url: string, notFoundLabel: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new RegistryClientError(
      `No se pudo conectar con el registry en "${url}": ${(error as Error).message}`,
    );
  }
  if (response.status === 404) {
    throw new RegistryClientError(`${notFoundLabel} (404 en "${url}"). ${NOT_GENERATED_HINT}`);
  }
  if (!response.ok) {
    throw new RegistryClientError(
      `El registry respondió ${response.status} en "${url}". ${NOT_GENERATED_HINT}`,
    );
  }
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RegistryClientError(
      `Respuesta no-JSON del registry en "${url}" (¿registry no generado?). ${NOT_GENERATED_HINT}`,
    );
  }
}

export interface RegistryClient {
  getIndex(): Promise<RegistryIndexEntry[]>;
  getDescriptor(name: string): Promise<RegistryEntry>;
  getTarball(name: string): Promise<Buffer>;
}

export function createRegistryClient(registryUrl: string): RegistryClient {
  return {
    async getIndex() {
      const url = joinUrl(registryUrl, 'index.json');
      const json = await fetchJson(url, 'Índice del registry no encontrado');
      const parsed = registryIndexSchema.safeParse(json);
      if (!parsed.success) {
        throw new RegistryClientError(
          `El índice del registry en "${url}" no tiene el formato esperado: ${parsed.error.message}`,
        );
      }
      return parsed.data;
    },
    async getDescriptor(name: string) {
      const url = joinUrl(registryUrl, `${name}.json`);
      const json = await fetchJson(url, `Componente "${name}" no encontrado en el registry`);
      const parsed = registryEntrySchema.safeParse(json);
      if (!parsed.success) {
        throw new RegistryClientError(
          `El descriptor de "${name}" en "${url}" no es válido: ${parsed.error.message}`,
        );
      }
      return parsed.data;
    },
    async getTarball(name: string) {
      const url = joinUrl(registryUrl, `${name}.tar.gz`);
      let response: Response;
      try {
        response = await fetch(url);
      } catch (error) {
        throw new RegistryClientError(
          `No se pudo conectar con el registry en "${url}": ${(error as Error).message}`,
        );
      }
      if (!response.ok) {
        throw new RegistryClientError(
          `No se pudo descargar el tarball de "${name}" (${response.status} en "${url}"). ${NOT_GENERATED_HINT}`,
        );
      }
      return Buffer.from(await response.arrayBuffer());
    },
  };
}
