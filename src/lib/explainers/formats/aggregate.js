// An aggregate tie, the Rivalry Series format: each fixture is one match per
// seat, and the fixture is decided on the goals of all of them added
// together. Here each side wins one match and Lagos still win the fixture,
// because the totals are added up from the seats below rather than written in.

import { Story, TEAMS, seed } from '../story';
import { fixture, fixtureCells } from '../table';

const HOME = TEAMS[0].name;
const AWAY = TEAMS[1].name;
const SEATS = [
  [seed(1), seed(5), 4, 0],
  [seed(2), seed(6), 1, 2],
];
const ROW_W = 230;

const explainer = {
  key: 'aggregate_2v2',
  title: 'Aggregate tie',
  lines: [
    'Each fixture is made of several matches, one for each player in the team.',
    'The goals from every match are added together.',
    'The team with more goals in total wins the fixture, so a big win can outweigh a narrow loss.',
  ],
  build() {
    const st = new Story('aggregate_2v2');
    const cx = 240;
    st.add('home', { t: 'text', x: cx - 92, y: 40, v: HOME, size: 18, weight: 700, anchor: 'middle', o: 0 });
    st.add('away', { t: 'text', x: cx + 92, y: 40, v: AWAY, size: 18, weight: 700, anchor: 'middle', o: 0 });
    st.add('totalPanel', { t: 'panel', x: cx - 44, y: 18, w: 88, h: 44, r: 12, tone: 'box', o: 0 });
    st.add('total', { t: 'text', x: cx, y: 47, v: '0 - 0', size: 20, weight: 700, anchor: 'middle', o: 0 });
    st.add('totalHead', { t: 'text', x: cx, y: 76, k: 'goals', size: 9, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });

    SEATS.forEach(([a, b], i) => {
      const y = 100 + i * 44;
      st.add(`seatBg${i}`, { t: 'panel', x: 24, y: y - 5, w: 432, h: 32, r: 8, tone: 'stripe', o: 0 });
      st.add(`seat${i}`, { t: 'text', x: 40, y: y + 15, k: 'match', vars: { n: i + 1 }, size: 10, tone: 'muted', weight: 600, o: 0 });
      fixture(st, `match${i}`, { cx, y, w: ROW_W, home: a.name, away: b.name });
    });

    // Matches won and goals, both added up from the seats.
    const homeWins = SEATS.filter(([, , ga, gb]) => ga > gb).length;
    const awayWins = SEATS.filter(([, , ga, gb]) => gb > ga).length;
    const homeGoals = SEATS.reduce((sum, s) => sum + s[2], 0);
    const awayGoals = SEATS.reduce((sum, s) => sum + s[3], 0);
    const winner = homeGoals > awayGoals ? HOME : AWAY;
    st.add('wonHead', { t: 'text', x: cx, y: 204, k: 'matchesWon', size: 9, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });
    st.add('won', { t: 'text', x: cx, y: 224, v: `${homeWins} - ${awayWins}`, size: 14, weight: 700, anchor: 'middle', o: 0 });
    st.add('verdict', { t: 'tag', x: cx - 130, y: 238, w: 260, h: 24, k: 'winsFixture', vars: { team: winner, goals: `${homeGoals} - ${awayGoals}` }, tone: 'gold', o: 0 });

    // The running total, from the seats played so far.
    let home = 0;
    let away = 0;
    const play = (i) => {
      const [a, b, ga, gb] = SEATS[i];
      home += ga;
      away += gb;
      return {
        [`match${i}`]: { cells: fixtureCells(ROW_W, a.name, b.name, ga, gb) },
        total: { v: `${home} - ${away}` },
      };
    };

    st.step(0, 3400, { home: { o: 1 }, away: { o: 1 }, totalPanel: { o: 1 }, total: { o: 1 }, totalHead: { o: 1 } });
    st.step(0, 4200, ...SEATS.flatMap((_, i) => [{ [`seatBg${i}`]: { o: 1 }, [`seat${i}`]: { o: 1 } }, { [`match${i}`]: { o: 1 } }]));
    st.step(1, 4800, play(0));
    st.step(1, 4800, play(1));
    st.step(1, 4000, { total: { tone: 'gold' } });
    st.step(2, 4800, { wonHead: { o: 1 }, won: { o: 1 } });
    st.step(2, 7000, { verdict: { o: 1 } });
    return st.scene();
  },
};

export default explainer;
