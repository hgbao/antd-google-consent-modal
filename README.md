# antd-google-consent-modal

A cookie consent banner for Google Consent Mode v2, built on Ant Design.
It sets the consent default, asks the visitor, and sends `gtag('consent', 'update', ...)` for Google Ads and Google Analytics.
Use it as a React component, or as a single script tag bundle.

## Supported use cases

Exactly two use cases are supported. Both are first-class and must keep working.

1. **React app**: installed from npm, `import GoogleConsentModal from 'antd-google-consent-modal'`, rendered inside the app's own antd `ConfigProvider`.
   It shares the app's antd and React, and follows its theme.
   The ESM and CJS builds start with `'use client'`, so it works in the Next.js App Router.
2. **Any website, via script tag (no build step)**: paste two `<script>` tags into the page `<head>`, before the Google tag: a config script and the pinned CDN script (`dist/index.min.js`).
   It works on plain static HTML, WordPress, Shopify, Webflow, Wix, Squarespace, Ghost, Hugo or Jekyll templates, server-rendered pages, and any other site where you can edit the `<head>`.
   It bundles its own React and antd (about 178 KB gzipped, 550 KB minified).
   It renders inside a Shadow DOM, so the host page's CSS cannot restyle it.
   It defaults `zIndexPopupBase` to 100000, so it sits above admin bars and sticky headers.
   Override it with `theme.token.zIndexPopupBase`.

Test every change against both entries: `src/index.ts` (React) and `src/browser.tsx` (script tag).
Keep the `window` config and global API stable within a minor version, since script tag sites pick up a new build without an npm upgrade.

## Features

- Consent `default` and `update` calls for Google Consent Mode v2.
- Custom categories mapped to any Google consent types.
- "Necessary only" as a one-click choice, as prominent as "Accept all".
- A customize view with one toggle per category.
- Region defaults: deny only in the EEA (or any region list) and grant elsewhere.
- A `dataLayer` event for Google Tag Manager triggers.
- An optional floating settings button to change or withdraw consent.
- Versioned and expiring consent, so you can ask again when needed.
- Follows the host theme and dark mode.
- Honors the system "reduced motion" setting.
- Responsive down to small phones.

## Install

```sh
npm install antd-google-consent-modal
```

Peer dependencies: `antd` (`^5.21 || ^6`), `react` and `react-dom` (`^18 || ^19`).
The script tag bundle needs none of them, it includes everything.

## Quick start: React

Call `initGoogleConsent(options)` at your app entry, before the Google tag is configured.
It sends the consent default and any saved choice to `gtag` synchronously.
Then render `<GoogleConsentModal />` once, near the root, inside your app's `ConfigProvider`.
It requires the app's `antd` (`^5.21 || ^6`) and `react` (`^18 || ^19`).

```tsx
import { ConfigProvider } from 'antd';
import GoogleConsentModal, { initGoogleConsent } from 'antd-google-consent-modal';

initGoogleConsent({ version: 1 });

export const App = () => (
  <ConfigProvider>
    <GoogleConsentModal privacyPolicyUrl="/privacy" texts={{ title: 'Cookies' }} />
    {/* ... */}
  </ConfigProvider>
);
```

The modal opens by itself when the visitor has not chosen yet, or the saved choice expired or has an older `version`.

Recommended `<head>` order. The app bundle that calls `initGoogleConsent` must run before the Google tag starts sending hits:

```html
<head>
  <!-- 1. Your app bundle, which calls initGoogleConsent() at startup -->
  <script type="module" src="/assets/app.js"></script>
  <!-- 2. Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
```

If your app bundle loads late, use the script tag setup below.
Or, when `index.html` loads the Google tag before the bundle, put your own inline `gtag('consent', 'default', ...)` snippet in `<head>` before the Google tag and pass `setDefault: false`.

Other helpers:

- `openGoogleConsentPreferences()` reopens the modal on the customize view. Use it for a "Cookie settings" link in the footer.
- `getGoogleConsent()` returns the saved choices (`{ analytics: true, ... }`), or `null` when there is no valid choice.
- `EEA_REGIONS` and `DEFAULT_CATEGORIES` are exported too.

