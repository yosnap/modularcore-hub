import {
  frameworkCatalogSchema,
  registryEntrySchema,
  registryIndexEntrySchema,
} from '@modularcore/registry';
import { z } from 'zod';

import { RegistryClientError } from './errors.js';

import type { FrameworkDefinition, RegistryEntry, RegistryIndexEntry } from '@modularcore/registry';

const registryIndexSchema = z.array(registryIndexEntrySchema);

const NOT_GENERATED_HINT =
  'Corre `pnpm build:registry` en el repo del registry (o verifica `registryUrl`).';

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmedBase}/${path}`;
}

/**
 * Un host que descarta paquetes en vez de rechazar la conexión —una VPN, un cortafuegos— deja el
 * `fetch` colgado para siempre. Con esto, `init` cae a los frameworks de casa en vez de quedarse
 * esperando sin forma de saltárselo.
 */
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchJson(url: string, notFoundLabel: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
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
  /**
   * Catálogo de frameworks del registry: los de casa más los que aporte cualquier componente.
   * Es lo que permite a `init` ofrecer y detectar un framework que ningún código nuestro conoce.
   */
  getFrameworkCatalog(): Promise<Record<string, FrameworkDefinition>>;
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
    async getFrameworkCatalog() {
      const url = joinUrl(registryUrl, 'frameworks.json');
      const json = await fetchJson(url, 'Catálogo de frameworks no encontrado');
      const parsed = frameworkCatalogSchema.safeParse(json);
      if (!parsed.success) {
        throw new RegistryClientError(
          `El catálogo de frameworks en "${url}" no tiene el formato esperado: ${parsed.error.message}`,
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
