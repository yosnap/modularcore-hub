import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../vanilla-styles.css';

export interface BulkActionsBarProps {
  picker: UseMediaPickerResult;
  multiple: boolean;
  onConfirm?: (items: ReturnType<UseMediaPickerResult['confirmSelection']>) => void;
}

/** Vanilla CSS variant of BulkActionsBar — same props/behavior as headless. */
export function BulkActionsBar({
  picker,
  multiple,
  onConfirm,
}: BulkActionsBarProps): JSX.Element | null {
  const { selection } = picker.state;
  if (!multiple || selection.length === 0) return null;

  const handleConfirm = (): void => {
    onConfirm?.(picker.confirmSelection());
  };

  return (
    <div role="toolbar" aria-label="Bulk actions" className="mc-toolbar">
      <span>{selection.length} selected</span>
      <button type="button" onClick={handleConfirm} className="mc-button">
        Confirm
      </button>
      <button type="button" onClick={() => picker.clearSelection()} className="mc-button">
        Clear
      </button>
    </div>
  );
}
