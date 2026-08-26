import { useEffect, useRef } from 'react';

import { createFocusTrap } from '../a11y/focus-trap.js';
import { OverlayBody } from './internal/OverlayBody.js';
import { useEscapeKey } from './internal/use-escape-key.js';

import type { ModalConfig } from '../../core/types.js';

export interface FullscreenOverlayProps {
  config: ModalConfig;
  onDismiss: (
    action: 'primary-button' | 'secondary-button' | 'close-button' | 'outside-click',
  ) => void;
}

/** Full-viewport dialog for `type: 'fullscreen'` (shares the 'modal' slot). Focus-trapped, closes on Escape. */
export function FullscreenOverlay({ config, onDismiss }: FullscreenOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const trap = createFocusTrap(el);
    trap.activate();
    return () => trap.deactivate();
  }, []);

  useEscapeKey(true, () => onDismiss('close-button'));

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={config.title ?? config.name ?? 'Dialog'}
      className="modals-fullscreen"
    >
      <OverlayBody
        config={config}
        onPrimary={() => onDismiss('primary-button')}
        onSecondary={() => onDismiss('secondary-button')}
        onClose={() => onDismiss('close-button')}
      />
    </div>
  );
}
