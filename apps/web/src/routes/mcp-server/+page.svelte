<!--
  Static content page, deliberately NOT data-driven from registry-data/index.json.
  @modularcore/mcp-server has no modularcore.json (it is an executable npm package, not a
  copy-code component) — see packages/mcp-server/README.md for the source of this content.
-->
<a href="/">&larr; Volver al catálogo</a>

<h1>MCP Server</h1>
<p class="meta">
  <span class="badge">npm</span>
  <span>@modularcore/mcp-server</span>
</p>
<p>
  Servidor <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">MCP (Model
  Context Protocol)</a> que expone la API HTTP del Registry de ModularCore a cualquier cliente MCP
  (Cursor, Claude Code, VS Code, ChatGPT, ...) por <strong>stdio</strong>. Es un adaptador ligero
  sobre <code>@modularcore/registry-client</code> — el mismo registry con el que habla el CLI
  (<code>modularcore</code>), sin backend adicional.
</p>
<p>
  No se instala vía CLI ni como código copiado a tu proyecto: se registra en la configuración de
  tu cliente MCP y se ejecuta bajo demanda con <code>npx</code>.
</p>

<section>
  <h2>Herramientas (tools)</h2>
  <table>
    <thead>
      <tr>
        <th>Tool</th>
        <th>Lee/escribe</th>
        <th>Elicitation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>search_components(query, limit?)</code></td>
        <td>Registry HTTP (solo lectura)</td>
        <td>ninguna</td>
      </tr>
      <tr>
        <td><code>get_component(name)</code></td>
        <td>Registry HTTP (solo lectura)</td>
        <td>ninguna</td>
      </tr>
      <tr>
        <td><code>install_component(name, targetPath, version?)</code></td>
        <td>Registry HTTP + escritura en filesystem local</td>
        <td><strong>requerida</strong></td>
      </tr>
      <tr>
        <td><code>check_updates(installedComponents)</code></td>
        <td>Registry HTTP (solo lectura)</td>
        <td>ninguna</td>
      </tr>
    </tbody>
  </table>
  <p>
    <code>install_component</code> es la única tool que escribe archivos: antes de escribir nada
    envía una petición <code>elicitation/create</code> al cliente MCP conectado mostrando la ruta
    destino resuelta, la versión del componente, qué <code>envVariables</code> son nuevas y qué
    dependencias npm declara el componente. El servidor nunca ejecuta
    <code>npm install</code>/<code>pnpm add</code> por su cuenta — esas dependencias son
    informativas.
  </p>
</section>

<section>
  <h2>Registrar el servidor</h2>
  <p>
    Configuración <code>mcpServers</code> para Cursor, Claude Code, VS Code y otros clientes
    compatibles con MCP:
  </p>
  <pre><code
    >{`{
  "mcpServers": {
    "modularcore": {
      "command": "npx",
      "args": ["-y", "@modularcore/mcp-server"],
      "env": {
        "MODULARCORE_REGISTRY_URL": "https://registry.example.com"
      }
    }
  }
}`}</code
  ></pre>
  <p>
    Apunta <code>MODULARCORE_REGISTRY_URL</code> a tu propio registry hospedado (ver este mismo
    sitio, <code>apps/web</code>, como ejemplo de cómo se genera/sirve uno). Para desarrollo local
    contra un registry en <code>localhost</code>, añade
    <code>"MODULARCORE_REGISTRY_ALLOW_INSECURE": "1"</code> al bloque <code>env</code>.
  </p>
  <p>
    <code>targetPath</code> en <code>install_component</code> se resuelve relativo al directorio
    donde el cliente MCP lanza el servidor (su <code>cwd</code> de proceso) — configura ese
    directorio de trabajo a la raíz de tu proyecto.
  </p>
</section>

<section>
  <h2>Seguridad de la URL del registry</h2>
  <p>
    No hay valor por defecto en producción: el servidor se niega a arrancar sin
    <code>MODULARCORE_REGISTRY_URL</code> configurada. Por defecto se exige <code>https://</code>;
    <code>http://</code> se rechaza salvo que actives explícitamente
    <code>--allow-insecure-registry</code> o <code>MODULARCORE_REGISTRY_ALLOW_INSECURE=1</code>.
  </p>
  <p>
    El texto de <code>title</code>/<code>description</code>/<code>category</code> que devuelven
    <code>search_components</code> y <code>get_component</code> proviene del servidor que apunte
    <code>MODULARCORE_REGISTRY_URL</code> — es contenido externo, no instrucciones. Cada respuesta
    de las tools de solo lectura incluye este mismo aviso como campo <code>notice</code>.
  </p>
</section>

<section>
  <h2>Instalación</h2>
  <pre><code>npx -y @modularcore/mcp-server</code></pre>
  <p>Requiere Node.js 18 o superior.</p>
</section>

<style>
  .meta {
    display: flex;
    gap: 0.75rem;
    color: #555;
    font-size: 0.9rem;
  }
  .badge {
    background: #eee;
    border-radius: 4px;
    padding: 0 0.4rem;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    border: 1px solid #ddd;
    padding: 0.4rem 0.6rem;
    text-align: left;
    vertical-align: top;
  }
  pre {
    background: #f5f5f5;
    padding: 0.75rem;
    border-radius: 6px;
    overflow-x: auto;
  }
</style>