## Quick start: script tag

For any webpage: paste this into the `<head>`.
Set the config object before the script, and load the script before the Google tag (`gtag.js`) snippet, so the consent default is sent first.
Do not add `async` or `defer` to the CDN script.

```html
<head>
  <!-- 1. Config -->
  <script>
    window.AntdGoogleConsentModalConfig = {
      privacyPolicyUrl: 'https://example.com/privacy',
      texts: { title: 'Cookies' },
    };
  </script>
  <!-- 2. Consent modal (no async or defer) -->
  <script src="https://cdn.jsdelivr.net/npm/antd-google-consent-modal@0.1/dist/index.min.js"></script>
  <!-- 3. Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
```

unpkg works too: `https://unpkg.com/antd-google-consent-modal@0.1/dist/index.min.js`.

Always pin the version.
An unversioned URL serves every new release, including breaking ones.
`@0.1` takes patch fixes only.
Bump it deliberately, after reading the release notes.

The bundle includes React and Ant Design and renders the modal on load.
It is exposed as `window.AntdGoogleConsentModal`:

- Set `autoRender: false` in the config, then call `AntdGoogleConsentModal.render(config)` when you are ready.
- `AntdGoogleConsentModal.open()` reopens the preferences, such as from a button.
- `AntdGoogleConsentModal.getGoogleConsent()` returns the saved choices.

## Adding it to an existing website

Rules that apply to every site:

1. Put both scripts (config, then CDN file) in the `<head>` of every page, before any Google tag: gtag.js, Google Tag Manager, or an analytics plugin or app.
2. Do not add `async` or `defer` to the CDN script.
3. Exclude the CDN URL and the inline config from any "delay", "defer" or "combine JavaScript" optimization feature.
   This covers CMS optimization plugins and CDN features such as Cloudflare Rocket Loader.
   Delayed loading breaks the consent default.
4. If another tool already sends `gtag('consent', 'default', ...)`, do one of:
   - Turn its consent mode off. Recommended, so `regions`, `wait_for_update` and redaction come from this library.
   - Or set `setDefault: false`.
5. Test.
   Open the site in a private window and check that the banner shows.
   Check the DevTools console for `dataLayer` entries.
   View the page source to confirm both scripts come before the Google tag.

Notes:

- Page caching is fine. The choice is stored in the visitor's `localStorage`, not on the server.
- Dark mode: `darkMode: 'auto'` (the default) follows the page's dark class, attribute or background.
- Brand color: `theme: { token: { colorPrimary: '#0f766e' } }`.
- To let visitors reopen the preferences, add `<a href="#" onclick="AntdGoogleConsentModal.open(); return false;">Cookie settings</a>` in the footer, or use `settingsButton: true`.

### Platform notes

Where the `<head>` code goes. Menu names typically look like this, but UIs change.

- **Static HTML, Hugo, Jekyll, server-rendered pages**: edit the shared layout or template that outputs `<head>`.
- **WordPress**: a header-code plugin such as WPCode, set to site-wide header.
  Or in the theme's `functions.php`, where priority 1 prints it before plugins that add the Google tag:

  ```php
  add_action('wp_head', function () { ?>
    <script>
      window.AntdGoogleConsentModalConfig = { privacyPolicyUrl: '/privacy-policy/' };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/antd-google-consent-modal@0.1/dist/index.min.js"></script>
  <?php }, 1);
  ```

- **Shopify**: `theme.liquid`, inside `<head>` above `{{ content_for_header }}`.
- **Webflow**: Site settings, Custom code, Head code.
- **Wix**: Settings, Custom code, Head. Load it on all pages.
- **Squarespace**: Settings, Advanced, Code injection, Header.
- **Google Tag Manager users**: the snippet must be in the page source, not inside a GTM tag, since it must run before GTM.

## Reference

### Options

These work as component props, as `initGoogleConsent` options, and in the script tag config.

