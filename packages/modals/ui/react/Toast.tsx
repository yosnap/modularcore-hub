import { useEffect } from 'react';

import { OverlayBody } from './internal/OverlayBody.js';

import type { ModalConfig } from '../../core/types.js';

export interface ToastProps {
  config: ModalConfig;
  onDismiss: (action: 'primary-button' | 'secondary-button' | 'close-button') => void;
}

const DEFAULT_AUTO_DISMISS_MS = 5000;

/** Transient, multi-instance toast for `type: 'toast'`. No focus trap; auto-dismisses (keyed by id). */
export function Toast({ config, onDismiss }: ToastProps) {
  useEffect(() => {
    const ms = config.autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS;
    const timer = setTimeout(() => onDismiss('close-button'), ms);
    return () => clearTimeout(timer);
    // Re-arm only when the toast identity changes — `onDismiss` is idempotent (core/modals.ts), so
    // a stale timer firing right after a manual close is a safe no-op rather than a bug to guard here.
  }, [config.id, config.autoDismissMs]);

  return (
    <div role="status" aria-live="polite" className="modals-toast">
      <OverlayBody
        config={config}
        onPrimary={() => onDismiss('primary-button')}
        onSecondary={() => onDismiss('secondary-button')}
        onClose={() => onDismiss('close-button')}
      />
    </div>
  );
}
