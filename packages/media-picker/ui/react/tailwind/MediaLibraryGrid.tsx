import { basename, formatBytes, formatVariantBadge, sortVariants } from '../../../core/format.js';

import type { JSX } from 'react';
import type { LibraryItem } from '../../../core/media-picker.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

export interface MediaLibraryGridProps {
  picker: UseMediaPickerResult;
  /** Called with the clicked item when `picker.state` was built without `multiple: true`. */
  onSelectSingle?: (item: LibraryItem) => void;
}

/** Tailwind variant: same props/behavior as the headless MediaLibraryGrid, styled with
 * Tailwind utility classes only. No component library dependency. */
export function MediaLibraryGrid({ picker, onSelectSingle }: MediaLibraryGridProps): JSX.Element {
  const { libraryItems, selection, libraryLoading, libraryError } = picker.state;
  const selectedKeys = new Set(selection.map((item) => item.key));

  const handleClick = (item: LibraryItem): void => {
    if (onSelectSingle) {
      onSelectSingle(item);
      return;
    }
    picker.toggleLibrarySelection(item);
  };

  return (
    <div
      role="grid"
      aria-busy={libraryLoading}
      className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2"
    >
      {libraryError ? (
        <p role="alert" className="col-span-full text-sm text-red-600">
          {libraryError.message}
        </p>
      ) : null}
      {libraryItems.map((item) => {
        const isSelected = selectedKeys.has(item.key);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isSelected}
            data-selected={isSelected}
            onClick={() => handleClick(item)}
            className={`rounded-md border p-1 text-left transition-colors ${
              isSelected ? 'border-2 border-zinc-900' : 'border-zinc-200 hover:border-zinc-400'
            }`}
          >
            {item.mimeType?.startsWith('image/') ? (
              <img
                src={item.url}
                alt={item.key}
                className="aspect-square w-full rounded object-cover"
              />
            ) : (
              <span className="block truncate text-xs text-zinc-600">{item.key}</span>
            )}
            <div className="mt-1 leading-tight">
              <span className="block truncate text-xs text-zinc-600" title={item.key}>
                {basename(item.key)}
              </span>
              <span className="block text-[11px] text-zinc-400">{formatBytes(item.size)}</span>
              {item.variants?.length ? (
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {sortVariants(item.variants).map((variant) => (
                    <span
                      key={variant.key}
                      title={variant.label}
                      className="rounded bg-zinc-800 px-1 text-[10px] leading-4 text-zinc-400"
                    >
                      {formatVariantBadge(variant)}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
