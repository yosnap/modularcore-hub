import { useEffect, useId, useRef, useState } from 'react';
import type { JSX, KeyboardEvent } from 'react';

import '../modern-select.css';

export interface ModernSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ModernSelectProps {
  options: ModernSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

/** Select custom accesible para evitar el control visual legacy del navegador. */
export function ModernSelect({
  options,
  value = '',
  onChange,
  placeholder = 'Seleccionar…',
  disabled = false,
  name,
}: ModernSelectProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const moveHighlight = (direction: 1 | -1): void => {
    if (!options.length) return;
    let next = highlighted;
    do {
      next = (next + direction + options.length) % options.length;
    } while (options[next]?.disabled && next !== highlighted);
    setHighlighted(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && options[highlighted] && !options[highlighted].disabled) {
        onChange(options[highlighted].value);
        setOpen(false);
      } else setOpen(true);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="mc-modern-select-root">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        className="mc-modern-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className={selected ? undefined : 'mc-modern-select-placeholder'}>
          {selected?.label ?? placeholder}
        </span>
        <span aria-hidden="true" className="mc-modern-select-chevron">
          ⌄
        </span>
      </button>
      {open ? (
        <div
          id={listboxId}
          className="mc-modern-select-content"
          role="listbox"
          aria-label={placeholder}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`mc-modern-select-option${index === highlighted ? ' is-highlighted' : ''}`}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
              {option.value === value ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
