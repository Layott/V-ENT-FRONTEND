'use client';

// "Let people vote", on the organiser's Games tab (inbox 439, piece G2).
//
// CEO, 12 October 2026: organisers "can even create a voting system for poeple
// to vote on". Tick games already on the event or pick more from the catalogue,
// ask the question, open it. While it is open the organiser sees the count and
// runs the top N with one press; Close runs none of them. A catalogue game put
// to the vote is "in the vote" until then: on the event page it shows only
// inside the vote, never as a game people can sign up for.

import { useMemo, useState } from 'react';
import { appLocale } from '@/lib/appLocale';
import DateField from '@/components/date-field/DateField';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { plural } from '@/lib/plural';
import { formatNumber, formatWithZone, localInputToISO } from '@/lib/datetime';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';
import { GAMES } from '@/lib/partyGames/catalogue';
import { wordsForGame } from './EventGames';
import panel from './event-games-panel.module.css';
import styles from './games-vote.module.css';

const MAX_OPTIONS = 10;

/**
 * @param path       the event's games address, ending in a slash
 * @param token      the organiser's session token
 * @param vote       the payload's `vote` (the open one, else the latest), or null
 * @param games      every game on the event, as the organiser sees them
 * @param words      catalogue words for a key, in the reader's language
 * @param onPayload  hands back the games payload the server answered with
 * @param toast      shows a short notice
 */
