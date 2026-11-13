import type { ButtonProps, ModalProps } from 'antd';
import { Button, ConfigProvider, Flex, Grid, Modal, Switch, theme, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';

import type { ConsentCategory, ConsentChoices, GoogleConsentOptions } from './consent';
import {
  allChoices,
  getConsentCategories,
  getGoogleConsent,
  initGoogleConsent,
  OPEN_EVENT,
  openGoogleConsentPreferences,
  saveGoogleConsent,
} from './consent';
import type { DarkMode } from './darkMode';
import { resolveDarkMode, watchDarkMode } from './darkMode';

export interface GoogleConsentTexts {
  title: string;
  description: string;
  acceptAll: string;
  acceptNecessary: string;
  customize: string;
  save: string;
  privacyPolicy: string;
  settings: string;
  alwaysActive: string;
  close: string;
}

export interface GoogleConsentModalProps extends GoogleConsentOptions {
  texts?: Partial<GoogleConsentTexts>;
  privacyPolicyUrl?: string;
  settingsButton?: boolean; // Floating bottom-left button to change consent later.
  getContainer?: ModalProps['getContainer']; // Where the modal mounts. Defaults to document.body.
  darkMode?: DarkMode; // Unset inherits the app's ConfigProvider. 'auto' follows the host page.
}

export const DEFAULT_TEXTS: GoogleConsentTexts = {
  title: 'We use cookies',
  description:
    'We use cookies to make your experience better and to show you personalized content. ' +
    'You can accept all cookies, keep only the necessary ones, or choose for yourself.',
  acceptAll: 'Accept all',
  acceptNecessary: 'Necessary only',
  customize: 'Customize',
  save: 'Save preferences',
  privacyPolicy: 'Privacy policy',
  settings: 'Cookie settings',
  alwaysActive: 'Always active',
  close: 'Close',
};

const matches = (query: string) =>
  typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;

// Returns undefined when mode is unset, so the app's own ConfigProvider decides.
const useDarkMode = (mode?: DarkMode) => {
  const [dark, setDark] = useState<boolean>();
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  });
  // An inline function must not re-subscribe on every render.
  const key = typeof mode === 'function' ? 'function' : mode;
  useEffect(() => {
    if (key === undefined) return;
    const update = () => setDark(resolveDarkMode(modeRef.current ?? false));
    update();
    return watchDarkMode(update);
  }, [key]);
  return mode === undefined ? undefined : dark;
};

interface CategoryListProps {
  categories: ConsentCategory[];
  choices: ConsentChoices;
  onChange: (choices: ConsentChoices) => void;
  alwaysActive: string;
  autoFocus: boolean;
}

const CategoryList = ({
  categories,
  choices,
  onChange,
  alwaysActive,
  autoFocus,
}: CategoryListProps) => {
  const { token } = theme.useToken();
  const firstOptional = categories.find((c) => !c.required)?.key;
  return (
    <Flex vertical gap={token.margin}>
      {categories.map((category) => {
        const id = `consent-${category.key}`;
        const descriptionId = category.description ? `${id}-description` : undefined;
        return (
          <Flex key={category.key} gap={token.margin} align="flex-start" justify="space-between">
            <div>
              <label htmlFor={id}>
                <Typography.Text strong>{category.title}</Typography.Text>
              </label>
              {descriptionId && (
                <Typography.Paragraph
                  id={descriptionId}
                  type="secondary"
                  style={{ marginBottom: 0 }}
                >
                  {category.description}
                </Typography.Paragraph>
              )}
            </div>
            {category.required ? (
              <Typography.Text id={id} type="secondary" style={{ whiteSpace: 'nowrap' }}>
                {alwaysActive}
              </Typography.Text>
            ) : (
              <Switch
                id={id}
                autoFocus={autoFocus && category.key === firstOptional}
                aria-describedby={descriptionId}
                checked={!!choices[category.key]}
                onChange={(checked) => onChange({ ...choices, [category.key]: checked })}
              />
            )}
          </Flex>
        );
      })}
    </Flex>
  );
};

