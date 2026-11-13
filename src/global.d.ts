import type { BrowserConfig } from './browser';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    AntdGoogleConsentModalConfig?: BrowserConfig;
    __antdGoogleConsentModalRendered?: boolean;
  }
}

export {};
