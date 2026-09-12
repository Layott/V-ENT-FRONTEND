'use client';

// The rules a squad has to satisfy, and where this squad stands against each
// one. Shared by the player building a squad and the organiser looking at one,
// because they are the same question asked from two sides and a second copy
// would eventually give two answers.
//
// Every line here is built from a CODE the server sent plus its numbers.
// Nothing translates a sentence written in Python, which cannot be translated,
// and nothing works the rules out in JavaScript, which would be the rules
// written twice.

import { useT } from '@/i18n/LanguageProvider';
import styles from './squad-status.module.css';

const NUMBER = (n) => Number(n || 0).toLocaleString();

/** One violation, as a sentence somebody can act on. */
export function violationText(tt, v) {
  const code = v?.code;
  if (code === 'NO_RULES_SET') {
    return tt('squad.v.noRules',
      'The organiser has not set the squad rules yet, so nothing can be submitted. Ask them to set them.');
  }
  if (code === 'NOT_ELEVEN') {
    return tt('squad.v.notEleven', 'You have {have} of {need} on the pitch.')
      .replace('{have}', String(v.have)).replace('{need}', String(v.need));
  }
  if (code === 'OVER_BUDGET') {
    return tt('squad.v.overBudget',
      'This eleven costs {spent} coins. The limit is {allowed}, so you are {over} over.')
      .replace('{spent}', NUMBER(v.spent))
      .replace('{allowed}', NUMBER(v.allowed))
      .replace('{over}', NUMBER(v.over));
  }
  if (code === 'NOT_ENOUGH_FROM_NATION') {
    return tt('squad.v.nation',
      'You need {need} from {nation} and you have {have}.')
      .replace('{need}', String(v.need)).replace('{have}', String(v.have))
      .replace('{nation}', String(v.nation || ''));
  }
  if (code === 'BANNED_ITEM_TYPE') {
    return tt('squad.v.banned', 'These card types are not allowed here: {kinds}.')
      .replace('{kinds}', (v.kinds || []).join(', '));
  }
  if (code === 'CARD_TOO_HIGH') {
    return tt('squad.v.rating',
      'No card may be rated above {limit}. Too high: {cards}.')
      .replace('{limit}', String(v.limit))
      .replace('{cards}', (v.cards || []).join(', '));
  }
  return tt('squad.v.other', 'Something about this squad does not meet the rules.');
}

/** What the organiser has asked for, in plain words. */
function ruleLines(tt, rules) {
  if (!rules) return [];
  const out = [];
  if (rules.max_budget_coins) {
    out.push(tt('squad.rule.budget', 'The eleven may cost at most {n} coins.')
      .replace('{n}', NUMBER(rules.max_budget_coins)));
  }
  if (rules.required_nation && rules.min_from_nation) {
    out.push(tt('squad.rule.nation', 'At least {n} from {nation}.')
      .replace('{n}', String(rules.min_from_nation))
      .replace('{nation}', rules.required_nation));
  }
  if ((rules.banned_item_types || []).length) {
    out.push(tt('squad.rule.banned', 'Not allowed: {kinds}.')
      .replace('{kinds}', rules.banned_item_types.join(', ')));
  }
  if (rules.max_card_rating) {
    out.push(tt('squad.rule.rating', 'No card rated above {n}.')
      .replace('{n}', String(rules.max_card_rating)));
  }
  if (rules.notes) out.push(rules.notes);
  return out;
}

/**
 * @param rules      the squad rules payload, or null when none are set
 * @param violations what is currently wrong, from the server
 * @param spend      what this eleven costs
 * @param status     draft | submitted | accepted | rejected
 * @param note       the organiser's reason, on a rejection
 */
export default function SquadStatus({ rules, violations, spend, status, note,
                                      reviewedBy }) {
  const tt = useT();
  const wrong = violations || [];
  const lines = ruleLines(tt, rules);

  const stateWords = {
    draft: tt('squad.state.draft', 'Not submitted yet. The organiser cannot see this.'),
    submitted: tt('squad.state.submitted', 'Submitted. Waiting for the organiser to check it.'),
    accepted: tt('squad.state.accepted', 'Accepted by the organiser.'),
    rejected: tt('squad.state.rejected', 'Sent back by the organiser. Change it and submit again.'),
  };

  return (
    <div className={styles.wrap}>
      {status && (
        <p className={`${styles.state} ${styles[status] || ''}`}>
          {stateWords[status] || ''}
          {reviewedBy && status !== 'draft' && (
            <span className={styles.by}>
              {' '}
              {tt('squad.state.by', 'Checked by {who}.').replace('{who}', reviewedBy)}
            </span>
          )}
        </p>
      )}

      {status === 'rejected' && note && (
        <p className={styles.note}>
          {tt('squad.state.reason', 'Their reason: {note}').replace('{note}', note)}
        </p>
      )}

      <h4 className={styles.heading}>{tt('squad.rulesTitle', 'Squad rules')}</h4>
      {!rules && (
        <p className={styles.muted}>
          {tt('squad.noRules',
            'The organiser has not set any squad rules yet. Nothing can be submitted until they do.')}
        </p>
      )}
      {rules && lines.length === 0 && (
        <p className={styles.muted}>
          {tt('squad.rulesOpen', 'No restrictions. Any eleven may be submitted.')}
        </p>
      )}
      {lines.map((line) => (
        <p key={line} className={styles.rule}>{line}</p>
      ))}

      {rules?.max_budget_coins ? (
        <p className={styles.spend}>
          {tt('squad.spend', '{spent} of {allowed} coins used.')
            .replace('{spent}', NUMBER(spend))
            .replace('{allowed}', NUMBER(rules.max_budget_coins))}
        </p>
      ) : null}

      {wrong.length > 0 && (
        <>
          <h4 className={styles.heading}>
            {tt('squad.blocking', 'What is stopping this being submitted')}
          </h4>
          {wrong.map((v, i) => (
            <p key={`${v.code}-${i}`} className={styles.problem}>
              {violationText(tt, v)}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
