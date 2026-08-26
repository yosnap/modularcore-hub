import { describe, expect, it, vi } from 'vitest';

import { createInMemoryProvider } from '../../core/providers/in-memory.js';

describe('createInMemoryProvider', () => {
  it('returns the static modals list and forwards tracking events', async () => {
    const onView = vi.fn();
    const onInteraction = vi.fn();
    const modal = { id: 'a', type: 'top-banner' as const, message: 'hi', trigger: { type: 'manual' as const } };
    const provider = createInMemoryProvider({ modals: [modal], onView, onInteraction });

    await expect(provider.getActiveModals({ path: '/' })).resolves.toEqual([modal]);

    const viewEvent = { modalId: 'a', path: '/', at: '2026-01-01T00:00:00.000Z' };
    provider.trackView?.(viewEvent);
    expect(onView).toHaveBeenCalledWith(viewEvent);

    const interactionEvent = { modalId: 'a', action: 'close-button' as const, path: '/', at: '2026-01-01T00:00:00.000Z' };
    provider.trackInteraction?.(interactionEvent);
    expect(onInteraction).toHaveBeenCalledWith(interactionEvent);
  });

  it('defaults tracking callbacks to no-ops', async () => {
    const provider = createInMemoryProvider({ modals: [] });
    expect(() => provider.trackView?.({ modalId: 'x', path: '/', at: '' })).not.toThrow();
    expect(() => provider.trackInteraction?.({ modalId: 'x', action: 'close-button', path: '/', at: '' })).not.toThrow();
  });
});
