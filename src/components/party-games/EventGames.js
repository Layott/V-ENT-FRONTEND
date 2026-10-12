'use client';

// The Games tab on an event page (inbox 434, 435, 439).
//
// CEO, 12 October 2026: organisers add party games "under like a games section,
// so people can register for them when they buy tickets or after they register
// ... only people who register for an event can participate". Approved as the
// mockup docs/mockups/party-games.html.
//
// Reading is public: anybody sees which games are on and how each is played,
// because somebody deciding whether to buy a ticket is exactly who asks. Playing
// takes a live ticket for this event. A signed-in reader plays with the tickets
// they hold; a guest types the code printed on theirs. Nobody is shown a button
// they cannot use: without a ticket the row offers the way to get one.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';
import { apiMessage } from '@/lib/apiMessage';
import { plural } from '@/lib/plural';
import { formatNumber, formatWithZone } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';
import { ownGameWords, useGameWords } from '@/lib/partyGames/useGameWords';
import { BY_KEY } from '@/lib/partyGames/catalogue';
import { GameStill } from './stage/Stage';
import GameExplainer from './GameExplainer';
import { kindName, shortOrigin } from './names';
import styles from './event-games.module.css';

const REFRESH_MS = 30000;

/** The words for a game at an event: the catalogue's, or the organiser's own. */
export function wordsForGame(game, words) {
  if (game?.catalogue_key) return words(game.catalogue_key);
  return ownGameWords(game);
}

/** "12 of 16 places", or "12 want to play" for a game with no limit. */
export function placesText(tt, game) {
  if (game.places) {
    // French agrees with the count ("1 place prise", "6 places prises").
    return plural(tt, game.playing,
      'games.placesOfOne', '{n} of {places} places', 'games.placesOf', '{n} of {places} places',
      formatNumber(game.playing)).replace('{places}', formatNumber(game.places));
  }
  return plural(tt, game.playing,
    'games.wantOne', '{n} wants to play. Open to everyone with a ticket.',
    'games.want', '{n} want to play. Open to everyone with a ticket.',
    formatNumber(game.playing));
}

