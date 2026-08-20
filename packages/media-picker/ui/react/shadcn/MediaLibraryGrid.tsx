import * as TogglePrimitive from '@radix-ui/react-toggle';

import type { JSX } from 'react';
import type { LibraryItem } from '../../../core/media-picker.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../shadcn-theme.css';

export interface MediaLibraryGridProps {
  picker: UseMediaPickerResult;
  /** Called with the clicked item when `picker.state` was built without `multiple: true`. */
  onSelectSingle?: (item: LibraryItem) => void;
}

/** Shadcn variant: same props/behavior as the headless MediaLibraryGrid. Each grid item is a
 * real `@radix-ui/react-toggle` (not just a styled `<button>`), so `aria-pressed`/`data-state`
 * accessibility semantics come from Radix itself rather than being hand-rolled. Requires
 * `@radix-ui/react-toggle` as a peer dependency + `shadcn-theme.css` + Tailwind loaded. */
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
        <p role="alert" className="col-span-full text-sm text-destructive">
          {libraryError.message}
        </p>
      ) : null}
      {libraryItems.map((item) => {
        const isSelected = selectedKeys.has(item.key);
        return (
          <TogglePrimitive.Root
            key={item.key}
            data-selected={isSelected}
            pressed={isSelected}
            onPressedChange={() => handleClick(item)}
            className={`rounded-md border p-1 text-left transition-colors ${
              isSelected ? 'border-2 border-ring' : 'border-input hover:border-ring/50'
            }`}
          >
            {item.mimeType?.startsWith('image/') ? (
              <img
                src={item.url}
                alt={item.key}
                className="aspect-square w-full rounded-sm object-cover"
              />
            ) : (
              <span className="block truncate text-xs text-muted-foreground">{item.key}</span>
            )}
          </TogglePrimitive.Root>
        );
      })}
    </div>
  );
}
