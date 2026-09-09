'use client';

// Picking the shape of the competition, and being told what that shape is.
//
// The list itself used to be written out here: eight entries with their names,
// their blurbs and their notes, beside a catalogue on the server that already
// held all three. Twice that copy has drifted. It offered five of the eight
// formats, so three the platform runs could not be chosen at all; and
// `swiss-system` resolved to nothing, so a Swiss tournament had no format.
//
// So the LIST comes from `/tournament/formats/` now, which is the same
// catalogue that validates the save. What stays here is the wording, because a
// sentence built in Python cannot be translated: each key has an entry in the
// dictionary and the server's English is the fallback. A format added on the
// server therefore appears here the same day, in English, rather than not
// appearing at all.
//
// The second half is the spec line this screen never answered: "Tournament
// structure, explained automatically once the bracket is chosen." Naming the
// format is not explaining it. Twelve teams in a round robin is sixty-six
// fixtures over eleven rounds, and that is the number that decides whether the
// afternoon is long enough. It is computed on the server by the same rules the
// bracket generator uses, and `tests_structure.py` builds real brackets to
// prove the two agree.

import { useState } from 'react';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './tournament-format.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { formatKey } from '@/lib/formatLabel';
import { useFormatShape, structureLines } from '@/lib/formatCatalogue';

// One English string per format, which is both the dictionary fallback and
// what the screen shows if the catalogue cannot be reached. The keys are the
// catalogue's own, and `tools/check-format-catalogue.py` fails if the two
// lists stop matching.
const WORDS = {
  single_elimination: {
    nameKey: 'ui.single.elimination.7001',
    name: 'Single Elimination',
    blurbKey: 'ui.participants.eliminated.after.one.d1bb',
    blurb: 'Participants are eliminated after one loss, and only the winners advance until a champion is crowned.',
    noteKey: 'format.noteSingle',
    note: 'A field that is not a power of two needs byes in the first round, which the strongest seeds should receive.',
  },
  double_elimination: {
    nameKey: 'ui.double.elimination.261d',
    name: 'Double Elimination',
    blurbKey: 'ui.participants.must.lose.twice.a411',
    blurb: 'Participants must lose twice to be eliminated.',
    noteKey: 'format.noteDouble',
    note: 'Twice the matches of single elimination for the same field, so it needs roughly twice the time. The grand final is where organisers differ: a bracket reset gives the lower-bracket side the two wins the upper-bracket side has already earned.',
  },
  round_robin: {
    nameKey: 'ui.round.robin.b15b',
    name: 'Round Robin',
    blurbKey: 'ui.participants.play.against.all.f6db',
    blurb: 'Participants play against all others, and the team with the most wins is the winner.',
    noteKey: 'format.noteRoundRobin',
    note: 'Matches grow with the square of the field: eight teams is 28 matches, sixteen is 120. Past about twelve it wants splitting into groups.',
  },
  swiss: {
    nameKey: 'ui.swiss.system.f479',
    name: 'Swiss System',
    blurbKey: 'ui.participants.compete.set.number.7eef',
    blurb: 'Participants compete in a set number of rounds, paired against opponents with similar records.',
    noteKey: 'format.noteSwiss',
    note: 'Rounds are usually enough to separate the field: 5 rounds for 16, 6 for 32. Teams reaching three wins advance and three losses are out, which is the shape a Counter-Strike major runs.',
  },
  battle_royale: {
    nameKey: 'ui.battle.royale.853c',
    name: 'Battle Royale',
    blurbKey: 'ui.many.players.teams.compete.89b8',
    blurb: 'Many players or teams compete in multiple rounds, earning points based on eliminations and placement.',
    noteKey: 'format.noteBattleRoyale',
    note: 'The placement table is the argument: PUBG Mobile pays 10 for a win down to 1 for eighth, Free Fire pays 12 down to 1 for tenth. Both pay 1 a kill. Set it to match the game being played.',
  },
  gsl: {
    nameKey: 'format.gsl',
    name: 'GSL Groups',
    blurbKey: 'format.gslBlurb',
    blurb: 'Groups of four, each playing five matches, feeding a knockout stage.',
    noteKey: 'format.noteGsl',
    note: 'Five matches per group of four: two openers, a winners match, a losers match, and a decider. It feeds a knockout stage.',
  },
  aggregate_2v2: {
    nameKey: 'format.aggregate',
    name: 'Aggregate League',
    blurbKey: 'format.aggregateBlurb',
    blurb: 'Each fixture is several matches, one per seat, and the tie is decided on total goals rather than matches won.',
    noteKey: 'format.noteAggregate',
    note: 'The EA FC league format V-ENT already runs. A tie is TOTAL GOALS across the per-player fixtures, never a win count.',
  },
  ladder: {
    nameKey: 'format.ladder',
    name: 'Ladder',
    blurbKey: 'format.ladderBlurb',
    blurb: 'A standing table that people climb by challenging the players above them.',
    noteKey: 'format.noteLadder',
    note: 'Good for a season that runs for weeks rather than an afternoon.',
  },
};

