#!/usr/bin/env node
// Every format has an explainer, and every explainer can be watched and read.
//
// Inbox 476 (CEO, 16 October 2026): "we'll need a video explainer for all
// these bracket/format systems". The design says the explainers are made as
// each format ships, in the same PR as the format. Nothing else would notice a
// format added to the catalogue with no explainer, or an explainer whose
// words exist in English only: the player falls back to the English written
// in the scene, which is silent, and check-keys cannot see a key built from a
// format name at run time.
//
// So this reads every scene in src/lib/explainers and fails on:
//
//   * a format in the catalogue (src/lib/formatLabel.js FORMAT_KEYS) with no explainer
//   * a scene shorter than 30 seconds or longer than 60 (the design's length)
//   * a step with no caption line, a caption line never shown, lines shown out
//     of order, or a line on screen for under 5 seconds (too short to read)
//   * anything drawn outside the stage in any frame, which is a scene that
//     will be clipped on every screen
//   * a drawn word with no English fallback, a fallback nothing draws, or a
//     word missing from French or Portuguese
//   * a title or caption line missing from a language, an English dictionary
//     line that differs from the scene's own English, or a translation that
//     drops a {placeholder}
//
//   node scripts/check-explainers.mjs
//   node scripts/check-explainers.mjs --self-test

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// The scenes import with the app's `@/` alias and without extensions, the
// way Next resolves them. This answers both for Node.
const hook = `
  import { existsSync } from 'node:fs';
  import { fileURLToPath, pathToFileURL } from 'node:url';
  import path from 'node:path';
  const SRC = ${JSON.stringify(path.join(ROOT, 'src'))};
  const withJs = (file) => (existsSync(file) ? file : existsSync(file + '.js') ? file + '.js' : path.join(file, 'index.js'));
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      return { url: pathToFileURL(withJs(path.join(SRC, specifier.slice(2)))).href, shortCircuit: true };
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const base = path.dirname(fileURLToPath(context.parentURL));
      return { url: pathToFileURL(withJs(path.resolve(base, specifier))).href, shortCircuit: true };
    }
    return next(specifier, context);
  }
`;
register('data:text/javascript,' + encodeURIComponent(hook), pathToFileURL(ROOT + '/'));

const MIN_MS = 30000;
const MAX_MS = 60000;
const MIN_LINE_MS = 5000;
const LANGS = ['en', 'fr', 'pt'];
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

/**
 * Findings for a set of explainers against the dictionaries.
 *
 * @param explainers  [{ key, title, lines, scene }]
 * @param art         the English drawn words, key -> text
 * @param formatKeys  the catalogue's keys, each needing an explainer
 * @param dicts       { en, fr, pt }
 * @param story       { frames, duration, artKeys } from story.js
 */
export function findingsFor({ explainers, art, formatKeys, dicts, story }) {
  const out = [];
  const keys = new Set(explainers.map((e) => e.key));
  for (const f of formatKeys) {
    if (!keys.has(f)) out.push(`${f}: a format in the catalogue with no explainer`);
  }

  const drawn = new Set();
  for (const e of explainers) {
    const { scene } = e;
    const total = story.duration(scene);
    if (total < MIN_MS || total > MAX_MS) {
      out.push(`${e.key}: plays for ${(total / 1000).toFixed(1)} s, the design says 30 to 60`);
    }
    const shownFor = [0, 0, 0];
    let last = 0;
    scene.steps.forEach((s, i) => {
      if (![0, 1, 2].includes(s.line)) out.push(`${e.key}: step ${i + 1} names no caption line`);
      else {
        if (s.line < last) out.push(`${e.key}: step ${i + 1} goes back to caption line ${s.line + 1}`);
        last = Math.max(last, s.line);
        shownFor[s.line] += s.ms;
      }
    });
    shownFor.forEach((ms, i) => {
      if (ms === 0) out.push(`${e.key}: caption line ${i + 1} is never shown`);
      else if (ms < MIN_LINE_MS) out.push(`${e.key}: caption line ${i + 1} is on screen for ${ms} ms, too short to read`);
    });

    // Inside the stage, in every frame.
    story.frames(scene).forEach((frame, fi) => {
      for (const [id, a] of Object.entries(frame)) {
        const pts = a.t === 'line' ? a.d : [[a.x, a.y], [a.x + (a.w || 0), a.y + (a.h || 0)]];
        const outside = pts.some(([x, y]) => x < 0 || y < 0 || x > scene.w || y > scene.h);
        if (outside) {
          out.push(`${e.key}: ${id} is drawn outside the ${scene.w} x ${scene.h} stage in frame ${fi}`);
          break;
        }
      }
    });

    for (const k of story.artKeys(scene)) {
      drawn.add(k);
      if (!art[k]) out.push(`${e.key}: draws "${k}", which has no English in ART (story.js)`);
    }

    const words = [['title', e.title], ...e.lines.map((text, i) => [`line${i + 1}`, text])];
    if (e.lines.length !== 3) out.push(`${e.key}: has ${e.lines.length} caption lines, the design says three`);
    for (const [name, english] of words) {
      const key = `explainer.${e.key}.${name}`;
      for (const lang of LANGS) {
        const value = dicts[lang]?.[key];
        if (!value) out.push(`${key}: missing from ${lang}`);
        else if (lang === 'en' && value !== english) out.push(`${key}: the dictionary's English differs from the scene's own`);
      }
    }
  }

  for (const [k, english] of Object.entries(art)) {
    if (!drawn.has(k)) out.push(`explainer.art.${k}: in ART but drawn by no explainer`);
    const key = `explainer.art.${k}`;
    for (const lang of LANGS) {
      const value = dicts[lang]?.[key];
      if (!value) out.push(`${key}: missing from ${lang}`);
      else if (lang === 'en' && value !== english) out.push(`${key}: the dictionary's English differs from ART`);
      else if (placeholders(value) !== placeholders(english)) out.push(`${key}: ${lang} drops or adds a {placeholder}`);
    }
  }
  return out;
}

