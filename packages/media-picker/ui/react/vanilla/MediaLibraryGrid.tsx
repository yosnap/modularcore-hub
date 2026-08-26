import type { JSX } from 'react';
import type { LibraryItem } from '../../../core/media-picker.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../vanilla-styles.css';

export interface MediaLibraryGridProps {
  picker: UseMediaPickerResult;
  /** Called with the clicked item when `picker.state` was built without `multiple: true`. */
  onSelectSingle?: (item: LibraryItem) => void;
}

/** Vanilla CSS variant: same props/behavior as the headless MediaLibraryGrid, styled with
 * plain `mc-*` classes from `../../vanilla-styles.css` — no framework dependency. A consumer
 * without a bundler can drop `<link rel="stylesheet" href="vanilla-styles.css">` in their HTML
 * instead of relying on this side-effect import. */
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
    <div role="grid" aria-busy={libraryLoading} className="mc-grid">
      {libraryError ? (
        <p role="alert" className="mc-alert">
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
            className={`mc-grid__item${isSelected ? ' mc-grid__item--selected' : ''}`}
          >
            {item.mimeType?.startsWith('image/') ? (
              <img src={item.url} alt={item.key} className="mc-grid__thumb" />
            ) : (
              <span>{item.key}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
