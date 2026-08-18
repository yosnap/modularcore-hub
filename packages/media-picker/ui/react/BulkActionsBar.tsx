import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../adapters/react/use-media-picker.js';

export interface BulkActionsBarProps {
  picker: UseMediaPickerResult;
  multiple: boolean;
  onConfirm?: (items: ReturnType<UseMediaPickerResult['confirmSelection']>) => void;
}

/** Renders nothing unless `multiple` and at least one item is selected. */
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
    <div role="toolbar" aria-label="Bulk actions">
      <span>{selection.length} selected</span>
      <button type="button" onClick={handleConfirm}>
        Confirm
      </button>
      <button type="button" onClick={() => picker.clearSelection()}>
        Clear
      </button>
    </div>
  );
}
