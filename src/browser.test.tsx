import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const HOST = '#antd-google-consent-modal';
const defaults = () =>
  (window.dataLayer ?? [])
    .map((e) => Array.from(e as ArrayLike<unknown>))
    .filter((c) => c[0] === 'consent' && c[1] === 'default');

const load = async () => {
  vi.resetModules();
  return import('./browser');
};

describe('browser entry', () => {
  it('autoRender false renders nothing until render() is called', async () => {
    window.AntdGoogleConsentModalConfig = { autoRender: false };
    const mod = await load();
    expect(document.querySelector(HOST)).toBeNull();
    expect(window.dataLayer).toBeUndefined();

    mod.render({});
    expect(defaults()).toHaveLength(1);
    const host = document.querySelector(HOST)!;
    expect(host.shadowRoot).not.toBeNull();
    await waitFor(() => expect(host.shadowRoot!.querySelector('.ant-modal')).not.toBeNull());
  });

  it('auto-renders by default', async () => {
    await load();
    expect(defaults()).toHaveLength(1);
    expect(document.querySelector(HOST)).not.toBeNull();
    await waitFor(() =>
      expect(document.querySelector(HOST)!.shadowRoot!.querySelector('.ant-modal')).not.toBeNull()
    );
    expect(screen.queryByRole('dialog')).toBeNull(); // Inside the shadow root, not in body.
  });

  it('renders once across repeated calls and repeated bundles', async () => {
    const mod = await load();
    mod.render();
    await load();
    expect(document.querySelectorAll(HOST)).toHaveLength(1);
    expect(defaults()).toHaveLength(1);
  });

  it('exports open and getGoogleConsent', async () => {
    window.AntdGoogleConsentModalConfig = { autoRender: false };
    const mod = await load();
    expect(typeof mod.open).toBe('function');
    expect(typeof mod.getGoogleConsent).toBe('function');
  });
});
