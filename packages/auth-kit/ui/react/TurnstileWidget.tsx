import { useEffect, useRef } from 'react';

import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';

import type { JSX } from 'react';

export interface TurnstileWidgetProps {
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  mode?: 'managed' | 'non-interactive' | 'invisible';
  /** Called on every token change — `''` once when no `siteKey` is configured (dev no-op), `null` on expiry. */
  onToken: (token: string | null) => void;
}

/**
 * Shared across every presentation (headless/tailwind/shadcn/vanilla) — the Cloudflare widget
 * itself renders its own UI (an iframe), so there's nothing presentation-specific to restyle
 * here, same reasoning as `ModernSelect` living directly under `ui/react/` in media-picker.
 */
export function TurnstileWidget({
  siteKey,
  theme,
  mode,
  onToken,
}: TurnstileWidgetProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TurnstileController | null>(null);
  if (!controllerRef.current)
    controllerRef.current = new TurnstileController({ siteKey, theme, mode });
  const controller = controllerRef.current;

  useEffect(() => controller.subscribe((state) => onToken(state.token)), [controller, onToken]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return mountTurnstileWidget(container, controller);
  }, [controller]);

  if (!siteKey) return null;
  return <div ref={containerRef} />;
}
