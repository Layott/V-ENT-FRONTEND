// Tournaments and events on somebody else's website (P8, inbox 480).
//
//   node scripts/test-embed.mjs
//
// CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
// or put tournament registrations and brackets system under their own website
// from v-ent."
//
// The pure halves of it, proven here because a frame address and a header are
// exactly the kind of thing that looks right when read and is wrong when used:
//
//   embedLook.js   the look a frame is drawn in, read from its address, and
//                  the snippet an organiser pastes for each widget

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  THEMED_WIDGETS, WIDGETS, carryQuery, embedSnippets, lookQuery, readLook, widgetPath,
} from '../src/lib/embedLook.js';
import { scheduleGroups } from '../src/lib/scheduleGroups.js';

let failures = 0;
let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message}`);
  }
};

console.log('the look');

test('anything unreadable falls back, never reaches the page', () => {
  assert.deepEqual(readLook({ theme: 'blue', accent: 'red', font: 'comic' }),
    { theme: 'dark', accent: '', font: 'clash' });
  // A colour with a script in it is not a colour.
  assert.equal(readLook({ accent: '#fff;background:url(x)' }).accent, '');
});

test('the record\'s own look is the starting point', () => {
  assert.deepEqual(readLook({}, { theme: 'light', accent: '#C0392B' }),
    { theme: 'light', accent: '#c0392b', font: 'clash' });
});

test('the address overrides the record, from an object or URLSearchParams', () => {
  const params = new URLSearchParams('theme=dark&accent=%23112233&font=system');
  assert.deepEqual(readLook(params, { theme: 'light', accent: '#c0392b' }),
    { theme: 'dark', accent: '#112233', font: 'system' });
  // Next hands searchParams over as an object whose repeated keys are arrays.
  assert.equal(readLook({ theme: ['light', 'dark'] }).theme, 'light');
});

test('the address carries only what differs from the record', () => {
  const base = { theme: 'light', accent: '#c0392b' };
  assert.equal(lookQuery(base, base), '');
  assert.equal(lookQuery({ theme: 'light', accent: '#ff0000', font: 'clash' }, {}),
    'theme=light&accent=%23ff0000');
  assert.equal(lookQuery({ theme: 'dark', accent: '#c0392b', font: 'system' }, base),
    'theme=dark&font=system');
});

test('a moved frame keeps its look and its name, and nothing else', () => {
  assert.equal(carryQuery({ theme: 'light', vent_frame: 'vent-2', utm: 'x', next: '/admin' }),
    '?theme=light&vent_frame=vent-2');
  assert.equal(carryQuery(new URLSearchParams('')), '');
});

console.log('widgets and snippets');

test('every widget has an address, the card the one inbox 360 shipped', () => {
  assert.deepEqual(WIDGETS, ['card', 'bracket', 'standings', 'schedule']);
  assert.deepEqual(THEMED_WIDGETS, ['card', 'schedule']);
  assert.equal(widgetPath('naija-cup', 'card'), '/embed/tournaments/naija-cup');
  assert.equal(widgetPath('naija-cup', 'bracket'), '/embed/tournaments/naija-cup/bracket');
  assert.equal(widgetPath('naija-cup', 'schedule'), '/embed/tournaments/naija-cup/schedule');
  // Not a widget: the card, never an address that 404s on somebody's page.
  assert.equal(widgetPath('naija-cup', '../admin'), '/embed/tournaments/naija-cup');
});

test('a wide widget is not held to the card\'s 640px', () => {
  const s = embedSnippets('tournament', 'naija-cup', 'https://v-ent.co', {}, { widget: 'bracket' });
  assert.equal(s.frameUrl, 'https://v-ent.co/embed/tournaments/naija-cup/bracket');
  assert.match(s.iframe, /width="100%"/);
  assert.doesNotMatch(s.iframe, /max-width:640px/);
  assert.match(s.script, /data-vent-tournament="naija-cup" data-vent-widget="bracket"/);
});

test('the frame and the script carry the same look', () => {
  const s = embedSnippets('tournament', 'naija-cup', 'https://v-ent.co/', {},
    { widget: 'schedule', look: { theme: 'light', accent: '#ff0000', font: 'system' } });
  assert.equal(s.frameUrl,
    'https://v-ent.co/embed/tournaments/naija-cup/schedule?theme=light&accent=%23ff0000&font=system');
  assert.match(s.script, /data-vent-theme="light" data-vent-accent="#ff0000" data-vent-font="system"/);
  assert.match(s.iframe, /src="https:\/\/v-ent\.co\/embed\/tournaments\/naija-cup\/schedule\?theme=light&amp;accent=%23ff0000&amp;font=system"/);
});

test('an event\'s snippets are exactly what inbox 360 shipped', () => {
  const s = embedSnippets('event', 'lagos-con', 'https://v-ent.co', { button: 'Get tickets' });
  assert.equal(s.frameUrl, 'https://v-ent.co/embed/events/lagos-con');
  assert.equal(s.script,
    '<div data-vent-event="lagos-con"></div>\n<script src="https://v-ent.co/embed.js" async></script>');
  assert.equal(s.iframe,
    '<iframe src="https://v-ent.co/embed/events/lagos-con" title="V-ENT" width="100%" height="560" style="border:0;max-width:640px" loading="lazy"></iframe>');
  assert.equal(s.button,
    '<a href="https://v-ent.co/events/lagos-con?tab=tickets" target="_blank" rel="noopener">Get tickets</a>');
});

test('a pasted link goes to the tournament page, which says whether entry is open', () => {
  // A link is pasted once and outlives the registration window, so it opens
  // the page that always knows; the card's live Register button opens the
  // registration itself while entry is open.
  const s = embedSnippets('tournament', 'naija-cup', 'https://v-ent.co', { button: 'Register' });
  assert.equal(s.button,
    '<a href="https://v-ent.co/tournaments/naija-cup" target="_blank" rel="noopener">Register</a>');
});

console.log('embed.js on the organiser\'s page');

// public/embed.js runs on somebody else's page with nothing but the DOM, so
// it is run here against a small stand-in for one.
const runEmbedScript = (placeholders) => {
  const appended = [];
  const node = (attrs) => ({
    attrs: { ...attrs },
    getAttribute(name) { return this.attrs[name] ?? null; },
    setAttribute(name, value) { this.attrs[name] = value; },
    appendChild(child) { appended.push(child); },
  });
  const nodes = placeholders.map(node);
  const document = {
    currentScript: { src: 'https://v-ent.co/embed.js' },
    readyState: 'complete',
    querySelectorAll: (selector) => {
      const attr = selector.slice(1, -1);
      return nodes.filter((n) => n.attrs[attr] !== undefined);
    },
    createElement: () => ({ style: {} }),
    addEventListener: () => {},
  };
  const window = { addEventListener: () => {} };
  const source = readFileSync(new URL('../public/embed.js', import.meta.url), 'utf8');
  new Function('document', 'window', source)(document, window);
  return appended;
};

test('a widget and its look reach the frame, checked; the card keeps its 640px', () => {
  const [card, bracket, schedule, bad] = runEmbedScript([
    { 'data-vent-tournament': 'naija-cup' },
    { 'data-vent-tournament': 'naija-cup', 'data-vent-widget': 'bracket' },
    { 'data-vent-tournament': 'naija-cup', 'data-vent-widget': 'schedule',
      'data-vent-theme': 'light', 'data-vent-accent': '#FF0000', 'data-vent-font': 'system' },
    { 'data-vent-tournament': 'naija-cup', 'data-vent-widget': '../admin',
      'data-vent-theme': 'neon', 'data-vent-accent': 'red;x' },
  ]);
  assert.equal(card.src, 'https://v-ent.co/embed/tournaments/naija-cup?vent_frame=vent-1');
  assert.equal(card.style.maxWidth, '640px');
  assert.equal(bracket.src, 'https://v-ent.co/embed/tournaments/naija-cup/bracket?vent_frame=vent-2');
  assert.equal(bracket.style.maxWidth, '100%');
  // The same query lookQuery writes for the same look.
  const look = lookQuery({ theme: 'light', accent: '#ff0000', font: 'system' }, {});
  assert.equal(schedule.src, `https://v-ent.co/embed/tournaments/naija-cup/schedule?${look}&vent_frame=vent-3`);
  assert.equal(bad.src, 'https://v-ent.co/embed/tournaments/naija-cup?vent_frame=vent-4');
});