export default function GamesVoteConsole({ path, token, vote, games, words, onPayload, toast }) {
  const tt = useT();
  const open = Boolean(vote?.is_open);

  // Games on the event that could go in a vote: anything still on, and not
  // already waiting on a vote of its own.
  const onEvent = useMemo(
    () => games.filter((g) => g.status === 'open' || g.status === 'closed'),
    [games],
  );
  const onEventKeys = useMemo(
    () => new Set(games.filter((g) => g.status !== 'off').map((g) => g.catalogue_key).filter(Boolean)),
    [games],
  );

  const [chosen, setChosen] = useState(() => new Set());
  const [extra, setExtra] = useState([]);
  const [question, setQuestion] = useState('');
  const [pick, setPick] = useState('1');
  const [closes, setCloses] = useState('');
  const [top, setTop] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const nameOfKey = (key) => words(key)?.name || key;
  const nameOf = (game) => (game ? wordsForGame(game, words)?.name || '' : '');

  // The catalogue games not on the event, by name in the reader's language.
  const more = useMemo(() => {
    const collator = new Intl.Collator(appLocale(), { sensitivity: 'base' });
    return GAMES
      .filter((g) => !onEventKeys.has(g.key) && !extra.includes(g.key))
      .map((g) => ({ key: g.key, name: words(g.key)?.name || g.key }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [onEventKeys, extra, words]);

  const candidates = [
    ...onEvent.map((g) => ({ id: `id:${g.id}`, name: nameOf(g), game: g })),
    ...extra.map((key) => ({ id: `key:${key}`, name: nameOfKey(key), key })),
  ];

  const toggle = (id) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_OPTIONS) next.add(id);
      return next;
    });
  };

  const addExtra = (key) => {
    if (!key || chosen.size >= MAX_OPTIONS) return;
    setExtra((prev) => [...prev, key]);
    setChosen((prev) => new Set(prev).add(`key:${key}`));
  };

  const call = async (url, body, done) => {
    setBusy(true);
    setProblem('');
    try {
      const data = await ventFetch(url, { method: 'POST', token, body });
      onPayload(data);
      done(data);
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.vote.saveFailed', 'That did not go through. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const openVote = () => {
    const picked = [...chosen];
    const most = Math.max(1, Math.min(Number(pick) || 1, picked.length));
    // The option's words under Polls, where a game is shown by its text alone:
    // the name as the organiser reads it, keyed the way the server looks it up.
    const names = {};
    candidates.forEach((c) => {
      if (chosen.has(c.id)) names[c.key || String(c.game.id)] = c.name;
    });
    call(`${path}vote/`, {
      games: picked.map((id) => (id.startsWith('id:') ? Number(id.slice(3)) : id.slice(4))),
      names,
      // Left blank, the question is the one the box suggested, in the
      // organiser's language: the server's own default is English, and a
      // French event read "Which games should we run?" (walk, 13 October).
      question: question.trim() || tt('games.vote.questionHint', 'Which games should we run?'),
      pick: most,
      closes_at: closes ? localInputToISO(closes) : null,
    }, () => {
      setChosen(new Set());
      setExtra([]);
      setQuestion('');
      setCloses('');
      toast(tt('games.vote.opened', 'The vote is open. It shows on your event page under Games, and under Polls.'));
    });
  };

  const run = (n) => {
    call(`${path}vote/${vote.id}/run/`, { top: n }, (data) => {
      const count = (data.winners || []).length;
      toast(count
        ? plural(tt, count, 'games.vote.ranOne', '{n} game is on. Set when and where under Games at your event.',
          'games.vote.ran', '{n} games are on. Set when and where under Games at your event.', formatNumber(count))
        : tt('games.vote.closedNotice', 'The vote is closed. None of its games were added.'));
    });
  };

  if (open) {
    const options = vote.options || [];
    const ranked = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0) || a.position - b.position);
    const most = Math.max(...ranked.map((o) => o.votes || 0), 0);
    const total = vote.total_votes || 0;
    const runTop = Math.min(Number(top) || Math.min(vote.max_choices || 1, options.length), options.length);
    return (
      <section className={panel.panel}>
        <h3 className={panel.subTitle}>{tt('games.vote.title', 'Let people vote')}</h3>
        <div className={panel.spread}>
          <div>
            <span className={panel.label}>
              {vote.closes_at
                ? tt('games.vote.openCloses', 'Open, closes {when}').replace('{when}', formatWithZone(vote.closes_at))
                : tt('games.vote.openNow', 'Open')}
            </span>
            <p className={styles.question}>{vote.question}</p>
          </div>
          <span className={styles.greenTag}>
            {plural(tt, total, 'games.vote.votesOne', '{n} vote', 'games.vote.votes', '{n} votes', formatNumber(total))}
          </span>
        </div>
        <ol className={styles.results}>
          {ranked.map((o, i) => (
            <li key={o.id}>
              <div className={styles.resultLine}>
                <span>{formatNumber(i + 1)}. {nameOf(o.game) || o.text}</span>
                <span className={styles.muted}>
                  {plural(tt, o.votes || 0, 'games.vote.votesOne', '{n} vote', 'games.vote.votes', '{n} votes',
                    formatNumber(o.votes || 0))}
                </span>
              </div>
              <span className={styles.bar} aria-hidden="true">
                <i style={{ width: `${most ? Math.round(((o.votes || 0) / most) * 100) : 0}%` }} />
              </span>
            </li>
          ))}
        </ol>
        {problem && <p className={panel.problem} role="alert">{problem}</p>}
        <div className={panel.buttons}>
          <label className={panel.inlineField}>
            <span>{tt('games.vote.runHowMany', 'How many to run')}</span>
            <select className={panel.select} value={String(runTop)} onChange={(e) => setTop(e.target.value)}>
              {options.map((o, i) => (
                <option key={o.id} value={String(i + 1)}>{formatNumber(i + 1)}</option>
              ))}
            </select>
          </label>
          <button type="button" className={panel.goldBtn} disabled={busy} onClick={() => run(runTop)}>
            {plural(tt, runTop, 'games.vote.runTopOne', 'Run the top game', 'games.vote.runTop', 'Run the top {n}',
              formatNumber(runTop))}
          </button>
          <button type="button" className={panel.btn} disabled={busy} onClick={() => run(0)}>
            {tt('games.vote.close', 'Close the vote')}
          </button>
        </div>
        <p className={panel.muted}>
          {tt('games.vote.runHint', 'Running a game opens it for sign ups; you set the time and place. The others in the vote come off. Close the vote to run none of them.')}
        </p>
      </section>
    );
  }

  return (
    <section className={panel.panel}>
      <h3 className={panel.subTitle}>{tt('games.vote.title', 'Let people vote')}</h3>
      <p className={panel.muted}>
        {tt('games.vote.lede', 'Not sure which games your crowd wants? Put some to a vote first. Votes are one per ticket, and the vote also shows under Polls.')}
      </p>
      {vote && !vote.is_open && (
        <p className={panel.muted}>
          {tt('games.vote.lastClosed', 'Your last vote, "{question}", is closed.').replace('{question}', vote.question)}
        </p>
      )}

      <span className={panel.label}>{tt('games.vote.putThese', 'Put these to the vote')}</span>
      {candidates.length === 0 && (
        <p className={panel.muted}>{tt('games.vote.noCandidates', 'Add a game below, or pick one from the list here.')}</p>
      )}
      {candidates.length > 0 && (
        <ul className={styles.options}>
          {candidates.map((c) => (
            <li key={c.id} className={styles.optionRow}>
              <button type="button" className={styles.option} aria-pressed={chosen.has(c.id)} onClick={() => toggle(c.id)}>
                <span className={styles.box} aria-hidden="true" />
                <span className={styles.optionName}>{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className={panel.field}>
        <span>{tt('games.vote.morePick', 'Add a game from the list')}</span>
        <select className={panel.select} value="" onChange={(e) => addExtra(e.target.value)}
                disabled={chosen.size >= MAX_OPTIONS}>
          <option value="">{tt('games.vote.morePlaceholder', 'Choose a game')}</option>
          {more.map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
        </select>
      </label>

      <div className={panel.fields}>
        <label className={panel.field}>
          <span>{tt('games.vote.question', 'Question')}</span>
          <input className={panel.input} value={question} maxLength={200}
                 placeholder={tt('games.vote.questionHint', 'Which games should we run?')}
                 onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <label className={panel.field}>
          <span>{tt('games.vote.pickLabel', 'Each person picks up to')}</span>
          <input className={panel.input} value={pick} inputMode="numeric"
                 onChange={(e) => setPick(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
        </label>
        <label className={panel.field}>
          <span>{tt('games.vote.closesLabel', 'Voting closes (optional)')}</span>
          <DateField withTime className={panel.input} value={closes}
                     ariaLabel={tt('games.vote.closesLabel', 'Voting closes (optional)')}
                     onChange={(e) => setCloses(e.target.value)} />
        </label>
      </div>

      {problem && <p className={panel.problem} role="alert">{problem}</p>}
      <div className={panel.buttons}>
        <button type="button" className={panel.goldBtn} disabled={busy || chosen.size < 2} onClick={openVote}>
          {tt('games.vote.openVote', 'Open the vote')}
        </button>
        <span className={panel.muted}>
          {chosen.size < 2
            ? tt('games.vote.needTwo', 'Tick at least two games.')
            : plural(tt, chosen.size, 'games.vote.inVoteOne', '{n} game in the vote', 'games.vote.inVote', '{n} games in the vote',
              formatNumber(chosen.size))}
        </span>
      </div>
    </section>
  );
}