export function OwnGameTile({ name, className }) {
  return (
    <div className={className || styles.ownTile} aria-hidden="true">
      <span>{String(name || '?').trim().charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default function EventGames({ eventRef, eventSlug, onOpenTickets }) {
  const tt = useT();
  const { token, loading: sessionLoading, signedIn } = useViewer();
  const { words, say } = useGameWords();

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [code, setCode] = useState('');
  const [guestCode, setGuestCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [active, setActive] = useState('');
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');
  const [open, setOpen] = useState(null);

  const path = `/event/${encodeURIComponent(eventRef || '')}/games/`;

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!eventRef) return;
    if (!quiet) setStatus('loading');
    try {
      const body = guestCode
        ? await ventFetch(`${path}mine/`, { method: 'POST', token, body: { ticket_code: guestCode } })
        : await ventFetch(path, { token });
      setData(body);
      setStatus('ready');
    } catch (err) {
      if (!quiet) setStatus('error');
    }
  }, [eventRef, guestCode, path, token]);

  // Decided once the session has answered: a signed-in reader's own tickets
  // come back with the list, and asking before then would ask as nobody.
  useEffect(() => {
    if (sessionLoading) return;
    load();
  }, [sessionLoading, load]);

  useAutoRefresh(() => load({ quiet: true }), [eventRef, token, guestCode],
    { interval: REFRESH_MS, enabled: status === 'ready' });

  const tickets = useMemo(() => data?.tickets || [], [data]);
  const canPlay = Boolean(data?.can_play);
  useEffect(() => {
    if (!tickets.length) { setActive(''); return; }
    if (!tickets.some((t) => t.code === active)) setActive(tickets[0].code);
  }, [tickets, active]);
  const ticket = tickets.find((t) => t.code === active) || null;
  // A buyer often holds several tickets in their own name. Each chip has to
  // say which one it is, so the tier is added, and the end of the code where
  // even that repeats (found walking walk_rush_25: two chips read "Rush 25").
  const chipLabel = (t) => {
    const base = [t.name, t.tier].filter(Boolean).join(' · ');
    const twins = tickets.filter((o) => [o.name, o.tier].filter(Boolean).join(' · ') === base).length > 1;
    return twins ? `${base} · ${t.code.slice(-4)}` : base;
  };
  const games = data?.games || [];
  const myCount = ticket
    ? games.filter((g) => g.mine?.[ticket.code]).length
    : 0;

  const submitCode = async (e) => {
    e.preventDefault();
    const typed = code.trim().toUpperCase();
    if (!typed) return;
    setCodeError('');
    setBusy('code');
    try {
      const body = await ventFetch(`${path}mine/`, { method: 'POST', token, body: { ticket_code: typed } });
      setGuestCode(typed);
      setData(body);
      setStatus('ready');
    } catch (err) {
      setCodeError(apiMessage(tt, err, 'games.codeWrong',
        'That is not a live ticket for this event. Check the code printed on your ticket.'));
    } finally {
      setBusy(null);
    }
  };

  const nameOf = (game) => wordsForGame(game, words)?.name || '';

  const press = async (game, leaving) => {
    if (!ticket) return;
    setBusy(game.id);
    setNotice('');
    setProblem('');
    try {
      const body = await ventFetch(`${path}${game.id}/${leaving ? 'leave' : 'join'}/`, {
        method: 'POST', token, body: { ticket_code: ticket.code },
      });
      const fresh = body.game;
      setData((prev) => (prev ? {
        ...prev,
        games: prev.games.map((g) => (g.id === fresh.id
          ? { ...fresh, mine: { ...(g.mine || {}), [ticket.code]: fresh.mine?.[ticket.code] } }
          : g)),
      } : prev));
      const mine = fresh.mine?.[ticket.code];
      const name = nameOf(game);
      if (leaving) setNotice(tt('games.leftNotice', 'You left {name}.').replace('{name}', name));
      else if (mine?.state === 'waiting') {
        setNotice(tt('games.waitingNotice', 'You are number {n} on the waiting list for {name}.')
          .replace('{n}', formatNumber(mine.place_in_line || 1)).replace('{name}', name));
      } else setNotice(tt('games.joinedNotice', 'You are in: {name}.').replace('{name}', name));
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.pressFailed', 'That did not go through. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  const actionFor = (game) => {
    const mine = ticket ? game.mine?.[ticket.code] : null;
    if (mine) {
      const label = mine.state === 'waiting'
        ? tt('games.waitingLeave', 'Waiting list, number {n}. Leave').replace('{n}', formatNumber(mine.place_in_line || 1))
        : tt('games.inLeave', 'You’re in. Leave');
      return (
        <button type="button" className={styles.inBtn} aria-pressed="true"
                disabled={busy === game.id} onClick={() => press(game, true)}>
          {label}
        </button>
      );
    }
    if (game.status === 'closed') return <span className={styles.statusNote}>{tt('games.closed', 'Sign ups closed')}</span>;
    if (game.status === 'proposed') return <span className={styles.statusNote}>{tt('games.inVote', 'In a vote')}</span>;
    if (!canPlay) {
      return (
        <button type="button" className={styles.redBtn} onClick={onOpenTickets}>
          {tt('games.getTicketToPlay', 'Get a ticket to play')}
        </button>
      );
    }
    return (
      <button type="button" className={game.full ? styles.btn : styles.goldBtn}
              disabled={busy === game.id} onClick={() => press(game, false)}>
        {game.full ? tt('games.joinWaiting', 'Join the waiting list') : tt('games.wantToPlay', 'I want to play')}
      </button>
    );
  };

  const openGame = open ? games.find((g) => g.id === open) : null;
  const openWords = openGame ? wordsForGame(openGame, words) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <h2 className={styles.title}>{tt('games.title', 'Games at this event')}</h2>
        <p className={styles.lead}>{tt('games.lede', 'Party games run by the organiser. Pick the ones you want to play.')}</p>
      </div>

      {data?.is_organiser && eventSlug && (
        <p className={styles.organiserNote}>
          {tt('games.organiserNote', 'You run these games.')}{' '}
          <Link href={`/events/${eventSlug}/manage?tab=games`} className={styles.inlineLink}>
            {tt('games.organiserLink', 'Change them in your console')}
          </Link>
        </p>
      )}

      {status === 'ready' && (
        <div className={styles.ticketBar}>
          {ticket ? (
            <div className={styles.barText}>
              <b>{tt('games.yourTicket', 'Your ticket: {tier}').replace('{tier}', ticket.tier || ticket.code)}</b>
              <span>
                {myCount === 0
                  ? tt('games.downForNone', 'You are not down for any game yet. Pick one below.')
                  : plural(tt, myCount,
                  'games.downForOne', 'You’re down for {n} game. Change it here any time before a game starts.',
                  'games.downFor', 'You’re down for {n} games. Change it here any time before a game starts.',
                  formatNumber(myCount))}
              </span>
              {tickets.length > 1 && (
                <div className={styles.chips} role="group" aria-label={tt('games.playingAs', 'Playing as')}>
                  <span className={styles.chipsLabel}>{tt('games.playingAs', 'Playing as')}</span>
                  {tickets.map((t) => (
                    <button key={t.code} type="button" className={styles.chip}
                            aria-pressed={t.code === active} onClick={() => setActive(t.code)}>
                      {chipLabel(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.barText}>
              <b>{tt('games.forTicketHolders', 'Games are for people with a ticket')}</b>
              <span>
                {signedIn
                  ? tt('games.signedInNoTicket', 'Your ticket is your place in any game below.')
                  : tt('games.signedOutNoTicket', 'Anyone can read how each game works. To play, buy a ticket; no account needed.')}
              </span>
              <form className={styles.codeForm} onSubmit={submitCode}>
                <label className={styles.codeLabel} htmlFor="games-ticket-code">
                  {tt('games.haveCode', 'Have a ticket? Enter its code')}
                </label>
                <div className={styles.codeRow}>
                  <input
                    id="games-ticket-code"
                    className={styles.codeInput}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={tt('games.codePlaceholder', 'Ticket code')}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={24}
                  />
                  <button type="submit" className={styles.btn} disabled={busy === 'code' || !code.trim()}>
                    {tt('games.useCode', 'Use this ticket')}
                  </button>
                </div>
                {codeError && <p className={styles.problem} role="alert">{codeError}</p>}
              </form>
            </div>
          )}
          {!ticket && (
            <button type="button" className={styles.redBtn} onClick={onOpenTickets}>
              {tt('games.getTickets', 'Get tickets')}
            </button>
          )}
        </div>
      )}

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {status === 'loading' && <p className={styles.muted}>{tt('games.loading', 'Loading the games...')}</p>}
      {status === 'error' && (
        <div className={styles.errorBox}>
          <p className={styles.problem}>{tt('games.loadFailed', 'The games did not load. Check your connection and try again.')}</p>
          <button type="button" className={styles.btn} onClick={() => load()}>{tt('games.tryAgain', 'Try again')}</button>
        </div>
      )}
      {status === 'ready' && games.length === 0 && (
        <p className={styles.empty}>{tt('games.none', 'No games at this event yet. When the organiser adds some, they show here with how to play each one.')}</p>
      )}

      {status === 'ready' && games.length > 0 && (
        <ul className={styles.list}>
          {games.map((game) => {
            const w = wordsForGame(game, words);
            const meta = game.catalogue_key ? BY_KEY[game.catalogue_key] : null;
            const name = w?.name || '';
            return (
              <li key={game.id} className={styles.row}>
                {meta
                  ? <GameStill gameKey={game.catalogue_key} className={styles.thumb} say={say(game.catalogue_key)} label={name} />
                  : <OwnGameTile name={name} className={styles.ownThumb} />}
                <div className={styles.rowBody}>
                  <div className={styles.nameLine}>
                    <h3 className={styles.name}>{name}</h3>
                    {meta && <span className={styles.tag}>{kindName(tt, meta.kind)}</span>}
                    {meta?.region === 'africa' && w?.origin && <span className={styles.goldTag}>{shortOrigin(w.origin)}</span>}
                  </div>
                  <p className={styles.meta}>
                    {game.starts_at ? formatWithZone(game.starts_at) : tt('games.timeTba', 'Time to be announced')}
                    {' · '}
                    {game.place || tt('games.placeTba', 'Place to be announced')}
                  </p>
                  {game.prize && <p className={styles.meta}>{tt('games.prize', 'Prize: {prize}').replace('{prize}', game.prize)}</p>}
                  <div className={styles.places}>
                    {game.places ? (
                      <span className={styles.meter} aria-hidden="true">
                        <i style={{ width: `${Math.min(100, (game.playing / game.places) * 100)}%` }} />
                      </span>
                    ) : null}
                    <span>{placesText(tt, game)}</span>
                    {game.full && <span className={styles.redTag}>{tt('games.full', 'Full, waiting list open')}</span>}
                  </div>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.quietBtn} onClick={() => setOpen(game.id)}>
                    {tt('games.howToPlay', 'How to play')}
                  </button>
                  {actionFor(game)}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {openGame && openWords && (
        <GameExplainer
          gameKey={openGame.catalogue_key}
          words={openWords}
          say={say(openGame.catalogue_key)}
          onClose={() => setOpen(null)}
          action={<div className={styles.sheetAction}>{actionFor(openGame)}</div>}
        />
      )}
    </div>
  );
}
