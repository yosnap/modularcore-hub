import { useEffect, useRef } from 'react';

import { createFocusTrap } from '../a11y/focus-trap.js';
import { prefersReducedMotion } from '../a11y/reduced-motion.js';
import { OverlayBody } from './internal/OverlayBody.js';
import { useEscapeKey } from './internal/use-escape-key.js';

import type { ModalConfig } from '../../core/types.js';

export interface ModalOverlayProps {
  config: ModalConfig;
  onDismiss: (
    action: 'primary-button' | 'secondary-button' | 'close-button' | 'outside-click',
  ) => void;
}

/** Centered dialog for `type: 'modal'`. Focus-trapped, closes on Escape/backdrop click. */
export function ModalOverlay({ config, onDismiss }: ModalOverlayProps) {
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
      role="presentation"
      className={`modals-backdrop${prefersReducedMotion() ? ' modals-no-motion' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss('outside-click');
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={config.title ?? config.name ?? 'Dialog'}
        className="modals-modal"
      >
        <OverlayBody
          config={config}
          onPrimary={() => onDismiss('primary-button')}
          onSecondary={() => onDismiss('secondary-button')}
          onClose={() => onDismiss('close-button')}
        />
      </div>
    </div>
  );
}
