import type { JSX } from 'react';

export interface MimeTypeFilterProps {
  /** e.g. `['image/png', 'image/jpeg', 'video/mp4']` — caller decides the offered set. */
  options: string[];
  selected: string[];
  onChange: (mimeTypes: string[]) => void;
}

/** Plain checkbox pills over a caller-provided list of mime types; no business logic. */
export function MimeTypeFilter({ options, selected, onChange }: MimeTypeFilterProps): JSX.Element {
  const toggle = (mimeType: string): void => {
    onChange(
      selected.includes(mimeType)
        ? selected.filter((existing) => existing !== mimeType)
        : [...selected, mimeType],
    );
  };

  return (
    <div role="group" aria-label="Filter by file type">
      {options.map((mimeType) => (
        <label key={mimeType} style={{ marginRight: 8 }}>
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