async function load() {
  const lib = (p) => import(pathToFileURL(path.join(ROOT, 'src', 'lib', ...p.split('/'))).href);
  const story = await lib('explainers/story.js');
  const index = await lib('explainers/index.js');
  const labels = await lib('formatLabel.js');
  const { dictionaries } = await import(pathToFileURL(path.join(ROOT, 'src', 'i18n', 'dictionaries.js')).href);
  const explainers = index.EXPLAINER_KEYS.map((key) => ({ ...index.EXPLAINERS[key], scene: index.sceneFor(key) }));
  return { story, explainers, art: story.ART, formatKeys: labels.FORMAT_KEYS, dicts: dictionaries };
}

async function selfTest() {
  const { story, explainers, art, formatKeys, dicts } = await load();
  const good = explainers.find((e) => e.key === 'single_elimination');
  const base = { story, art, formatKeys: [], dicts };
  const cases = [];
  const run = (name, input, expect) => {
    const found = findingsFor({ ...base, ...input });
    const hit = found.some((f) => f.includes(expect));
    cases.push([name, expect ? hit : found.length === 0, found]);
  };
  const usesAll = Object.fromEntries(Object.entries(art).filter(([k]) => story.artKeys(good.scene).includes(k)));
  const clone = (scene) => JSON.parse(JSON.stringify(scene));

  run('a real explainer passes', { explainers: [good], art: usesAll }, null);
  run('a format with no explainer', { explainers: [good], art: usesAll, formatKeys: ['swiss'] }, 'swiss: a format in the catalogue with no explainer');
  const short = clone(good.scene);
  short.steps = short.steps.slice(0, 3);
  run('a scene under 30 seconds', { explainers: [{ ...good, scene: short }], art: usesAll }, 'the design says 30 to 60');
  const long = clone(good.scene);
  long.steps.push({ line: 2, ms: 40000, set: {} });
  run('a scene over 60 seconds', { explainers: [{ ...good, scene: long }], art: usesAll }, 'the design says 30 to 60');
  const noLine = clone(good.scene);
  noLine.steps[1].line = undefined;
  run('a step with no caption', { explainers: [{ ...good, scene: noLine }], art: usesAll }, 'names no caption line');
  const back = clone(good.scene);
  back.steps[back.steps.length - 1].line = 0;
  run('captions out of order', { explainers: [{ ...good, scene: back }], art: usesAll }, 'goes back to caption line 1');
  const outside = clone(good.scene);
  outside.steps[2].set[Object.keys(outside.cast).find((id) => outside.cast[id].t === 'chip')] = { x: 470 };
  run('an actor pushed off the stage', { explainers: [{ ...good, scene: outside }], art: usesAll }, 'outside the 480 x 270 stage');
  run('a drawn word with no English', { explainers: [good], art: { ...usesAll, champion: undefined } }, 'draws "champion", which has no English');
  run('a fallback nothing draws', { explainers: [good], art: { ...usesAll, decider: 'Decider' } }, 'explainer.art.decider: in ART but drawn by no explainer');
  const frOnly = { ...dicts, fr: { ...dicts.fr, 'explainer.single_elimination.line2': undefined } };
  run('a caption missing in French', { explainers: [good], art: usesAll, dicts: frOnly }, 'explainer.single_elimination.line2: missing from fr');
  run('a dictionary that drifted from the scene', { explainers: [{ ...good, lines: ['x', ...good.lines.slice(1)] }], art: usesAll }, "the dictionary's English differs from the scene's own");
  const dropped = { ...dicts, pt: { ...dicts.pt, 'explainer.art.round': 'Ronda' } };
  run('a translation that drops {n}', { explainers: [good], art: usesAll, dicts: dropped }, 'pt drops or adds a {placeholder}');

  let failed = 0;
  for (const [name, ok, found] of cases) {
    if (!ok) {
      failed += 1;
      console.log(`  FAIL ${name}`);
      for (const f of found) console.log(`       ${f}`);
    } else {
      console.log(`  ok   ${name}`);
    }
  }
  if (failed) {
    console.log(`check-explainers self-test: ${failed} of ${cases.length} failed`);
    process.exit(1);
  }
  console.log(`check-explainers self-test passed (${cases.length} cases)`);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const input = await load();
  const found = findingsFor(input);
  if (found.length) {
    for (const f of found) console.log(`  ${f}`);
    console.log(`check-explainers: ${found.length} problem${found.length === 1 ? '' : 's'} in ${input.explainers.length} explainers`);
    process.exit(1);
  }
  const seconds = input.explainers.map((e) => input.story.duration(e.scene) / 1000);
  console.log(`check-explainers: ${input.explainers.length} explainers, `
    + `${Math.min(...seconds).toFixed(1)} to ${Math.max(...seconds).toFixed(1)} s each, every word in en, fr and pt`);
}

main();
