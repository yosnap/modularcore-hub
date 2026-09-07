/**
 * Renderizador de Markdown para la documentación de un componente.
 *
 * La ficha usaba el de `@modularcore/ai-chat`, que está pensado para mensajes de chat: hace
 * código, negrita, cursiva y enlaces, y convierte cada salto de línea en un `<br>`. Con un README
 * entero eso deja los `#`, los `##` y los `-` en crudo y la página se lee casi como el fichero
 * fuente.
 *
 * Aquí se cubren además títulos, listas, párrafos y citas. Todo el texto se escapa **antes** de
 * añadir marcado: la documentación puede venir del README de un componente aportado por alguien
 * de fuera, así que no es contenido de confianza.
 */

const FENCED_CODE_BLOCK = /```([a-z0-9+-]*)\n([\s\S]*?)```/gi;
const INLINE_CODE = /`([^`\n]+)`/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const ITALIC = /(^|[^*])\*([^*\n]+)\*/g;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Marcador para apartar los bloques de código mientras se procesa el resto del documento. */
const CODE_MARKER = '@@MODULARCORE-CODE-';
const CODE_MARKER_PATTERN = /^@@MODULARCORE-CODE-(\d+)@@$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sólo enlaces http(s) y anclas. Un README puede traer `javascript:` o `data:`, y aquí acabarían
 * en un `href` de nuestra web.
 */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith('#') || /^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

/** Formato dentro de una línea: código, negrita, cursiva y enlaces, sobre texto ya escapado. */
function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(INLINE_CODE, (_m, code: string) => `<code>${code}</code>`);
  out = out.replace(BOLD, (_m, bold: string) => `<strong>${bold}</strong>`);
  out = out.replace(ITALIC, (_m, prefix: string, italic: string) => `${prefix}<em>${italic}</em>`);
  out = out.replace(LINK, (match, label: string, url: string) => {
    const href = safeHref(url);
    // Un enlace relativo a un fichero del repo (`./docs/algo.md`) no lleva a ninguna parte desde
    // la web: se deja el texto, que es lo informativo, sin el enlace roto.
    return href
      ? `<a href="${href}" rel="noopener noreferrer" target="_blank">${label}</a>`
      : label;
  });
  return out;
}

interface Block {
  type: 'code' | 'heading' | 'list' | 'quote' | 'paragraph';
  lines: string[];
  language?: string;
  level?: number;
}

/** Parte el documento en bloques, respetando los bloques de código como texto literal. */
function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const codeBlocks: { language: string; code: string }[] = [];

  const withoutCode = markdown.replace(FENCED_CODE_BLOCK, (_m, language: string, code: string) => {
    codeBlocks.push({ language, code });
    return `${CODE_MARKER}${codeBlocks.length - 1}@@`;
  });

  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = (): void => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', lines: [...paragraph] });
    if (list.length > 0) blocks.push({ type: 'list', lines: [...list] });
    paragraph = [];
    list = [];
  };

  for (const line of withoutCode.split('\n')) {
    const codeMarker = CODE_MARKER_PATTERN.exec(line.trim());
    if (codeMarker) {
      flush();
      const block = codeBlocks[Number(codeMarker[1])]!;
      blocks.push({ type: 'code', lines: [block.code], language: block.language });
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', lines: [heading[2]!], level: heading[1]!.length });
      continue;
    }

    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    if (item) {
      if (paragraph.length > 0) flush();
      list.push(item[1]!);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({ type: 'quote', lines: [quote[1]!] });
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    if (list.length > 0) {
      // Continuación de la línea anterior de la lista, que el README parte por ancho.
      list[list.length - 1] += ` ${line.trim()}`;
      continue;
    }
    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

export function renderDocsMarkdown(markdown: string): string {
  // El frontmatter de los ficheros de `apps/docs` no es contenido.
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');

  return toBlocks(body)
    .map((block) => {
      switch (block.type) {
        case 'code': {
          const language = block.language ? ` class="language-${escapeHtml(block.language)}"` : '';
          return `<pre><code${language}>${escapeHtml(block.lines[0]!)}</code></pre>`;
        }
        case 'heading':
          return `<h${block.level}>${renderInline(block.lines[0]!)}</h${block.level}>`;
        case 'list':
          return `<ul>${block.lines.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`;
        case 'quote':
          return `<blockquote>${renderInline(block.lines[0]!)}</blockquote>`;
        default:
          return `<p>${renderInline(block.lines.join(' '))}</p>`;
      }
    })
    .join('\n');
}
