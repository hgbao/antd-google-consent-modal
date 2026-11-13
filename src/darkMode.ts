// Detects whether the host page is dark, so the modal can follow the site's own mode.

// 'auto' follows the host page. A function lets the site report its own mode.
export type DarkMode = 'auto' | boolean | (() => boolean);

const DARK_VALUES = ['dark', 'night'];
const MODE_ATTRIBUTES = ['data-theme', 'data-mode', 'data-color-scheme', 'data-bs-theme'];

// Parses rgb()/rgba() from getComputedStyle. Returns null for transparent or unknown values.
export const isDarkColor = (color: string): boolean | null => {
  const match = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/);
  if (!match) return null;
  const alpha =
    match[4] === undefined ? 1 : parseFloat(match[4]) / (match[4].endsWith('%') ? 100 : 1);
  if (alpha < 0.5) return null;
  const [r, g, b] = [match[1], match[2], match[3]].map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5; // Perceived brightness.
};

const markerMode = (element: Element): boolean | null => {
  if (element.classList.contains('dark')) return true;
  if (element.classList.contains('light')) return false;
  for (const name of MODE_ATTRIBUTES) {
    const value = element.getAttribute(name)?.toLowerCase();
    if (value) return DARK_VALUES.some((dark) => value.includes(dark));
  }
  return null;
};

// Order: explicit class or data attribute, then the page background, then CSS color-scheme.
export const detectDarkMode = (): boolean => {
  const roots = [document.documentElement, document.body].filter(Boolean);
  for (const root of roots) {
    const mode = markerMode(root);
    if (mode !== null) return mode;
  }
  for (const root of roots) {
    const mode = isDarkColor(getComputedStyle(root).backgroundColor);
    if (mode !== null) return mode;
  }
  const scheme = getComputedStyle(document.documentElement).colorScheme;
  if (scheme.includes('dark')) {
    return !scheme.includes('light') || window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false; // A page that declares nothing renders light.
};

export const resolveDarkMode = (mode: DarkMode): boolean =>
  typeof mode === 'function' ? mode() : mode === 'auto' ? detectDarkMode() : mode;

// Calls onChange when the host page may have switched mode. Returns the unsubscribe function.
export const watchDarkMode = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  const options = { attributes: true, attributeFilter: ['class', 'style', ...MODE_ATTRIBUTES] };
  observer.observe(document.documentElement, options);
  if (document.body) observer.observe(document.body, options);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', onChange);
  };
};
