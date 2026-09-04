'use client';

// The organiser's half of squads: the rules they set, and the squads that come
// back to be accepted or sent back.
//
// CEO, 3 September 2026: "a place for admins to accept or reject etc. also a
// place for admins to set rules for the squads that the players are submitting
// to use if not they wont be able to submit."
//
// CEO, 4 September 2026: "i hjave not seen the UI of where the players submit
// and how they pick". This is the other end of the same gap. Both endpoints
// existed and neither had a screen, so an organiser could set rules nowhere and
// a submitted squad sat in the database with nobody able to look at it.
//
// The rules come first on the screen because they come first in time: with none
// set, nothing can be submitted at all, and the player is told exactly that. An
// organiser landing here with an empty queue needs to know that is why.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import FutCard from './FutCard';
import styles from './squad-review.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const ITEM_TYPES = ['gold', 'silver', 'bronze', 'icon', 'hero', 'special', 'other'];

/** A number field's value, kept as text so an empty box stays empty. */
const asText = (v) => (v === null || v === undefined ? '' : String(v));

export default function SquadReviewPanel({ tournamentRef, token, showToast,
                                          onDecided }) {
  const tt = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingRules, setSavingRules] = useState(false);

  const [lineups, setLineups] = useState([]);
  const [openPlayer, setOpenPlayer] = useState(null);
  const [notes, setNotes] = useState({});
  const [deciding, setDeciding] = useState('');

  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

  const load = useCallback(async () => {
    if (!tournamentRef) { setLoading(false); return; }
    try {
      const [rulesRes, listRes] = await Promise.all([
        fetch(`${API}/tournament/${tournamentRef}/squad-rules/`),
        fetch(`${API}/tournament/${tournamentRef}/lineups/`, { headers: auth }),
      ]);
      const rulesBody = await rulesRes.json().catch(() => ({}));
      const listBody = await listRes.json().catch(() => ({}));

      if (rulesBody?.status === 'success') {
        const found = rulesBody.data.squad_rules;
        setRules(found);
        setDraft({
          max_budget_coins: asText(found?.max_budget_coins),
          required_nation: found?.required_nation || '',
          min_from_nation: asText(found?.min_from_nation),
          max_card_rating: asText(found?.max_card_rating),
          banned_item_types: found?.banned_item_types || [],
          notes: found?.notes || '',
        });
      }
      if (listBody?.status === 'success') {
        setLineups(listBody.data.lineups || []);
      }
      setError('');
    } catch (err) {
      setError(apiMessage(tt, err, 'review.loadFailed', 'Could not load the squads.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const saveRules = async () => {
    setSavingRules(true);
    setError('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/squad-rules/`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // An empty box means no limit, which the API reads as 0 or null.
          max_budget_coins: draft.max_budget_coins === '' ? 0 : Number(draft.max_budget_coins),
          required_nation: draft.required_nation.trim(),
          min_from_nation: draft.min_from_nation === '' ? 0 : Number(draft.min_from_nation),
          max_card_rating: draft.max_card_rating === '' ? '' : Number(draft.max_card_rating),
          banned_item_types: draft.banned_item_types,
          notes: draft.notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'review.rulesFailed', 'Those rules were not saved.'));
        return;
      }
      setRules(body.data.squad_rules);
      showToast?.(tt('review.rulesSaved', 'Squad rules saved.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'review.rulesFailed', 'Those rules were not saved.'));
    } finally {
      setSavingRules(false);
    }
  };

  const decide = async (player, decision) => {
    const note = (notes[player] || '').trim();
    if (decision === 'reject' && !note) {
      setError(tt('review.reasonNeeded',
        'Say why you are sending it back, so they can fix it.'));
      return;
    }
    setDeciding(`${player}:${decision}`);
    setError('');
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/lineups/${encodeURIComponent(player)}/review/`,
        { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, note }) });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'review.decideFailed', 'That decision was not saved.'));
        return;
      }
      setLineups((current) => current.map(
        (l) => (l.player === player ? body.data.lineup : l)));
      setNotes((current) => ({ ...current, [player]: '' }));
      showToast?.(decision === 'accept'
        ? tt('review.accepted', 'Squad accepted.')
        : tt('review.sentBack', 'Sent back to the player.'));
      // An organiser who also plays has their own squad on this same screen,
      // and it would otherwise go on saying "waiting for the organiser" after
      // they had just decided it.
      onDecided?.();
    } catch (err) {
      setError(apiMessage(tt, err, 'review.decideFailed', 'That decision was not saved.'));
    } finally {
      setDeciding('');
    }
  };

  // Waiting first, because that is the work. Then the ones already decided.
  const ordered = useMemo(() => {
    const rank = { submitted: 0, rejected: 1, accepted: 2, draft: 3 };
    return [...lineups].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
      || String(a.player).localeCompare(String(b.player)));
  }, [lineups]);

  const waiting = ordered.filter((l) => l.status === 'submitted').length;

  const toggleType = (kind) => setDraft((d) => ({
    ...d,
    banned_item_types: d.banned_item_types.includes(kind)
      ? d.banned_item_types.filter((k) => k !== kind)
      : [...d.banned_item_types, kind],
  }));

  const statusWord = (status) => ({
    draft: tt('review.status.draft', 'Still a draft'),
    submitted: tt('review.status.submitted', 'Waiting for you'),
    accepted: tt('review.status.accepted', 'Accepted'),
    rejected: tt('review.status.rejected', 'Sent back'),
  })[status] || status;

  if (loading) {
    return <p className={styles.muted}>{tt('review.loading', 'Loading...')}</p>;
  }

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('review.title', 'Squads')}</h3>
      <p className={styles.hint}>
        {tt('review.hint', 'Set what a squad has to satisfy, then accept or send back what players hand in. Nobody can submit until these rules exist, so an empty queue with no rules set is why.')}
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <h4 className={styles.subTitle}>{tt('review.rulesTitle', 'Rules for every squad')}</h4>
      {!rules && (
        <p className={styles.warn}>
          {tt('review.noRulesYet', 'No rules set yet, so nothing can be submitted. Save these to open submissions, even if you leave every box empty.')}
        </p>
      )}

      {draft && (
        <>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>
                {tt('review.budget', 'Most the eleven may cost, in coins')}
              </span>
              <input className={styles.input} inputMode="numeric"
                     value={draft.max_budget_coins}
                     placeholder={tt('review.noLimit', 'No limit')}
                     onChange={(e) => setDraft({ ...draft, max_budget_coins: e.target.value.replace(/[^0-9]/g, '') })} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                {tt('review.maxRating', 'Highest card rating allowed')}
              </span>
              <input className={styles.input} inputMode="numeric"
                     value={draft.max_card_rating}
                     placeholder={tt('review.noLimit', 'No limit')}
                     onChange={(e) => setDraft({ ...draft, max_card_rating: e.target.value.replace(/[^0-9]/g, '') })} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                {tt('review.nation', 'Nation they must include')}
              </span>
              <input className={styles.input} value={draft.required_nation}
                     placeholder={tt('review.nationPlaceholder', 'Nigeria')}
                     onChange={(e) => setDraft({ ...draft, required_nation: e.target.value })} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                {tt('review.minFromNation', 'How many from that nation')}
              </span>
              <input className={styles.input} inputMode="numeric"
                     value={draft.min_from_nation}
                     placeholder="0"
                     onChange={(e) => setDraft({ ...draft, min_from_nation: e.target.value.replace(/[^0-9]/g, '') })} />
            </label>
          </div>

          <span className={styles.label}>
            {tt('review.banned', 'Card types nobody may use')}
          </span>
          <div className={styles.chips}>
            {ITEM_TYPES.map((kind) => (
              <button key={kind} type="button"
                      aria-pressed={draft.banned_item_types.includes(kind)}
                      className={`${styles.chip} ${draft.banned_item_types.includes(kind) ? styles.chipOn : ''}`}
                      onClick={() => toggleType(kind)}>
                {kind}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            <span className={styles.label}>
              {tt('review.notes', 'Anything else players should know')}
            </span>
            <input className={styles.input} value={draft.notes} maxLength={280}
                   placeholder={tt('review.notesPlaceholder', 'No duplicate clubs in the back four')}
                   onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </label>

          <button type="button" className={styles.save} disabled={savingRules}
                  onClick={saveRules}>
            {savingRules
              ? tt('review.savingRules', 'Saving...')
              : tt('review.saveRules', 'Save squad rules')}
          </button>
        </>
      )}

      <h4 className={styles.subTitle}>
        {tt('review.queue', 'Squads handed in')}
        {waiting > 0 && (
          <span className={styles.waiting}>
            {' '}
            {tt('review.waitingCount', '{n} waiting for you').replace('{n}', String(waiting))}
          </span>
        )}
      </h4>

      {ordered.length === 0 && (
        <p className={styles.muted}>
          {tt('review.none', 'Nobody has built a squad yet.')}
        </p>
      )}

      {ordered.map((row) => {
        const open = openPlayer === row.player;
        const eleven = (row.slots || []).filter((s) => s.slot_index < 11);
        return (
          <div key={row.player} className={styles.row}>
            <div className={styles.rowHead}>
              <span className={styles.player}>{row.player}</span>
              <span className={`${styles.state} ${styles[row.status] || ''}`}>
                {statusWord(row.status)}
              </span>
              <span className={styles.formation}>{row.formation}</span>
              <button type="button" className={styles.ghost}
                      onClick={() => setOpenPlayer(open ? null : row.player)}>
                {open ? tt('review.hide', 'Hide squad') : tt('review.show', 'See squad')}
              </button>
            </div>

            {row.status === 'rejected' && row.review_note && (
              <p className={styles.note}>
                {tt('review.yourReason', 'You said: {note}').replace('{note}', row.review_note)}
              </p>
            )}

            {open && (
              <div className={styles.cards}>
                {eleven.length === 0 && (
                  <p className={styles.muted}>
                    {tt('review.emptySquad', 'Nothing picked yet.')}
                  </p>
                )}
                {eleven.map((slot) => (
                  <FutCard key={slot.slot_index} size="fit"
                           card={slot.card || slot} caption={slot.position} />
                ))}
              </div>
            )}

            {row.status === 'submitted' && (
              <div className={styles.decide}>
                <input className={styles.input}
                       value={notes[row.player] || ''}
                       maxLength={280}
                       placeholder={tt('review.notePlaceholder', 'Why, if you are sending it back')}
                       aria-label={tt('review.notePlaceholder', 'Why, if you are sending it back')}
                       onChange={(e) => setNotes({ ...notes, [row.player]: e.target.value })} />
                <button type="button" className={styles.accept}
                        disabled={Boolean(deciding)}
                        onClick={() => decide(row.player, 'accept')}>
                  {deciding === `${row.player}:accept`
                    ? tt('review.working', 'Working...')
                    : tt('review.accept', 'Accept')}
                </button>
                <button type="button" className={styles.reject}
                        disabled={Boolean(deciding)}
                        onClick={() => decide(row.player, 'reject')}>
                  {deciding === `${row.player}:reject`
                    ? tt('review.working', 'Working...')
                    : tt('review.reject', 'Send back')}
                </button>
              </div>
            )}

            {row.status === 'submitted' && !(notes[row.player] || '').trim() && (
              <p className={styles.smallHint}>
                {tt('review.rejectNeedsReason', 'Sending one back needs a reason. Accepting does not.')}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
