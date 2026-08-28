export interface PlaygroundEntry {
  component: string;
  label: string;
  href: string;
}

/** Single source for every component with an interactive demonstration. */
export const PLAYGROUNDS: readonly PlaygroundEntry[] = [
  { component: 'ai-chat', label: 'AI Chat', href: '/playground/ai-chat' },
  { component: 'auto-seo', label: 'Auto SEO', href: '/playground/auto-seo' },
  { component: 'media-picker', label: 'Media Picker', href: '/playground/media-picker' },
  { component: 'modals', label: 'Modals', href: '/playground/modals' },
];

export function playgroundFor(component: string): PlaygroundEntry | undefined {
  return PLAYGROUNDS.find((playground) => playground.component === component);
}
