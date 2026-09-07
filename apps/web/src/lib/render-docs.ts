/**
 * Renderizador de Markdown para la documentación de un componente.
 *
 * La ficha usaba el de `@modularcore/ai-chat`, que está pensado para mensajes de chat: hace
 * código, negrita, cursiva y enlaces, y convierte cada salto de línea en un `<br>`. Con un
 * documento entero eso deja los `#` y los `-` en crudo y todo se lee con el mismo peso.
 *
 * Todo el texto se escapa **antes** de añadir marcado, y sólo se admiten enlaces http(s) o anclas:
 * la documentación puede venir del README de un componente aportado desde fuera, así que no es
 * contenido de confianza.
 */

const FENCED_CODE_BLOCK = /^```([a-z0-9+-]*)[ \t]*\n([\s\S]*?)^```[ \t]*$/gim;
const INLINE_CODE = /`([^`\n]+)`/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const ITALIC = /(^|[^*])\*([^*\n]+)\*/g;

/**
 * Enlace Markdown. La URL admite paréntesis balanceados —los de una entrada de Wikipedia, por
 * ejemplo— porque cortar en el primero dejaba el `href` truncado y un paréntesis suelto en el
 * texto.
 */
const LINK = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;

/** Marcadores internos: se sustituyen todos de vuelta, nunca deben acabar en la página. */
const codeBlockMarker = (index: number): string => `@@MC-BLOCK-${index}@@`;
const CODE_BLOCK_PATTERN = /@@MC-BLOCK-(\d+)@@/;
const inlineMarker = (index: number): string => `@@MC-INLINE-${index}@@`;
const INLINE_PATTERN = /@@MC-INLINE-(\d+)@@/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sólo http(s) y anclas: un README puede traer `javascript:` o `data:`. */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  return trimmed.startsWith('#') || /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/**
 * Formato dentro de una línea.
 *
 * El código se aparta primero y se devuelve al final: aplicar negrita, cursiva o enlaces sobre su
 * contenido producía marcado entrelazado —un `<em>` abierto dentro de un `<code>` y cerrado dentro
 * del siguiente— en cuanto un fragmento de código llevaba un asterisco.
 */
function renderInline(text: string): string {
  const spans: string[] = [];
  let out = text.replace(INLINE_CODE, (_match, code: string) => {
    spans.push(`<code>${escapeHtml(code)}</code>`);
    return inlineMarker(spans.length - 1);
  });

  out = escapeHtml(out);
  out = out.replace(BOLD, (_match, bold: string) => `<strong>${bold}</strong>`);
  out = out.replace(
    ITALIC,
    (_match, prefix: string, italic: string) => `${prefix}<em>${italic}</em>`,
  );
  out = out.replace(LINK, (_match, label: string, url: string) => {
    const href = safeHref(url);
    // Un enlace relativo a un fichero del repo no lleva a ninguna parte desde la web: se conserva
    // el texto, que es lo informativo, y se descarta el enlace roto.
    return href
      ? `<a href="${href}" rel="noopener noreferrer" target="_blank">${label}</a>`
      : label;
  });

  return out.replace(INLINE_PATTERN, (_match, index: string) => spans[Number(index)] ?? '');
}

interface CodeBlock {
  language: string;
  code: string;
}

interface ListItem {
  text: string;
  depth: number;
}

type Block =
  | { type: 'code'; code: CodeBlock }
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; ordered: boolean; items: ListItem[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'paragraph'; text: string };

const TABLE_ROW = /^\|(.+)\|\s*$/;
const TABLE_DIVIDER = /^\|[\s:|-]+\|\s*$/;

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const codeBlocks: CodeBlock[] = [];

  const withoutCode = markdown.replace(
    FENCED_CODE_BLOCK,
    (_match, language: string, code: string) => {
      codeBlocks.push({ language, code });
      return codeBlockMarker(codeBlocks.length - 1);
    },
  );

  const lines = withoutCode.split('\n');
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: ListItem[] } | null = null;

  const flush = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
    if (list) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items });
      list = null;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    // El marcador puede caer en medio de una línea si la valla no abría al principio: se emite el
    // texto que lo rodea en vez de dejar el marcador a la vista y perder el código.
    const blockMarker = CODE_BLOCK_PATTERN.exec(line);
    if (blockMarker) {
      const before = line.slice(0, blockMarker.index).trim();
      const after = line.slice(blockMarker.index + blockMarker[0].length).trim();
      if (before) paragraph.push(before);
      flush();
      blocks.push({ type: 'code', code: codeBlocks[Number(blockMarker[1])]! });
      if (after) paragraph.push(after);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1]!.length, text: heading[2]! });
      continue;
    }

    // Tabla: cabecera, separador y filas. Sin esto se juntaba todo en un párrafo con las barras.
    if (TABLE_ROW.test(line) && TABLE_DIVIDER.test(lines[index + 1] ?? '')) {
      flush();
      const header = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && TABLE_ROW.test(lines[index]!)) {
        rows.push(splitTableRow(lines[index]!));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const item = /^(\s*)(?:([-*])|(\d+)[.)])\s+(.*)$/.exec(line);
    if (item) {
      const ordered = item[2] === undefined;
      const depth = Math.floor(item[1]!.length / 2);
      if (paragraph.length > 0) flush();
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push({ text: item[4]!, depth });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({ type: 'quote', text: quote[1]! });
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    // Continuación de la línea anterior, que el fichero parte por ancho.
    if (list && list.items.length > 0) {
      list.items[list.items.length - 1]!.text += ` ${line.trim()}`;
      continue;
    }
    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

/** Anida por sangría, para no aplanar la jerarquía de la lista. */
function renderList(items: ListItem[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul';
  let html = `<${tag}>`;
  let depth = 0;

  for (const item of items) {
    while (item.depth > depth) {
      html += `<${tag}>`;
      depth += 1;
    }
    while (item.depth < depth) {
      html += `</${tag}>`;
      depth -= 1;
    }
    html += `<li>${renderInline(item.text)}</li>`;
  }

  while (depth > 0) {
    html += `</${tag}>`;
    depth -= 1;
  }
  return `${html}</${tag}>`;
}

export function renderDocsMarkdown(markdown: string): string {
  // El frontmatter de los ficheros de `apps/docs` no es contenido.
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');

  return toBlocks(body)
    .map((block) => {
      switch (block.type) {
        case 'code': {
          const language = block.code.language
            ? ` class="language-${escapeHtml(block.code.language)}"`
            : '';
          return `<pre><code${language}>${escapeHtml(block.code.code)}</code></pre>`;
        }
        case 'heading':
          return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
        case 'list':
          return renderList(block.items, block.ordered);
        case 'table': {
          const head = block.header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
          const rows = block.rows
            .map(
              (row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`,
            )
            .join('');
          return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
        }
        case 'quote':
          return `<blockquote>${renderInline(block.text)}</blockquote>`;
        default:
          return `<p>${renderInline(block.text)}</p>`;
      }
    })
    .join('\n');
}
