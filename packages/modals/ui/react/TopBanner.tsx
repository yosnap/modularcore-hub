import { prefersReducedMotion } from '../a11y/reduced-motion.js';
import { OverlayBody } from './internal/OverlayBody.js';
import { useEscapeKey } from './internal/use-escape-key.js';

import type { ModalConfig } from '../../core/types.js';

export interface TopBannerProps {
  config: ModalConfig;
  onDismiss: (action: 'primary-button' | 'secondary-button' | 'close-button') => void;
}

/** Sticky banner at the top of the viewport for `type: 'top-banner'`. Does not steal focus. */
export function TopBanner({ config, onDismiss }: TopBannerProps) {
  useEscapeKey(true, () => onDismiss('close-button'));

  return (
    <div
      role="region"
      aria-live="polite"
      className={`modals-top-banner${prefersReducedMotion() ? ' modals-no-motion' : ''}`}
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
