import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ConsentCategory } from './consent';

const setup = async () => {
  vi.resetModules();
  const consent = await import('./consent');
  const { default: GoogleConsentModal } = await import('./GoogleConsentModal');
  return { consent, GoogleConsentModal };
};

const stored = () =>
  JSON.parse(localStorage.getItem('googleConsent')!) as { choices: Record<string, boolean> };
// The header X and a footer button can share a name, and the footer comes last.
const button = (name: string) => screen.getAllByRole('button', { name }).at(-1)!;
// Motion off, so a closed modal leaves the DOM at once in jsdom.
const renderModal = (ui: ReactElement) =>
  render(<ConfigProvider theme={{ token: { motion: false } }}>{ui}</ConfigProvider>);
const lastUpdate = () => {
  const updates = (window.dataLayer ?? [])
    .map((e) => Array.from(e as ArrayLike<unknown>))
    .filter((c) => c[0] === 'consent' && c[1] === 'update');
  return updates[updates.length - 1]?.[2] as Record<string, string>;
};
const dialogGone = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
const firstVisit = async (props: object = {}) => {
  const ctx = await setup();
  renderModal(<ctx.GoogleConsentModal {...props} />);
  await screen.findByRole('dialog');
  return ctx;
};
const savedModal = async (props: object = {}) => {
  const ctx = await setup();
  localStorage.setItem(
    'googleConsent',
    JSON.stringify({
      version: 1,
      timestamp: 1000 + Date.now() - 1000,
      choices: { necessary: true, analytics: true, marketing: false, preferences: false },
    })
  );
  renderModal(<ctx.GoogleConsentModal {...props} />);
  return ctx;
};

describe('GoogleConsentModal', () => {
  it('shows the first-visit dialog', async () => {
    await firstVisit();
    expect(screen.getByRole('dialog', { name: 'We use cookies' })).toBeTruthy();
    for (const name of ['Accept all', 'Necessary only', 'Customize']) {
      expect(button(name)).toBeTruthy();
    }
  });

  it('Accept all stores all true, grants all and closes', async () => {
    await firstVisit();
    fireEvent.click(button('Accept all'));
    expect(stored().choices).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
    expect(Object.values(lastUpdate()).every((v) => v === 'granted')).toBe(true);
    await dialogGone();
  });

  it('Necessary only stores optional categories false', async () => {
    await firstVisit();
    fireEvent.click(button('Necessary only'));
    expect(stored().choices).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  });

  it('Customize shows switches and saves the toggled category', async () => {
    await firstVisit();
    fireEvent.click(button('Customize'));
    expect(await screen.findByText('Always active')).toBeTruthy();
    expect(screen.getAllByRole('switch')).toHaveLength(3);
    expect(screen.queryByRole('switch', { name: 'Necessary' })).toBeNull();
    for (const name of ['Analytics', 'Marketing', 'Personalization']) {
      expect(screen.getByRole('switch', { name })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('switch', { name: 'Analytics' }));
    fireEvent.click(button('Save preferences'));
    expect(stored().choices).toMatchObject({ analytics: true, marketing: false });
  });

  it('the X button on first visit saves necessary only', async () => {
    await firstVisit();
    const close = document.querySelector('.ant-modal-close')!;
    expect(close.getAttribute('aria-label')).toBe('Necessary only');
    fireEvent.click(close);
    expect(stored().choices).toMatchObject({ analytics: false, marketing: false });
  });

  it('a stored choice shows no dialog; reopening shows saved switches; X keeps storage', async () => {
    const { consent } = await savedModal();
    await waitFor(() => expect(window.dataLayer).toBeDefined());
    expect(screen.queryByRole('dialog')).toBeNull();
    const before = localStorage.getItem('googleConsent');
    act(() => {
      consent.openGoogleConsentPreferences();
    });
    await screen.findByRole('dialog');
    expect(screen.getByRole('switch', { name: 'Analytics' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    expect(screen.getByRole('switch', { name: 'Marketing' }).getAttribute('aria-checked')).toBe(
      'false'
    );
    fireEvent.click(button('Close'));
    await dialogGone();
    expect(localStorage.getItem('googleConsent')).toBe(before);
  });

  it('settingsButton appears after a choice and reopens the dialog', async () => {
    await firstVisit({ settingsButton: true });
    expect(screen.queryByRole('button', { name: 'Cookie settings' })).toBeNull();
    fireEvent.click(button('Accept all'));
    await dialogGone();
    fireEvent.click(await screen.findByRole('button', { name: 'Cookie settings' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('texts override labels', async () => {
    await firstVisit({ texts: { title: 'Cookies?', acceptAll: 'Yes' } });
    expect(screen.getByRole('dialog', { name: 'Cookies?' })).toBeTruthy();
    expect(button('Yes')).toBeTruthy();
  });

  it('renders the privacy link only with the prop', async () => {
    await firstVisit({ privacyPolicyUrl: '/privacy' });
    const link = screen.getByRole('link', { name: 'Privacy policy' });
    expect(link.getAttribute('href')).toBe('/privacy');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders no privacy link without the prop', async () => {
    await firstVisit();
    expect(screen.queryByRole('link', { name: 'Privacy policy' })).toBeNull();
  });

  it('custom categories render and save only their keys', async () => {
    const categories: ConsentCategory[] = [
      { key: 'core', title: 'Core', required: true, consentTypes: ['security_storage'] },
      { key: 'stats', title: 'Stats', consentTypes: ['analytics_storage'] },
    ];
    await firstVisit({ categories });
    fireEvent.click(button('Customize'));
    expect(await screen.findAllByRole('switch')).toHaveLength(1);
    expect(screen.getByRole('switch', { name: 'Stats' })).toBeTruthy();
    expect(screen.queryByText('Marketing')).toBeNull();
    fireEvent.click(button('Accept all'));
    expect(Object.keys(stored().choices).sort()).toEqual(['core', 'stats']);
  });

  it('calls onChange once with choices and state', async () => {
    const onChange = vi.fn();
    await firstVisit({ onChange });
    fireEvent.click(button('Accept all'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [choices, state] = onChange.mock.calls[0] as [
      Record<string, boolean>,
      Record<string, string>,
    ];
    expect(choices.analytics).toBe(true);
    expect(state.analytics_storage).toBe('granted');
  });

  it('darkMode auto renders on a dark page', async () => {
    document.documentElement.classList.add('dark');
    await firstVisit({ darkMode: 'auto' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
