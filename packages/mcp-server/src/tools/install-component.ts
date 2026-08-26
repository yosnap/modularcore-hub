import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import {
  isTrackedWriteError,
  remapTarget,
  resolveTargetPath,
  writeFilesTracked,
} from '@modularcore/registry-client';

import { toolError } from './tool-error.js';
import { UNTRUSTED_CONTENT_NOTICE } from './untrusted-content.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegistryClient, RegistryEntry } from '@modularcore/registry-client';

type EnvVariableDescriptor = RegistryEntry['envVariables'][number];

const inputSchema = {
  name: z.string().min(1).describe('Exact component name (kebab-case) to install.'),
  targetPath: z
    .string()
    .min(1)
    .describe(
      "Path, relative to the server's project root (its process cwd), where the component " +
        'should be installed. Must not be absolute and must not contain "..".',
    ),
  version: z
    .string()
    .optional()
    .describe(
      'Expected version to install. The registry only serves the current published version ' +
        'per component (no historical versions), so this is validated against — not used to ' +
        'select — the fetched descriptor; a mismatch fails the tool call before elicitation.',
    ),
};

const ENV_EXAMPLE_FILENAME = '.env.example';
const ENV_KEY_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)=/;

function parseExistingEnvKeys(envExampleContent: string): Set<string> {
  const keys = new Set<string>();
  for (const line of envExampleContent.split(/\r?\n/)) {
    const match = ENV_KEY_PATTERN.exec(line.trim());
    if (match?.[1]) keys.add(match[1]);
  }
  return keys;
}

/**
 * Reads `.env.example` from `projectRoot` if present, for the elicitation preview's "which
 * envVariables are new" computation. The path MUST go through `resolveTargetPath` — same
 * clamp used for writes — before any `readFile` call (Red-team #8): a `targetPath` that
 * escaped its intended sandbox must not be able to read arbitrary files either, not just be
 * blocked from writing them.
 */
/**
 * Reads `paths.*` from `projectRoot`'s `modularcore.json` (`init`'s output) if present, so
 * `install_component` can `remapTarget` its files the same way the CLI's `add` does (Code
 * Review Finding, Critical: without this, a component installed via MCP landed at a different
 * on-disk path than the same component installed via the CLI in the same project, and the
 * CLI's `diff`/`update` afterward couldn't find what MCP had written). Tolerant of a missing or
 * malformed file — unlike the CLI's `readProjectConfig`, MCP installs don't require a prior
 * `modularcore init`; an absent/invalid config just means no remap (targets used as-is).
 */
