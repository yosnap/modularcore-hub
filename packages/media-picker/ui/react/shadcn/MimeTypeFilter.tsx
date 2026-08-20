import type { JSX } from 'react';

import '../../shadcn-theme.css';

export interface MimeTypeFilterProps {
  options: string[];
  selected: string[];
  onChange: (mimeTypes: string[]) => void;
}

/** Shadcn variant of MimeTypeFilter — same props/behavior as headless. */
export function MimeTypeFilter({ options, selected, onChange }: MimeTypeFilterProps): JSX.Element {
  const toggle = (mimeType: string): void => {
    onChange(
      selected.includes(mimeType)
        ? selected.filter((existing) => existing !== mimeType)
        : [...selected, mimeType],
    );
  };

  return (
    <div role="group" aria-label="Filter by file type" className="flex flex-wrap gap-2">
      {options.map((mimeType) => (
        <label
          key={mimeType}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-secondary px-3 py-1 text-xs text-secondary-foreground"
        >
          <input
            type="checkbox"
            checked={selected.includes(mimeType)}
            onChange={() => toggle(mimeType)}
            className="accent-primary"
          />
          {mimeType}
        </label>
      ))}
    </div>
  );
}
