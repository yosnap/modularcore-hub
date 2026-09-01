#!/usr/bin/env node
// Congela la versión actual de la doc en una carpeta de solo lectura. Disparo manual del usuario
// (nunca desde CI). Endurecido tras red-team: slug validado con allowlist, escritura atómica
// (directorio temporal + rename), versions.json actualizado como última operación.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, cpSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(here, '..');
const contentRoot = path.join(docsRoot, 'src/content/docs');
const versionsPath = path.join(docsRoot, 'versions.json');

// Sin puntos: Astro sanea "." al generar el slug de URL final (verificado empíricamente — un
// directorio "1.0.0-test" se sirve como "/100-test/", rompiendo la navegación en silencio).
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

function abort(message) {
  console.error(`[freeze-version] ${message}`);
  process.exit(1);
}

const slug = process.argv[2];
if (!slug) abort('Uso: node scripts/freeze-version.mjs <slug>  (p.ej. 1.0.0)');
if (!SLUG_RE.test(slug)) {
  abort(`Slug inválido "${slug}" — solo minúsculas, dígitos y "-", máx 32 caracteres, sin empezar por "-". Nada de puntos: usa "v1-0-0" en vez de "1.0.0".`);
}

const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));

if (versions.reservedSlugs?.includes(slug)) {
  abort(`"${slug}" es el nombre de una sección de primer nivel del sidebar — no se puede usar como versión.`);
}
if (versions.archived?.includes(slug)) {
  abort(`La versión "${slug}" ya está archivada.`);
}

const destDir = path.resolve(contentRoot, slug);
// Verificación anti-traversal: el destino resuelto debe seguir bajo contentRoot.
if (!destDir.startsWith(contentRoot + path.sep)) {
  abort(`Slug "${slug}" resuelve fuera de src/content/docs — rechazado.`);
}
if (existsSync(destDir)) abort(`El directorio de destino ya existe: ${destDir}`);

const tmpDir = path.resolve(contentRoot, `.${slug}.tmp`);
if (existsSync(tmpDir)) {
  abort(`Queda un directorio temporal huérfano de un intento anterior: ${tmpDir}. Bórralo manualmente (rm -rf) antes de reintentar.`);
}

// 1. Copiar el árbol actual (excluyendo otras versiones archivadas) al directorio temporal.
mkdirSync(tmpDir, { recursive: true });
const archivedSet = new Set(versions.archived ?? []);
for (const entry of readdirSync(contentRoot)) {
  if (entry.startsWith('.') || archivedSet.has(entry)) continue;
  const src = path.join(contentRoot, entry);
  if (statSync(src).isDirectory() && versions.reservedSlugs?.includes(entry) === false && entry !== path.basename(tmpDir)) {
    // no-op guard, cpSync below handles files/dirs generically
  }
  cpSync(src, path.join(tmpDir, entry), { recursive: true });
}

// 2. Reescribir enlaces internos y frontmatter en las copias (función de reemplazo, nunca $-string).
const rewrittenLinksReport = [];
const unrecognizedLinks = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.mdx?$/.test(entry)) continue;
    let content = readFileSync(full, 'utf8');
    const before = content;

    // Enlaces Markdown absolutos: ](/x -> ](/<slug>/x
    content = content.replace(/\]\((\/[^)\s]*)\)/g, (_match, absPath) => {
      rewrittenLinksReport.push(`${full}: ${absPath} -> /${slug}${absPath}`);
      return `](/${slug}${absPath})`;
    });

    // Frontmatter: inyectar `archived` (esquema extendido en Fase 2), el campo NATIVO
    // `pagefind: false` de Starlight (verificado real en starlight.astro.build/reference/frontmatter/
    // — NO es un campo inventado; una versión anterior de este script usaba `pagefindExclude`, que
    // no existe y no excluía nada, confirmado empíricamente: Pagefind indexó 89/89 páginas hasta
    // corregirlo) y el campo nativo `banner` (tampoco requiere extensión ni componente custom).
    if (content.startsWith('---')) {
      const end = content.indexOf('\n---', 3);
      if (end !== -1) {
        const fm = content.slice(0, end);
        const rest = content.slice(end);
        const parts = [];
        if (!fm.includes('archived:')) parts.push('archived: true');
        if (!fm.includes('pagefind:')) parts.push('pagefind: false');
        if (!fm.includes('banner:')) {
          parts.push(
            `banner:\n  content: 'Documentación archivada de la versión ${slug}. <a href="/">Ver la versión actual</a>.'`,
          );
        }
        const extra = parts.length ? `\n${parts.join('\n')}` : '';
        content = `${fm}${extra}${rest}`;
      }
    }

    // Detectar patrones de enlace no reconocidos (HTML crudo <a href="/...">) para revisión manual.
    for (const m of before.matchAll(/<a\s+href="(\/[^"]*)"/g)) {
      unrecognizedLinks.push(`${full}: <a href="${m[1]}"> (HTML crudo, no reescrito automáticamente)`);
    }

    writeFileSync(full, content, 'utf8');
  }
}
walk(tmpDir);

// 3. Rename atómico: el contenido servible nunca queda a medias.
renameSync(tmpDir, destDir);

// 4. versions.json se actualiza como ÚLTIMA operación, después del rename exitoso.
// Segundo argumento opcional: nueva etiqueta de "current" tras congelar (p.ej. bump manual de versión).
const nextCurrent = process.argv[3];
if (nextCurrent) versions.current = nextCurrent;
versions.archived = [...(versions.archived ?? []), slug];
writeFileSync(versionsPath, `${JSON.stringify(versions, null, 2)}\n`, 'utf8');

console.log(`[freeze-version] Versión "${slug}" congelada en ${destDir}`);
console.log(`[freeze-version] ${rewrittenLinksReport.length} enlace(s) reescrito(s).`);
if (unrecognizedLinks.length > 0) {
  console.warn(`[freeze-version] ${unrecognizedLinks.length} enlace(s) no reconocido(s), revisar a mano:`);
  for (const l of unrecognizedLinks) console.warn(`  - ${l}`);
}
console.log(`[freeze-version] versions.json actualizado. Recuerda: este script no hace commit ni tag — eso es manual.`);
