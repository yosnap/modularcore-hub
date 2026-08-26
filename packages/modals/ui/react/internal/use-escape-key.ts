import { useEffect } from 'react';

/** Calls `onEscape` while `active`, cleaning up the listener on deactivate/unmount. */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    function onKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onEscape();
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [active, onEscape]);
}
