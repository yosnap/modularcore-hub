import { basename, formatBytes, formatVariantBadge, sortVariants } from '../../core/format.js';

import type { JSX } from 'react';
import type { LibraryItem } from '../../core/media-picker.js';
import type { UseMediaPickerResult } from '../../adapters/react/use-media-picker.js';

export interface MediaLibraryGridProps {
  picker: UseMediaPickerResult;
  /** Called with the clicked item when `picker.state` was built without `multiple: true`. */
  onSelectSingle?: (item: LibraryItem) => void;
}

/**
 * Deliberately unstyled: a plain grid of buttons, no CSS framework, no design polish — this
 * package ships headless-first with minimal reference UI (see PRD non-goal on polished UI).
 * Consuming projects are expected to restyle this freely.
 */
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
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
        gap: 8,
      }}
    >
      {libraryError ? <p role="alert">{libraryError.message}</p> : null}
      {libraryItems.map((item) => {
        const isSelected = selectedKeys.has(item.key);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isSelected}
            data-selected={isSelected}
            onClick={() => handleClick(item)}
            style={{ border: isSelected ? '2px solid #333' : '1px solid #ccc', padding: 4 }}
          >
            {item.mimeType?.startsWith('image/') ? (
              <img src={item.url} alt={item.key} style={{ width: '100%', height: 'auto' }} />
            ) : (
              <span>{item.key}</span>
            )}
            <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.3, overflow: 'hidden' }}>
              <span
                title={item.key}
                style={{
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {basename(item.key)}
              </span>
              <span>{formatBytes(item.size)}</span>
              {item.variants?.length ? (
                <span style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                  {sortVariants(item.variants).map((variant) => (
                    <span
                      key={variant.key}
                      title={variant.label}
                      style={{ fontSize: 10, padding: '0 3px', border: '1px solid #ccc' }}
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
