/**
 * Minimal, dependency-free Markdown -> HTML renderer for LLM output, which is untrusted content
 * (it can echo user/document text, including attempted HTML/script injection). Every code path
 * escapes HTML *before* any formatting markup is added, so the model can never smuggle a raw
 * tag or attribute into the output — callers may assign the result to `innerHTML` directly.
 * If a richer renderer (e.g. a `marked`-based one) is ever added, it must keep this same
 * "escape untrusted text before formatting" invariant or add explicit sanitization on top.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] as string);
}

const FENCED_CODE_BLOCK = /```(\w*)\n([\s\S]*?)```/g;
const INLINE_CODE = /`([^`\n]+)`/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const ITALIC = /(?<!\*)\*([^*]+)\*(?!\*)/g;
// Only http(s) targets — never `javascript:`/`data:`, which would execute in the reader's context.
const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
// Placeholder inserted pre-escape and consumed post-escape. A collision would require the
// model's own text to already contain the exact literal " CODEBLOCKn " token, which even then
// only swaps in another code block's content — never attacker-controlled markup.
const CODE_BLOCK_PLACEHOLDER = / CODEBLOCK(\d+) /g;

export function renderMarkdownToHtml(markdown: string): string {
  const codeBlocks: string[] = [];

  // Extract fenced code blocks first so bold/italic/link rules never run inside code content.
  let working = markdown.replace(FENCED_CODE_BLOCK, (_match, lang: string, code: string) => {
    const index = codeBlocks.length;
    const languageClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    codeBlocks.push(`<pre><code${languageClass}>${escapeHtml(code)}</code></pre>`);
    return ` CODEBLOCK${index} `;
  });

  working = escapeHtml(working);
  working = working.replace(INLINE_CODE, (_match, code: string) => `<code>${code}</code>`);
  working = working.replace(BOLD, (_match, text: string) => `<strong>${text}</strong>`);
  working = working.replace(ITALIC, (_match, text: string) => `<em>${text}</em>`);
  working = working.replace(
    LINK,
    (_match, text: string, url: string) =>
      `<a href="${url}" rel="noopener noreferrer" target="_blank">${text}</a>`,
  );
  working = working.replace(/\n/g, '<br>');
  working = working.replace(
    CODE_BLOCK_PLACEHOLDER,
    (_match, index: string) => codeBlocks[Number(index)] ?? '',
  );

  return working;
}
