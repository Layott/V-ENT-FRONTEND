// A stage whose format is chosen later (P4c, design section 14a), in words.
//
// The server keeps the rule a stage was saved with as its `settings`, and what
// happened as `format_decision`. Both are read here, so the organiser's panel
// and the public bracket say the same thing about the same stage.
//
// A rule's options and bands arrive as bare keys in a saved plan and as
// {key, label} objects from the public read, so both shapes are accepted.

import { formatLabel, stageName } from './formatLabel';

export const UNDECIDED = 'undecided';

export const isUndecided = row => row?.format === UNDECIDED;

const keyOf = option => (typeof option === 'string' ? option : option?.key);
const formatName = (tt, key) => formatLabel(tt, key, '');

/** What a stage is called. One nobody has named yet is "Format to be decided". */
export const titleOf = (tt, row) => (isUndecided(row) && !String(row?.label ?? '').trim()
  ? tt('stages.undecidedName', 'Format to be decided')
  : stageName(tt, row?.label, row?.format, row?.settings?.preset ?? row?.preset));

const bandRange = (tt, band) => {
  const low = Number(band.min) || 0;
  if (band.max === null || band.max === undefined || band.max === '') {
    return tt('stages.bandFrom', '{n} or more').replace('{n}', low);
  }
  const high = Number(band.max);
  if (low === 0) return tt('stages.bandUnder', 'under {n}').replace('{n}', high + 1);
  if (low === high) return tt('stages.bandExactly', 'exactly {n}').replace('{n}', low);
  return tt('stages.bandBetween', '{low} to {high}').replace('{low}', low).replace('{high}', high);
};

/** How a format will be decided, in one sentence. `rule` is a stage's rule. */
export const decideSentence = (tt, rule = {}) => {
  if (rule.decide_by === 'vote') {
    const formats = (rule.options || []).map(o => formatName(tt, keyOf(o))).join(', ');
    return tt('stages.decideSentenceVote',
      'The entrants vote for the format, from {formats}. Voting closes when registration does.')
      .replace('{formats}', formats);
  }
  if (rule.decide_by === 'bands') {
    if (!(rule.bands || []).length) return tt('stages.bandsNone', 'Add at least one band.');
    const bands = rule.bands.map(b => `${bandRange(tt, b)}: ${formatName(tt, b.format)}`).join('; ');
    const how = rule.apply === 'confirm'
      ? tt('stages.bandsApplyConfirm', 'The organiser confirms it when registration closes.')
      : tt('stages.bandsApplyAuto', 'It is applied when registration closes.');
    return tt('stages.decideSentenceBands', 'The format follows how many are confirmed: {bands}. {how}')
      .replace('{bands}', bands)
      .replace('{how}', how);
  }
  return tt('stages.decideSentenceOrganiser', 'The organiser picks the format before the draw.');
};

/** The result, once a stage has been decided. */
export const decidedSentence = (tt, decision = {}) => {
  const name = formatName(tt, decision.format);
  if (decision.by === 'vote') {
    return tt('stages.decidedVote', 'The entrants chose {format}.').replace('{format}', name);
  }
  if (decision.by === 'bands') {
    return tt('stages.decidedBands', '{format} applied: {n} confirmed.')
      .replace('{format}', name)
      .replace('{n}', decision.count ?? 0);
  }
  return tt('stages.decidedOrganiser', 'The organiser chose {format}.').replace('{format}', name);
};

/** Where an undecided stage stands right now, or '' when there is nothing to say. */
export const statusSentence = (tt, state = {}) => {
  if (state.needs_organiser === 'tie') {
    return tt('stages.needsTie', 'The entrants tied. The organiser picks the format.');
  }
  if (state.needs_organiser === 'no_votes') {
    return tt('stages.needsNoVotes', 'Nobody has voted. The organiser picks the format.');
  }
  if (state.needs_organiser === 'no_band') {
    return tt('stages.needsNoBand', 'No band fits the count. The organiser picks the format.');
  }
  if (state.proposed) {
    return tt('stages.proposedWaiting', 'The count proposes {format}. The organiser confirms it before the draw.')
      .replace('{format}', formatName(tt, state.proposed));
  }
  if (state.band_now) {
    return tt('stages.bandRightNow', 'Right now: {format}, with {n} confirmed.')
      .replace('{format}', formatName(tt, state.band_now.format))
      .replace('{n}', state.confirmed_count ?? 0);
  }
  return '';
};
