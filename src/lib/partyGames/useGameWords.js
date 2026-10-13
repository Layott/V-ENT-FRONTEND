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

/** The wallet history codes that name a party game (vent_auth/statement_lines.py). */
const GAME_LINE_CODES = new Set(['gameFee', 'refundGameFee']);
const squash = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Names a game in a wallet history line in the reader's language (inbox 449).
 *
 * The server writes a catalogue game as its key in words ("Musical Chairs"),
 * so the line reads the same in the admin console and an export; a French
 * reader saw "Jeu : Musical Chairs" beside French words. Matched on the key,
 * squashed, so "Tug Of War" finds tug-of-war. An organiser's own game, or a
 * name nothing matches, is left as written. The words load only when a row
 * on screen names a game: a wallet with none never downloads them.
 *
 * Returns a function for `statementLine(tt, row, gameName)`, or null.
 */
export function useGameNames(rows) {
  const { language } = useLanguage();
  const wanted = (rows || []).some((r) => GAME_LINE_CODES.has(r?.line?.code));
  const [table, setTable] = useState(null);

  useEffect(() => {
    if (!wanted || language === 'en') return undefined;
    let cancelled = false;
    load(language).then((t) => { if (!cancelled) setTable(t); }).catch(() => {});
    return () => { cancelled = true; };
  }, [wanted, language]);

  return useMemo(() => {
    if (!table) return null;
    const byKey = new Map(Object.keys(table).map((key) => [squash(key), key]));
    return (written) => {
      const key = byKey.get(squash(written));
      return (key && table[key]?.name) || written;
    };
  }, [table]);
}
