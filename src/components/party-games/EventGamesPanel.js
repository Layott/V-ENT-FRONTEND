'use client';

// The organiser's Games tab in the event console (inbox 434, 439).
//
// Add games from the catalogue of fifty (or one of your own), set when, where
// and how many places, see who wants to play, close sign ups, take a game off.
// Approved as the organiser screen of docs/mockups/party-games.html. The vote
// over games (G2) sits under the games as "Let people vote"; fees (inbox 449,
// G3) come in a later piece and add to this panel rather than replace it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import DateField from '@/components/date-field/DateField';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { plural } from '@/lib/plural';
import { downloadWithToken } from '@/lib/download';
import { fuzzyFilter } from '@/lib/fuzzy';
import { formatNumber, formatWithZone, isoToLocalInput, localInputToISO } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';
import { GAMES, KINDS } from '@/lib/partyGames/catalogue';
import { useGameWords } from '@/lib/partyGames/useGameWords';
import { GameStill } from './stage/Stage';
import GameExplainer from './GameExplainer';
import GamesVoteConsole from './GamesVoteConsole';
import { OwnGameTile, wordsForGame } from './EventGames';
import { KIND_LABELS, kindName, shortOrigin } from './names';
import styles from './event-games-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;
const REGION_CHIPS = [
  ['africa', 'games.region.africa', 'Africa'],
  ['uk', 'games.region.uk', 'United Kingdom'],
  ['world', 'games.region.world', 'Worldwide'],
  ['all', 'games.regionAll', 'All'],
];
const BLANK_OWN = { name: '', players: '', length: '', needs: '', steps: '' };
const STATE_LABELS = {
  in: ['games.state.in', 'Playing'],
  waiting: ['games.state.waiting', 'Waiting'],
  left: ['games.state.left', 'Left'],
};

function draftOf(game) {
  return {
    starts_at: game.starts_at ? isoToLocalInput(game.starts_at) : '',
    place: game.place || '',
    places: game.places ? String(game.places) : '',
    prize: game.prize || '',
    fee: Number(game.fee_vc) ? String(Number(game.fee_vc)) : '',
  };
}

