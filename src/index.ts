// Module entry for bundlers. Has no side effects: render <GoogleConsentModal /> yourself.
export type {
  ConsentCategory,
  ConsentChoices,
  GoogleConsentOptions,
  GoogleConsentState,
  GoogleConsentType,
} from './consent';
export {
  DEFAULT_CATEGORIES,
  EEA_REGIONS,
  getGoogleConsent,
  initGoogleConsent,
  openGoogleConsentPreferences,
} from './consent';
export type { DarkMode } from './darkMode';
export type { GoogleConsentModalProps, GoogleConsentTexts } from './GoogleConsentModal';
export { default, default as GoogleConsentModal } from './GoogleConsentModal';
