'use client';

// The stage a format explainer is drawn on (inbox 476).
//
// One frame of a scene (src/lib/explainers), drawn as SVG. Every actor that
// can move is placed with a CSS transform and every tone is a class, so when
// the player swaps one frame for the next the browser animates the difference
// by itself: a chip slides to the slot it has earned, a line lights, a row
// takes its new place. With `moving` off nothing animates, which is how a jump
// (play again, a step chosen by hand, reduced motion) lands without sliding.
// The colours are the site's variables, in the stylesheet, never here.

import { artText } from '@/lib/explainers/story';
import styles from './format-explainer.module.css';

const TONE = {
  '': '',
  win: styles.toneWin,
  out: styles.toneOut,
  drop: styles.toneDrop,
  gold: styles.toneGold,
  through: styles.toneThrough,
  lit: styles.toneLit,
  muted: styles.toneMuted,
  good: styles.toneGood,
  bad: styles.toneBad,
  stripe: styles.toneStripe,
  box: styles.toneBox,
  outBox: styles.toneOutBox,
  fixture: '',
};

const tone = (t) => TONE[t || ''] || '';
const place = (a) => ({ transform: `translate(${a.x}px, ${a.y}px)`, opacity: a.o });

// Every word's size, multiplied by --ex-type. On a phone the whole stage is
// drawn at about two thirds of its size, so the stylesheet raises that factor
// when the stage is narrow, and words that sit in a box are centred on it
// (dominant-baseline) so they stay centred at any size.
const type = (n) => ({ fontSize: `calc(${n}px * var(--ex-type, 1))` });

function Chip({ a }) {
  const fontSize = Math.min(12.5, a.h * 0.62);
  const box = a.h - 6;
  return (
    <g className={`${styles.actor} ${styles.chip} ${tone(a.tone)}`} style={place(a)}>
      <rect className={styles.chipFill} width={a.w} height={a.h} rx={5} />
      {a.seed ? (
        <>
          <rect className={styles.seedFill} x={3} y={3} width={box} height={box} rx={3} />
          <text className={styles.seedText} x={3 + box / 2} y={a.h / 2} style={type(fontSize * 0.8)} textAnchor="middle" dominantBaseline="central">
            {a.seed}
          </text>
        </>
      ) : null}
      <text className={styles.chipText} x={a.seed ? box + 9 : 8} y={a.h / 2} style={type(fontSize)} dominantBaseline="central">
        {a.name}
      </text>
    </g>
  );
}

function Row({ a, tt }) {
  return (
    <g className={`${styles.actor} ${styles.row} ${tone(a.tone)}`} style={place(a)}>
      <rect className={styles.rowFill} x={a.fillX || 0} width={a.w - (a.fillX || 0)} height={a.h} rx={6} />
      {a.bar ? (
        <g transform={`translate(${a.bar.x}, ${a.h / 2 - 4})`}>
          <rect className={styles.barTrack} width={a.bar.w} height={8} rx={4} />
          <rect
            className={styles.barFill}
            width={a.bar.w}
            height={8}
            rx={4}
            style={{ transform: `scaleX(${Math.max(0, Math.min(1, a.bar.v || 0))})` }}
          />
        </g>
      ) : null}
      {a.cells.map((c, i) => (
        <text
          key={i}
          className={`${styles.cellText} ${tone(c.tone)}`}
          x={c.x}
          y={a.h / 2}
          style={type(12)}
          dominantBaseline="central"
          fontWeight={c.weight || 500}
          textAnchor={c.anchor || 'start'}
        >
          {c.k ? artText(tt, c.k, c.vars) : c.v}
        </text>
      ))}
    </g>
  );
}

function Actor({ a, tt }) {
  switch (a.t) {
    case 'chip':
      return <Chip a={a} />;
    case 'row':
      return <Row a={a} tt={tt} />;
    case 'line':
      return (
        <path
          className={`${styles.line} ${tone(a.tone)}`}
          d={`M${a.d.map(([x, y]) => `${x} ${y}`).join(' L')}`}
          style={{ opacity: a.o }}
        />
      );
    case 'slot':
      return (
        <g className={styles.actor} style={place(a)}>
          <rect className={styles.slotFill} width={a.w} height={a.h} rx={5} />
        </g>
      );
    case 'panel':
      return (
        <g className={styles.actor} style={place(a)}>
          <rect className={`${styles.panelFill} ${tone(a.tone)}`} width={a.w} height={a.h} rx={a.r || 10} />
        </g>
      );
    case 'tag':
      return (
        <g className={`${styles.actor} ${styles.tag} ${tone(a.tone)}`} style={place(a)}>
          <rect className={styles.tagFill} width={a.w} height={a.h} rx={6} />
          <text className={styles.tagText} x={a.w / 2} y={a.h / 2} style={type(11.5)} textAnchor="middle" dominantBaseline="central">
            {artText(tt, a.k, a.vars)}
          </text>
        </g>
      );
    case 'text':
      return (
        <g className={styles.actor} style={place(a)}>
          <text
            className={`${styles.word} ${tone(a.tone)}`}
            style={type(a.size || 11)}
            fontWeight={a.weight || 500}
            textAnchor={a.anchor || 'start'}
          >
            {a.k ? artText(tt, a.k, a.vars) : a.v}
          </text>
        </g>
      );
    default:
      return null;
  }
}

/**
 * @param scene   a built scene
 * @param frame   one of frames(scene)
 * @param moving  animate from the previous frame to this one
 * @param label   what the picture shows, for a screen reader
 */
export default function ExplainerStage({ scene, frame, moving, label, tt, className }) {
  return (
    <svg
      className={`${styles.stage} ${moving ? styles.moving : ''} ${className || ''}`}
      viewBox={`0 0 ${scene.w} ${scene.h}`}
      role="img"
      aria-label={label}
    >
      {scene.order.map((id) => <Actor key={id} a={frame[id]} tt={tt} />)}
    </svg>
  );
}
