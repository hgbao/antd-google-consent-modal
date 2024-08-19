import ReactDOM from 'react-dom/client';

import GoogleConsentBanner from '@/components/GoogleConsentBanner';

import { ScreenSizeProvider } from './context/ScreenSizeContext';

// Create a div element dynamically and append it to the body
const rootElement = document.createElement('div');
document.body.appendChild(rootElement);

// Use React 18's createRoot to render the component into the newly created div
const root = ReactDOM.createRoot(rootElement);
root.render(
  <ScreenSizeProvider>
    <GoogleConsentBanner />
  </ScreenSizeProvider>
);
