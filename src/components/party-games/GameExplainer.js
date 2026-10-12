'use client';

// How a party game is played, with its animation (inbox 439).
//
// CEO, 12 October 2026: "i want each to have an explainers and like an
// animation, that can be easily understod by organizers or users". The words
// are the animation's captions: step 2 of the list is frame 2 of the picture,
// and the one being shown is lit. It plays once on opening and stops on the
// last step; "Play again" and the step buttons are how somebody watches it
// again or holds one frame. An organiser's own game has no animation, so its
// sheet is the words alone.

import { useCallback, useEffect, useRef } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { BY_KEY } from '@/lib/partyGames/catalogue';
import { GameStage, useGamePlayer } from './stage/Stage';
import { kindName, regionName } from './names';
import styles from './game-explainer.module.css';

/**
 * @param gameKey  a catalogue key, or null for an organiser's own game
 * @param words    the game's words (useGameWords().words(key), or ownGameWords)
 * @param say      translates words drawn in the animation
 * @param onClose  closes the sheet
 * @param action   optional: the sign-up control for this game at this event
 */
export default function GameExplainer({ gameKey, words, say, onClose, action }) {
  const tt = useT();
  const meta = gameKey ? BY_KEY[gameKey] : null;
  const player = useGamePlayer(meta ? gameKey : null);
  const closeRef = useRef(null);
  const { play, stop } = player;

  useEffect(() => {
    play();
    closeRef.current?.focus();
    return stop;
  }, [play, stop]);

  const onKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  if (!words) return null;
  const steps = words.steps || [];
  const facts = [
    ['games.players', 'Players', words.players],
    ['games.time', 'Time', words.time],
    ['games.needs', 'You need', words.needs],
    ['games.age', 'Age', words.age],
  ].filter(([, , value]) => value);
  const kicker = meta
    ? `${kindName(tt, meta.kind)} · ${regionName(tt, meta.region)}`
    : tt('games.ownGame', 'The organiser’s own game');

  return (
    <div
      className={styles.scrim}
      role="dialog"
      aria-modal="true"
      aria-label={words.name}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`${styles.sheet} ${meta ? '' : styles.wordsOnly}`}>
        {meta && (
          <div className={styles.stageBox}>
            <GameStage
              player={player}
              say={say}
              label={tt('games.playedStepByStep', '{name}, played step by step').replace('{name}', words.name)}
            />
            <div className={styles.stepButtons}>
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.stepButton}
                  aria-pressed={player.now === i + 1}
                  onClick={() => player.go(i + 1)}
                >
                  {tt('games.step', 'Step {n}').replace('{n}', String(i + 1))}
                </button>
              ))}
            </div>
            <div className={styles.stageFoot}>
              <button type="button" className={styles.quiet} onClick={play}>
                {tt('games.playAgain', 'Play again')}
              </button>
              {words.origin && <span className={styles.origin}>{words.origin}</span>}
            </div>
          </div>
        )}

        <div className={styles.body}>
          <div className={styles.head}>
            <div>
              <span className={styles.kicker}>{kicker}</span>
              <h2 className={styles.name}>{words.name}</h2>
            </div>
            <button ref={closeRef} type="button" className={styles.quiet} onClick={onClose}>
              {tt('games.close', 'Close')}
            </button>
          </div>

          {words.summary && <p className={styles.summary}>{words.summary}</p>}

          {steps.length > 0 && (
            <ol className={styles.steps}>
              {steps.map((text, i) => (
                <li key={i} className={meta && player.now === i + 1 ? styles.now : undefined}>
                  <span className={styles.number} aria-hidden="true">{i + 1}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          )}

          {facts.length > 0 && (
            <dl className={styles.facts}>
              {facts.map(([key, english, value]) => (
                <div key={key} className={styles.fact}>
                  <dt>{tt(key, english)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {words.win && (
            <div className={styles.win}>
              <span className={styles.kicker}>{tt('games.toWin', 'How to win')}</span>
              <p>{words.win}</p>
            </div>
          )}

          {action}
        </div>
      </div>
    </div>
  );
}
