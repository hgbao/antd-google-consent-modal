// Script-tag entry, built as the IIFE bundle exposed on window.AntdGoogleConsentModal.
// Configure it by setting window.AntdGoogleConsentModalConfig before this script runs.
import { StyleProvider } from '@ant-design/cssinjs';
import type { ThemeConfig } from 'antd';
import { ConfigProvider } from 'antd';
import { createRoot } from 'react-dom/client';

import { initGoogleConsent } from './consent';
import type { GoogleConsentModalProps } from './GoogleConsentModal';
import GoogleConsentModal from './GoogleConsentModal';

export interface BrowserConfig extends GoogleConsentModalProps {
  autoRender?: boolean;
  theme?: ThemeConfig;
}

export { getGoogleConsent, openGoogleConsentPreferences as open } from './consent';

export const render = ({ theme, autoRender: _, ...props }: BrowserConfig = {}) => {
  // Flag on window, not in this module: a page that includes the script twice runs two bundles.
  if (window.__antdGoogleConsentModalRendered) return;
  window.__antdGoogleConsentModalRendered = true;
  initGoogleConsent(props); // Synchronous, so the default runs before a Google tag that loads later.
  const mount = () => {
    // A shadow root keeps the host page's CSS (site themes often style every button) off the modal.
    const host = document.createElement('div');
    host.id = 'antd-google-consent-modal';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadow.appendChild(container);
    createRoot(container).render(
      <StyleProvider container={shadow}>
        <ConfigProvider
          // Above CMS admin bars (WordPress uses 99999) and typical sticky headers.
          theme={{ ...theme, token: { zIndexPopupBase: 100000, ...theme?.token } }}
        >
          <GoogleConsentModal darkMode="auto" getContainer={container} {...props} />
        </ConfigProvider>
      </StyleProvider>
    );
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
};

const config = window.AntdGoogleConsentModalConfig ?? {};
if (config.autoRender !== false) render(config);
