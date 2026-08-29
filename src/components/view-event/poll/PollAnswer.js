'use client';

// One poll, in whichever shape it was asked.
//
// CEO, 29 August 2026: the poll mechanism should be "a lot more detailed with a
// lot more options for polling, just like google forms". The page could draw
// exactly one shape - a column of buttons, press one - which is the right shape
// for "which day suits you" and wrong for every other question an organiser has.
//
// It is a component rather than more JSX inside the event page because six
// shapes with their own local state (a multi-select being assembled, an order
// being dragged into place, a sentence being typed) do not belong in a page
// that already holds the ticket flow.
//
// Nothing here renders a live control somebody is not allowed to press. A
// closed poll, a reader with no ticket, and a poll already answered each
// produce a different, written state instead of a button that fails.

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './poll-answer.module.css';

export default function PollAnswer({ poll, canAnswer, busy, onAnswer }) {
  const tt = useT();

  const [picked, setPicked] = useState([]);
  const [order, setOrder] = useState([]);
  const [text, setText] = useState('');

  // Whatever this reader answered before, so the controls open on their answer
  // rather than empty.
  useEffect(() => {
    setPicked(poll.my_option_ids || []);
    setOrder((poll.my_option_ids && poll.my_option_ids.length)
      ? poll.my_option_ids
      : poll.options.map((o) => o.id));
    setText(poll.my_text || '');
  }, [poll.id, poll.my_option_ids, poll.my_text, poll.options]);

  const live = poll.is_open && canAnswer && !busy;
  const answered = poll.answered;

  const share = (option) => (option.share === null || option.share === undefined
    ? null
    : <span className={styles.share}>{option.share}%</span>);

  // ------------------------------------------------------------------ shapes

  const single = () => (
    <div className={styles.options}>
      {poll.options.map((option) => {
        const mine = poll.my_option_id === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`${styles.option} ${mine ? styles.optionMine : ''}`}
            disabled={!live || mine}
            onClick={() => onAnswer({ option_id: option.id })}
          >
            <span>{option.text}</span>
            {share(option)}
          </button>
        );
      })}
    </div>
  );

  const multiple = () => {
    const toggle = (id) => setPicked((was) => (was.includes(id)
      ? was.filter((x) => x !== id)
      : [...was, id]));
    const tooFew = poll.min_choices > 0 && picked.length < poll.min_choices;
    const tooMany = poll.max_choices > 0 && picked.length > poll.max_choices;
    return (
      <>
        <div className={styles.options}>
          {poll.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.option} ${picked.includes(option.id) ? styles.optionMine : ''}`}
              aria-pressed={picked.includes(option.id)}
              disabled={!live}
              onClick={() => toggle(option.id)}
            >
              <span>{option.text}</span>
              {share(option)}
            </button>
          ))}
        </div>
        {(poll.min_choices > 0 || poll.max_choices > 0) && (
          <p className={styles.note}>
            {poll.min_choices > 0 && poll.max_choices > 0
              ? tt('event.pollBetween', 'Pick between {a} and {b}.')
                .replace('{a}', poll.min_choices).replace('{b}', poll.max_choices)
              : poll.min_choices > 0
                ? tt('event.pollAtLeast', 'Pick at least {n}.').replace('{n}', poll.min_choices)
                : tt('event.pollAtMost', 'Pick no more than {n}.').replace('{n}', poll.max_choices)}
          </p>
        )}
        <button
          type="button"
          className={styles.submit}
          disabled={!live || !picked.length || tooFew || tooMany}
          onClick={() => onAnswer({ option_ids: picked })}
        >
          {answered
            ? tt('event.pollUpdate', 'Change my answer')
            : tt('event.pollSend', 'Send my answer')}
        </button>
      </>
    );
  };

  const ranking = () => {
    const move = (index, by) => setOrder((was) => {
      const next = [...was];
      const to = index + by;
      if (to < 0 || to >= next.length) return was;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
    const label = (id) => (poll.options.find((o) => o.id === id) || {}).text || '';
    return (
      <>
        <ol className={styles.ranked}>
          {order.map((id, index) => (
            <li key={id} className={styles.rankRow}>
              <span className={styles.rankPlace}>{index + 1}</span>
              <span className={styles.rankLabel}>{label(id)}</span>
              {/* Arrows rather than dragging: a drag target on a phone is a
                  fight, and this has to work with a thumb and with a keyboard. */}
              <button
                type="button" className={styles.rankBtn} disabled={!live || index === 0}
                aria-label={tt('event.pollMoveUp', 'Move {x} up').replace('{x}', label(id))}
                onClick={() => move(index, -1)}
              >&uarr;</button>
              <button
                type="button" className={styles.rankBtn}
                disabled={!live || index === order.length - 1}
                aria-label={tt('event.pollMoveDown', 'Move {x} down').replace('{x}', label(id))}
                onClick={() => move(index, 1)}
              >&darr;</button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={styles.submit}
          disabled={!live}
          onClick={() => onAnswer({ option_ids: order })}
        >
          {answered
            ? tt('event.pollUpdate', 'Change my answer')
            : tt('event.pollSend', 'Send my answer')}
        </button>
      </>
    );
  };

  const scale = () => {
    const points = [];
    for (let n = poll.scale_min; n <= poll.scale_max; n += 1) points.push(n);
    return (
      <>
        <div className={styles.scaleRow}>
          {points.map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.scalePoint} ${poll.my_number === n ? styles.scalePointMine : ''}`}
              disabled={!live}
              aria-label={String(n)}
              onClick={() => onAnswer({ number: n })}
            >{n}</button>
          ))}
        </div>
        {(poll.scale_min_label || poll.scale_max_label) && (
          <div className={styles.scaleEnds}>
            <span>{poll.scale_min_label}</span>
            <span>{poll.scale_max_label}</span>
          </div>
        )}
        {poll.average !== null && poll.average !== undefined && (
          <p className={styles.note}>
            {tt('event.pollAverage', 'Average so far: {n}').replace('{n}', poll.average)}
          </p>
        )}
      </>
    );
  };

  const written = () => {
    const long = poll.kind === 'long_text';
    const limit = long ? 2000 : 120;
    return (
      <>
        {long
          ? <textarea
              className={styles.textarea} rows={4} maxLength={limit}
              placeholder={tt('event.pollWrite', 'Your answer')}
              aria-label={poll.question}
              disabled={!live}
              value={text} onChange={(e) => setText(e.target.value)} />
          : <input
              className={styles.input} maxLength={limit}
              placeholder={tt('event.pollWrite', 'Your answer')}
              aria-label={poll.question}
              disabled={!live}
              value={text} onChange={(e) => setText(e.target.value)} />}
        <p className={styles.note}>
          {tt('event.pollTextPrivate',
            'Only the organiser reads these. Other people at the event do not.')}
        </p>
        <button
          type="button"
          className={styles.submit}
          disabled={!live || !text.trim()}
          onClick={() => onAnswer({ text: text.trim() })}
        >
          {answered
            ? tt('event.pollUpdate', 'Change my answer')
            : tt('event.pollSend', 'Send my answer')}
        </button>
      </>
    );
  };

  const body = {
    single,
    multiple,
    ranking,
    scale,
    short_text: written,
    long_text: written,
  }[poll.kind] || single;

  return (
    <div className={styles.poll}>
      <strong className={styles.question}>{poll.question}</strong>
      {poll.help_text && <p className={styles.help}>{poll.help_text}</p>}
      {!poll.is_open && (
        <span className={styles.note}>{tt('event.pollClosedNote', 'This poll has closed.')}</span>
      )}

      {body()}

      <span className={styles.note}>
        {answered
          ? tt('event.pollVoted', 'Your answer is in.')
          : poll.results_visible
            ? ''
            : tt('event.pollHidden', 'The count appears once you have answered.')}
      </span>
    </div>
  );
}
