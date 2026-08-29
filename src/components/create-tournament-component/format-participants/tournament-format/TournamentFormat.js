'use client';

// Picking the shape of the competition.
//
// Two things were wrong here and both were invisible.
//
// The list offered five formats. The backend supports eight, and the three it
// left out - GSL groups, the aggregate 2v2 league, and the ladder - could not be
// chosen at all, so a structure the platform runs could not be built on the
// screen that exists to build them. The CEO asked for exactly this: "make sure
// it is easy for a user to create any tournament structure they want."
//
// And nothing explained what a format does once it is picked. `formats.py` has
// carried a `notes` line for every one of them since it was written, the API
// serialises it, and no screen has ever shown it. The note is the sentence that
// stops somebody running a 16-team round robin by accident and discovering at
// the venue that it is 120 matches.
//
// The notes live here rather than being read from the API, because a sentence
// built in Python cannot be translated. They go through `tt()` with the English
// as the fallback, and the same text sits in fr and pt.

import { useState } from 'react';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './tournament-format.module.css';
import { useT } from '@/i18n/LanguageProvider';

// The value stored is what the backend accepts. The hyphenated spellings are
// what this screen has always saved, and `normalise_bracket` reads both, so
// they stay as they are rather than orphaning every draft in progress.
const FORMATS = [
  {
    value: 'single-elimination',
    nameKey: 'ui.single.elimination.7001',
    name: 'Single Elimination',
    blurbKey: 'ui.participants.eliminated.after.one.d1bb',
    blurb: 'Participants are eliminated after one loss, and only the winners advance until a champion is crowned.',
    noteKey: 'format.noteSingle',
    note: 'A field that is not a power of two needs byes in the first round, which the strongest seeds should receive.',
  },
  {
    value: 'double-elimination',
    nameKey: 'ui.double.elimination.261d',
    name: 'Double Elimination',
    blurbKey: 'ui.participants.must.lose.twice.a411',
    blurb: 'Participants must lose twice to be eliminated.',
    noteKey: 'format.noteDouble',
    note: 'Twice the matches of single elimination for the same field, so it needs roughly twice the time. The grand final is where organisers differ: a bracket reset gives the lower-bracket side the two wins the upper-bracket side has already earned.',
  },
  {
    value: 'round-robin',
    nameKey: 'ui.round.robin.b15b',
    name: 'Round Robin',
    blurbKey: 'ui.participants.play.against.all.f6db',
    blurb: 'Participants play against all others, and the team with the most wins is the winner.',
    noteKey: 'format.noteRoundRobin',
    note: 'Matches grow with the square of the field: eight teams is 28 matches, sixteen is 120. Past about twelve it wants splitting into groups.',
  },
  {
    value: 'swiss-system',
    nameKey: 'ui.swiss.system.f479',
    name: 'Swiss System',
    blurbKey: 'ui.participants.compete.set.number.7eef',
    blurb: 'Participants compete in a set number of rounds, paired against opponents with similar records.',
    noteKey: 'format.noteSwiss',
    note: 'Rounds are usually enough to separate the field: 5 rounds for 16, 6 for 32. Teams reaching three wins advance and three losses are out, which is the shape a Counter-Strike major runs.',
  },
  {
    value: 'battle-royale',
    nameKey: 'ui.battle.royale.853c',
    name: 'Battle Royale',
    blurbKey: 'ui.many.players.teams.compete.89b8',
    blurb: 'Many players or teams compete in multiple rounds, earning points based on eliminations and placement.',
    noteKey: 'format.noteBattleRoyale',
    note: 'The placement table is the argument: PUBG Mobile pays 10 for a win down to 1 for eighth, Free Fire pays 12 down to 1 for tenth. Both pay 1 a kill. Set it to match the game being played.',
  },
  {
    value: 'gsl',
    nameKey: 'format.gsl',
    name: 'GSL Groups',
    blurbKey: 'format.gslBlurb',
    blurb: 'Groups of four, each playing five matches, feeding a knockout stage.',
    noteKey: 'format.noteGsl',
    note: 'Five matches per group of four: two openers, a winners match, a losers match, and a decider. It feeds a knockout stage.',
  },
  {
    value: 'aggregate_2v2',
    nameKey: 'format.aggregate',
    name: 'Aggregate League',
    blurbKey: 'format.aggregateBlurb',
    blurb: 'Each fixture is several matches, one per seat, and the tie is decided on total goals rather than matches won.',
    noteKey: 'format.noteAggregate',
    note: 'The EA FC league format V-ENT already runs. A tie is TOTAL GOALS across the per-player fixtures, never a win count.',
  },
  {
    value: 'ladder',
    nameKey: 'format.ladder',
    name: 'Ladder',
    blurbKey: 'format.ladderBlurb',
    blurb: 'A standing table that people climb by challenging the players above them.',
    noteKey: 'format.noteLadder',
    note: 'Good for a season that runs for weeks rather than an afternoon.',
  },
];

const TournamentFormat = ({ formData = {}, updateFormData }) => {
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData.bracket_type || null);

  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('bracket_type', option);
  };

  const chosen = FORMATS.find(f => f.value === selectedOption);

  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>
          {tt('ui.tournament.format.bracket.system.dbf4', 'Tournament Format (Bracket System)')}
        </h3>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
          {FORMATS.map(format => <div
            key={format.value}
            className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === format.value ? createTournamentStyles.activeBox : ''}`}
            onClick={() => handleOptionClick(format.value)}>
              <div className={`${createTournamentStyles.option} ${selectedOption === format.value ? createTournamentStyles.selected : ''}`} />
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{tt(format.nameKey, format.name)}</h4>
                <p>{tt(format.blurbKey, format.blurb)}</p>
              </div>
            </div>)}
        </div>

        {/* What picking it actually commits the organiser to. Shown only once
            something is chosen, because eight notes at once is a wall nobody
            reads and the one that matters is the one they just picked. */}
        {chosen && <div className={styles.note}>
          <span className={styles.noteLabel}>
            {tt('format.whatThisMeans', 'What this means')}
          </span>
          <p className={styles.noteBody}>{tt(chosen.noteKey, chosen.note)}</p>
        </div>}
      </div>
    </div>;
};

export default TournamentFormat;
