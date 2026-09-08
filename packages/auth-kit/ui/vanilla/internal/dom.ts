/**
 * Tiny imperative-DOM helpers shared by every `mount*` factory in `ui/vanilla`. No framework,
 * no JSX — just `document.createElement` wrapped for less boilerplate. Presentation-specific
 * class names are passed in by each `mount*` factory, never hardcoded here.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children)
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}

/** Builds a `<label>` + `<input>` pair, returns both so the caller can wire events/read `.value`. */
export function field(
  labelText: string,
  inputAttrs: Record<string, string> & { id: string },
  classes: { label?: string; input?: string } = {},
): { label: HTMLLabelElement; input: HTMLInputElement } {
  const input = el('input', { ...inputAttrs, ...(classes.input ? { class: classes.input } : {}) });
  const label = el(
    'label',
    classes.label ? { for: inputAttrs.id, class: classes.label } : { for: inputAttrs.id },
    [labelText, input],
  );
  return { label, input };
}

/** A `role="alert"` paragraph, hidden (via `hidden` attribute) until `setText` is called with non-empty text. */
export function errorText(className?: string): {
  node: HTMLParagraphElement;
  setText: (text: string | null | undefined) => void;
} {
  const node = el('p', className ? { role: 'alert', class: className } : { role: 'alert' });
  node.hidden = true;
  return {
    node,
    setText: (text) => {
      node.hidden = !text;
      node.textContent = text ?? '';
    },
  };
}

/** A status paragraph (no `role="alert"`), same hidden-until-set behavior as `errorText`. */
export function statusText(className?: string): {
  node: HTMLParagraphElement;
  setText: (text: string | null | undefined) => void;
} {
  const node = el('p', className ? { class: className } : {});
  node.hidden = true;
  return {
    node,
    setText: (text) => {
      node.hidden = !text;
      node.textContent = text ?? '';
    },
  };
}
