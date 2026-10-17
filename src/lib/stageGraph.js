/**
 * A tournament in stages as a picture: where each stage sits, and the lines
 * between them (P1f).
 *
 * CEO, 16 October 2026: "i aprove the design". Section 2 of the bracket
 * structure design: "Every competition on V-ENT becomes a graph of stages ...
 * Progressions are the lines between boxes." One layout and one sentence per
 * line, read by the organiser's planner (from the draft, as it is edited) and
 * by the public Path view (from the saved plan), so the two never disagree.
 */

const key = v => String(v);

/**
 * Columns by the longest way in: a stage nothing feeds sits in the first
 * column, every other stage one column after the latest stage feeding it.
 * A line to a stage that is not in the list (a draft line left pointing at a
 * removed stage) is dropped rather than drawn, and a cycle (which the save
 * refuses, but a draft can hold for a moment) still lays out.
 */
export function layout(stages, lines) {
  const ids = (stages || []).map(s => key(s.id));
  const known = new Set(ids);
  const edges = (lines || []).filter(l => known.has(key(l.source)) && known.has(key(l.target))
    && key(l.source) !== key(l.target));
  const into = Object.fromEntries(ids.map(id => [id, []]));
  edges.forEach(l => into[key(l.target)].push(key(l.source)));

  const depth = {};
  const open = new Set();
  const depthOf = id => {
    if (depth[id] !== undefined) return depth[id];
    if (open.has(id)) return 0;
    open.add(id);
    const d = into[id].length ? 1 + Math.max(...into[id].map(depthOf)) : 0;
    open.delete(id);
    depth[id] = d;
    return d;
  };
  ids.forEach(depthOf);

  const columns = [];
  (stages || []).forEach(s => {
    const d = depth[key(s.id)];
    (columns[d] = columns[d] || []).push(s);
  });
  return { columns: columns.filter(Boolean), edges, depth };
}

/**
 * The Path view across tournaments (P2): a feed's other end is a box of its
 * own ("Lagos Qualifier: League"), before the stages a feed fills and after
 * the stages a feed empties, joined by the feed's line, which names who went
 * through it. `plan` is the public stages answer, `feeds` the public feeds
 * answer ({incoming, outgoing}); either may be missing. One function for the
 * tournament page and the Path widget (P8): the widget once read "one stage,
 * no path" beside a page drawing two (walk, 17 October 2026).
 */
export function pathWithFeeds(plan, feeds) {
  const own = plan?.stages || [];
  const external = [];
  const lines = [];
  const seen = new Set();
  const outside = (side, end) => {
    const id = `x-${end}-${side.stage_id}`;
    if (!seen.has(id)) {
      seen.add(id);
      external.push({ id, label: `${side.tournament.title}: ${side.stage}`, format: side.format,
                      groups: side.groups, slug: side.tournament.slug });
    }
    return id;
  };
  const through = f => (f.qualifiers || []).filter(q => q.status === 'confirmed').map(q => ({ name: q.name }));
  (feeds?.incoming || []).forEach(f => lines.push({ ...f, sent: through(f), source: outside(f.source, 'in'), target: f.target.stage_id }));
  (feeds?.outgoing || []).forEach(f => lines.push({ ...f, sent: through(f), source: f.source.stage_id, target: outside(f.target, 'out') }));
  return {
    stages: [...external.filter(x => x.id.startsWith('x-in')), ...own, ...external.filter(x => x.id.startsWith('x-out'))],
    lines: [...(plan?.progressions || []), ...lines],
    external,
  };
}

/**
 * Where a stage is up to, in words. A stage drawn early (P1d) is drawn and
 * not yet played: its seats are waiting for the places that feed them, and
 * calling it "being played" sent people looking for matches that cannot
 * start yet (walk, 17 October 2026).
 */
export function stageState(tt, stage) {
  if (stage?.status === 'complete') return tt('bracket.stageDone', 'Finished');
  if (stage?.status === 'running') return tt('bracket.stageLive', 'Being played');
  if (stage?.drawn_at || stage?.drawn) return tt('bracket.stageWaiting', 'Drawn, waiting for its places');
  return tt('bracket.stageLater', 'Not drawn yet');
}

const groupLetter = n => String.fromCharCode(64 + Number(n || 1));

/**
 * "Places 1 to 2 of each group go to Playoff, in the upper bracket." Built
 * from parts so every language puts them in its own order.
 */
export function lineWords(tt, line, sourceStage, targetLabel) {
  const grouped = Number(sourceStage?.groups) > 1;
  const each = grouped && (line.group === null || line.group === undefined || line.group === '');
  const one = grouped && !each;
  const from = Number(line.place_from) || 1;
  const to = Number(line.place_to) || from;
  const scope = each ? 'Each' : one ? 'Group' : '';
  const kind = from === to ? (from === 1 ? 'winner' : 'place') : 'range';
  const fallback = {
    winner: 'The winner goes to {target}', winnerEach: 'The winner of each group goes to {target}',
    winnerGroup: 'The winner of group {g} goes to {target}',
    place: 'Place {n} goes to {target}', placeEach: 'Place {n} of each group goes to {target}',
    placeGroup: 'Place {n} of group {g} goes to {target}',
    range: 'Places {a} to {b} go to {target}', rangeEach: 'Places {a} to {b} of each group go to {target}',
    rangeGroup: 'Places {a} to {b} of group {g} go to {target}',
  }[kind + scope];
  const base = tt(`stages.lines.${kind}${scope}`, fallback)
    .replace('{target}', targetLabel || '').replace('{g}', one ? groupLetter(line.group) : '')
    .replace('{n}', from).replace('{a}', from).replace('{b}', to);
  const parts = [];
  if (line.side === 'winners') parts.push(tt('stages.lines.inUpper', 'in the upper bracket'));
  if (line.side === 'losers') parts.push(tt('stages.lines.inLower', 'in the lower bracket'));
  if (line.carry_points) parts.push(tt('stages.lines.keeping', 'keeping their points'));
  if (line.fire === 'on_close') parts.push(tt('stages.lines.goesOnClose', 'as soon as the stage ends'));
  if (line.fire === 'manual') parts.push(tt('stages.lines.goesManual', 'when you press send'));
  return `${base}${parts.length ? `, ${parts.join(', ')}` : ''}.`;
}
