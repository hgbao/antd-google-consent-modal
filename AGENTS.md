# AGENTS.md

## Orientation

`antd-google-consent-modal`: a Google Consent Mode v2 banner built on antd, published to npm as a React component and a script-tag bundle.

Stack: React 19 and antd 6 for development, peers `react`/`react-dom` `^18 || ^19` and `antd` `^5.21 || ^6`. TypeScript ~6.0, Rollup 4, npm, Node 24+, ESLint 10 (flat config), Prettier 3, Vitest.

## Layout

- `src/index.ts`: module entry, side-effect free. Built to `dist/index.cjs`, `dist/index.esm.js`, `dist/index.d.ts`.
- `src/browser.tsx`: script-tag entry. Built as an IIFE (`dist/index.min.js`, global `AntdGoogleConsentModal`) that auto-runs from `window.AntdGoogleConsentModalConfig`.
- `src/consent.ts`: options, categories, gtag calls, localStorage, dataLayer event. No React.
- `src/darkMode.ts`: host page dark mode detection and watching.
- `src/GoogleConsentModal.tsx`: the antd modal component and its props.
- `src/global.d.ts`: `Window` typings.
- `src/*.test.ts(x)`: tests, next to the source they cover. `src/test/setup.ts`: jsdom setup.
- `rollup.config.mjs`, `index.html` (dev page with fake gtag).

## Commands

```sh
npm install    # also installs husky hooks
npm run dev      # watch build + http://localhost:3001 demo page. Does not open a browser.
npm test         # vitest run (jsdom)
npm run test:watch
npm run lint      # tsc --noEmit, eslint, prettier --check
npm run format
npm run build
npm run depcheck
```

## Rules

Supported use cases:

- React app, installed from npm.
- Any webpage via the CDN script tag (`dist/index.min.js` in `<head>`), rendered in a Shadow DOM.

Rules:

- Changes must work in both use cases.
- Never break `window.AntdGoogleConsentModalConfig` or `window.AntdGoogleConsentModal` within a minor version.
- Keep the `'use client'` banner on the module builds.
- Keep the shadow-root mount and the 100000 `zIndexPopupBase` default in `src/browser.tsx`, so it stays above admin bars and sticky headers.
- On 0.x, a breaking change bumps the minor version.
- Peers stay external in the cjs/esm builds. The IIFE bundles them.
- Never add runtime `dependencies`.
- Style only with antd theme tokens. No raw hex or px colors, so the host brand color and dark mode apply.
- Send the consent default synchronously, before the Google tag.
- Accept and reject keep equal prominence (GDPR).
- Every user-facing string goes through `texts`.
- Document every new option in the README tables.
- Tests live next to the source as `*.test.ts(x)`, run with Vitest. Use `vi.resetModules()` + dynamic import for fresh consent state.
- Run `npm run lint && npm test && npm run build` before finishing.
- Dependencies: use `^` matching the locked version. TypeScript is the exception and stays at `~6.0`.
- Release through the `release` branch (`git push origin main:release`) after bumping `version`.

## Don't

- Commit `dist/`.
- Use `@ts-ignore`.
- Add a CSS or SCSS pipeline.
