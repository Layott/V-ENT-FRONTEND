'use client';

import { useState, useEffect } from 'react';
import shared from './settingsShared.module.css';

const LANGUAGES = [
  { v: 'en', label: 'English' },
  { v: 'fr', label: 'French' },
  { v: 'yo', label: 'Yoruba' },
  { v: 'ig', label: 'Igbo' },
  { v: 'ha', label: 'Hausa' },
  { v: 'pcm', label: 'Nigerian Pidgin' },
];

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
  const [lang, setLang] = useState(language || 'en');
  const [curr, setCurr] = useState('VC');
  const [tz, setTz] = useState(timezone || 'Africa/Lagos');
  const [df, setDf] = useState('DMY');

  useEffect(() => {
    setLang(language || 'en');
    setTz(timezone || 'Africa/Lagos');
  }, [language, timezone]);

  const persist = async (next) => {
    await onSave?.(next);
  };

  return (
    <div className={shared.formStack}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Language</h3>
        <p className={shared.cardSub}>The language used across V-ENT for menus, emails, and notifications.</p>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="lang">Display language</label>
          <select
            id="lang"
            className={shared.formSelect}
            value={lang}
            onChange={(e) => {
              const v = e.target.value;
              setLang(v);
              persist({ language: v });
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.v} value={l.v}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Currency &amp; region</h3>
        <p className={shared.cardSub}>Affects how prices and times display across the platform.</p>

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
