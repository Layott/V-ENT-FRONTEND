'use client';

// A circuit's ranking (P5): zebra rows on one panel, as /rankings draws its
// table, and a "where the points came from" row under each entrant.
//
// The server ranks (vent_circuits/standings.py through ranking.order); this
// only draws what it sends. A shared rank says so under the number, and a
// place decided by a tie-breaker says which one, because "why is that player
// above me" deserves an answer on the page.

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import Avatar from '@/components/avatar/Avatar';
import { formatNumber } from '@/lib/datetime';
import styles from './circuits.module.css';

const points = (value) => formatNumber(Number(value), { maximumFractionDigits: 2 });

function placeWords(tt, event) {
  // An Elo circuit counts matches as they are played, before the tournament
  // has final places.
  if (event.place == null) return tt('circuit.stillPlaying', 'still being played');
  const place = tt('circuit.placeShort', 'Place {n}').replace('{n}', event.place);
  if (!event.shared_with) return place;
  return tt('circuit.placeShared', '{place}, shared with {n}')
    .replace('{place}', place).replace('{n}', event.shared_with);
}

function decidedWords(tt, key) {
  if (key === 'best_place') return tt('circuit.decided.bestPlace', 'ahead on best single place');
  if (key === 'wins') return tt('circuit.decided.wins', 'ahead on events won');
  return '';
}

const profileHref = (entrant) => (entrant.type === 'team'
  ? (entrant.slug ? `/teams/${encodeURIComponent(entrant.slug)}` : null)
  : (entrant.handle ? `/u/${encodeURIComponent(entrant.handle)}` : null));

function Row({ row, index, tt }) {
  const [open, setOpen] = useState(false);
  const { entrant } = row;
  const href = profileHref(entrant);
  const name = entrant.name || entrant.handle || tt('circuit.unknownEntrant', 'Unknown');
  const who = (
    <>
      <Avatar src={entrant.avatar} name={name} size={36} />
      <span className={styles.whoText}>
        <span className={styles.whoName}>{name}</span>
        {entrant.handle && <span className={styles.whoHandle}>@{entrant.handle}</span>}
        {row.decided_by && decidedWords(tt, row.decided_by)
          && <span className={styles.why}>{decidedWords(tt, row.decided_by)}</span>}
      </span>
    </>
  );
  return (
    <div className={index % 2 === 0 ? styles.zebra : undefined}>
      <div className={styles.trow} role="row">
        <span className={`${styles.rank} ${styles.num} ${row.rank === 1 ? styles.rankFirst : ''}`} role="cell">
          {row.rank}
          {row.tied && <span className={styles.rankShared}>{tt('circuit.shared', 'shared')}</span>}
        </span>
        <span role="cell" className={styles.cellMin}>
          {href ? <Link href={href} className={styles.who}>{who}</Link> : <span className={styles.who}>{who}</span>}
        </span>
        <span className={`${styles.points} ${styles.num}`} role="cell">{points(row.points)}</span>
        <span className={`${styles.cell} ${styles.num}`} role="cell">{row.played}</span>
        <span className={`${styles.cell} ${styles.num}`} role="cell">
          {row.best_place ? tt('circuit.placeShort', 'Place {n}').replace('{n}', row.best_place) : ''}
        </span>
        <span role="cell">
          <button type="button" className={styles.expand} aria-expanded={open}
                  aria-label={tt('circuit.whereFrom', "Where {name}'s points came from").replace('{name}', name)}
                  onClick={() => setOpen((v) => !v)}>
            {open ? '-' : '+'}
          </button>
        </span>
      </div>
      {open && (
        <div className={styles.detail}>
          {row.events.map((event, i) => (
            <div key={`e${i}`} className={styles.line}>
              <span className={styles.lineWhat}>
                <Link href={`/tournaments/${encodeURIComponent(event.tournament.slug)}`} className={styles.lineLink}>
                  {event.tournament.title}
                </Link>{' '}
                <span>{placeWords(tt, event)}{event.tier ? `, ${event.tier}` : ''}</span>
              </span>
              <span className={styles.num}>{Number(event.points) > 0 ? '+' : ''}{points(event.points)}</span>
            </div>
          ))}
          {row.adjustments.map((adj, i) => (
            <div key={`a${i}`} className={`${styles.line} ${styles.lineAdj}`}>
              <span className={styles.lineWhat}>{adj.reason} <span>{tt('circuit.adjustment', 'adjustment')}</span></span>
              <span className={styles.num}>{Number(adj.points) > 0 ? '+' : ''}{points(adj.points)}</span>
            </div>
          ))}
          {!row.events.length && !row.adjustments.length
            && <p className={styles.faint}>{tt('circuit.noPointsYet', 'No points yet.')}</p>}
        </div>
      )}
    </div>
  );
}

export default function CircuitRanking({ rows, entrant, engine = 'points' }) {
  const tt = useT();
  if (!rows.length) {
    return (
      <p className={styles.empty}>
        {tt('circuit.rankingEmpty', 'Nobody has points yet. The ranking fills in as each tournament in the circuit finishes.')}
      </p>
    );
  }
  return (
    <div className={styles.table} role="table" aria-label={tt('circuit.tab.ranking', 'Ranking')}>
      <div className={styles.thead} role="row">
        <span role="columnheader">{tt('circuit.col.rank', 'Rank')}</span>
        <span role="columnheader">{entrant === 'team' ? tt('circuit.col.team', 'Team') : tt('circuit.col.player', 'Player')}</span>
        <span role="columnheader" className={styles.right}>
          {engine === 'elo' ? tt('circuit.col.rating', 'Rating') : tt('circuit.col.points', 'Points')}
        </span>
        <span role="columnheader" className={styles.right}>{tt('circuit.col.played', 'Played')}</span>
        <span role="columnheader" className={styles.right}>{tt('circuit.col.best', 'Best')}</span>
        <span role="columnheader" aria-hidden="true" />
      </div>
      <div>
        {rows.map((row, i) => (
          <Row key={`${row.entrant.type}-${row.entrant.id}`} row={row} index={i} tt={tt} />
        ))}
      </div>
    </div>
  );
}
