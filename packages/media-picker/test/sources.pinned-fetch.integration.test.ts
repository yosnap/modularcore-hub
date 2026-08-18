import { describe, expect, it } from 'vitest';

import { fromRemoteUrl } from '../core/sources.js';

/**
 * Deliberately NOT in `sources.test.ts`: that file mocks 'undici' to unit-test
 * `fromRemoteUrl`'s branching without a real network call. This file does the opposite —
 * it hits the real network through the real, unmocked `undici` package to exercise the one
 * thing a mock cannot: undici's own connector actually invoking the `connect.lookup`
 * callback `pinnedLookup` wires up. A prior version of that callback only handled the
 * non-Happy-Eyeballs shape and made every real pinned fetch throw
 * `ERR_INVALID_IP_ADDRESS: Invalid IP address: undefined` — this test is the regression
 * guard for that class of bug, which a mocked-fetch test structurally cannot catch.
 */
describe('fromRemoteUrl — pinned fetch against the real network (regression, unmocked undici)', () => {
  it('fetches a real https URL through the pinned dispatcher without throwing', async () => {
    const blob = await fromRemoteUrl('https://example.com/');
    expect(blob.size).toBeGreaterThan(0);
  });
});
