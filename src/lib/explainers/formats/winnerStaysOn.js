// Winner stays on with 5 players, d_wso() on the bracket page: one player
// holds the spot, the next in line takes them on, the loser goes to the back.
// Played out from a list of results, so where everybody stands after each
// challenge is worked out rather than placed by hand.

import { Story, seed } from '../story';

const STREAK = 3;
const CHIP_W = 92;
const CHIP_H = 22;
const SPOT = { x: 128, y: 44, w: 224, h: 70 };
const HOLDER = { x: SPOT.x + 12, y: SPOT.y + 34 };
const CHALLENGER = { x: SPOT.x + SPOT.w - 12 - CHIP_W, y: SPOT.y + 34 };
const QUEUE_Y = 190;
const queueAt = (i) => ({ x: 34 + i * (CHIP_W + 14), y: QUEUE_Y });

// Who wins each challenge, in order.
const WINNERS = ['Kojo', 'Tunde', 'Tunde', 'Tunde'];

const explainer = {
  key: 'winner_stays_on',
  title: 'Winner stays on',
  lines: [
    'One player holds the spot, and everyone else waits in line.',
    'The next in line takes them on. The winner stays on, and the loser goes to the back of the line.',
    'The first player to reach the winning streak the organiser set wins.',
  ],
  build() {
    const st = new Story('winner_stays_on');
    const players = [1, 2, 3, 4, 5].map(seed);
    let holder = players[0].name;
    let queue = players.slice(1).map((p) => p.name);
    let streak = 0;

    st.add('spot', { t: 'panel', x: SPOT.x, y: SPOT.y, w: SPOT.w, h: SPOT.h, r: 14, tone: 'box', o: 0 });
    st.add('spotHead', { t: 'text', x: SPOT.x + 12, y: SPOT.y + 20, k: 'holdsSpot', size: 10, tone: 'muted', weight: 600, o: 0 });
    st.add('streak', { t: 'text', x: SPOT.x + SPOT.w / 2, y: SPOT.y + SPOT.h + 22, k: 'streak', vars: { n: 0 }, size: 12, weight: 700, anchor: 'middle', o: 0 });
    st.add('goal', { t: 'text', x: SPOT.x + SPOT.w / 2, y: SPOT.y - 14, k: 'streakGoal', vars: { n: STREAK }, size: 10, tone: 'muted', anchor: 'middle', o: 0 });
    st.add('queueHead', { t: 'text', x: 34, y: QUEUE_Y - 10, k: 'queue', size: 10, tone: 'muted', weight: 600, o: 0 });
    st.add('champ', { t: 'tag', x: HOLDER.x, y: SPOT.y + SPOT.h + 36, w: CHIP_W, h: 22, k: 'champion', tone: 'gold', o: 0 });
    players.forEach((p, i) => {
      const at = i === 0 ? HOLDER : queueAt(i - 1);
      st.add(`c_${p.name}`, { t: 'chip', ...at, w: CHIP_W, h: CHIP_H, seed: p.seed, name: p.name, o: 0 });
    });

    const lineUp = () => Object.fromEntries(queue.map((name, i) => [`c_${name}`, { ...queueAt(i), tone: '' }]));

    st.step(0, 2800, { spot: { o: 1 }, spotHead: { o: 1 }, queueHead: { o: 1 }, goal: { o: 1 } });
    st.step(0, 3600, Object.fromEntries(players.map((p) => [`c_${p.name}`, { o: 1 }])));

    WINNERS.forEach((winner, i) => {
      const challenger = queue[0];
      queue = queue.slice(1);
      // The next in line steps up; everybody behind moves along one place.
      st.step(i === 0 ? 0 : 1, 3200, lineUp(), { [`c_${challenger}`]: { ...CHALLENGER } });
      const loser = winner === holder ? challenger : holder;
      if (winner !== holder) streak = 0;
      holder = winner;
      streak += 1;
      queue = [...queue, loser];
      const done = streak >= STREAK;
      st.step(done ? 2 : 1, 3600,
        lineUp(),
        { [`c_${winner}`]: { ...HOLDER, tone: done ? 'gold' : 'win' } },
        { [`c_${loser}`]: { ...queueAt(queue.length - 1), tone: '' } },
        { streak: { vars: { n: streak }, o: 1 } },
        done ? { champ: { o: 1 } } : {});
    });
    st.step(2, 6000, {});
    return st.scene();
  },
};

export default explainer;
