import { prefersReducedMotion } from '../a11y/reduced-motion.js';
import { OverlayBody } from './internal/OverlayBody.js';
import { useEscapeKey } from './internal/use-escape-key.js';

import type { ModalConfig } from '../../core/types.js';

export interface SlideInProps {
  config: ModalConfig;
  onDismiss: (action: 'primary-button' | 'secondary-button' | 'close-button') => void;
}

/** Corner panel (bottom-right on desktop, near-full-width from the bottom on mobile) for `type: 'slide-in'`. */
export function SlideIn({ config, onDismiss }: SlideInProps) {
  useEscapeKey(true, () => onDismiss('close-button'));

  return (
    <div
      role="region"
      aria-live="polite"
      className={`modals-slide-in${prefersReducedMotion() ? ' modals-no-motion' : ''}`}
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
