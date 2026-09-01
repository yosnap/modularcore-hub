#!/usr/bin/env node
// Guardarraíl anti-invención (red-team Finding 3/11): Starlight no valida enlaces de sidebar
// rotos ni comandos/tools inventados por defecto. Este script compara el sidebar declarado en
// astro.config.mjs contra (a) los comandos/tools/playgrounds reales del repo y (b) los ficheros
// de contenido realmente presentes, y falla el build si algo no cuadra.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(here, '..');
const repoRoot = path.resolve(docsRoot, '..', '..');

let failures = [];

// 1. Comandos CLI reales.
const cliCommandsDir = path.join(repoRoot, 'packages/cli/src/commands');
const realCliCommands = readdirSync(cliCommandsDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();
const expectedCliPages = ['init', 'add', 'list', 'search', 'diff', 'update'].sort();
if (JSON.stringify(realCliCommands) !== JSON.stringify(expectedCliPages)) {
  failures.push(
    `Comandos CLI reales (${realCliCommands.join(', ')}) no coinciden con las páginas esperadas (${expectedCliPages.join(', ')}).`,
  );
}
for (const cmd of realCliCommands) {
  const page = path.join(docsRoot, `src/content/docs/referencia/herramientas/cli/${cmd}.md`);
  if (!existsSync(page)) failures.push(`Falta página para el comando CLI real "${cmd}": ${page}`);
}

// 2. Tools MCP reales — leídas de las llamadas register*Tool en index.ts, no adivinadas.
const mcpIndex = readFileSync(path.join(repoRoot, 'packages/mcp-server/src/index.ts'), 'utf8');
const registerCalls = [...mcpIndex.matchAll(/register(\w+)Tool\(/g)].map((m) => m[1]);
const toolSlugMap = {
  SearchComponents: 'search-components',
  GetComponent: 'get-component',
  InstallComponent: 'install-component',
  CheckUpdates: 'check-updates',
};
const expectedToolSlugs = ['search-components', 'get-component', 'install-component', 'check-updates'].sort();
const realToolSlugs = registerCalls.map((name) => toolSlugMap[name]).filter(Boolean).sort();
if (JSON.stringify(realToolSlugs) !== JSON.stringify(expectedToolSlugs)) {
  failures.push(
    `Tools MCP registradas realmente (${realToolSlugs.join(', ')}) no coinciden con las esperadas (${expectedToolSlugs.join(', ')}).`,
  );
}
for (const slug of realToolSlugs) {
  const page = path.join(docsRoot, `src/content/docs/referencia/herramientas/mcp/${slug}.md`);
  if (!existsSync(page)) failures.push(`Falta página para la tool MCP real "${slug}": ${page}`);
}
// Guardarraíl explícito: untrusted-content/tool-error NUNCA como página de tool.
const mcpToolsDir = path.join(docsRoot, 'src/content/docs/referencia/herramientas/mcp');
if (existsSync(mcpToolsDir)) {
  for (const f of readdirSync(mcpToolsDir)) {
    if (/untrusted-content|tool-error/.test(f)) {
      failures.push(`"${f}" documenta un helper interno como si fuera una tool MCP — prohibido.`);
    }
  }
}

// 3. Playgrounds reales.
const playgroundsSrc = readFileSync(path.join(repoRoot, 'apps/web/src/lib/playgrounds.ts'), 'utf8');
const realPlaygrounds = [...playgroundsSrc.matchAll(/component:\s*'([a-z-]+)'/g)]
  .map((m) => m[1])
  .sort();
for (const p of realPlaygrounds) {
  const page = path.join(docsRoot, `src/content/docs/referencia/playground/${p}.md`);
  if (!existsSync(page)) failures.push(`Falta página de playground para "${p}": ${page}`);
}

// 4. Cobertura sidebar -> ficheros: cada slug del sidebar debe tener .md/.mdx real.
const configSrc = readFileSync(path.join(docsRoot, 'astro.config.mjs'), 'utf8');
const sidebarSlugs = [...configSrc.matchAll(/slug:\s*'([a-z0-9/-]+)'/g)].map((m) => m[1]);
for (const slug of sidebarSlugs) {
  // Convención de Astro content collections: un slug de carpeta ("x/y") resuelve tanto a
  // "x/y.md" como a "x/y/index.md" — probar ambos antes de fallar.
  const candidates = [
    path.join(docsRoot, `src/content/docs/${slug}.md`),
    path.join(docsRoot, `src/content/docs/${slug}.mdx`),
    path.join(docsRoot, `src/content/docs/${slug}/index.md`),
    path.join(docsRoot, `src/content/docs/${slug}/index.mdx`),
  ];
  if (!candidates.some(existsSync)) {
    failures.push(`El sidebar referencia "${slug}" pero no existe ninguno de: ${candidates.map((c) => path.relative(docsRoot, c)).join(', ')}`);
  }
}

if (failures.length > 0) {
  console.error('\n[check-coverage] Guardarraíl anti-invención — FALLÓ:\n');
  for (const f of failures) console.error(`  - ${f}`);
  console.error(`\n${failures.length} problema(s). Corrige el sidebar o el contenido antes de construir.\n`);
  process.exit(1);
}

console.log(`[check-coverage] OK — ${sidebarSlugs.length} entradas de sidebar verificadas contra el código real.`);
