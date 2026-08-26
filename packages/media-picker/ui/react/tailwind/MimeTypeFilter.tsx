import type { JSX } from 'react';

export interface MimeTypeFilterProps {
  /** e.g. `['image/png', 'image/jpeg', 'video/mp4']` — caller decides the offered set. */
  options: string[];
  selected: string[];
  onChange: (mimeTypes: string[]) => void;
}

/** Tailwind variant of MimeTypeFilter — same props/behavior as headless, styled as pills. */
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
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs"
        >
          <input
            type="checkbox"
            checked={selected.includes(mimeType)}
            onChange={() => toggle(mimeType)}
            className="accent-zinc-900"
          />
          {mimeType}
        </label>
      ))}
    </div>
  );
}
