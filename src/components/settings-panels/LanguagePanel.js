'use client';

import { useState, useEffect } from 'react';
import shared from './settingsShared.module.css';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useWalkthrough } from '@/components/walkthrough/WalkthroughProvider';

// Three languages, and every one of them actually translates the interface.
// Yoruba, Igbo, Hausa and Nigerian Pidgin were in this list with nothing behind
// them: choosing one changed a stored string and not a single word on screen,
// which is worse than not offering them. They come back when there are
// translations to serve.

const CURRENCIES = [
  { v: 'NGN', label: 'NGN - Nigerian Naira' },
  { v: 'USD', label: 'USD - US Dollar' },
  { v: 'VC', label: 'VC - VENT COINS (primary)' },
];

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Singapore',
  'UTC',
];

const DATE_FORMATS = [
  { v: 'DMY', label: 'DD/MM/YYYY (e.g. 23/04/2026)' },
  { v: 'MDY', label: 'MM/DD/YYYY (e.g. 04/23/2026)' },
  { v: 'YMD', label: 'YYYY-MM-DD (e.g. 2026-04-23)' },
  { v: 'long', label: '23 Apr 2026' },
];

const LanguagePanel = ({ language, timezone, onSave }) => {
  // The provider owns the language: setting it re-renders the app straight
  // away and writes the choice to the account, so there is no save button to
  // press and no reload to wait for.
  const { language: current, setLanguage, languages, t } = useLanguage();
  const { start: startWalkthrough } = useWalkthrough();
  const [lang, setLang] = useState(current || language || 'en');
  const [curr, setCurr] = useState('VC');
  const [tz, setTz] = useState(timezone || 'Africa/Lagos');
  const [df, setDf] = useState('DMY');

  useEffect(() => {
    setLang(current || language || 'en');
    setTz(timezone || 'Africa/Lagos');
  }, [current, language, timezone]);

  const persist = async (next) => {
    await onSave?.(next);
  };

  return (
    <div className={shared.formStack}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{t('settings.language')}</h3>
        <p className={shared.cardSub}>{t('settings.languageBlurb')}</p>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="lang">{t('settings.displayLanguage')}</label>
          <select
            id="lang"
            className={shared.formSelect}
            value={lang}
            onChange={(e) => {
              const v = e.target.value;
              setLang(v);
              setLanguage(v);          // the interface changes on this line
              persist({ language: v }); // and the panel's own save keeps its contract
            }}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native === l.label ? l.label : `${l.label} - ${l.native}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{t('settings.walkthroughTitle')}</h3>
        <p className={shared.cardSub}>{t('settings.walkthroughBlurb')}</p>
        <div className={shared.formFooter}>
          <button
            type="button"
            className={`${shared.btn} ${shared.ghostBTN}`}
            onClick={() => startWalkthrough()}
          >
            {t('settings.walkthroughReplay')}
          </button>
        </div>
      </div>

      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{t('settings.currencyRegion')}</h3>
        <p className={shared.cardSub}>{t('settings.currencyBlurb')}</p>

        <div className={shared.formRow}>
          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="curr">Currency display</label>
            <select
              id="curr"
              className={shared.formSelect}
              value={curr}
              onChange={(e) => {
                const v = e.target.value;
                setCurr(v);
                persist({ currency: v });
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.v} value={c.v}>{c.label}</option>
              ))}
            </select>
            <span className={shared.fieldHelper}>VENT COINS remain the primary platform currency for transactions.</span>
          </div>
          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="tz">Timezone</label>
            <select
              id="tz"
              className={shared.formSelect}
              value={tz}
              onChange={(e) => {
                const v = e.target.value;
                setTz(v);
                persist({ timezone: v });
              }}
            >
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="df">Date format</label>
          <select
            id="df"
            className={shared.formSelect}
            value={df}
            onChange={(e) => {
              const v = e.target.value;
              setDf(v);
              persist({ date_format: v });
            }}
          >
            {DATE_FORMATS.map((f) => (
              <option key={f.v} value={f.v}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LanguagePanel;
