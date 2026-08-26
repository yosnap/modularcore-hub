import { McpServerConfigError } from './errors.js';

export interface ServerConfig {
  registryUrl: string;
  /**
   * Directory the server treats as "the project" — every tool's `targetPath` argument is
   * resolved (and clamped) relative to this. Defaults to `process.cwd()` (wherever the
   * MCP client launched `npx @modularcore/mcp-server` / configured the server's `cwd`).
   */
  projectRoot: string;
}

const ENV_REGISTRY_URL = 'MODULARCORE_REGISTRY_URL';
const ENV_ALLOW_INSECURE = 'MODULARCORE_REGISTRY_ALLOW_INSECURE';
const FLAG_REGISTRY_URL = '--registry-url';
const FLAG_ALLOW_INSECURE = '--allow-insecure-registry';

/**
 * Resolves `registryUrl` from `MODULARCORE_REGISTRY_URL` (new convention for this package —
 * the CLI has no `process.env` precedent, see `packages/cli/src/config.ts`), with
 * `--registry-url` as an explicit override. There is no production default: an unset value
 * is a configuration error, not a fallback to some hardcoded host (same "no assumed deploy
 * target" posture the CLI already takes for its own `registryUrl`).
 *
 * `https://` is required unless the caller opts in to `http://` via
 * `MODULARCORE_REGISTRY_ALLOW_INSECURE=1` or `--allow-insecure-registry` — this closes the
 * MITM/registry-mirror-spoofing risk flagged in the phase's Security Considerations, since
 * `search_components`/`get_component` output is untrusted content relayed to an LLM.
 */
export function resolveConfig(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const flagUrl = readFlagValue(argv, FLAG_REGISTRY_URL);
  const rawUrl = flagUrl ?? env[ENV_REGISTRY_URL];

  if (!rawUrl || rawUrl.trim().length === 0) {
    throw new McpServerConfigError(
      `No se configuró la URL del registry. Define la variable de entorno "${ENV_REGISTRY_URL}" ` +
        `o pasa el flag "${FLAG_REGISTRY_URL} <url>". No hay una URL de producción por defecto.`,
    );
  }

  const allowInsecure = argv.includes(FLAG_ALLOW_INSECURE) || env[ENV_ALLOW_INSECURE] === '1';

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new McpServerConfigError(`"${rawUrl}" no es una URL válida.`);
  }

  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && allowInsecure)) {
    throw new McpServerConfigError(
      `"${rawUrl}" debe usar https:// (registry HTTP inseguro habilita MITM/spoofing del ` +
        `contenido que las tools de solo-lectura devuelven a un LLM). Si de verdad necesitas ` +
        `http:// en un entorno local/confiable, pasa "${FLAG_ALLOW_INSECURE}" o define ` +
        `"${ENV_ALLOW_INSECURE}=1".`,
    );
  }

  return {
    registryUrl: rawUrl,
    projectRoot: process.cwd(),
  };
}

function readFlagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value) {
    throw new McpServerConfigError(`"${flag}" requiere un valor (ej. "${flag} https://...").`);
  }
  return value;
}