test('an event never takes a widget', () => {
  const [event] = runEmbedScript([{ 'data-vent-event': 'lagos-con', 'data-vent-widget': 'bracket' }]);
  assert.equal(event.src, 'https://v-ent.co/embed/events/lagos-con?vent_frame=vent-1');
});

console.log('the schedule');

// The reader's calendar day for an instant; UTC here so the test is the same
// on every machine. The widget passes the real one from datetime.js.
const utcDay = (iso) => iso.slice(0, 10);
const fixture = (id, extra = {}) => ({ match_id: id, round: 1, match_number: id, day: null,
  running_order: 0, scheduled_at: null, ...extra });

test('the organiser\'s day and order come first, as they set them', () => {
  const groups = scheduleGroups({
    days: [{ day: '2026-10-20', fixtures: [
      fixture(1, { day: '2026-10-20', running_order: 2 }),
      fixture(2, { day: '2026-10-20', running_order: 1 }),
    ] }],
    unscheduled: [],
  }, utcDay);
  assert.deepEqual(groups.map(g => g.day), ['2026-10-20']);
  assert.deepEqual(groups[0].fixtures.map(f => f.match_id), [2, 1]);
});

test('a fixture with a time and no day sits on the day of its time', () => {
  const groups = scheduleGroups({
    days: [{ day: '2026-10-21', fixtures: [fixture(1, { day: '2026-10-21', running_order: 1 })] }],
    unscheduled: [
      fixture(2, { scheduled_at: '2026-10-21T15:00:00Z' }),
      fixture(3, { scheduled_at: '2026-10-20T09:00:00Z' }),
      fixture(4, { scheduled_at: '2026-10-21T11:00:00Z' }),
    ],
  }, utcDay);
  assert.deepEqual(groups.map(g => g.day), ['2026-10-20', '2026-10-21']);
  // The organiser's ordered fixture first, then the timed ones by time.
  assert.deepEqual(groups[1].fixtures.map(f => f.match_id), [1, 4, 2]);
});

test('nothing known about when: one group at the end, in playing order', () => {
  const groups = scheduleGroups({
    days: [],
    unscheduled: [fixture(9, { round: 2, match_number: 1 }), fixture(8, { round: 1, match_number: 2 }),
      fixture(7, { scheduled_at: '2026-10-22T10:00:00Z' })],
  }, utcDay);
  assert.deepEqual(groups.map(g => g.day), ['2026-10-22', null]);
  assert.deepEqual(groups[1].fixtures.map(f => f.match_id), [8, 9]);
});

test('an empty or missing schedule is no groups, never a crash', () => {
  assert.deepEqual(scheduleGroups(null, utcDay), []);
  assert.deepEqual(scheduleGroups({ days: [], unscheduled: [] }, utcDay), []);
});

console.log(failures ? `${failures} failed, ${passed} passed` : `all ${passed} passed`);
process.exit(failures ? 1 : 0);