export default function EventGamesPanel({ eventRef, token, showToast }) {
  const tt = useT();
  const { words, say } = useGameWords();
  const path = `/event/${encodeURIComponent(eventRef || '')}/games/`;

  const [games, setGames] = useState([]);
  const [vote, setVote] = useState(null);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [draft, setDraft] = useState(null);
  const [people, setPeople] = useState({});
  const [region, setRegion] = useState('africa');
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(null);
  const [own, setOwn] = useState(BLANK_OWN);

  const toast = useCallback((text) => {
    if (showToast) showToast(text);
  }, [showToast]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!eventRef || !token) return;
    try {
      const body = await ventFetch(path, { token });
      setGames(body.games || []);
      setVote(body.vote || null);
      setStatus('ready');
    } catch {
      if (!quiet) setStatus('error');
    }
  }, [eventRef, path, token]);

  useEffect(() => { load(); }, [load]);
  // Sign ups arrive while the organiser is looking; the counts keep up.
  useAutoRefresh(() => load({ quiet: true }), [eventRef, token], { enabled: status === 'ready', interval: 30000 });

  const loadPeople = useCallback(async (game) => {
    try {
      const body = await ventFetch(`${path}${game.id}/entries/`, { token });
      setPeople((prev) => ({ ...prev, [game.id]: body.people || [] }));
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.console.peopleFailed', 'The list of players did not load.'));
    }
  }, [path, token, tt]);

  const toggleRow = (game) => {
    if (openRow === game.id) {
      setOpenRow(null);
      return;
    }
    setOpenRow(game.id);
    setDraft(draftOf(game));
    loadPeople(game);
  };

  const replaceGame = (fresh) => setGames((prev) => prev.map((g) => (g.id === fresh.id ? { ...g, ...fresh } : g)));

  const patch = async (game, changes, doneKey, doneText) => {
    setBusy(game.id);
    setProblem('');
    try {
      const body = await ventFetch(`${path}${game.id}/`, { method: 'PATCH', token, body: changes });
      replaceGame(body.game);
      if (openRow === game.id) loadPeople(body.game);
      toast(tt(doneKey, doneText));
      return true;
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.console.saveFailed', 'That was not saved. Try again.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = (game) => patch(game, {
    starts_at: draft.starts_at ? localInputToISO(draft.starts_at) : null,
    place: draft.place.trim(),
    places: draft.places.trim() ? Number(draft.places) : null,
    prize: draft.prize.trim(),
    fee_vc: draft.fee.trim() ? Number(draft.fee) : 0,
  }, 'games.console.saved', 'Saved.');

  const remove = async (game) => {
    setBusy(game.id);
    setProblem('');
    try {
      await ventFetch(`${path}${game.id}/`, { method: 'DELETE', token });
      setGames((prev) => prev.filter((g) => g.id !== game.id));
      setOpenRow(null);
      toast(tt('games.console.removed', 'Removed.'));
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.console.saveFailed', 'That was not saved. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  const add = async (payload) => {
    setBusy('add');
    setProblem('');
    try {
      const body = await ventFetch(path, { method: 'POST', token, body: payload });
      setGames((prev) => [...prev, body.game]);
      toast(tt('games.console.added', 'Added to your event. Set when and where under Games at your event.'));
      return true;
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.console.addFailed', 'That game was not added. Try again.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const addOwn = async (e) => {
    e.preventDefault();
    if (!own.name.trim()) return;
    const done = await add({
      custom_name: own.name.trim(),
      custom_players: own.players.trim(),
      custom_length: own.length.trim(),
      custom_needs: own.needs.trim(),
      custom_steps: own.steps,
    });
    if (done) setOwn(BLANK_OWN);
  };

  const download = async (game) => {
    try {
      await downloadWithToken(`${API}${path}${game.id}/entries/?download=csv`, token, `players-${game.id}.csv`);
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.console.downloadFailed', 'The list did not download. Try again.'));
    }
  };

  // A catalogue game on the event, or waiting on the vote: either way not offered again.
  const onEvent = useMemo(() => new Map(games.filter((g) => g.status !== 'off').map((g) => [g.catalogue_key, g.status])), [games]);
  const takePayload = useCallback((data) => {
    setGames(data.games || []);
    setVote(data.vote || null);
  }, []);
  const signups = games.reduce((n, g) => n + (g.playing || 0) + (g.waiting || 0), 0);

  const pool = useMemo(() => {
    const rows = GAMES
      .filter((g) => region === 'all' || g.region === region)
      .filter((g) => kind === 'all' || g.kind === kind)
      .map((g) => ({ ...g, words: words(g.key) }));
    return fuzzyFilter(rows, query, [(g) => g.words?.name, (g) => g.words?.origin, 'key']);
  }, [region, kind, query, words]);

  const previewWords = preview ? words(preview) : null;

  return (
    <div className={styles.wrap}>
      <section className={styles.panel}>
        <div className={styles.spread}>
          <div>
            <h3 className={styles.subTitle}>{tt('games.console.title', 'Games at your event')}</h3>
            <p className={styles.muted}>
              {tt('games.console.lede', 'Only people holding a ticket can sign up. A ticket that is refunded or voided drops its games.')}
            </p>
          </div>
          {games.length > 0 && (
            <span className={styles.goldTag}>
              {plural(tt, signups, 'games.console.signupsOne', '{n} sign up', 'games.console.signups', '{n} sign ups', formatNumber(signups))}
            </span>
          )}
        </div>

        {problem && <p className={styles.problem} role="alert">{problem}</p>}
        {status === 'loading' && <p className={styles.muted}>{tt('games.loading', 'Loading the games...')}</p>}
        {status === 'error' && (
          <div className={styles.row}>
            <p className={styles.problem}>{tt('games.loadFailed', 'The games did not load. Check your connection and try again.')}</p>
            <button type="button" className={styles.btn} onClick={() => load()}>{tt('games.tryAgain', 'Try again')}</button>
          </div>
        )}
        {status === 'ready' && games.length === 0 && (
          <p className={styles.empty}>
            {tt('games.console.none', 'No games yet. Pick some from the list below, or add your own. They show on your event page under Games.')}
          </p>
        )}

        {games.map((game) => {
          const w = wordsForGame(game, words);
          const name = w?.name || '';
          const open = openRow === game.id;
          const list = people[game.id];
          return (
            <div key={game.id} className={styles.inner}>
              <div className={styles.gameHead}>
                {game.catalogue_key
                  ? <GameStill gameKey={game.catalogue_key} className={styles.thumb} say={say(game.catalogue_key)} label={name} />
                  : <OwnGameTile name={name} className={styles.ownThumb} />}
                <div className={styles.gameText}>
                  <div className={styles.nameLine}>
                    <span className={styles.gameName}>{name}</span>
                    {game.status === 'proposed' && <span className={styles.goldTag}>{tt('games.console.inVoteTag', 'In the vote')}</span>}
                    {game.status === 'closed' && <span className={styles.tag}>{tt('games.closed', 'Sign ups closed')}</span>}
                    {game.status === 'off' && <span className={styles.redTag}>{tt('games.console.offTag', 'Taken off')}</span>}
                    {Number(game.fee_vc) > 0 && (
                      <span className={styles.goldTag}>
                        {tt('games.feeTag', 'Entry {n} VC').replace('{n}', formatNumber(Number(game.fee_vc)))}
                      </span>
                    )}
                  </div>
                  <span className={styles.meta}>
                    {game.starts_at ? formatWithZone(game.starts_at) : tt('games.timeTba', 'Time to be announced')}
                    {' · '}
                    {game.place || tt('games.placeTba', 'Place to be announced')}
                  </span>
                  <span className={styles.meta}>
                    {plural(tt, game.playing + game.waiting,
                      'games.console.wantOne', '{n} wants to play', 'games.console.want', '{n} want to play',
                      formatNumber(game.playing + game.waiting))}
                    {' · '}
                    {game.places
                      ? plural(tt, game.places, 'games.console.placesOne', '{n} place', 'games.console.places', '{n} places', formatNumber(game.places))
                      : tt('games.console.noLimit', 'no limit')}
                    {game.full && <span className={styles.redTag}>{tt('games.console.full', 'Full')}</span>}
                  </span>
                </div>
                <button type="button" className={styles.quiet} aria-expanded={open} onClick={() => toggleRow(game)}>
                  {open ? tt('games.console.hide', 'Hide') : tt('games.console.whoAndWhen', 'Who and when')}
                </button>
              </div>

              {open && draft && (
                <div className={styles.editor}>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span>{tt('games.field.when', 'When')}</span>
                      <DateField withTime className={styles.input} value={draft.starts_at}
                                 ariaLabel={tt('games.field.when', 'When')}
                                 onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      <span>{tt('games.field.where', 'Where')}</span>
                      <input className={styles.input} value={draft.place} maxLength={120}
                             placeholder={tt('games.field.whereHint', 'e.g. Hall B, by the stage')}
                             onChange={(e) => setDraft({ ...draft, place: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      <span>{tt('games.field.places', 'Places')}</span>
                      <input className={styles.input} value={draft.places} inputMode="numeric"
                             placeholder={tt('games.field.placesHint', 'No limit')}
                             onChange={(e) => setDraft({ ...draft, places: e.target.value.replace(/[^0-9]/g, '') })} />
                    </label>
                    <label className={styles.field}>
                      <span>{tt('games.field.fee', 'Entry fee in VC (optional)')}</span>
                      <input className={styles.input} value={draft.fee} inputMode="numeric"
                             placeholder={tt('games.field.feeHint', 'Free with the ticket')}
                             onChange={(e) => setDraft({ ...draft, fee: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} />
                    </label>
                    <label className={styles.field}>
                      <span>{tt('games.field.prize', 'Prize (optional)')}</span>
                      <input className={styles.input} value={draft.prize} maxLength={160}
                             placeholder={tt('games.field.prizeHint', 'What the winner gets')}
                             onChange={(e) => setDraft({ ...draft, prize: e.target.value })} />
                    </label>
                  </div>

                  {draft.fee.trim() && Number(draft.fee) > 0 && (
                    <p className={styles.muted}>
                      {tt('games.console.feeHint', 'Paid from the player’s wallet with their PIN, or a card for what they are short. It goes back if they leave before the game starts or you take the game off. It reaches you through your event’s earnings, less the same fee as a ticket.')}
                    </p>
                  )}

                  <span className={styles.label}>
                    {tt('games.console.who', 'Who wants to play ({n})')
                      .replace('{n}', formatNumber((list || []).filter((p) => p.state !== 'left').length))}
                  </span>
                  {!list && <p className={styles.muted}>{tt('games.console.loadingPeople', 'Loading the players...')}</p>}
                  {list && list.length === 0 && <p className={styles.muted}>{tt('games.console.nobody', 'Nobody has signed up yet.')}</p>}
                  {list && list.length > 0 && (
                    <ul className={styles.people}>
                      {list.map((p) => (
                        <li key={p.code} className={p.state === 'left' ? styles.personLeft : styles.person}>
                          <span className={styles.personName}>{p.name}</span>
                          <em>
                            {p.tier}
                            {p.guest ? ` · ${tt('games.console.guest', 'Guest, no account')}` : ''}
                            {' · '}
                            {tt(STATE_LABELS[p.state]?.[0] || 'games.state.in', STATE_LABELS[p.state]?.[1] || p.state)}
                            {Number(p.fee_paid_vc) > 0
                              ? ` · ${tt('games.console.paid', 'paid {n} VC').replace('{n}', formatNumber(Number(p.fee_paid_vc)))}`
                              : ''}
                          </em>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className={styles.buttons}>
                    <button type="button" className={styles.goldBtn} disabled={busy === game.id} onClick={() => save(game)}>
                      {tt('games.console.save', 'Save')}
                    </button>
                    {list && list.length > 0 && (
                      <button type="button" className={styles.btn} onClick={() => download(game)}>
                        {tt('games.console.download', 'Download the list')}
                      </button>
                    )}
                    {game.status === 'open' && (
                      <button type="button" className={styles.quiet} disabled={busy === game.id}
                              onClick={() => patch(game, { status: 'closed' }, 'games.console.closedNotice', 'Sign ups closed.')}>
                        {tt('games.console.close', 'Close sign ups')}
                      </button>
                    )}
                    {(game.status === 'closed' || game.status === 'off') && (
                      <button type="button" className={styles.quiet} disabled={busy === game.id}
                              onClick={() => patch(game, { status: 'open' }, 'games.console.openedNotice', 'Sign ups are open.')}>
                        {tt('games.console.reopen', 'Open sign ups')}
                      </button>
                    )}
                    {game.status !== 'off' && (list || []).length > 0 && (
                      <button type="button" className={styles.quiet} disabled={busy === game.id}
                              onClick={() => patch(game, { status: 'off' },
                                ...(Number(game.fee_vc) > 0
                                  ? ['games.console.offRefundNotice', 'Taken off your event. Every entry fee paid for it has gone back.']
                                  : ['games.console.offNotice', 'Taken off your event. The players stay on record.']))}>
                        {tt('games.console.takeOff', 'Take this game off')}
                      </button>
                    )}
                    {list && list.length === 0 && (
                      <button type="button" className={styles.dangerBtn} disabled={busy === game.id} onClick={() => remove(game)}>
                        {tt('games.console.remove', 'Remove')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {status === 'ready' && (
        <GamesVoteConsole path={path} token={token} vote={vote} games={games} words={words}
                          onPayload={takePayload} toast={toast} />
      )}

      <section className={styles.panel}>
        <div className={styles.spread}>
          <h3 className={styles.subTitle}>{tt('games.console.addTitle', 'Add games')}</h3>
          <span className={styles.muted}>
            {tt('games.console.addCount', '{n} games, each with how to play and an animation').replace('{n}', formatNumber(GAMES.length))}
          </span>
        </div>
        <div className={styles.filters}>
          {REGION_CHIPS.map(([id, key, english]) => (
            <button key={id} type="button" className={styles.chip} aria-pressed={region === id} onClick={() => setRegion(id)}>
              {tt(key, english)}
            </button>
          ))}
          <select className={styles.select} value={kind} onChange={(e) => setKind(e.target.value)}
                  aria-label={tt('games.console.kindLabel', 'Kind of game')}>
            <option value="all">{tt('games.console.everyKind', 'Every kind')}</option>
            {KINDS.map((k) => <option key={k} value={k}>{tt(KIND_LABELS[k][0], KIND_LABELS[k][1])}</option>)}
          </select>
          <input className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder={tt('games.console.search', 'Search games')}
                 aria-label={tt('games.console.search', 'Search games')} />
        </div>
        {pool.length === 0 ? (
          <p className={styles.muted}>{tt('games.console.noMatch', 'Nothing matches. Clear the search or pick another region.')}</p>
        ) : (
          <ul className={styles.catalogue}>
            {pool.map((g) => {
              const w = g.words;
              const added = onEvent.get(g.key);
              return (
                <li key={g.key} className={styles.catItem}>
                  <GameStill gameKey={g.key} className={styles.catThumb} say={say(g.key)} label={w?.name || g.key} />
                  <div className={styles.catText}>
                    <span className={styles.catName}>{w?.name || ''}</span>
                    <span className={styles.meta}>
                      {[shortOrigin(w?.origin), w?.players, w?.time].filter(Boolean).join(' · ')}
                    </span>
                    <span className={styles.meta}>{kindName(tt, g.kind)}</span>
                  </div>
                  <div className={styles.catActions}>
                    <button type="button" className={styles.quiet} onClick={() => setPreview(g.key)}>
                      {tt('games.console.preview', 'Preview')}
                    </button>
                    {added === 'proposed' ? (
                      <span className={styles.inTag}>{tt('games.console.inVoteTag', 'In the vote')}</span>
                    ) : added ? (
                      <span className={styles.inTag}>{tt('games.console.onEvent', 'On your event')}</span>
                    ) : (
                      <button type="button" className={styles.goldBtn} disabled={busy === 'add'}
                              onClick={() => add({ catalogue_key: g.key })}>
                        {tt('games.console.add', 'Add')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.panel}>
        <h3 className={styles.subTitle}>{tt('games.console.ownTitle', 'Your own game')}</h3>
        <p className={styles.muted}>
          {tt('games.console.ownLede', 'Something not in the list? Name it and say how it is played. It gets the same sign up, without an animation.')}
        </p>
        <form className={styles.ownForm} onSubmit={addOwn}>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>{tt('games.own.name', 'Name')}</span>
              <input className={styles.input} value={own.name} maxLength={80} required
                     placeholder={tt('games.own.nameHint', 'e.g. Cosplay trivia')}
                     onChange={(e) => setOwn({ ...own, name: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>{tt('games.own.players', 'Players')}</span>
              <input className={styles.input} value={own.players} maxLength={40}
                     placeholder={tt('games.own.playersHint', 'e.g. 4 to 20')}
                     onChange={(e) => setOwn({ ...own, players: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>{tt('games.own.length', 'How long')}</span>
              <input className={styles.input} value={own.length} maxLength={40}
                     placeholder={tt('games.own.lengthHint', 'e.g. 20 min')}
                     onChange={(e) => setOwn({ ...own, length: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>{tt('games.own.needs', 'You need')}</span>
              <input className={styles.input} value={own.needs} maxLength={160}
                     placeholder={tt('games.own.needsHint', 'e.g. a mic')}
                     onChange={(e) => setOwn({ ...own, needs: e.target.value })} />
            </label>
          </div>
          <label className={styles.field}>
            <span>{tt('games.own.steps', 'How to play, step by step')}</span>
            <textarea className={styles.textarea} value={own.steps} maxLength={2000} rows={4}
                      placeholder={tt('games.own.stepsHint', 'One step per line')}
                      onChange={(e) => setOwn({ ...own, steps: e.target.value })} />
          </label>
          <div className={styles.buttons}>
            <button type="submit" className={styles.goldBtn} disabled={busy === 'add' || !own.name.trim()}>
              {tt('games.console.addOwn', 'Add this game')}
            </button>
          </div>
        </form>
      </section>

      {preview && previewWords && (
        <GameExplainer gameKey={preview} words={previewWords} say={say(preview)} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
