import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsentCategory } from './consent';

type Consent = Awaited<ReturnType<typeof importConsent>>;
const importConsent = () => import('./consent');

const load = async (): Promise<Consent> => {
  vi.resetModules();
  return importConsent();
};

const calls = () =>
  (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
const gtagCalls = (...prefix: unknown[]) =>
  calls().filter((c) => prefix.every((p, i) => c[i] === p));
const store = (value: unknown, key = 'googleConsent') =>
  localStorage.setItem(key, JSON.stringify(value));
const valid = (choices: Record<string, boolean>, extra = {}) => ({
  version: 1,
  timestamp: Date.now(),
  choices,
  ...extra,
});
const ALL_TYPES = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

describe('toGtagState', () => {
  it('necessary only grants only required types', async () => {
    const c = await load();
    const state = c.toGtagState(c.DEFAULT_CATEGORIES, c.allChoices(c.DEFAULT_CATEGORIES, false));
    expect(Object.keys(state).filter((k) => state[k as keyof typeof state] === 'granted')).toEqual(
      ['security_storage', 'functionality_storage'].sort(
        (a, b) => ALL_TYPES.indexOf(a) - ALL_TYPES.indexOf(b)
      )
    );
  });

  it('custom choice grants only the chosen category', async () => {
    const c = await load();
    const state = c.toGtagState(c.DEFAULT_CATEGORIES, { analytics: true });
    expect(state.analytics_storage).toBe('granted');
    expect(state.ad_storage).toBe('denied');
    expect(state.personalization_storage).toBe('denied');
  });

  it('accept all grants all 7 types', async () => {
    const c = await load();
    const state = c.toGtagState(c.DEFAULT_CATEGORIES, c.allChoices(c.DEFAULT_CATEGORIES, true));
    expect(Object.keys(state)).toHaveLength(7);
    expect(Object.values(state).every((v) => v === 'granted')).toBe(true);
  });

  it('keeps a type listed in no category denied', async () => {
    const c = await load();
    const categories: ConsentCategory[] = [
      { key: 'a', title: 'A', consentTypes: ['analytics_storage'] },
    ];
    const state = c.toGtagState(categories, { a: true });
    expect(state.ad_storage).toBe('denied');
    expect(state.analytics_storage).toBe('granted');
  });
});

describe('allChoices', () => {
  it('keeps required categories true when denying', async () => {
    const c = await load();
    expect(c.allChoices(c.DEFAULT_CATEGORIES, false)).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  });
});

describe('parseStored', () => {
  it('round-trips a valid record', async () => {
    const c = await load();
    const record = valid({ necessary: true });
    expect(c.parseStored(JSON.stringify(record))).toEqual(record);
  });

  it.each([
    ['malformed JSON', '{nope'],
    ['null', null],
    ['old granted value', '"granted"'],
    ['no choices', JSON.stringify({ version: 1, timestamp: 1 })],
    ['non-number timestamp', JSON.stringify({ version: 1, timestamp: '1', choices: {} })],
  ])('returns null for %s', async (_name, raw) => {
    const c = await load();
    expect(c.parseStored(raw)).toBeNull();
  });
});

describe('isStoredConsentValid', () => {
  const day = 24 * 60 * 60 * 1000;
  const now = 10 * day;
  const options = (c: Consent) => ({
    version: 1,
    expiryDays: 1,
    categories: c.DEFAULT_CATEGORIES,
  });
  const full = { necessary: true, analytics: true, marketing: false, preferences: false };

  it('accepts a valid record', async () => {
    const c = await load();
    expect(
      c.isStoredConsentValid({ version: 1, timestamp: now - 1000, choices: full }, options(c), now)
    ).toBe(true);
  });

  it('rejects another version', async () => {
    const c = await load();
    expect(
      c.isStoredConsentValid({ version: 2, timestamp: now - 1000, choices: full }, options(c), now)
    ).toBe(false);
  });

  it('rejects an expired record', async () => {
    const c = await load();
    expect(
      c.isStoredConsentValid(
        { version: 1, timestamp: now - 2 * day, choices: full },
        options(c),
        now
      )
    ).toBe(false);
  });

  it('rejects a record missing an optional category', async () => {
    const c = await load();
    const { marketing: _, ...choices } = full;
    expect(
      c.isStoredConsentValid({ version: 1, timestamp: now - 1000, choices }, options(c), now)
    ).toBe(false);
  });

  it('accepts a record missing a required category', async () => {
    const c = await load();
    const { necessary: _, ...choices } = full;
    expect(
      c.isStoredConsentValid({ version: 1, timestamp: now - 1000, choices }, options(c), now)
    ).toBe(true);
  });

  it('rejects null', async () => {
    const c = await load();
    expect(c.isStoredConsentValid(null, options(c), now)).toBe(false);
  });
});

describe('initGoogleConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends the default and redaction with no stored choice', async () => {
    const c = await load();
    expect(c.initGoogleConsent()).toBeNull();
    const entries = window.dataLayer!;
    expect(entries).toHaveLength(2);
    for (const e of entries) expect(Object.prototype.toString.call(e)).toBe('[object Arguments]');
    expect(calls()[0]).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'granted',
        personalization_storage: 'denied',
        security_storage: 'granted',
        wait_for_update: 500,
      },
    ]);
    expect(calls()[1]).toEqual(['set', 'ads_data_redaction', true]);
    expect(gtagCalls('set', 'url_passthrough')).toHaveLength(0);
  });

  it('EEA regions send a denied default then a granted default', async () => {
    const c = await load();
    c.initGoogleConsent({ regions: 'EEA' });
    const defaults = gtagCalls('consent', 'default');
    expect(defaults).toHaveLength(2);
    const first = defaults[0][2] as Record<string, unknown>;
    const second = defaults[1][2] as Record<string, unknown>;
    expect(first.region).toEqual(c.EEA_REGIONS);
    expect(first.analytics_storage).toBe('denied');
    expect(first.wait_for_update).toBe(500);
    expect(second.region).toBeUndefined();
    expect(Object.values(second).every((v) => v === 'granted')).toBe(true);
  });

  it('passes an explicit region list through', async () => {
    const c = await load();
    c.initGoogleConsent({ regions: ['US-CA'] });
    expect((gtagCalls('consent', 'default')[0][2] as { region: string[] }).region).toEqual([
      'US-CA',
    ]);
  });

  it('setDefault false sends no default and no set calls', async () => {
    const c = await load();
    c.initGoogleConsent({ setDefault: false });
    expect(gtagCalls('consent', 'default')).toHaveLength(0);
    expect(gtagCalls('set')).toHaveLength(0);
  });

  it('urlPassthrough sends set url_passthrough', async () => {
    const c = await load();
    c.initGoogleConsent({ urlPassthrough: true });
    expect(gtagCalls('set', 'url_passthrough', true)).toHaveLength(1);
  });

  it('adsDataRedaction false skips the redaction call', async () => {
    const c = await load();
    c.initGoogleConsent({ adsDataRedaction: false });
    expect(gtagCalls('set', 'ads_data_redaction')).toHaveLength(0);
  });

  describe('with a valid stored choice', () => {
    const choices = { necessary: true, analytics: true, marketing: false, preferences: false };

    it('returns the choices and sends the update and event', async () => {
      store(valid(choices));
      const c = await load();
      expect(c.initGoogleConsent()).toEqual(choices);
      const [update] = gtagCalls('consent', 'update');
      const state = c.toGtagState(c.DEFAULT_CATEGORIES, choices);
      expect(update[2]).toEqual(state);
      expect(window.dataLayer).toContainEqual({
        event: 'google_consent_update',
        consent: state,
        choices,
      });
    });

    it('renames the event', async () => {
      store(valid(choices));
      const c = await load();
      c.initGoogleConsent({ dataLayerEvent: 'my_event' });
      expect(window.dataLayer).toContainEqual(expect.objectContaining({ event: 'my_event' }));
    });

    it('pushes no event when dataLayerEvent is false', async () => {
      store(valid(choices));
      const c = await load();
      c.initGoogleConsent({ dataLayerEvent: false });
      expect(gtagCalls('consent', 'update')).toHaveLength(1);
      expect(window.dataLayer!.filter((e) => !('length' in (e as object)))).toHaveLength(0);
    });
  });

  it('ignores a stored choice from another version', async () => {
    store(
      valid(
        { necessary: true, analytics: true, marketing: true, preferences: true },
        { version: 2 }
      )
    );
    const c = await load();
    expect(c.initGoogleConsent()).toBeNull();
    expect(gtagCalls('consent', 'update')).toHaveLength(0);
  });

  it('only the first call takes effect', async () => {
    const c = await load();
    c.initGoogleConsent();
    c.initGoogleConsent({
      storageKey: 'other',
      categories: [{ key: 'x', title: 'X', consentTypes: ['ad_storage'] }],
    });
    expect(gtagCalls('consent', 'default')).toHaveLength(1);
    expect(c.getConsentCategories()).toBe(c.DEFAULT_CATEGORIES);
  });

  it('uses an existing window.gtag', async () => {
    const spy = vi.fn();
    window.gtag = spy;
    const c = await load();
    c.initGoogleConsent();
    expect(window.gtag).toBe(spy);
    expect(spy).toHaveBeenCalledWith('consent', 'default', expect.any(Object));
    expect(spy).toHaveBeenCalledWith('set', 'ads_data_redaction', true);
  });

  it('returns null without throwing when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const c = await load();
    expect(c.initGoogleConsent()).toBeNull();
  });
});