// The order they are offered in, when the catalogue cannot be reached. The
// server's own order wins whenever it answers.
const OFFLINE_ORDER = [
  'single_elimination', 'double_elimination', 'round_robin', 'swiss',
  'battle_royale', 'gsl', 'aggregate_2v2', 'ladder',
];

/** However many entrants this tournament is being built for, or 0. */
export const plannedCount = (formData = {}) => {
  const raw = formData.number_of_teams ?? formData.max_number_of_participants;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
};

/** How many players each side fields inside one fixture. */
export const plannedSeats = (formData = {}) => {
  const n = parseInt(formData.players_per_team ?? formData.team_size, 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
};

const TournamentFormat = ({ formData = {}, updateFormData }) => {
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData.bracket_type || null);

  const chosenKey = formatKey(selectedOption);
  const { entry, entries } = useFormatShape(
    selectedOption, plannedCount(formData), plannedSeats(formData));

  const handleOptionClick = key => {
    setSelectedOption(key);
    updateFormData('bracket_type', key);
  };

  // The catalogue when it answers, the offline list when it does not. Either
  // way each row is a catalogue key with the words attached.
  const rows = (entries && entries.length
    ? entries.map(f => ({ key: f.key, label: f.label, summary: f.summary }))
    : OFFLINE_ORDER.map(key => ({ key, label: '', summary: '' }))
  ).filter(row => WORDS[row.key] || row.label);

  const lines = structureLines(tt, entry);
  const words = chosenKey ? WORDS[chosenKey] : null;
  const noteText = words
    ? tt(words.noteKey, entry?.notes || words.note)
    : (entry?.notes || '');

  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>
          {tt('ui.tournament.format.bracket.system.dbf4', 'Tournament Format (Bracket System)')}
        </h3>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
          {rows.map(row => {
            const w = WORDS[row.key];
            const isChosen = chosenKey === row.key;
            return <div
              key={row.key}
              className={`${createTournamentStyles.halfBoxContainer} ${isChosen ? createTournamentStyles.activeBox : ''}`}
              onClick={() => handleOptionClick(row.key)}>
                <div className={`${createTournamentStyles.option} ${isChosen ? createTournamentStyles.selected : ''}`} />
                <div className={createTournamentStyles.boxTextContainer}>
                  <h4>{w ? tt(w.nameKey, row.label || w.name) : row.label}</h4>
                  <p>{w ? tt(w.blurbKey, row.summary || w.blurb) : row.summary}</p>
                </div>
              </div>;
          })}
        </div>

        {/* What picking it actually commits the organiser to. Shown only once
            something is chosen, because eight notes at once is a wall nobody
            reads and the one that matters is the one they just picked. */}
        {(noteText || lines.length > 0) && <div className={styles.note}>
          <span className={styles.noteLabel}>
            {tt('format.whatThisMeans', 'What this means')}
          </span>
          {noteText && <p className={styles.noteBody}>{noteText}</p>}

          {/* The arithmetic, once there is an entrant count to do it with.
              Before that there is nothing honest to say about the size of the
              thing, so nothing is said. */}
          {lines.length > 0 && <ul className={styles.structure}>
            {lines.map(line => <li key={line} className={styles.structureLine}>{line}</li>)}
          </ul>}
        </div>}
      </div>
    </div>;
};

export default TournamentFormat;
