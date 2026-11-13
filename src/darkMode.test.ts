import { describe, expect, it, vi } from 'vitest';

import { detectDarkMode, isDarkColor, resolveDarkMode, watchDarkMode } from './darkMode';

describe('isDarkColor', () => {
  it.each([
    ['rgb(10, 10, 10)', true],
    ['rgb(255, 255, 255)', false],
    ['rgba(10, 10, 10, 1)', true],
    ['rgba(250, 250, 250, 0.9)', false],
    ['rgb(10 10 10 / 0.8)', true],
    ['rgb(250 250 250)', false],
    ['rgb(10 10 10 / 80%)', true],
  ])('%s -> %s', (color, expected) => {
    expect(isDarkColor(color)).toBe(expected);
  });

  it.each([['rgba(0, 0, 0, 0)'], ['rgba(0, 0, 0, 0.4)'], ['transparent'], ['']])(
    '%j -> null',
    (color) => {
      expect(isDarkColor(color)).toBeNull();
    }
  );
});

describe('detectDarkMode', () => {
  it('dark class on html', () => {
    document.documentElement.classList.add('dark');
    expect(detectDarkMode()).toBe(true);
  });

  it('light class on html', () => {
    document.documentElement.classList.add('light');
    expect(detectDarkMode()).toBe(false);
  });

  it('data-theme dark on body', () => {
    document.body.setAttribute('data-theme', 'dark');
    expect(detectDarkMode()).toBe(true);
  });

  it('data-bs-theme night', () => {
    document.documentElement.setAttribute('data-bs-theme', 'night');
    expect(detectDarkMode()).toBe(true);
  });

  it('data-theme light', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(detectDarkMode()).toBe(false);
  });

  it('dark body background', () => {
    document.body.style.background = 'rgb(10, 10, 10)';
    expect(detectDarkMode()).toBe(true);
  });

  it('light body background', () => {
    document.body.style.background = 'rgb(250, 250, 250)';
    expect(detectDarkMode()).toBe(false);
  });

  it('nothing set', () => {
    expect(detectDarkMode()).toBe(false);
  });

  // The colorScheme branch is skipped: jsdom does not compute the color-scheme property.
});

describe('resolveDarkMode', () => {
  it('passes booleans through', () => {
    expect(resolveDarkMode(true)).toBe(true);
    expect(resolveDarkMode(false)).toBe(false);
  });

  it('uses the function result', () => {
    expect(resolveDarkMode(() => true)).toBe(true);
    expect(resolveDarkMode(() => false)).toBe(false);
  });

  it('auto detects the page', () => {
    document.documentElement.classList.add('dark');
    expect(resolveDarkMode('auto')).toBe(true);
  });
});

describe('watchDarkMode', () => {
  it('runs the callback on a class toggle until unsubscribed', async () => {
    const onChange = vi.fn();
    const stop = watchDarkMode(onChange);
    document.documentElement.classList.add('dark');
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    stop();
    onChange.mockClear();
    document.documentElement.classList.remove('dark');
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).not.toHaveBeenCalled();
  });
});
