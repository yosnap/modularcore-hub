import { Fragment } from 'react';

import { BottomBanner } from './BottomBanner.js';
import { FullscreenOverlay } from './FullscreenOverlay.js';
import { ModalOverlay } from './ModalOverlay.js';
import { SlideIn } from './SlideIn.js';
import { Toast } from './Toast.js';
import { TopBanner } from './TopBanner.js';

import type { OverlaysState } from '../../core/modals.js';
import type { InteractionAction } from '../../core/types.js';

export interface ModalsRendererProps {
  state: OverlaysState;
  onDismiss: (id: string, action?: InteractionAction) => void;
}

/** Maps `state.active[slot]` (1 per singleton slot) and `state.toasts[]` (stack) to their components. */
export function ModalsRenderer({ state, onDismiss }: ModalsRendererProps) {
  const { active, toasts } = state;

  return (
    <Fragment>
      {active.modal &&
        (active.modal.type === 'fullscreen' ? (
          <FullscreenOverlay config={active.modal} onDismiss={(action) => onDismiss(active.modal!.id, action)} />
        ) : (
          <ModalOverlay config={active.modal} onDismiss={(action) => onDismiss(active.modal!.id, action)} />
        ))}
      {active['top-banner'] && (
        <TopBanner config={active['top-banner']} onDismiss={(action) => onDismiss(active['top-banner']!.id, action)} />
      )}
      {active['bottom-banner'] && (
        <BottomBanner
          config={active['bottom-banner']}
          onDismiss={(action) => onDismiss(active['bottom-banner']!.id, action)}
        />
      )}
      {active['slide-in'] && (
        <SlideIn config={active['slide-in']} onDismiss={(action) => onDismiss(active['slide-in']!.id, action)} />
      )}
      {toasts.length > 0 && (
        <div className="modals-toast-stack">
          {toasts.map((toast) => (
            <Toast key={toast.id} config={toast} onDismiss={(action) => onDismiss(toast.id, action)} />
          ))}
        </div>
      )}
    </Fragment>
  );
}
