import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { createRegistryClient } from '@modularcore/registry-client';

import { registerCheckUpdatesTool } from '../../src/tools/check-updates.js';
import { registerGetComponentTool } from '../../src/tools/get-component.js';
import { registerInstallComponentTool } from '../../src/tools/install-component.js';
import { registerSearchComponentsTool } from '../../src/tools/search-components.js';

import type { ElicitResult } from '@modelcontextprotocol/sdk/types.js';

export type ElicitationHandler = (message: string) => ElicitResult | Promise<ElicitResult>;

export interface ConnectedTestServer {
  client: Client;
  close(): Promise<void>;
}

/**
 * Wires up a real `McpServer` (all 4 tools registered against `registryUrl`) and a real
 * `Client`, linked via `InMemoryTransport.createLinkedPair()` — no stdio process, no network
 * beyond the caller-supplied `registryUrl` (a local `startTestRegistryServer`/fixture server
 * in every test that uses this).
 *
 * `supportsElicitation: false` mirrors an MCP client that never declared the `elicitation`
 * capability at connect time — distinct from `elicitationHandler` returning a decline.
 */
export async function connectTestServer(options: {
  registryUrl: string;
  projectRoot: string;
  supportsElicitation: boolean;
  elicitationHandler?: ElicitationHandler;
}): Promise<ConnectedTestServer> {
  const registryClient = createRegistryClient(options.registryUrl);
  const server = new McpServer({ name: 'test-server', version: '0.0.0' });
  registerSearchComponentsTool(server, registryClient);
  registerGetComponentTool(server, registryClient);
  registerInstallComponentTool(server, registryClient, options.projectRoot);
  registerCheckUpdatesTool(server, registryClient);

  const client = new Client(
    { name: 'test-client', version: '0.0.0' },
    {
      capabilities: options.supportsElicitation ? { elicitation: { form: {} } } : {},
    },
  );

  if (options.elicitationHandler) {
    const handler = options.elicitationHandler;
    client.setRequestHandler(ElicitRequestSchema, async (request) =>
      handler(request.params.message),
    );
  }

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
