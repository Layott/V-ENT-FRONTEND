'use client';

// C2, the now and next bar, from the CADE Rivalry Series pack.
//
// The original is `nownext()` in `CLAUDE/VIDEOS/RIVALRY/stream_more.py`, and
// every measurement in the stylesheet beside this file is that function's. Its
// own note says why it sits where it does: "Small and bottom right so it can
// live under a camera or a break slate without competing with anything on it."
//
// The bindings are the ones the studio's first now-and-next already read, kept
// exactly: the run of show where a broadcast has one, and the event's own
// now-and-next where it does not.
//
// What it deliberately does NOT draw is `owner`. That column of the run sheet
// says which of the crew a cue belongs to, "Graphics", "Casters", "Floor", and
// it is internal. A viewer wants the match, not the rota.

import { useT } from '@/i18n/LanguageProvider';
import { clock } from './lib';
import rv from './rivalry.module.css';
import s from './now-next-bar.module.css';

// The pack draws a fixture cue's separator in the panel edge green, written as
// `NIGERIA <b>v</b> GHANA` in `nownext()`. A run sheet cue is free text typed
// by an organiser, so the separator is found rather than assumed: "Doors open"
// is drawn exactly as written and nothing is inserted that nobody typed.
const FIXTURE = /^(.*?\S)\s+(v|vs|vs\.)\s+(\S.*)$/i;

function cueTitle(text) {
  const said = String(text || '');
  const hit = FIXTURE.exec(said);
  if (!hit) return said;
  return (
    <>
      {hit[1]} <span className={s.sep}>{hit[2]}</span> {hit[3]}
    </>
  );
}

// The right hand code on a row. `F1` in the pack, which is the fixture the cue
// is about, and the clock reading in front of it when the cue carries one.
const tailOf = (cue) => [clock(cue.starts_at), cue.match]
  .filter(Boolean).join(' ');

export default function NowNextBar({ data }) {
  const tt = useT();
  const ros = data.run_of_show || null;
  const ev = data.event || {};

  const now = ros?.now
    || (ev.now_on ? { activity: ev.now_on, match: ev.room } : null);
  const next = ros?.next
    || (ev.next_on ? { activity: ev.next_on, match: ev.next_room } : null);

  // Nothing to be on and nothing to follow. A designed plate in the pack's own
  // vocabulary, in the corner the bar lives in, rather than a blank frame that
  // reads to an operator as a dead browser source.
  if (!now && !next) {
    return (
      <div className={`${rv.rv} ${rv.frame} ${s.root}`}>
        <div className={`${s.empty} ${rv.wipeIn}`}>
          <div className={s.emptyK}>{tt('studio.rv.next', 'Next')}</div>
          <div className={s.emptyLine}>
            {tt('studio.rv.runningOrderTBC',
              'The running order is being confirmed.')}
          </div>
        </div>
      </div>
    );
  }

  const row = (cue, label, tone) => (
    <div className={`${s.row} ${tone}`}>
      <span className={s.lab}>{label}</span>
      <span className={s.txt}>{cueTitle(cue.activity)}</span>
      {tailOf(cue) && <span className={s.tail}>{tailOf(cue)}</span>}
    </div>
  );

  return (
    <div className={`${rv.rv} ${rv.frame} ${s.root}`}>
      {/* One wipe for the whole bar, as the pack has it, not one per row. */}
      <div className={`${s.nn} ${rv.wipeIn}`}>
        {now && row(now, tt('studio.rv.now', 'Now'), s.now)}
        {next && row(next, tt('studio.rv.next', 'Next'), s.next)}
      </div>
    </div>
  );
}
