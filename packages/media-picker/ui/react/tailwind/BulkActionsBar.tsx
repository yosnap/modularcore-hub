import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

export interface BulkActionsBarProps {
  picker: UseMediaPickerResult;
  multiple: boolean;
  onConfirm?: (items: ReturnType<UseMediaPickerResult['confirmSelection']>) => void;
}

/** Tailwind variant of BulkActionsBar — same props/behavior as headless, styled as a toolbar. */
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
      className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2"
    >
      <span className="text-sm text-zinc-600">{selection.length} selected</span>
      <button
        type="button"
        onClick={handleConfirm}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => picker.clearSelection()}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
      >
        Clear
      </button>
    </div>
  );
}
