import type { GOOGLE_CONSENT_STATUS } from '../constants';

enum LOCAL_STORAGE {
  GOOGLE_CONSENT_STATUS = 'googleConsentStatus',
}

const getLocalStorage = (key: string) => {
  return localStorage.getItem(key);
};

const setLocalStorage = (key: string, value: string) => {
  localStorage.setItem(key, value);
};

export const getGoogleConsentStatus = (): GOOGLE_CONSENT_STATUS | null => {
  return getLocalStorage(LOCAL_STORAGE.GOOGLE_CONSENT_STATUS) as GOOGLE_CONSENT_STATUS;
};

export const setGoogleConsentStatus = (value: GOOGLE_CONSENT_STATUS) => {
  setLocalStorage(LOCAL_STORAGE.GOOGLE_CONSENT_STATUS, value);
};
