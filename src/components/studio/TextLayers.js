'use client';

// Words on top of a broadcast graphic, drawn.
//
// CEO, 4 September 2026, inbox row 52: "also should be able to add text, change
// the font size, color, position, animation of that text also on any overlay".
//
// Five axes are named and all five are here: the words, the size, the colour,
// the position, the animation. `TextLayerEditor` is where an operator sets
// them; `tasks/text-layers-contract.md` is the seam the two halves meet on.
//
// ## Three rules this follows, taken from the page it draws inside
//
// **A graphic with no layers is drawn exactly as it was.** Nothing is rendered,
// not even a container, not even a stylesheet. That is the same safety rule the
// uploaded-file runtime keeps, and it is why shipping this cannot move anything
// already on air.
//
// **It holds no state that matters.** Everything on screen comes from the feed.
// The only state here is which side of its own delay a layer is on, and a
// reload works that out again from the same two numbers, so a browser source
// restarted mid-show comes back correct.
//
// **It reuses the frame's own positions and animations.** The nine places, the
// safe area and the one-shot entries and exits are written once, in
// `studio.module.css`. A text layer sits in them exactly as a graphic does. A
// second set would have drifted the first time somebody moved the safe area,
// and the drift would only ever have been visible on air.

import { useEffect, useState } from 'react';
import { readFeed } from '@/components/studio/elements/lib';
import frame from '@/app/studio/[...parts]/studio.module.css';
import styles from './text-layers.module.css';

// How long the frame's exit animations run, plus a little. The page uses the
// same number for taking a whole graphic off, and the two must not disagree or
// a layer would be cut off mid-fade.
const EXIT_MS = 420;

// The four built in families, as the names of the custom properties that hold
// their stacks. A family the server has not heard of would build
// `var(--vent-f-nonsense)`, which resolves to nothing and drops the whole
// declaration, so it is checked against this rather than interpolated blind.
const FAMILIES = new Set(['house', 'condensed', 'display', 'accent']);

// A colour is validated by the API and refused rather than corrected there. It
// is checked again here for one reason: this value is written into a style
// attribute, and the one thing that must be impossible is for it to carry
// anything other than a colour.
const COLOUR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

// A font the organiser uploaded is named by its slot and served from a URL the
// server built. Both go into a stylesheet, so both are stripped of the
// characters that could end a CSS string and start something else. The slot is
// already validated at upload; this costs nothing and does not depend on that
// staying true.
const cssSafe = (value) => String(value || '').replace(/["'\\;{}()<>]/g, '').trim();

/** The three weights the contract allows, and nothing else.
 *
 *  A free weight would be drawn synthetically wherever the face has no cut at
 *  that number, and a synthetic bold is visible on air.
 */
const weightOf = (value) => {
  const n = Number(value);
  return n === 400 || n === 600 || n === 800 ? n : 800;
};

/** One layer, on its own clock.
 *
 *  Its own component because `delay_ms` and `duration_ms` are per layer and
 *  they are the whole point of having more than one: a title arrives, and the
 *  name under it arrives a beat later. Timers held together in the parent would
 *  restart every layer whenever any of them changed.
 */
function Layer({ row, data }) {
  const delay = Math.max(0, Number(row.delay_ms) || 0);
  // Zero means it stays until the graphic goes, which is the ordinary case.
  const hold = Math.max(0, Number(row.duration_ms) || 0);

  const [phase, setPhase] = useState(() => (delay ? 'waiting' : 'in'));

  useEffect(() => {
    setPhase(delay ? 'waiting' : 'in');
    const timers = [];
    if (delay) timers.push(setTimeout(() => setPhase('in'), delay));
    if (hold) {
      timers.push(setTimeout(() => setPhase('out'), delay + hold));
      timers.push(setTimeout(() => setPhase('gone'), delay + hold + EXIT_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [delay, hold, row.id]);

  if (phase === 'waiting' || phase === 'gone') return null;

  // A feed path wins, and the typed words are what is drawn when the path
  // resolves to nothing. That is the contract's rule, and it is what lets a
  // layer read `tournament.title` on a broadcast that has one and still say
  // something sensible on one that does not.
  const live = row.field ? readFeed(row.field, data) : '';
  const words = live || row.text || '';
  // Nothing to say, so nothing is drawn. An empty box with a text shadow is
  // still a smudge on live video.
  if (!words) return null;

  const anchor = frame[`at_${row.position}`] || frame.at_bottom_centre;
  const arrive = phase === 'in' && row.entry && row.entry !== 'none'
    ? frame[`in_${row.entry}`] : '';
  const leave = phase === 'out' && row.exit && row.exit !== 'none'
    ? frame[`out_${row.exit}`] : '';

  const slot = cssSafe(row.font_slot);
  const family = FAMILIES.has(row.family) ? row.family : 'house';
  const stack = slot
    ? `'${slot}', var(--vent-f-${family})`
    : `var(--vent-f-${family})`;

  return (
    <div
      className={`${styles.spot} ${frame.positioned} ${anchor}`}
      style={{
        '--vent-dx': `${Number(row.offset_x) || 0}px`,
        '--vent-dy': `${Number(row.offset_y) || 0}px`,
      }}
    >
      <span
        className={styles.box}
        style={{
          color: COLOUR.test(String(row.colour || '')) ? row.colour : undefined,
          fontFamily: stack,
          fontSize: `${Math.max(8, Math.min(400, Number(row.font_size) || 64))}px`,
          fontWeight: weightOf(row.weight),
          textAlign: row.align === 'centre' ? 'center' : row.align,
        }}
      >
        <span className={`${styles.words} ${arrive} ${leave}`.trim()}>{words}</span>
      </span>
    </div>
  );
}

/**
 * Every text layer on one graphic.
 *
 * @param layers  the graphic's `layers` out of the studio feed, already
 *                filtered to the active ones and ordered by the server
 * @param data    the whole feed, for a layer that reads a live value
 */
export default function TextLayers({ layers, data }) {
  // Only the active ones. The feed already filters, and this costs nothing and
  // means a preview handed the unfiltered list behaves the same way.
  const rows = (layers || []).filter((row) => row && row.is_active !== false);

  // Nothing at all when there is nothing to draw. Not a container, not a
  // stylesheet, not a class.
  if (!rows.length) return null;

  // The organiser's own uploaded fonts, declared for the slots this graphic
  // actually asks for. Written here rather than in the stylesheet because the
  // family name and the URL only exist at run time. The uploaded-file runtime
  // writes the identical block into somebody else's document, so a layer looks
  // the same on both kinds of overlay.
  const wanted = new Set(rows.map((row) => cssSafe(row.font_slot)).filter(Boolean));
  const faces = (data?.fonts || [])
    .filter((font) => wanted.has(cssSafe(font.slot)))
    .map((font) => `@font-face{font-family:'${cssSafe(font.slot)}';`
      + `src:url('${cssSafe(font.url)}') format('${cssSafe(font.format)}');`
      + 'font-display:swap;}')
    .join('');

  return (
    <div
      className={styles.layers}
      // Inline, and only these five. The stage carries `.positioned` whenever
      // the graphic has been moved off its own design, and that rule re-anchors
      // EVERY direct child of the stage. This container is not a graphic to be
      // anchored, it is the whole frame, and an inline declaration is the one
      // thing a class of equal specificity cannot win against.
      style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
    >
      {faces && <style>{faces}</style>}
      {rows.map((row) => <Layer key={row.id} row={row} data={data} />)}
    </div>
  );
}
