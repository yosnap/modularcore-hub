import type { JSX } from 'react';

import '../../vanilla-styles.css';

export interface MimeTypeFilterProps {
  options: string[];
  selected: string[];
  onChange: (mimeTypes: string[]) => void;
}

/** Vanilla CSS variant of MimeTypeFilter — same props/behavior as headless. */
export function MimeTypeFilter({ options, selected, onChange }: MimeTypeFilterProps): JSX.Element {
  const toggle = (mimeType: string): void => {
    onChange(
      selected.includes(mimeType)
        ? selected.filter((existing) => existing !== mimeType)
        : [...selected, mimeType],
    );
  };

  return (
    <div role="group" aria-label="Filter by file type" className="mc-mime-group">
      {options.map((mimeType) => (
        <label key={mimeType} className="mc-mime-pill">
          <input
            type="checkbox"
            checked={selected.includes(mimeType)}
            onChange={() => toggle(mimeType)}
          />
          {mimeType}
        </label>
      ))}
    </div>
  );
}
