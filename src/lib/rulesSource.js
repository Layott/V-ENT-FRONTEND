/**
 * Where a match rule comes from, in words (P1c, design section 10): "set for
 * this match", "set for this round", "from Playoff", "the tournament's own".
 * The server says which (`match.rules[key].from`); the words are built here so
 * they read in the visitor's language.
 */
export function rulesSource(tt, rules, key) {
  const rule = rules?.[key];
  if (!rule?.from) return null;
  if (rule.from === 'match') return tt('match.rulesFrom.match', 'set for this match');
  if (rule.from === 'round') return tt('match.rulesFrom.round', 'set for this round');
  if (rule.from === 'stage') {
    return rule.stage
      ? tt('match.rulesFrom.stage', 'from {stage}').replace('{stage}', rule.stage)
      : tt('match.rulesFrom.stageUnnamed', 'from this stage');
  }
  return tt('match.rulesFrom.tournament', 'the tournament’s own');
}