const GoogleConsentModal = ({
  texts,
  privacyPolicyUrl,
  settingsButton,
  darkMode,
  getContainer,
  ...options
}: GoogleConsentModalProps) => {
  const t = { ...DEFAULT_TEXTS, ...texts };
  const { token } = theme.useToken(); // Spacing and layering follow the host app's antd theme.
  const isMobile = !Grid.useBreakpoint().sm;
  const touch = matches('(pointer: coarse)');
  const dark = useDarkMode(darkMode);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>({});
  const [hasConsent, setHasConsent] = useState(false);
  const categories = getConsentCategories();

  useEffect(() => {
    if (initGoogleConsent(options)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasConsent(true);
    } else {
      // Opening after mount keeps the first render identical on server and client.
      setChoices(allChoices(getConsentCategories(), false));
      setOpen(true);
    }
    const reopen = () => {
      setChoices(getGoogleConsent() ?? allChoices(getConsentCategories(), false));
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
    // Options apply once, on first mount, like initGoogleConsent itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setOpen(false);
    setCustomizing(false);
  };
  const save = (next: ConsentChoices) => {
    saveGoogleConsent(next);
    setHasConsent(true);
    close();
  };
  const acceptAll = () => save(allChoices(categories, true));
  const acceptNecessary = () => save(allChoices(categories, false));

  // 40px buttons for fingers, full width on phones.
  const button = (key: string, label: string, onClick: () => void, type?: ButtonProps['type']) => (
    <Button
      key={key}
      type={type}
      block={isMobile}
      size={isMobile || touch ? 'large' : 'middle'}
      onClick={onClick}
    >
      {label}
    </Button>
  );
  // Accept and reject share one style, so refusing is as easy as accepting.
  // Keys differ per view, so focus never lands on a button whose action just changed.
  const buttons = customizing
    ? [
        button('necessary', t.acceptNecessary, acceptNecessary),
        button('all', t.acceptAll, acceptAll),
        button('save', t.save, () => save(choices), 'primary'),
      ]
    : [
        button('customize', t.customize, () => setCustomizing(true), 'text'),
        button('necessary', t.acceptNecessary, acceptNecessary, 'primary'),
        button('all', t.acceptAll, acceptAll, 'primary'),
      ];

  const offset = isMobile ? token.marginXS : token.marginLG;

  return (
    <ConfigProvider
      theme={{
        ...(dark !== undefined && {
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }),
        ...(matches('(prefers-reduced-motion: reduce)') && { token: { motion: false } }),
      }}
    >
      {settingsButton && hasConsent && !open && (
        <Button
          style={{
            position: 'fixed',
            left: `calc(${token.marginLG}px + env(safe-area-inset-left, 0px))`,
            bottom: `calc(${token.marginLG}px + env(safe-area-inset-bottom, 0px))`,
            zIndex: token.zIndexPopupBase,
          }}
          onClick={openGoogleConsentPreferences}
        >
          {t.settings}
        </Button>
      )}
      <Modal
        open={open}
        getContainer={getContainer}
        title={t.title}
        // First visit: closing counts as "continue without accepting", as CNIL allows.
        // Reopened later: closing keeps the saved choice.
        onCancel={hasConsent ? close : acceptNecessary}
        closable={{ 'aria-label': hasConsent ? t.close : t.acceptNecessary }}
        style={{
          position: 'fixed',
          top: 'auto',
          right: `calc(${offset}px + env(safe-area-inset-right, 0px))`,
          bottom: `calc(${offset}px + env(safe-area-inset-bottom, 0px))`,
          margin: 0,
          paddingBottom: 0,
        }}
        width={`min(520px, calc(100vw - ${offset * 2}px))`}
        // Body scrolls inside the viewport, so header and buttons stay visible on short screens.
        // Reserved height covers the title, the footer and the card padding.
        styles={{
          body: {
            maxHeight: `max(96px, calc(100dvh - ${offset * 2 + (isMobile ? 260 : 150)}px))`,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          },
        }}
        footer={
          <Flex
            wrap
            vertical={isMobile}
            gap={token.marginXS}
            justify="flex-end"
            style={{ flexDirection: isMobile ? 'column-reverse' : undefined }}
          >
            {buttons}
          </Flex>
        }
      >
        <Typography.Paragraph>
          {t.description}{' '}
          {privacyPolicyUrl && (
            <Typography.Link href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
              {t.privacyPolicy}
            </Typography.Link>
          )}
        </Typography.Paragraph>
        {customizing && (
          <CategoryList
            categories={categories}
            choices={choices}
            onChange={setChoices}
            alwaysActive={t.alwaysActive}
            autoFocus={!touch} // On touch, keep the intro in view.
          />
        )}
      </Modal>
    </ConfigProvider>
  );
};

export default GoogleConsentModal;
