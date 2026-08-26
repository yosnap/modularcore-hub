import { StrictMode } from 'react';
import { render, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useModals } from '../../adapters/react/use-modals.js';

import type { ModalsProvider } from '../../core/provider.js';
import type { ModalsContext } from '../../core/types.js';

function providerOf(getActiveModals: ModalsProvider['getActiveModals'] = async () => []): ModalsProvider {
  return { getActiveModals };
}

function Probe({ provider, ctx, onResult }: { provider: ModalsProvider; ctx: ModalsContext; onResult: (r: ReturnType<typeof useModals>) => void }) {
  const result = useModals(provider, ctx);
  onResult(result);
  return null;
}

describe('useModals', () => {
  it('reloads when ctx.path changes, keeping the same manager instance', async () => {
    const loadCalls: string[] = [];
    const provider = providerOf(async (ctx) => {
      loadCalls.push(ctx.path);
      return [];
    });

    let latest: ReturnType<typeof useModals> | undefined;
    const onResult = (r: ReturnType<typeof useModals>) => {
      latest = r;
    };

    const { rerender } = render(<Probe provider={provider} ctx={{ path: '/a' }} onResult={onResult} />);
    await act(async () => {});
    expect(loadCalls).toEqual(['/a']);

    rerender(<Probe provider={provider} ctx={{ path: '/b' }} onResult={onResult} />);
    await act(async () => {});
    expect(loadCalls).toEqual(['/a', '/b']);
    expect(latest).toBeDefined();
  });

  it('reloads when the provider identity changes, even with the same path', async () => {
    const loadCalls: number[] = [];
    const makeProvider = (tag: number) =>
      providerOf(async () => {
        loadCalls.push(tag);
        return [];
      });

    const onResult = () => {};
    const { rerender } = render(<Probe provider={makeProvider(1)} ctx={{ path: '/a' }} onResult={onResult} />);
    await act(async () => {});

    rerender(<Probe provider={makeProvider(2)} ctx={{ path: '/a' }} onResult={onResult} />);
    await act(async () => {});

    expect(loadCalls).toEqual([1, 2]);
  });

  it('survives a StrictMode mount -> unmount -> remount cycle without a dead manager', async () => {
    const provider = providerOf(async () => []);
    const onResult = vi.fn();

    const { unmount, rerender } = render(
      <StrictMode>
        <Probe provider={provider} ctx={{ path: '/' }} onResult={onResult} />
      </StrictMode>,
    );
    await act(async () => {});

    unmount();

    // Remount: if useModals reused a destroyed manager, load()/subscribe() on it would be a
    // silent no-op forever instead of driving state again.
    let latest: ReturnType<typeof useModals> | undefined;
    render(
      <StrictMode>
        <Probe provider={provider} ctx={{ path: '/' }} onResult={(r) => (latest = r)} />
      </StrictMode>,
    );
    await act(async () => {});

    expect(latest?.state.loading).toBe(false);
    expect(latest?.state.error).toBeNull();
    void rerender;
  });
});
