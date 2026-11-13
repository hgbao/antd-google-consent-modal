// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

describe('server render', () => {
  it('returns null without a window', async () => {
    vi.resetModules();
    const { initGoogleConsent } = await import('./consent');
    expect(typeof window).toBe('undefined');
    expect(() => initGoogleConsent()).not.toThrow();
    expect(initGoogleConsent()).toBeNull();
  });

  it('getGoogleConsent returns null without a window', async () => {
    vi.resetModules();
    const { getGoogleConsent } = await import('./consent');
    expect(getGoogleConsent()).toBeNull();
  });
});
