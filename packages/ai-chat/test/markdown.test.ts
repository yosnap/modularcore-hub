import { describe, expect, it } from 'vitest';

import { renderMarkdownToHtml } from '../ui/markdown.js';

describe('renderMarkdownToHtml (untrusted LLM output -> safe HTML)', () => {
  it('escapes raw HTML tags instead of rendering them', () => {
    const html = renderMarkdownToHtml('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('never allows a javascript: link', () => {
    const html = renderMarkdownToHtml('[click me](javascript:alert(1))');
    expect(html).not.toContain('<a href="javascript:');
  });

  it('renders an http(s) link with a safe rel/target', () => {
    const html = renderMarkdownToHtml('[docs](https://example.com/x)');
    expect(html).toContain(
      '<a href="https://example.com/x" rel="noopener noreferrer" target="_blank">docs</a>',
    );
  });

  it('renders bold, italic, and inline code', () => {
    expect(renderMarkdownToHtml('**bold**')).toBe('<strong>bold</strong>');
    expect(renderMarkdownToHtml('*italic*')).toBe('<em>italic</em>');
    expect(renderMarkdownToHtml('`code`')).toBe('<code>code</code>');
  });

  it('renders a fenced code block and escapes its content instead of interpreting it', () => {
    const html = renderMarkdownToHtml('```js\nconst x = "<script>";\n```');
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('does not apply bold/italic/link formatting inside a code block', () => {
    const html = renderMarkdownToHtml('```\n**not bold** [not a link](https://x.com)\n```');
    expect(html).not.toContain('<strong>');
    expect(html).not.toContain('<a href');
  });

  it('converts newlines to <br>', () => {
    expect(renderMarkdownToHtml('a\nb')).toBe('a<br>b');
  });
});
