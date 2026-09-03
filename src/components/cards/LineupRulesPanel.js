'use client';

// When lineups open and close, set by the organiser.
//
// CEO, 3 September 2026: "The submission time should be a feature and something
// the tournament organizers should be able to set."
//
// Two shapes, because a league and a one-off tournament are different things: a
// single moment, or the same time every week. ESOCCER hardcoded Thursday 10:00
// WAT, which is CADE's rule rather than a law, so both are settings here and a
// tournament that sets neither simply never locks.
//
// The two switches at the bottom are the organiser's hand on the clock, and
// they beat it in both directions. A deadline that cannot be lifted is one that
// ruins an event the night somebody's power goes out.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './lineup-rules.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const DAYS = [
  ['0', 'rules.mon', 'Monday'], ['1', 'rules.tue', 'Tuesday'],
  ['2', 'rules.wed', 'Wednesday'], ['3', 'rules.thu', 'Thursday'],
  ['4', 'rules.fri', 'Friday'], ['5', 'rules.sat', 'Saturday'],
  ['6', 'rules.sun', 'Sunday'],
];

/** A datetime the browser's own input understands, from what the API sends. */
function forInput(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

export default function LineupRulesPanel({ tournamentRef, token, showToast }) {
  const tt = useT();
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    if (!tournamentRef) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/lineup-rules/`);
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        const found = body.data.rules || {};
        setRules(found);
        setDraft({
          enabled: Boolean(found.enabled),
          opens_at: forInput(found.opens_at),
          closes_at: forInput(found.closes_at),
          weekly_day: found.weekly_day === null || found.weekly_day === undefined
            ? '' : String(found.weekly_day),
          weekly_time: (found.weekly_time || '').slice(0, 5),
          changes_open_at: forInput(found.changes_open_at),
          changes_close_at: forInput(found.changes_close_at),
          locked_by_hand: Boolean(found.locked_by_hand),
          reopened_by_hand: Boolean(found.reopened_by_hand),
        });
        setError('');
      } else {
        setError(apiMessage(tt, body, 'rules.loadFailed', 'Could not load the deadline.'));
      }
    } catch (err) {
      setError(apiMessage(tt, err, 'rules.loadFailed', 'Could not load the deadline.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async (extra) => {
    setSaving(true);
    setError('');
    try {
      const body = {
        enabled: draft.enabled,
        opens_at: draft.opens_at || null,
        closes_at: draft.closes_at || null,
        weekly_day: draft.weekly_day === '' ? null : Number(draft.weekly_day),
        weekly_time: draft.weekly_time ? `${draft.weekly_time}:00` : null,
        changes_open_at: draft.changes_open_at || null,
        changes_close_at: draft.changes_close_at || null,
        locked_by_hand: draft.locked_by_hand,
        reopened_by_hand: draft.reopened_by_hand,
        ...(extra || {}),
      };
      const res = await fetch(`${API}/tournament/${tournamentRef}/lineup-rules/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const reply = await res.json().catch(() => ({}));
      if (reply?.status !== 'success') {
        setError(apiMessage(tt, reply, 'rules.saveFailed', 'That was not saved.'));
        return;
      }
      showToast?.(tt('rules.saved', 'Saved.'));
      await load();
    } catch (err) {
      setError(apiMessage(tt, err, 'rules.saveFailed', 'That was not saved.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.muted}>{tt('rules.loading', 'Loading...')}</p>;

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('rules.title', 'When lineups close')}</h3>
      <p className={styles.hint}>
        {tt('rules.hint', 'Set one closing time, or the same time every week for a league. Leave both empty and lineups never close. Everybody can see this before it passes.')}
      </p>

      {rules?.state && (
        <p className={styles.state}>
          {tt('rules.rightNow', 'Right now: {state}').replace('{state}',
            tt(`rules.state.${rules.state}`, rules.state))}
        </p>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      <label className={styles.toggle}>
        <input type="checkbox" checked={Boolean(draft.enabled)}
               onChange={(e) => set('enabled', e.target.checked)} />
        <span>{tt('rules.enabled', 'Use lineups in this tournament')}</span>
      </label>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('rules.opensAt', 'Opens')}</span>
          <input className={styles.input} type="datetime-local" value={draft.opens_at || ''}
                 onChange={(e) => set('opens_at', e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('rules.closesAt', 'Closes')}</span>
          <input className={styles.input} type="datetime-local" value={draft.closes_at || ''}
                 onChange={(e) => set('closes_at', e.target.value)} />
        </label>
      </div>

      <h4 className={styles.subTitle}>{tt('rules.weekly', 'Or the same time every week')}</h4>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('rules.day', 'Day')}</span>
          <select className={styles.input} value={draft.weekly_day || ''}
                  onChange={(e) => set('weekly_day', e.target.value)}>
            <option value="">{tt('rules.noDay', 'No weekly deadline')}</option>
            {DAYS.map(([value, key, fallback]) => (
              <option key={value} value={value}>{tt(key, fallback)}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('rules.time', 'Time')}</span>
          <input className={styles.input} type="time" value={draft.weekly_time || ''}
                 onChange={(e) => set('weekly_time', e.target.value)} />
        </label>
      </div>

      <h4 className={styles.subTitle}>{tt('rules.changeWindow', 'A change window afterwards')}</h4>
      <p className={styles.hint}>
        {tt('rules.changeHint', 'Optional. A period after the deadline in which a limited change is allowed. Leave empty for none.')}
      </p>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('rules.changesOpen', 'Opens')}</span>
          <input className={styles.input} type="datetime-local"
                 value={draft.changes_open_at || ''}
                 onChange={(e) => set('changes_open_at', e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('rules.changesClose', 'Closes')}</span>
          <input className={styles.input} type="datetime-local"
                 value={draft.changes_close_at || ''}
                 onChange={(e) => set('changes_close_at', e.target.value)} />
        </label>
      </div>

      <div className={styles.row}>
        <button type="button" className={styles.primary} disabled={saving}
                onClick={() => save()}>
          {saving ? tt('rules.saving', 'Saving...') : tt('rules.save', 'Save the deadline')}
        </button>
        {/* The hand on the clock. Two buttons rather than a switch, because
            each is a decision somebody makes once and wants to be sure of. */}
        <button type="button" className={styles.secondary} disabled={saving}
                onClick={() => save({ locked_by_hand: true, reopened_by_hand: false })}>
          {tt('rules.lockNow', 'Lock lineups now')}
        </button>
        <button type="button" className={styles.secondary} disabled={saving}
                onClick={() => save({ reopened_by_hand: true, locked_by_hand: false })}>
          {tt('rules.reopen', 'Reopen lineups')}
        </button>
        <button type="button" className={styles.ghost} disabled={saving}
                onClick={() => save({ locked_by_hand: false, reopened_by_hand: false })}>
          {tt('rules.backToClock', 'Back to the clock')}
        </button>
      </div>
    </section>
  );
}
