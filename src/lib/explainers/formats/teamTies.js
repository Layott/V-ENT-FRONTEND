// A tie between two teams (stage setting tie_rule, P3 W3c), played seat by seat
// and decided three ways. The same three seats are shown under total goals and
// then under games won, where the two verdicts disagree: Lagos score more goals,
// Accra win more games. The crew battle then plays the same two crews one game
// at a time, the winner of each game staying on.

import { Story, TEAMS, seed } from '../story';
import { fixture, fixtureCells } from '../table';

const HOME = TEAMS[0].name;
const AWAY = TEAMS[1].name;
const SEATS = [
  [seed(1), seed(5), 4, 0],
  [seed(2), seed(6), 1, 2],
  [seed(3), seed(7), 0, 1],
];
// The crew battle, two a side: Kojo beats Femi and stays on, then loses to
// Amara and is out; Ada loses to Amara, which gives Accra the tie.
const CREW = [
  ['Kojo', 'Femi', 4, 0],
  ['Kojo', 'Amara', 0, 2],
  ['Ada', 'Amara', 1, 2],
];
const ROW_W = 230;
const SEAT_Y = [92, 130, 168];

// Seats are [home, away, home goals, away goals], so a side is 2 or 3.
const goalsFor = (side) => SEATS.reduce((sum, s) => sum + s[side], 0);
const winsFor = (side) => SEATS.filter((s) => (side === 2 ? s[2] > s[3] : s[3] > s[2])).length;

const explainer = {
  key: 'team_ties',
  title: 'Team ties',
  lines: [
    'Total goals decide the tie: the goals from every seat are added together, and more goals wins.',
    'Or games won: the team that wins more seats takes the tie, however many goals it scored.',
    'Or a crew battle: the winner of each game stays on, the loser is out, and the first crew to beat every opponent wins.',
  ],
  build() {
    const st = new Story('team_ties');
    const cx = 240;
    const homeGoals = goalsFor(2);
    const awayGoals = goalsFor(3);
    const homeWins = winsFor(2);
    const awayWins = winsFor(3);

    st.add('home', { t: 'text', x: cx - 92, y: 40, v: HOME, size: 18, weight: 700, anchor: 'middle', o: 0 });
    st.add('away', { t: 'text', x: cx + 92, y: 40, v: AWAY, size: 18, weight: 700, anchor: 'middle', o: 0 });
    st.add('totalPanel', { t: 'panel', x: cx - 44, y: 18, w: 88, h: 44, r: 12, tone: 'box', o: 0 });
    st.add('total', { t: 'text', x: cx, y: 47, v: '0 - 0', size: 20, weight: 700, anchor: 'middle', o: 0 });
    st.add('totalHead', { t: 'text', x: cx, y: 76, k: 'goals', size: 9, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });

    SEATS.forEach(([a, b, ga, gb], i) => {
      st.add(`seatBg${i}`, { t: 'panel', x: 24, y: SEAT_Y[i] - 5, w: 432, h: 32, r: 8, tone: 'stripe', o: 0 });
      st.add(`seat${i}`, { t: 'text', x: 40, y: SEAT_Y[i] + 15, k: 'match', vars: { n: i + 1 }, size: 10, tone: 'muted', weight: 600, o: 0 });
      fixture(st, `match${i}`, { cx, y: SEAT_Y[i], w: ROW_W, home: a.name, away: b.name, hg: ga, ag: gb });
    });

    st.add('wonHead', { t: 'text', x: cx, y: 210, k: 'matchesWon', size: 9, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });
    st.add('won', { t: 'text', x: cx, y: 228, v: `${homeWins} - ${awayWins}`, size: 14, weight: 700, anchor: 'middle', o: 0 });
    st.add('verdict', { t: 'tag', x: cx - 130, y: 240, w: 260, h: 22, k: 'winsFixture', vars: { team: HOME, goals: `${homeGoals} - ${awayGoals}` }, tone: 'gold', o: 0 });

    const seatLabels = (k) => Object.fromEntries(SEATS.map((_, i) => [`seat${i}`, { k, vars: { n: i + 1 } }]));

    st.step(0, 3400, { home: { o: 1 }, away: { o: 1 }, totalPanel: { o: 1 }, total: { o: 1 }, totalHead: { o: 1 } });
    st.step(0, 4000, ...SEATS.flatMap((_, i) => [{ [`seatBg${i}`]: { o: 1 }, [`seat${i}`]: { o: 1 } }, { [`match${i}`]: { o: 1 } }]));
    st.step(0, 4000, { total: { v: `${homeGoals} - ${awayGoals}`, tone: 'gold' }, verdict: { o: 1 } });
    st.step(1, 4000, { wonHead: { o: 1 }, won: { o: 1 } });
    st.step(1, 6000, { verdict: { k: 'winsGames', vars: { team: AWAY }, o: 1 } });
    st.step(2, 4000, seatLabels('crewGame'), Object.fromEntries(CREW.map(([a, b, ga, gb], i) => [
      `match${i}`, { cells: fixtureCells(ROW_W, a, b, ga, gb) },
    ])), { verdict: { k: 'crewWins', vars: { team: AWAY } } });
    st.step(2, 4000, {});
    st.step(2, 4000, {});
    return st.scene();
  },
};

export default explainer;
