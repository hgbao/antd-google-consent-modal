import ReactDOM from 'react-dom/client';

import GoogleConsentModal from '@/components/GoogleConsentModal';

import { ScreenSizeProvider } from './context/ScreenSizeContext';

const renderGoogleConsentModal = () => {
  // Create a div element dynamically and append it to the body
  const rootElement = document.createElement('div');
  document.body.appendChild(rootElement);

  // Use React 18's createRoot to render the component into the newly created div
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ScreenSizeProvider>
      <GoogleConsentModal />
    </ScreenSizeProvider>
  );
};

// Export the component for use as a module
export default GoogleConsentModal;

// Automatically render the modal if loaded via a <script> tag in the browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // @ts-ignore
  window.AntdGoogleConsentModal = {
    render: renderGoogleConsentModal,
  };

  // Automatically render the component if desired
  // @ts-ignore
  if (!window.AntdGoogleConsentModal.noAutoRender) {
    renderGoogleConsentModal();
  }
}
