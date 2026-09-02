'use client';

// How this league is worked out, and corrections to it.
//
// CEO: "AN ORGANIZER SHOULD HAVE A CHOICE TO DECIDE HOW SOME METRICS ARE
// CALCULATED, THE ONES THAT COULD HAVE SEVERAL WAYS IN WHICH IT COULD BE
// CALCULATED."
//
// The list is not written here. It comes from the API with a label and a
// sentence on what each one changes, so this screen cannot drift from what the
// server accepts - which is how a settings page ends up offering something
// that is refused on save, or hiding something that works.
//
// Only the questions with more than one defensible answer appear. A metric
// with one correct definition is not a setting, and a settings screen full of
// non-choices is one where the real choices stop being read.

import { useCallback, useEffect, useState } from 'react';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './league-scoring.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// What an organiser may add or take away, matching the server's list.
const METRICS = [
  ['PTS', 'scoring.metricPts', 'Points'],
  ['W', 'scoring.metricW', 'Wins'],
  ['D', 'scoring.metricD', 'Draws'],
  ['L', 'scoring.metricL', 'Losses'],
  ['GF', 'scoring.metricGf', 'Goals for'],
  ['GA', 'scoring.metricGa', 'Goals against'],
  ['GD', 'scoring.metricGd', 'Goal difference'],
  ['MP', 'scoring.metricMp', 'Matches played'],
];

export default function LeagueScoring({ tournamentId, token, entrants = [] }) {
  const tt = useT();
  const [choices, setChoices] = useState([]);
  const [settings, setSettings] = useState({});
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState(false);

  const [draft, setDraft] = useState({ player: '', metric: 'PTS', value: '', reason: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!tournamentId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/stat-settings/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setChoices(body.data.choices || []);
        setSettings(body.data.settings || {});
      } else {
        setProblem(apiMessage(tt, body, 'scoring.loadFailed',
          'Could not load how this league is scored.'));
      }
    } catch {
      setProblem(tt('api.networkError', 'Could not reach the server.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, tt]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch) => {
    if (saving) return;
    setSaving(true);
    setProblem('');
    setSaved(false);
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/stat-settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        // Named, never silently defaulted: the server refuses a value it does
        // not recognise rather than substituting one, so the organiser learns
        // their league is not running the way they just asked.
        setProblem(apiMessage(tt, body, 'scoring.saveFailed', 'That could not be saved.'));
        return;
      }
      setSettings(body.data.settings || {});
      setSaved(true);
    } catch {
      setProblem(tt('api.networkError', 'Could not reach the server.'));
    } finally {
      setSaving(false);
    }
  };

  const addAdjustment = async () => {
    if (adding) return;
    setAdding(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/league-adjustment/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({
          player: draft.player.trim(),
          metric: draft.metric,
          value: Number(draft.value),
          reason: draft.reason.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setProblem(apiMessage(tt, body, 'scoring.adjustFailed',
          'That adjustment was not recorded.'));
        return;
      }
      setAdjustments(body.data.adjustments || []);
      setDraft({ player: '', metric: 'PTS', value: '', reason: '' });
    } catch {
      setProblem(tt('api.networkError', 'Could not reach the server.'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>;

  return (
    <div className={styles.wrap}>
      <section className={styles.block}>
        <p className={styles.title}>{tt('scoring.title', 'How this league is worked out')}</p>
        <p className={styles.hint}>
          {tt('scoring.hint', 'Only the things that have more than one fair answer. Everything else has one definition and is not a setting.')}
        </p>

        <div className={styles.rows}>
          {choices.map(choice => (
            <div key={choice.key} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowLabel}>{choice.label}</span>
                {choice.detail && <span className={styles.rowDetail}>{choice.detail}</span>}
              </div>

              {choice.type === 'boolean' && (
                <label className={styles.switch}>
                  <input type="checkbox" checked={!!settings[choice.key]}
                         onChange={e => save({ [choice.key]: e.target.checked })} />
                  <span>{settings[choice.key]
                    ? tt('ui.yes', 'Yes') : tt('ui.no', 'No')}</span>
                </label>
              )}

              {choice.type === 'choice' && (
                <select className={styles.input} value={settings[choice.key] || ''}
                        onChange={e => save({ [choice.key]: e.target.value })}>
                  {(choice.options || []).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}

              {choice.type === 'number' && (
                <input className={styles.input} type="number" min="0"
                       defaultValue={settings[choice.key] ?? ''}
                       onBlur={e => {
                         const next = Number(e.target.value);
                         if (Number.isFinite(next) && next !== settings[choice.key]) {
                           save({ [choice.key]: next });
                         }
                       }} />
              )}
            </div>
          ))}
        </div>

        {problem && <p className={styles.problem} role="alert">{problem}</p>}
        {saved && !problem && <p className={styles.saved}>{tt('ui.saved', 'Saved')}</p>}
      </section>

      <section className={styles.block}>
        <p className={styles.title}>{tt('scoring.adjustTitle', 'Add or take away')}</p>
        <p className={styles.hint}>
          {tt('scoring.adjustHint', 'A deduction is a decision you will be asked about weeks later, so the reason is kept with it and shown on the table.')}
        </p>

        <div className={styles.adjustRow}>
          <input className={styles.input} list="league-entrants"
                 placeholder={tt('scoring.who', 'Who')}
                 value={draft.player}
                 onChange={e => setDraft(d => ({ ...d, player: e.target.value }))} />
          <datalist id="league-entrants">
            {entrants.map(name => <option key={name} value={name} />)}
          </datalist>

          <select className={styles.input} value={draft.metric}
                  onChange={e => setDraft(d => ({ ...d, metric: e.target.value }))}>
            {METRICS.map(([value, key, fallback]) => (
              <option key={value} value={value}>{tt(key, fallback)}</option>
            ))}
          </select>

          <input className={styles.input} type="number"
                 placeholder={tt('scoring.howMuch', 'How much, minus to deduct')}
                 value={draft.value}
                 onChange={e => setDraft(d => ({ ...d, value: e.target.value }))} />
        </div>

        <input className={styles.input}
               placeholder={tt('scoring.reason', 'Why. This is shown on the table.')}
               value={draft.reason}
               onChange={e => setDraft(d => ({ ...d, reason: e.target.value }))} />

        <button type="button" className={`${styles.primary} goldBTN`}
                disabled={adding || !draft.player.trim() || !draft.reason.trim()
                          || !draft.value}
                onClick={addAdjustment}>
          {adding ? tt('ui.saving', 'Saving...') : tt('scoring.record', 'Record it')}
        </button>

        {!!adjustments.length && <div className={styles.made}>
          {adjustments.map((a, i) => (
            <p key={i} className={styles.madeRow}>
              <strong>{a.player}</strong> {a.metric}{' '}
              {a.value > 0 ? `+${a.value}` : a.value} - {a.reason}
            </p>
          ))}
        </div>}
      </section>
    </div>
  );
}
