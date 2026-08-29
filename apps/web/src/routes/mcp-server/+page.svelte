<script lang="ts">
  import { onMount } from 'svelte';

  let registryUrl = $state('https://tu-dominio.example/registry');

  onMount(() => {
    registryUrl = `${window.location.origin}/registry`;
  });

  let sharedConfig = $derived(`{
  "mcpServers": {
    "modularcore": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modularcore/mcp-server@0.3.1"],
      "env": {
        "MODULARCORE_REGISTRY_URL": "${registryUrl}"
      }
    }
  }
}`);
</script>

<h1>MCP Server</h1>
<p class="meta"><span class="badge">npm</span><span>@modularcore/mcp-server@0.3.1</span></p>
<p>
  El servidor MCP conecta Cursor, Claude Code, VS Code y otros clientes al registry de
  ModularCore. Es un proceso local por <strong>stdio</strong>: el cliente lo inicia con
  <code>npx</code> cuando lo necesita. No es el CLI y no se ejecuta manualmente para instalar
  componentes.
</p>

<section>
  <h2>Antes de configurarlo</h2>
  <ol>
    <li>Usa Node.js 18 o superior.</li>
    <li>Abre tu proyecto en el cliente MCP; el servidor escribirá únicamente bajo esa raíz.</li>
    <li>Comprueba que <a href="/registry/index.json">{registryUrl}/index.json</a> devuelve JSON.</li>
  </ol>
</section>

<section>
  <h2>Cursor</h2>
  <p>Crea <code>.cursor/mcp.json</code> dentro del proyecto:</p>
  <pre><code>{sharedConfig}</code></pre>
  <p>
    El servidor resuelve las escrituras desde el directorio de trabajo que Cursor le entrega. No
    uses una configuración global para instalar componentes: puede no apuntar al repositorio abierto.
  </p>
</section>

<section>
  <h2>Claude Code</h2>
  <p>Desde la raíz del proyecto, registra una configuración local:</p>
  <pre><code>{`claude mcp add --transport stdio modularcore \\
  --env MODULARCORE_REGISTRY_URL=${registryUrl} \\
  -- npx -y @modularcore/mcp-server@0.3.1`}</code></pre>
  <p>
    Usa <code>--scope project</code> si quieres compartir la configuración en
    <code>.mcp.json</code>. Revisa su contenido antes de versionarlo.
  </p>
</section>

<section>
  <h2>VS Code</h2>
  <p>Crea <code>.vscode/mcp.json</code> para la configuración del workspace:</p>
  <pre><code>{`{
  "servers": {
    "modularcore": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modularcore/mcp-server@0.3.1"],
      "cwd": "${'${workspaceFolder}'}",
      "env": {
        "MODULARCORE_REGISTRY_URL": "${registryUrl}"
      }
    }
  }
}`}</code></pre>
  <p>
    <code>.mcp.json</code> en la raíz se reserva para configuraciones portables de Agent Host; no
    es el archivo de configuración de workspace de VS Code.
  </p>
</section>

<section>
  <h2>Clientes compatibles</h2>
  <p>Configura un servidor <code>stdio</code> con <code>npx</code>, los argumentos del ejemplo y la variable de entorno del registry. El directorio de trabajo debe ser la raíz de tu proyecto.</p>
</section>

<section>
  <h2>Qué puede hacer</h2>
  <table>
    <thead><tr><th>Tool</th><th>Acción</th></tr></thead>
    <tbody>
      <tr><td><code>search_components</code></td><td>Busca en el registry (solo lectura).</td></tr>
      <tr><td><code>get_component</code></td><td>Consulta archivos, versión y dependencias (solo lectura).</td></tr>
      <tr><td><code>check_updates</code></td><td>Comprueba componentes instalados (solo lectura).</td></tr>
      <tr><td><code>install_component</code></td><td>Solicita confirmación y solo después escribe archivos bajo el proyecto.</td></tr>
    </tbody>
  </table>
  <p>
    <code>install_component</code> requiere que el cliente soporte <em>elicitation</em>. Si no lo
    soporta, la instalación falla sin escribir nada; buscar y consultar siguen funcionando. El
    servidor nunca ejecuta <code>npm install</code> ni <code>pnpm add</code> por su cuenta.
  </p>
</section>

<section>
  <h2>Seguridad</h2>
  <p>
    En producción la URL debe usar HTTPS. Para desarrollo local, añade
    <code>MODULARCORE_REGISTRY_ALLOW_INSECURE=1</code> solo si controlas la red y usas un registry
    HTTP local.
  </p>
</section>

<style>
  section {
    margin-top: 2rem;
  }
  .meta {
    display: flex;
    gap: 0.75rem;
    color: hsl(var(--muted-foreground));
    font-size: 0.9rem;
  }
  .badge {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
    border-radius: 4px;
    padding: 0 0.4rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--ui-glass-border);
    text-align: left;
    vertical-align: top;
  }
</style>
