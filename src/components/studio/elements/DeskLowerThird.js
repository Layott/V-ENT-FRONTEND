'use client';

// C1b, the desk lower third, from the CADE Rivalry Series pack.
//
// The original is `desk_lower_third()` in `CLAUDE/VIDEOS/RIVALRY/
// stream_extra.py`, and its reasoning travels with it: the role goes first and
// in the accent block, "because on a desk the role is what identifies the
// person: half the audience has never heard the name."
//
// C1, `lowerthird()` in `stream.py`, is the competitor plate and a different
// object. It carries an org mark and an origin code, and the pack's note says
// a caster has neither, "so the player plate's second line is empty on them
// and the graphic collapses to a name floating in a box". So this plate is the
// role chip and the name, and nothing else. An origin was drawn here in the
// first pass and taken off on 4 September: the approved artwork has none, and
// a country beside a caster's name is a second fact competing with the one the
// graphic exists to say.

import { useT } from '@/i18n/LanguageProvider';
import rv from './rivalry.module.css';
import s from './desk-lower-third.module.css';

// Three people, from the pack: "the desk runs two casters together and the
// flow puts three analysts on one frame. A single name draws a single plate."
// A fourth would ride up off the desk and into the action.
//
// A numbered pair of boxes each, rather than one box holding a list, because
// the console's payload fields are text boxes and an operator with one hand on
// the mixer should be typing into the box for the second caster.
const SEATS = [
  { name: 'name', role: 'role' },
  { name: 'name_2', role: 'role_2' },
  { name: 'name_3', role: 'role_3' },
];

export default function DeskLowerThird({ payload }) {
  const tt = useT();

  // Only the rows somebody has been typed into, in the order of the boxes. A
  // desk of one draws one plate, which is the pack's own behaviour.
  const people = SEATS
    .map((seat) => ({
      name: String(payload[seat.name] || '').trim(),
      role: String(payload[seat.role] || '').trim(),
    }))
    .filter((person) => person.name);

  // Nobody named yet. The pack's surface with a heading and one sentence,
  // rather than an empty frame that reads to the operator as a dead source.
  if (!people.length) {
    return (
      <div className={`${rv.rv} ${rv.frame} ${s.root}`}>
        <div className={`${s.empty} ${rv.wipeIn}`}>
          <div className={s.emptyK}>{tt('studio.rv.desk', 'On the desk')}</div>
          <div className={s.emptyLine}>
            {tt('studio.rv.deskTBC', 'The desk is being confirmed.')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${rv.rv} ${rv.frame} ${s.root}`}>
      <div className={s.wrap}>
        {people.map((person, i) => (
          <div className={`${s.plate} ${rv.wipeIn}`} key={`${i}-${person.name}`}>
            {person.role && <span className={s.role}>{person.role}</span>}
            <span className={s.name}>{person.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
