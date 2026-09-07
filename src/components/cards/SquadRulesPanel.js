'use client';

// What a squad has to satisfy before a player may submit it.
//
// CEO, 3 September 2026: "also a place for admins to set rules for the squads
// that the players are submitting to use if not they wont be able to submit."
//
// The backend has enforced that since the day it was written, and it means
// exactly what it says: with NO rules row a player cannot submit at all, and is
// told the organiser has not set them yet. There was no screen to set them, so
// on every tournament on the platform that path ended in a refusal nobody could
// clear. `tournament/<id>/squad-rules/` was one of the endpoints the caller
// checker named as having nothing able to reach it.
//
// This is separate from `LineupRulesPanel`, which is the CLOCK: when lineups
// open and close. This is the CONSTRAINTS: what may be in the eleven. Two
// different things that both happen to be called rules.
//
// The shape is CADE's, because it is the one that has actually run a season: a
// budget, a minimum number from one nation, banned item types, and a ceiling on
// any single card. Each is optional on its own, so an organiser who only cares
// about the budget sets only that.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import styles from './lineup-rules.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// Futbin's own vocabulary, because the cards carry these words and an organiser
// matching them by eye is the only way this is usable.
const ITEM_TYPES = [
  ['icon', 'squad.type.icon', 'Icons'],
  ['hero', 'squad.type.hero', 'Heroes'],
  ['totw', 'squad.type.totw', 'Team of the Week'],
  ['tots', 'squad.type.tots', 'Team of the Season'],
  ['toty', 'squad.type.toty', 'Team of the Year'],
  ['promo', 'squad.type.promo', 'Promo cards'],
];

export default function SquadRulesPanel({ tournamentRef, token, showToast }) {
  const tt = useT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({
    max_budget_coins: '',
    required_nation: '',
    min_from_nation: '',
    max_card_rating: '',
    banned_item_types: [],
    notes: '',
  });
  // Whether a rules row exists at all, which is what decides whether anybody
  // can submit. Null while unknown, so the warning below never flashes on load.
  const [exists, setExists] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentRef) { setLoading(false); return; }
    try {
      // Public on GET deliberately: a rule nobody can read until they are
      // refused is not a rule, it is a trap.
      const res = await fetch(`${API}/tournament/${tournamentRef}/squad-rules/`);
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        const found = body.data.squad_rules;
        setExists(Boolean(found));
        if (found) {
          setDraft({
            max_budget_coins: found.max_budget_coins ?? '',
            required_nation: found.required_nation || '',
            min_from_nation: found.min_from_nation ?? '',
            max_card_rating: found.max_card_rating ?? '',
            banned_item_types: found.banned_item_types || [],
            notes: found.notes || '',
          });
        }
        setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'squad.loadFailed', 'Could not load the squad rules.'));
      }
    } catch (err) {
      if (!quiet) {
        setError(apiMessage(tt, err, 'squad.loadFailed', 'Could not load the squad rules.'));
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [tournamentRef, tt]);

  useAutoRefresh(() => load({ quiet: true }), [], { interval: 30000 });

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleType = (value) => setDraft((d) => ({
    ...d,
    banned_item_types: d.banned_item_types.includes(value)
      ? d.banned_item_types.filter((t) => t !== value)
      : [...d.banned_item_types, value],
  }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/squad-rules/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_budget_coins: draft.max_budget_coins === '' ? 0 : draft.max_budget_coins,
          required_nation: draft.required_nation,
          min_from_nation: draft.min_from_nation === '' ? 0 : draft.min_from_nation,
          // The one field the server distinguishes empty from zero on: no
          // ceiling at all is null, not 0, because 0 would ban every card.
          max_card_rating: draft.max_card_rating === '' ? '' : draft.max_card_rating,
          banned_item_types: draft.banned_item_types,
          notes: draft.notes,
        }),
      });
      const reply = await res.json().catch(() => ({}));
      if (reply?.status !== 'success') {
        setError(apiMessage(tt, reply, 'squad.saveFailed', 'That was not saved.'));
        return;
      }
      showToast?.(tt('squad.saved', 'Squad rules saved.'));
      setExists(true);
      await load({ quiet: true });
    } catch (err) {
      setError(apiMessage(tt, err, 'squad.saveFailed', 'That was not saved.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.muted}>{tt('squad.loading', 'Loading...')}</p>;

  const budget = Number(draft.max_budget_coins || 0);

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('squad.title', 'What a squad must satisfy')}</h3>
      <p className={styles.hint}>
        {tt('squad.hint', 'Players build to these and cannot submit an eleven that breaks one. Leave a field empty to set no limit of that kind.')}
      </p>

      {exists === false && (
        <p className={styles.state} role="status">
          {tt('squad.none', 'No squad rules are set yet, and until they are nobody can submit a squad for this tournament. Save once below, even with every field empty, to open submissions.')}
        </p>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('squad.budget', 'Total budget, in coins')}</span>
          <input className={styles.input} type="number" min="0" inputMode="numeric"
                 value={draft.max_budget_coins}
                 placeholder={tt('squad.noCap', 'No cap')}
                 onChange={(e) => set('max_budget_coins', e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('squad.maxRating', 'Highest rating any one card may be')}</span>
          <input className={styles.input} type="number" min="0" max="99" inputMode="numeric"
                 value={draft.max_card_rating}
                 placeholder={tt('squad.noCap', 'No cap')}
                 onChange={(e) => set('max_card_rating', e.target.value)} />
        </label>
      </div>

      {budget > 0 && (
        <p className={styles.hint}>
          {tt('squad.budgetReads', 'The eleven must cost {n} coins or less.')
            .replace('{n}', formatNumber(budget))}
        </p>
      )}

      <h4 className={styles.subTitle}>{tt('squad.nation', 'A minimum from one nation')}</h4>
      <p className={styles.hint}>
        {tt('squad.nationHint', 'Write the nation exactly as the cards spell it, because that is what is compared. Leave it empty for no requirement.')}
      </p>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('squad.nationName', 'Nation')}</span>
          <input className={styles.input} type="text" maxLength={120}
                 value={draft.required_nation}
                 placeholder={tt('squad.nationEg', 'Nigeria')}
                 onChange={(e) => set('required_nation', e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('squad.nationCount', 'How many, at least')}</span>
          <input className={styles.input} type="number" min="0" max="11" inputMode="numeric"
                 value={draft.min_from_nation}
                 onChange={(e) => set('min_from_nation', e.target.value)} />
        </label>
      </div>

      <h4 className={styles.subTitle}>{tt('squad.banned', 'Card types that may not be used')}</h4>
      <div className={styles.formations}>
        {ITEM_TYPES.map(([value, key, fallback]) => {
          const on = draft.banned_item_types.includes(value);
          return (
            <button key={value} type="button"
                    className={on ? styles.chipOn : styles.chip}
                    aria-pressed={on}
                    onClick={() => toggleType(value)}>
              {tt(key, fallback)}
            </button>
          );
        })}
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{tt('squad.notes', 'Anything else players should know')}</span>
        <input className={styles.input} type="text" maxLength={280}
               value={draft.notes}
               placeholder={tt('squad.notesEg', 'One change allowed after the deadline.')}
               onChange={(e) => set('notes', e.target.value)} />
      </label>

      <div className={styles.footer}>
        <button type="button" className={styles.save} onClick={save} disabled={saving}>
          {saving ? tt('squad.saving', 'Saving...') : tt('squad.save', 'Save squad rules')}
        </button>
      </div>
    </section>
  );
}
