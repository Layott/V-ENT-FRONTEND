'use client';

// The words of the fifty party games, in the reader's language.
//
// Loaded here, on the pages that show games, rather than through the site
// dictionary every page downloads: fifty explainers are about 30 KB a language
// that a wallet or a tournament page never needs. English is the fallback for
// a language still loading, the same rule the site dictionary keeps.

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageProvider';

const LOADERS = {
  en: () => import('./words/en'),
  fr: () => import('./words/fr'),
  pt: () => import('./words/pt'),
};

// One download per language per visit: the promise while it is on its way,
// the table once it has arrived (so a second games list draws at once).
const pending = {};
const tablesSeen = {};

function load(code) {
  const loader = LOADERS[code] || LOADERS.en;
  if (!pending[code]) {
    pending[code] = loader().then((m) => {
      tablesSeen[code] = m.default;
      return m.default;
    });
  }
  return pending[code];
}

/** An own game, put in the same shape as a catalogue game's words. */
export function ownGameWords(game) {
  const custom = game?.custom || {};
  return {
    name: custom.name || '',
    origin: '',
    players: custom.players || '',
    time: custom.length || '',
    needs: custom.needs || '',
    age: '',
    summary: '',
    steps: custom.steps || [],
    win: '',
  };
}

/**
 * `{ ready, words(key), say(key) }`. `words(key)` is a game's name, explainer
 * and facts; `say(key)` translates the words drawn in its animation.
 */
export function useGameWords() {
  const { language } = useLanguage();
  const [tables, setTables] = useState(() => ({ ...tablesSeen }));

  useEffect(() => {
    let cancelled = false;
    const wanted = ['en', language].filter((c, i, all) => all.indexOf(c) === i);
    Promise.all(wanted.map((code) => load(code).then((table) => [code, table])))
      .then((pairs) => {
        if (!cancelled) setTables((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
      })
      .catch(() => { /* English, or the names alone, stay on screen */ });
    return () => { cancelled = true; };
  }, [language]);

  return useMemo(() => {
    const own = tables[language];
    const english = tables.en;
    const words = (key) => (own && own[key]) || (english && english[key]) || null;
    const say = (key) => (word) => {
      if (!word || language === 'en') return word;
      return own?.[key]?.art?.[word] ?? word;
    };
    return { ready: Boolean(english), words, say };
  }, [language, tables]);
}
