import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../shadcn-theme.css';

export interface BulkActionsBarProps {
  picker: UseMediaPickerResult;
  multiple: boolean;
  onConfirm?: (items: ReturnType<UseMediaPickerResult['confirmSelection']>) => void;
}

/** Shadcn variant of BulkActionsBar — same props/behavior as headless. */
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
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
    >
      <span className="text-sm text-muted-foreground">{selection.length} selected</span>
      <button
        type="button"
        onClick={handleConfirm}
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => picker.clearSelection()}
        className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
      >
        Clear
      </button>
    </div>
  );
}
