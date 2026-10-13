'use client';

// The optional games step in ticket checkout (inbox 434, piece G2).
//
// CEO, 12 October 2026: people "register for them when they buy tickets or
// after". The buyer ticks the event's open games here; the picks travel with
// the purchase and the server signs the new ticket up when it is issued, so a
// card payment confirmed after the tab was closed still counts them. Nothing
// is drawn when the event has no open games.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { formatNumber, formatWithZone } from '@/lib/datetime';
import { plural } from '@/lib/plural';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';
import { useGameWords } from '@/lib/partyGames/useGameWords';
import { GameStill } from './stage/Stage';
import GameExplainer from './GameExplainer';
import { OwnGameTile, wordsForGame } from './EventGames';
import styles from './checkout-games.module.css';

const PICKS_KEY = 'vent-game-picks:';

/** Picks kept across a trip to the card page, for the buyer coming back. */
export function rememberPicks(eventRef, ids) {
  try {
    if (ids && ids.length) sessionStorage.setItem(PICKS_KEY + eventRef, JSON.stringify(ids));
    else sessionStorage.removeItem(PICKS_KEY + eventRef);
  } catch {
    // Storage off in a private window: the picks are only lost on a reload.
  }
}

export function recallPicks(eventRef) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(PICKS_KEY + eventRef) || '[]');
    return Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

/**
 * @param eventRef  the event's slug
 * @param value     the picked game ids
 * @param onChange  called with the new list of ids
 */
export default function CheckoutGames({ eventRef, value, onChange }) {
  const tt = useT();
  const { words, say } = useGameWords();
  const [games, setGames] = useState([]);
  // Games with an entry fee are joined on the Games tab, where the fee is
  // paid: nobody is charged for something ticked on the way past (inbox 449).
  const [paidCount, setPaidCount] = useState(0);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!eventRef) return undefined;
    let gone = false;
    (async () => {
      try {
        const body = await ventFetch(`/event/${encodeURIComponent(eventRef)}/games/`);
        const on = (body.games || []).filter((g) => g.status === 'open');
        if (!gone) {
          setGames(on.filter((g) => !Number(g.fee_vc)));
          setPaidCount(on.filter((g) => Number(g.fee_vc) > 0).length);
        }
      } catch {
        // Optional step: when the list cannot load, checkout carries on
        // without it, and the Games tab is still there afterwards.
        if (!gone) setGames([]);
      }
    })();
    return () => { gone = true; };
  }, [eventRef]);

  // A pick for a game that has since closed is dropped, so nothing is sent
  // that the server would only skip.
  useEffect(() => {
    if (!games.length || !value?.length) return;
    const live = value.filter((id) => games.some((g) => g.id === id));
    if (live.length !== value.length) onChange(live);
  }, [games]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!games.length && !paidCount) return null;

  const picked = new Set(value || []);
  const toggle = (id) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };
  const openWords = open ? wordsForGame(open, words) : null;

  return (
    <section className={styles.wrap} aria-labelledby="checkout-games-title">
      <h3 id="checkout-games-title" className={styles.title}>
        {tt('games.checkout.title', 'Want to play any games?')}
      </h3>
      {games.length > 0 && (
        <p className={styles.muted}>
          {tt('games.checkout.lede', 'Optional. Tick the ones you would like to play and this ticket is signed up for them. You can change it later under Games.')}
        </p>
      )}
      {paidCount > 0 && (
        <p className={styles.muted}>
          {plural(tt, paidCount,
            'games.checkout.paidOne', '{n} game has an entry fee. It is paid on the Games tab once you have your ticket.',
            'games.checkout.paid', '{n} games have an entry fee. They are paid on the Games tab once you have your ticket.',
            formatNumber(paidCount))}
        </p>
      )}
      {games.length > 0 && (
      <ul className={styles.list}>
        {games.map((g) => {
          const w = wordsForGame(g, words);
          const name = w?.name || '';
          return (
            <li key={g.id} className={styles.row}>
              <button type="button" className={styles.tick} aria-pressed={picked.has(g.id)}
                      onClick={() => toggle(g.id)}>
                <span className={styles.box} aria-hidden="true" />
                {/* The still draws words of its own ("Six !"); the button's name
                    is the game's, so the picture is hidden from a screen reader. */}
                <span className={styles.still} aria-hidden="true">
                  {g.catalogue_key
                    ? <GameStill gameKey={g.catalogue_key} className={styles.thumb} say={say(g.catalogue_key)} label={name} />
                    : <OwnGameTile name={name} className={styles.thumb} />}
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>
                    {name}
                    {g.full && <span className={styles.redTag}>{tt('games.checkout.waitingTag', 'Waiting list')}</span>}
                  </span>
                  <span className={styles.muted}>
                    {g.starts_at ? formatWithZone(g.starts_at) : tt('games.timeTba', 'Time to be announced')}
                  </span>
                </span>
              </button>
              {g.catalogue_key && (
                <button type="button" className={styles.how} onClick={() => setOpen(g)}>
                  {tt('games.howToPlay', 'How to play')}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      )}
      {open && openWords && (
        <GameExplainer gameKey={open.catalogue_key} words={openWords} say={say(open.catalogue_key)}
                       onClose={() => setOpen(null)} />
      )}
    </section>
  );
}

/**
 * What a new ticket was signed up for, said once the ticket exists.
 *
 * @param rows         the purchase answer's `games`
 * @param eventSlug    where the holder changes them, from another page
 * @param onOpenGames  on the event page itself: opens its Games tab. A link to
 *                     the same page with another ?tab= changed the address and
 *                     left the tab as it was under /fr (walk, 13 October).
 */
export function GamesJoinedNote({ rows, eventSlug, onOpenGames }) {
  const tt = useT();
  const { words } = useGameWords();
  if (!rows || !rows.length) return null;
  const names = rows.map((r) => {
    const name = wordsForGame(r, words)?.name || '';
    if (!name) return '';
    return r.state === 'waiting'
      ? tt('games.checkout.waitingNote', '{name} (waiting list, number {n})')
        .replace('{name}', name).replace('{n}', formatNumber(r.place_in_line || 1))
      : name;
  }).filter(Boolean);
  if (!names.length) return null;
  return (
    <p className={styles.joined}>
      {tt('games.checkout.downFor', 'Games: you are down for {games}.').replace('{games}', names.join(', '))}
      {onOpenGames ? (
        <>
          {' '}
          <button type="button" className={styles.linkBtn} onClick={onOpenGames}>
            {tt('games.checkout.change', 'Change them under Games')}
          </button>
        </>
      ) : eventSlug && (
        <>
          {' '}
          <Link className={styles.link} href={`/events/${encodeURIComponent(eventSlug)}?tab=games`}>
            {tt('games.checkout.change', 'Change them under Games')}
          </Link>
        </>
      )}
    </p>
  );
}