| Option             | Default                                          | Description                                                                                                                  |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `categories`       | Necessary, Analytics, Marketing, Personalization | Consent categories. See [Categories](#categories).                                                                           |
| `version`          | `1`                                              | `string` or `number`. Bump it to ask every visitor again, such as after adding a category.                                   |
| `expiryDays`       | `180`                                            | Days a saved choice stays valid.                                                                                             |
| `storageKey`       | `'googleConsent'`                                | `localStorage` key of the saved choice.                                                                                      |
| `setDefault`       | `true`                                           | Send `gtag('consent', 'default', ...)`. Set `false` if your page already sends one.                                          |
| `waitForUpdate`    | `500`                                            | `wait_for_update` in milliseconds of the default.                                                                            |
| `adsDataRedaction` | `true`                                           | Send `gtag('set', 'ads_data_redaction', true)` with the default. Google applies it only while `ad_storage` is denied.        |
| `urlPassthrough`   | `false`                                          | Send `gtag('set', 'url_passthrough', true)`.                                                                                 |
| `regions`          | unset                                            | `string[]` of ISO 3166-2 codes, or `'EEA'`. See [Region defaults](#region-defaults).                                         |
| `dataLayerEvent`   | `'google_consent_update'`                        | Event name pushed to `dataLayer` after each consent update. `false` disables. See [Google Tag Manager](#google-tag-manager). |
| `onChange`         | none                                             | Called with `(choices, state)` after the visitor saves.                                                                      |

### Component props

Besides the options above, the component and the script tag config accept:

| Prop               | Default                      | Description                                                                                   |
| ------------------ | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `texts`            | see [Texts](#texts)          | Partial override of the modal texts.                                                          |
| `privacyPolicyUrl` | none                         | Adds a link after the description, labeled `texts.privacyPolicy`, opening in a new tab.       |
| `settingsButton`   | `false`                      | Shows a floating button (`texts.settings`) after a choice is made, to reopen the preferences. |
| `darkMode`         | unset (`'auto'` for scripts) | `'auto'`, `boolean` or `() => boolean`. See [Theming and dark mode](#theming-and-dark-mode).  |
| `getContainer`     | `document.body`              | Where the modal mounts. The script tag build passes its shadow-root container.                |

### Script tag only

| Option       | Default | Description                                                                            |
| ------------ | ------- | -------------------------------------------------------------------------------------- |
| `autoRender` | `true`  | Render on load. Set `false` and call `AntdGoogleConsentModal.render(config)` yourself. |
| `theme`      | none    | Ant Design `ThemeConfig`, for example `{ token: { colorPrimary: '#0f766e' } }`.        |

### Texts

Every user-facing string can be overridden with `texts`.

| Key               | Default                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | We use cookies                                                                                                                                                        |
| `description`     | We use cookies to make your experience better and to show you personalized content. You can accept all cookies, keep only the necessary ones, or choose for yourself. |
| `acceptAll`       | Accept all                                                                                                                                                            |
| `acceptNecessary` | Necessary only                                                                                                                                                        |
| `customize`       | Customize                                                                                                                                                             |
| `save`            | Save preferences                                                                                                                                                      |
| `privacyPolicy`   | Privacy policy                                                                                                                                                        |
| `settings`        | Cookie settings                                                                                                                                                       |
| `alwaysActive`    | Always active                                                                                                                                                         |
| `close`           | Close                                                                                                                                                                 |

## Categories

Each category has a `key`, a `title`, an optional `description`, a `required` flag, and the Google `consentTypes` it controls.
When the visitor grants a category, every consent type in it is sent as `granted`.
All other consent types stay `denied`.
A category with `required: true` is always granted, cannot be switched off, and shows as "Always active" (`texts.alwaysActive`).

Default categories:

| Key           | Title           | Consent types                                      | Required |
| ------------- | --------------- | -------------------------------------------------- | -------- |
| `necessary`   | Necessary       | `security_storage`, `functionality_storage`        | yes      |
| `analytics`   | Analytics       | `analytics_storage`                                | no       |
| `marketing`   | Marketing       | `ad_storage`, `ad_user_data`, `ad_personalization` | no       |
| `preferences` | Personalization | `personalization_storage`                          | no       |

A custom list replaces the defaults:

```ts
initGoogleConsent({
  categories: [
    {
      key: 'necessary',
      title: 'Necessary',
      required: true,
      consentTypes: ['security_storage', 'functionality_storage'],
    },
    {
      key: 'ads',
      title: 'Advertising',
      description: 'Used to show and measure ads.',
      consentTypes: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    },
  ],
});
```

Consent types: `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`, `functionality_storage`, `personalization_storage`, `security_storage`.

## Buttons and behavior

- **Accept all** grants every category.
- **Necessary only** grants required categories only.
- **Customize** opens one toggle per category, with **Save preferences** to confirm.
  Accept all and Necessary only stay available there.
- Closing the modal on the first visit counts as Necessary only.
- Closing it after reopening (for example from the settings button) keeps the saved choice.

The choice is saved in `localStorage` under `googleConsent` (see `storageKey`) as `{ version, timestamp, choices }`.
It expires after `expiryDays`, and a different `version` invalidates it.
In both cases the visitor sees the modal again.
If storage is blocked, the choice still applies to the current page view.

## Theming and dark mode

The modal uses only antd theme tokens, so it follows your brand color, spacing and mode.
In React, wrap it in your app's `ConfigProvider`.
With the script tag, pass `theme` in `window.AntdGoogleConsentModalConfig`.

`darkMode` controls light or dark:

- Unset (the React default): inherits the algorithm of your app's `ConfigProvider`.
- `'auto'` (the script tag default): follows the host page. It checks, in order:
  1. a `dark` or `light` class on `<html>` or `<body>`,
  2. a `data-theme`, `data-mode`, `data-color-scheme` or `data-bs-theme` attribute containing `dark` or `night`,
  3. the luminance of the page background color,
  4. the CSS `color-scheme`. If it declares both light and dark, the OS preference decides.

  It re-checks live when those classes or attributes change, and when the OS setting changes.

- `true` or `false`: force dark or light.
- `() => boolean`: let your site report its own mode. It is called on every re-check.

Animations are turned off when the visitor's system asks for reduced motion.

## Region defaults

By default the consent default is `denied` everywhere.
Set `regions` to deny only in some places and grant elsewhere.
It takes ISO 3166-2 codes, or `'EEA'`, which uses the exported `EEA_REGIONS` (EU, IS, LI, NO, GB, CH).

```ts
initGoogleConsent({ regions: 'EEA' }); // or regions: ['DE', 'FR', 'US-CA']
```

This sends two `gtag('consent', 'default', ...)` calls: `denied` with the `region` list, and a region-less `granted` one that applies to everyone else.
The banner still shows to all visitors.

## Google Tag Manager

After each consent update, `{ event, consent, choices }` is pushed to `dataLayer`.
`consent` is the gtag state (`ad_storage: 'granted'`, ...) and `choices` the category choices.
It fires on page load when a saved choice exists, and when the visitor saves.

In GTM, create a Custom Event trigger with event name `google_consent_update` (or your `dataLayerEvent`).
Use it to fire tags that need to re-run once consent is known.
Set `dataLayerEvent: false` to turn it off.

## Consent Mode checklist

- Send the consent default before any Google tag loads.
- Keep `waitForUpdate` so tags wait briefly for a saved choice.
- Make rejecting as easy as accepting: keep "Necessary only" next to "Accept all".
- Link your privacy policy with `privacyPolicyUrl`.
- Let visitors withdraw consent later: enable `settingsButton`, or link a "Cookie settings" control to `open()` or `openGoogleConsentPreferences()`.
- Bump `version` when you add or change categories.

## Limitations

This is not an IAB TCF v2 CMP and is not Google-certified.
Sites that serve ads in the EEA, UK or Switzerland with AdSense, Ad Manager or AdMob must use a Google-certified CMP that implements TCF.
Use this library for Google Analytics and Google Ads consent mode only.

## Migrating from 0.0.x

- The storage key changed from `googleConsentStatus` to `googleConsent`, so returning visitors are asked once more.
- `window.AntdGoogleConsentModal` now exposes `render`, `open`, and `getGoogleConsent`.
- Config moves to `window.AntdGoogleConsentModalConfig`.
- `react`, `react-dom` and `antd` are now peer dependencies.

## Development

Prerequisites: Node 24+.

```sh
npm install    # also installs the husky git hooks
npm run dev       # watch build, serves http://localhost:3001 (does not open a browser)
npm test          # vitest run (jsdom)
npm run test:watch # vitest watch mode
npm run lint      # tsc, eslint and prettier check
npm run format    # eslint --fix and prettier --write
npm run build     # builds dist/
npm run depcheck  # finds unused or missing dependencies
```

The dev page has a fake `gtag` that logs every call, plus "Cookie settings", "Reset consent" and "Toggle dark site" buttons.

`npm run build` writes to `dist/`:

- `index.cjs` and `index.esm.js`: module builds, peers stay external.
- `index.d.ts`: types.
- `index.min.js`: the script tag bundle (IIFE) with React and antd included.
- Source maps for each JavaScript file.

Project layout:

```
index.html                Dev page with a fake gtag logger
rollup.config.mjs         Builds cjs, esm, d.ts and the IIFE; dev server in watch mode
src/
  index.ts                Module entry: re-exports, no side effects
  browser.tsx             Script tag entry: reads the config and renders on load
  consent.ts              Consent logic: gtag calls, storage, options, categories
  consent.test.mjs        Tests for consent.ts
  darkMode.ts             Host page dark mode detection and watching
  darkMode.test.mjs       Tests for darkMode.ts
  GoogleConsentModal.tsx  The antd modal component and its props
  global.d.ts             Window typings (dataLayer, gtag, config)
```

TypeScript is held at `~6.0`: `typescript-eslint` supports `<6.1.0`, and TypeScript 7 has no JavaScript compiler API for the rollup plugins.

## Deployment

Releases are published to npm by a GitHub Actions workflow when `release` is pushed.
Follow these steps in order to set it up from nothing.

### One-time setup

Publishing uses npm trusted publishing: npm trusts this repository's workflow through GitHub's OIDC token, so no npm token is stored and nothing expires.

1. Create an npm account, or use the one that owns the package, with two-factor authentication on.
   The package name `antd-google-consent-modal` must be free, or owned by you.
2. Trusted publishing can only be set on a package that already exists.
   If the package has never been published, publish the first version from your machine: `npm login`, `npm run build`, `npm publish --access public`.
3. On npmjs.com, open the package, then Settings, then Trusted Publisher, and choose GitHub Actions:
   - Organization or user: `hgbao`
   - Repository: `antd-google-consent-modal`
   - Workflow filename: `npm-publish.yml`
   - Environment name: leave empty
4. On the same Settings page, under Publishing access, choose "Require two-factor authentication and disallow tokens" and save.
   Trusted publishing keeps working, and leaked tokens can no longer publish.
5. Create `.github/workflows/npm-publish.yml` with these properties:
   - Trigger: `push` on branch `release`.
   - Permissions: `contents: read` and `id-token: write` (trusted publishing and provenance need it).
   - Runner `ubuntu-latest` (trusted publishing needs a GitHub-hosted runner): checkout, `actions/setup-node` with Node 24 (npm 11.5.1 or newer), `cache: npm` and `registry-url: https://registry.npmjs.org`.
   - Steps in order: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm publish --provenance --access public`.
   - No `NODE_AUTH_TOKEN` and no npm secret.
6. Create the `release` branch from `main` and push it: `git push origin main:release`.

If a publish fails with `E404` or `ENEEDAUTH`, check that the three Trusted Publisher fields match the repository and workflow file name exactly.

### Releasing

1. On `main`, bump `version` in `package.json` (semver).
2. Commit the change.
3. Push `main` into `release`: `git push origin main:release`.
4. Watch the run in the repository's Actions tab.
5. Verify the new version on npmjs.com and at `https://cdn.jsdelivr.net/npm/antd-google-consent-modal@<version>/dist/index.min.js`.

npm refuses to publish a version that already exists, so every release needs a new `version`.

While on 0.x, a breaking change must bump the minor version (for example 0.1 to 0.2), so sites that load the script tag and pin `@0.1` do not break.
Those sites then update the CDN URL by hand.

## License

MIT
