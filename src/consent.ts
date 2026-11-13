// Pure consent logic plus the gtag and localStorage side effects. No React here.

export type GoogleConsentType =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';

export type GoogleConsentValue = 'granted' | 'denied';

export type GoogleConsentState = Record<GoogleConsentType, GoogleConsentValue>;

export interface ConsentCategory {
  key: string;
  title: string;
  description?: string;
  required?: boolean; // Always granted, cannot be switched off.
  consentTypes: GoogleConsentType[];
}

export type ConsentChoices = Record<string, boolean>; // Category key to granted.

export interface StoredConsent {
  version: string | number;
  timestamp: number;
  choices: ConsentChoices;
}

export interface GoogleConsentOptions {
  categories?: ConsentCategory[];
  version?: string | number; // Bump to ask every visitor again, such as after adding a category.
  expiryDays?: number;
  storageKey?: string;
  setDefault?: boolean; // Set false when your page already sends gtag('consent', 'default', ...).
  waitForUpdate?: number;
  adsDataRedaction?: boolean;
  urlPassthrough?: boolean;
  regions?: string[] | 'EEA'; // ISO 3166-2 codes, or 'EEA'. Deny by default only there, grant elsewhere.
  dataLayerEvent?: string | false; // Pushed to dataLayer on every consent update, for GTM triggers.
  onChange?: (choices: ConsentChoices, state: GoogleConsentState) => void;
}

export const GOOGLE_CONSENT_TYPES: GoogleConsentType[] = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

export const DEFAULT_CATEGORIES: ConsentCategory[] = [
  {
    key: 'necessary',
    title: 'Necessary',
    description: 'Required for security and basic features of the site.',
    required: true,
    consentTypes: ['security_storage', 'functionality_storage'],
  },
  {
    key: 'analytics',
    title: 'Analytics',
    description: 'Helps us understand how visitors use the site.',
    consentTypes: ['analytics_storage'],
  },
  {
    key: 'marketing',
    title: 'Marketing',
    description: 'Used to show and measure relevant ads.',
    consentTypes: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  },
  {
    key: 'preferences',
    title: 'Personalization',
    description: 'Remembers your choices to personalize content.',
    consentTypes: ['personalization_storage'],
  },
];

const DEFAULTS = {
  categories: DEFAULT_CATEGORIES,
  version: 1,
  expiryDays: 180, // CNIL recommends keeping a choice for about 6 months.
  storageKey: 'googleConsent',
  setDefault: true,
  waitForUpdate: 500,
  adsDataRedaction: true,
  urlPassthrough: false,
  regions: undefined as string[] | 'EEA' | undefined,
  dataLayerEvent: 'google_consent_update' as string | false,
};

// EU member states, the rest of the EEA, the UK and Switzerland.
export const EEA_REGIONS = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
  'GB',
  'CH',
];

export const resolveOptions = (options: GoogleConsentOptions = {}) => ({ ...DEFAULTS, ...options });

type ResolvedOptions = ReturnType<typeof resolveOptions>;

export const toGtagState = (
  categories: ConsentCategory[],
  choices: ConsentChoices
): GoogleConsentState => {
  const state = Object.fromEntries(
    GOOGLE_CONSENT_TYPES.map((type) => [type, 'denied'])
  ) as GoogleConsentState;
  for (const category of categories) {
    if (category.required || choices[category.key]) {
      for (const type of category.consentTypes) state[type] = 'granted';
    }
  }
  return state;
};

export const allChoices = (categories: ConsentCategory[], granted: boolean): ConsentChoices =>
  Object.fromEntries(categories.map((c) => [c.key, granted || !!c.required]));

// Parses the stored JSON. Anything that is not a well-formed record counts as no choice.
export const parseStored = (raw: string | null): StoredConsent | null => {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<StoredConsent> | null) : null;
    const valid =
      !!value &&
      (typeof value.version === 'string' || typeof value.version === 'number') &&
      typeof value.timestamp === 'number' &&
      !!value.choices &&
      typeof value.choices === 'object';
    return valid ? (value as StoredConsent) : null;
  } catch {
    return null;
  }
};

// A choice is valid for the same version, before it expires, and when it covers every optional
// category. A category added later re-asks the visitor without a version bump.
export const isStoredConsentValid = (
  stored: StoredConsent | null,
  options: Pick<ResolvedOptions, 'version' | 'expiryDays' | 'categories'>,
  now = Date.now()
): stored is StoredConsent =>
  !!stored &&
  stored.version === options.version &&
  now - stored.timestamp < options.expiryDays * 24 * 60 * 60 * 1000 &&
  options.categories.every((c) => c.required || typeof stored.choices[c.key] === 'boolean');

const gtag = (...args: unknown[]) => {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      // gtag.js only processes Arguments objects, not arrays.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag(...args);
};

const readStored = (storageKey: string): StoredConsent | null => {
  try {
    return parseStored(window.localStorage.getItem(storageKey));
  } catch {
    return null; // Storage blocked: ask again.
  }
};

const writeStored = (storageKey: string, stored: StoredConsent) => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    // Storage blocked: consent still applies to this page view.
  }
};

let initialized: ResolvedOptions | null = null;

const applyConsent = (options: ResolvedOptions, choices: ConsentChoices) => {
  const state = toGtagState(options.categories, choices);
  gtag('consent', 'update', state);
  if (options.dataLayerEvent) {
    window.dataLayer!.push({ event: options.dataLayerEvent, consent: { ...state }, choices });
  }
  return state;
};

// Sends the consent default and any stored choice to gtag.
// Call it before the Google tag loads. Only the first call takes effect.
export const initGoogleConsent = (options?: GoogleConsentOptions): ConsentChoices | null => {
  if (typeof window === 'undefined') return null; // Server render: nothing to send yet.
  if (!initialized) {
    initialized = resolveOptions(options);
    const { categories, setDefault, waitForUpdate, adsDataRedaction, urlPassthrough, regions } =
      initialized;
    if (setDefault) {
      const denied = { ...toGtagState(categories, {}), wait_for_update: waitForUpdate };
      if (regions?.length) {
        gtag('consent', 'default', {
          ...denied,
          region: regions === 'EEA' ? EEA_REGIONS : regions,
        });
        gtag('consent', 'default', toGtagState(categories, allChoices(categories, true)));
      } else {
        gtag('consent', 'default', denied);
      }
      if (adsDataRedaction) gtag('set', 'ads_data_redaction', true);
      if (urlPassthrough) gtag('set', 'url_passthrough', true);
    }
    const stored = getGoogleConsent();
    if (stored) applyConsent(initialized, stored);
  }
  return getGoogleConsent();
};

// Returns the saved choices, or null when the visitor has not chosen yet or the choice expired.
export const getGoogleConsent = (): ConsentChoices | null => {
  const options = initialized ?? resolveOptions();
  const stored = readStored(options.storageKey);
  return isStoredConsentValid(stored, options) ? stored.choices : null;
};

export const saveGoogleConsent = (choices: ConsentChoices) => {
  const options = initialized ?? resolveOptions();
  const state = applyConsent(options, choices);
  writeStored(options.storageKey, { version: options.version, timestamp: Date.now(), choices });
  options.onChange?.(choices, state);
};

export const getConsentCategories = () => (initialized ?? resolveOptions()).categories;

export const OPEN_EVENT = 'antd-google-consent-modal:open';

// Reopens the modal, such as from a "Cookie settings" link in the footer.
export const openGoogleConsentPreferences = () => window.dispatchEvent(new Event(OPEN_EVENT));