describe('saveGoogleConsent', () => {
  const choices = { necessary: true, analytics: true, marketing: false, preferences: false };

  it('writes the record, sends the update and calls onChange', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const onChange = vi.fn();
    const c = await load();
    c.initGoogleConsent({ onChange });
    c.saveGoogleConsent(choices);
    const state = c.toGtagState(c.DEFAULT_CATEGORIES, choices);
    expect(JSON.parse(localStorage.getItem('googleConsent')!)).toEqual({
      version: 1,
      timestamp: Date.parse('2030-01-01T00:00:00Z'),
      choices,
    });
    expect(gtagCalls('consent', 'update')[0][2]).toEqual(state);
    expect(onChange).toHaveBeenCalledWith(choices, state);
  });

  it('honors a custom storageKey and version', async () => {
    const c = await load();
    c.initGoogleConsent({ storageKey: 'k', version: 'v2' });
    c.saveGoogleConsent(choices);
    expect((JSON.parse(localStorage.getItem('k')!) as { version: string }).version).toBe('v2');
    expect(localStorage.getItem('googleConsent')).toBeNull();
    expect(c.getGoogleConsent()).toEqual(choices);
  });

  it('expires a choice older than expiryDays', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const c = await load();
    c.initGoogleConsent({ expiryDays: 2 });
    c.saveGoogleConsent(choices);
    vi.setSystemTime(new Date('2030-01-02T00:00:00Z'));
    expect(c.getGoogleConsent()).toEqual(choices);
    vi.setSystemTime(new Date('2030-01-04T00:00:00Z'));
    expect(c.getGoogleConsent()).toBeNull();
  });

  it('does not throw and still sends the update when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const c = await load();
    c.initGoogleConsent();
    expect(() => c.saveGoogleConsent(choices)).not.toThrow();
    expect(gtagCalls('consent', 'update')).toHaveLength(1);
  });
});

describe('openGoogleConsentPreferences', () => {
  it('dispatches OPEN_EVENT on window', async () => {
    const c = await load();
    const listener = vi.fn();
    window.addEventListener(c.OPEN_EVENT, listener);
    c.openGoogleConsentPreferences();
    window.removeEventListener(c.OPEN_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
