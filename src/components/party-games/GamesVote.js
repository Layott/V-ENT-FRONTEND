'use client';

// The vote over which games run, on the event's Games tab (inbox 439, piece G2).
//
// CEO, 12 October 2026: organisers "can even create a voting system for poeple
// to vote on". It is an ordinary poll of the pick-several kind whose options are
// games, so one ticket is one vote, the count stays hidden until you have voted
// (unless the organiser shows it), and each option opens its own explainer.

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber, formatWithZone } from '@/lib/datetime';
import { plural } from '@/lib/plural';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';
import styles from './games-vote.module.css';

/**
 * @param vote      the payload's `vote`
 * @param ticket    the ticket the reader is acting with, or null
 * @param eventRef  the event's slug
 * @param token     the session token, if any
 * @param nameOf    a game's name in the reader's language
 * @param onHow     opens a game's explainer
 * @param onVoted   reload after a vote
 */
export default function GamesVote({ vote, ticket, eventRef, token, nameOf, onHow, onVoted }) {
  const tt = useT();
  const mine = ticket ? vote.answers_by_ticket?.[ticket.code] : null;
  const [picked, setPicked] = useState(() => new Set(mine || []));
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => { setPicked(new Set(mine || [])); setChanging(false); }, [ticket?.code, vote.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = vote.max_choices || vote.options.length;
  const open = vote.is_open;
  const canVote = Boolean(ticket) && open;
  const asking = canVote && (!mine || changing);
  const total = vote.total_votes || 0;

  const toggle = (id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < pick) next.add(id);
      return next;
    });
  };

  const send = async () => {
    setBusy(true);
    setProblem('');
    try {
      await ventFetch(`/event/${encodeURIComponent(eventRef)}/polls/${vote.id}/vote/`, {
        method: 'POST', token, body: { option_ids: [...picked], ticket_code: ticket.code },
      });
      setChanging(false);
      onVoted?.();
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.vote.failed', 'Your vote did not go through. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const label = open
    ? (vote.closes_at
      ? tt('games.vote.closes', 'Vote, closes {when}').replace('{when}', formatWithZone(vote.closes_at))
      : tt('games.vote.open', 'Vote'))
    : tt('games.vote.closed', 'Vote closed');

  const ranked = [...vote.options].sort((a, b) => (b.votes || 0) - (a.votes || 0) || a.position - b.position);

  return (
    <section className={styles.panel} aria-labelledby={`games-vote-${vote.id}`}>
      <div className={styles.head}>
        <div>
          <span className={styles.label}>{label}</span>
          <h3 id={`games-vote-${vote.id}`} className={styles.question}>{vote.question}</h3>
        </div>
        {mine && !changing && <span className={styles.greenTag}>{tt('games.vote.youVoted', 'You voted')}</span>}
        {!ticket && open && <span className={styles.tag}>{tt('games.vote.needsTicket', 'Voting needs a ticket')}</span>}
      </div>

      {asking ? (
        <>
          <p className={styles.muted}>
            {plural(tt, pick,
              'games.vote.pickOne', 'Pick {n}. One vote per ticket. The organiser runs the winners.',
              'games.vote.pickUpTo', 'Pick up to {n}. One vote per ticket. The organiser runs the winners.',
              formatNumber(pick))}
          </p>
          <ul className={styles.options}>
            {vote.options.map((o) => (
              <li key={o.id} className={styles.optionRow}>
                <button type="button" className={styles.option} aria-pressed={picked.has(o.id)}
                        onClick={() => toggle(o.id)}>
                  <span className={styles.box} aria-hidden="true" />
                  <span className={styles.optionName}>{nameOf(o.game) || o.text}</span>
                </button>
                {o.game && (
                  <button type="button" className={styles.how} onClick={() => onHow(o.game)}>
                    {tt('games.howToPlay', 'How to play')}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {problem && <p className={styles.problem} role="alert">{problem}</p>}
          <div className={styles.row}>
            <button type="button" className={styles.goldBtn} disabled={busy || picked.size === 0} onClick={send}>
              {tt('games.vote.send', 'Send my vote')}
            </button>
            <span className={styles.muted}>
              {tt('games.vote.picked', '{k} of {n} picked')
                .replace('{k}', formatNumber(picked.size)).replace('{n}', formatNumber(pick))}
            </span>
          </div>
        </>
      ) : vote.results_visible ? (
        <>
          <ul className={styles.results}>
            {ranked.map((o) => (
              <li key={o.id}>
                <div className={styles.resultLine}>
                  <span>
                    {nameOf(o.game) || o.text}
                    {mine?.includes(o.id) && <span className={styles.goldTag}>{tt('games.vote.yourPick', 'Your pick')}</span>}
                  </span>
                  <span className={styles.muted}>
                    {plural(tt, o.votes || 0, 'games.vote.votesOne', '{n} vote', 'games.vote.votes', '{n} votes',
                      formatNumber(o.votes || 0))}
                  </span>
                </div>
                <span className={styles.bar} aria-hidden="true">
                  <i style={{ width: `${total ? Math.round(((o.votes || 0) / total) * 100) : 0}%` }} />
                </span>
              </li>
            ))}
          </ul>
          {canVote && mine && (
            <button type="button" className={styles.quiet} onClick={() => setChanging(true)}>
              {tt('games.vote.change', 'Change my vote')}
            </button>
          )}
        </>
      ) : (
        <>
          <ul className={styles.plainOptions}>
            {vote.options.map((o) => (
              <li key={o.id}>
                <span>{nameOf(o.game) || o.text}</span>
                {o.game && (
                  <button type="button" className={styles.how} onClick={() => onHow(o.game)}>
                    {tt('games.howToPlay', 'How to play')}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.muted}>{tt('games.vote.countLater', 'The count shows once you have voted. One vote per ticket.')}</p>
        </>
      )}
    </section>
  );
}