async function readConfiguredPaths(projectRoot: string): Promise<Record<string, string>> {
  try {
    const raw = await readFile(join(projectRoot, 'modularcore.json'), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const paths = (parsed as { paths?: unknown } | null)?.paths;
    if (paths === null || typeof paths !== 'object') return {};
    return paths as Record<string, string>;
  } catch {
    return {};
  }
}

async function readExistingEnvKeys(projectRoot: string): Promise<Set<string>> {
  const envExamplePath = resolveTargetPath(projectRoot, ENV_EXAMPLE_FILENAME);
  try {
    const content = await readFile(envExamplePath, 'utf8');
    return parseExistingEnvKeys(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }
}

export function registerInstallComponentTool(
  server: McpServer,
  client: RegistryClient,
  serverProjectRoot: string,
): void {
  server.registerTool(
    'install_component',
    {
      title: 'Install component',
      description:
        "DESTRUCTIVE: writes/overwrites files under targetPath in the caller's project. " +
        'Always requires an MCP elicitation confirmation (destination path, version, new ' +
        'envVariables, npm dependencies) before writing anything — if the connected MCP ' +
        'client does not support elicitation, or the user declines, no file is written and a ' +
        'clear error is returned instead. Does not run `npm install`/equivalent; the ' +
        '"dependencies" it reports must be installed by the caller separately. ' +
        UNTRUSTED_CONTENT_NOTICE,
      inputSchema,
    },
    async ({ name, targetPath, version }) => {
      let projectRoot: string;
      try {
        // Clamps `targetPath` itself to the server's project root — an LLM-supplied
        // `targetPath` of "../../etc" must not resolve outside `serverProjectRoot`.
        projectRoot = resolveTargetPath(serverProjectRoot, targetPath);
      } catch (error) {
        return toolError(error);
      }

      let descriptor: RegistryEntry;
      try {
        descriptor = await client.getDescriptor(name);
      } catch (error) {
        return toolError(error);
      }

      if (version !== undefined && version !== descriptor.version) {
        return toolError(
          new Error(
            `Se pidió instalar "${name}@${version}" pero el registry solo sirve la versión ` +
              `actual "${descriptor.version}" (no hay versiones históricas disponibles).`,
          ),
        );
      }

      let newEnvVariables: EnvVariableDescriptor[];
      try {
        const existingKeys = await readExistingEnvKeys(projectRoot);
        newEnvVariables = descriptor.envVariables.filter((env) => !existingKeys.has(env.key));
      } catch (error) {
        return toolError(error);
      }

      // Remap conventional descriptor targets onto this project's configured `paths` — same
      // remap the CLI's `add` applies — computed once and reused for both the elicitation
      // preview and the actual write, so what the user is shown is exactly what gets written.
      const configuredPaths = await readConfiguredPaths(projectRoot);
      const remappedFiles = descriptor.files.map((file) => ({
        ...file,
        target: remapTarget(file.target, configuredPaths),
      }));

      const elicitationSummary = {
        component: descriptor.name,
        version: descriptor.version,
        destination: projectRoot,
        filesToWrite: remappedFiles.map((file) => file.target),
        newEnvVariables: newEnvVariables.map((env) => env.key),
        npmDependenciesNotInstalledAutomatically: descriptor.dependencies,
      };

      let elicited: Awaited<ReturnType<typeof server.server.elicitInput>>;
      try {
        elicited = await server.server.elicitInput({
          message:
            `Install "${descriptor.name}@${descriptor.version}" into "${projectRoot}"? This ` +
            `will write ${descriptor.files.length} file(s), add ${newEnvVariables.length} new ` +
            `env variable(s) to consider, and lists ${descriptor.dependencies.length} npm ` +
            'dependency(ies) you will need to install yourself. Details: ' +
            JSON.stringify(elicitationSummary),
          requestedSchema: {
            type: 'object',
            properties: {
              confirm: {
                type: 'boolean',
                description: 'Set true to proceed with writing files, false to cancel.',
              },
            },
            required: ['confirm'],
          },
        });
      } catch (error) {
        // The SDK's `elicitInput` throws synchronously (before any network round-trip) when
        // the connected client's capabilities don't declare elicitation support — distinct
        // from a user explicitly declining below. No write happens in either case.
        return toolError(
          new Error(
            `El cliente MCP conectado no soporta elicitation, así que install_component no ` +
              `puede pedir confirmación y se cancela sin escribir nada. Detalle: ${
                (error as Error).message
              }`,
          ),
        );
      }

      if (elicited.action !== 'accept' || elicited.content?.confirm !== true) {
        return toolError(
          new Error(
            `Instalación de "${descriptor.name}" cancelada (acción del cliente: "${elicited.action}"). ` +
              'No se escribió ningún archivo.',
          ),
        );
      }

      try {
        const written = await writeFilesTracked(remappedFiles, projectRoot);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  installed: descriptor.name,
                  version: descriptor.version,
                  filesWritten: written,
                  newEnvVariables,
                  npmDependenciesNotInstalledAutomatically: descriptor.dependencies,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const partial = isTrackedWriteError(error) ? error.filesWritten : [];
        return toolError(
          new Error(
            `${(error as Error).message} (${partial.length} archivo(s) ya escritos antes del fallo: ` +
              `${partial.map((result) => result.target).join(', ') || 'ninguno'})`,
          ),
        );
      }
    },
  );
}
