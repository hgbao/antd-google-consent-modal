import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined') {
  // antd Grid reads matchMedia. restoreMocks resets vi.fn, so use a plain function.
  window.matchMedia = (media: string) => ({
    matches: false,
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  vi.useRealTimers();
  if (typeof window === 'undefined') return;
  cleanup();
  localStorage.clear();
  delete window.dataLayer;
  delete window.gtag;
  delete window.AntdGoogleConsentModalConfig;
  delete window.__antdGoogleConsentModalRendered;
  for (const el of [document.documentElement, document.body]) {
    for (const name of el.getAttributeNames()) el.removeAttribute(name);
  }
  document.body.innerHTML = '';
});
