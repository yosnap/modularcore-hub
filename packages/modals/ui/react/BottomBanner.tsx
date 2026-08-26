import { prefersReducedMotion } from '../a11y/reduced-motion.js';
import { OverlayBody } from './internal/OverlayBody.js';
import { useEscapeKey } from './internal/use-escape-key.js';

import type { ModalConfig } from '../../core/types.js';

export interface BottomBannerProps {
  config: ModalConfig;
  onDismiss: (action: 'primary-button' | 'secondary-button' | 'close-button') => void;
}

/** Sticky banner at the bottom of the viewport for `type: 'bottom-banner'`. Does not steal focus. */
export function BottomBanner({ config, onDismiss }: BottomBannerProps) {
  useEscapeKey(true, () => onDismiss('close-button'));

  return (
    <div
      role="region"
      aria-live="polite"
      className={`modals-bottom-banner${prefersReducedMotion() ? ' modals-no-motion' : ''}`}
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
