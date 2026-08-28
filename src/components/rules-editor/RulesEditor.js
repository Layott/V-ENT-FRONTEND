'use client';

// The organiser setting up their own rules.
//
// "users to be able to setup their own point systems, bracket, tie breakers and
// change and arrange as they want nothing rigid, all editable" - so every
// number here is a field, the tie-breakers are a list that can be reordered,
// and the placement table takes any positions and any values.
//
// Two things this deliberately does NOT do:
//
// 1. It does not hold its own copy of the format list, the tie-breaker list or
//    the placement presets. All three come from the server, from the same place
//    that validates what gets sent back. A frontend list that drifts from the
//    server's is how a form comes to say "must be an even number for single
//    elimination" while refusing an odd number for round robin.
// 2. It does not hide anything behind "advanced". An organiser who wants to pay
//    two points a kill should not have to go looking for it.

import { useCallback, useEffect, useState } from 'react';
import { LuArrowDown, LuArrowUp, LuPlus, LuRotateCcw, LuX } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './rules-editor.module.css';

const OUTCOMES = ['win', 'draw', 'loss'];

export default function RulesEditor({ tournamentId, token, onSaved, canEdit = true }) {
  const tt = useT();

  const [rules, setRules] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/${tournamentId}/rules/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRules(body.data.rules);
        setMeta(body.data);
      } else {
        setError(apiMessage(tt, body, 'api.rulesLoadFailed', 'Could not load the rules.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setRules(prev => ({ ...prev, [key]: value }));

  const setPoints = (outcome, value) => setRules(prev => ({
    ...prev,
    points: { ...(prev.points || {}), [outcome]: Number(value) || 0 },
  }));

  // The order IS the setting, so moving a row is the whole feature rather than
  // a nicety. Buttons rather than drag: this has to work on a phone, and a drag
  // handle on a 390px screen is a way to lose your place.
  const move = (index, by) => setRules(prev => {
    const list = [...(prev.tiebreakers || [])];
    const to = index + by;
    if (to < 0 || to >= list.length) return prev;
    [list[index], list[to]] = [list[to], list[index]];
    return { ...prev, tiebreakers: list };
  });

  const removeBreaker = key => setRules(prev => ({
    ...prev,
    tiebreakers: (prev.tiebreakers || []).filter(t => t !== key),
  }));

  const addBreaker = key => setRules(prev => (
    (prev.tiebreakers || []).includes(key)
      ? prev
      : { ...prev, tiebreakers: [...(prev.tiebreakers || []), key] }
  ));

  const setPlacement = (position, value) => setRules(prev => ({
    ...prev,
    placement_points: { ...(prev.placement_points || {}), [position]: Number(value) || 0 },
  }));

  const removePlacement = position => setRules(prev => {
    const next = { ...(prev.placement_points || {}) };
    delete next[position];
    return { ...prev, placement_points: next };
  });

  const addPlacement = () => setRules(prev => {
    const table = prev.placement_points || {};
    const next = Math.max(0, ...Object.keys(table).map(Number)) + 1;
    return { ...prev, placement_points: { ...table, [next]: 0 } };
  });

  const applyPlacementPreset = name => setRules(prev => ({
    ...prev,
    placement_points: { ...(meta?.placement_presets?.[name] || {}) },
  }));

  const save = async () => {
    setSaving(true);
    setNote('');
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/${tournamentId}/rules/set/`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rules }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRules(body.data.rules);
        setMeta(body.data);
        setNote(tt('rules.saved', 'Rules saved.'));
        if (onSaved) onSaved(body.data);
        return;
      }
      setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/${tournamentId}/rules/reset/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ format: rules?.format }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRules(body.data.rules);
        setMeta(body.data);
        setNote(tt('rules.reset', 'Put back to the standard rules for this format.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  if (!rules) return <p className={styles.state}>{error || tt('rules.none', 'No rules yet.')}</p>;

  const isBattleRoyale = Boolean(rules.placement_points);
  const chosen = rules.tiebreakers || [];
  const available = (meta?.available_tiebreakers || []).filter(t => !chosen.includes(t.key));
  const placementRows = Object.entries(rules.placement_points || {})
    .map(([position, points]) => [Number(position), points])
    .sort((a, b) => a[0] - b[0]);

  return (
    <div className={styles.editor}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{tt('rules.title', 'How this tournament is scored')}</h3>
          {meta?.format && <p className={styles.formatNote}>{meta.format.summary}</p>}
        </div>
        {canEdit && (
          <button type="button" className={styles.ghost} onClick={reset} disabled={saving}>
            <LuRotateCcw aria-hidden="true" /> {tt('rules.resetBtn', 'Standard rules')}
          </button>
        )}
      </div>

      {meta?.locked && (
        <p className={styles.locked}>
          {tt('rules.locked',
            'Matches have already been played under these rules, so they are fixed now. Changing the points after a result restates every standing without touching a single game.')}
        </p>
      )}

      {/* ------------------------------------------------------- points */}
      {!isBattleRoyale && (
        <section className={styles.block}>
          <h4 className={styles.blockTitle}>{tt('rules.points', 'Points')}</h4>
          <div className={styles.pointsRow}>
            {OUTCOMES.map(outcome => (
              <label key={outcome} className={styles.field}>
                <span className={styles.fieldLabel}>
                  {tt(`rules.points.${outcome}`,
                    outcome === 'win' ? 'For a win' : outcome === 'draw' ? 'For a draw' : 'For a loss')}
                </span>
                <input
                  type="number"
                  min="0"
                  className={styles.number}
                  value={rules.points?.[outcome] ?? 0}
                  disabled={!canEdit || meta?.locked}
                  onChange={e => setPoints(outcome, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------- the placement table */}
      {isBattleRoyale && (
        <section className={styles.block}>
          <h4 className={styles.blockTitle}>{tt('rules.placement', 'Points for where you finish')}</h4>
          <p className={styles.hint}>
            {tt('rules.placementHint',
              'Any positions, any values. A position not listed here scores nothing but the kills.')}
          </p>

          <div className={styles.presetRow}>
            {Object.keys(meta?.placement_presets || {}).map(name => (
              <button key={name} type="button" className={styles.chip}
                      disabled={!canEdit || meta?.locked} onClick={() => applyPlacementPreset(name)}>
                {tt(`rules.preset.${name}`, name.replace(/_/g, ' '))}
              </button>
            ))}
          </div>

          <div className={styles.placementGrid}>
            {placementRows.map(([position, points]) => (
              <div key={position} className={styles.placementRow}>
                <span className={styles.position}>
                  {tt('rules.position', 'Position {n}').replace('{n}', position)}
                </span>
                <input
                  type="number"
                  min="0"
                  className={styles.number}
                  value={points}
                  disabled={!canEdit || meta?.locked}
                  onChange={e => setPlacement(position, e.target.value)}
                />
                {canEdit && !meta?.locked && (
                  <button type="button" className={styles.iconBtn}
                          aria-label={tt('rules.removePosition', 'Remove this position')}
                          onClick={() => removePlacement(position)}>
                    <LuX aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && !meta?.locked && (
            <button type="button" className={styles.ghost} onClick={addPlacement}>
              <LuPlus aria-hidden="true" /> {tt('rules.addPosition', 'Add a position')}
            </button>
          )}

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{tt('rules.perKill', 'For each kill')}</span>
            <input
              type="number"
              min="0"
              className={styles.number}
              value={rules.points_per_kill ?? 1}
              disabled={!canEdit || meta?.locked}
              onChange={e => set('points_per_kill', Number(e.target.value) || 0)}
            />
          </label>
        </section>
      )}

      {/* --------------------------------------------------- tie-breakers */}
      <section className={styles.block}>
        <h4 className={styles.blockTitle}>{tt('rules.tiebreakers', 'When two are level')}</h4>
        <p className={styles.hint}>
          {tt('rules.tiebreakersHint',
            'Applied from the top down. The first one that separates them decides, and the standings will say which one it was.')}
        </p>

        <ol className={styles.breakerList}>
          {chosen.map((key, index) => {
            const fallback = (meta?.available_tiebreakers || []).find(t => t.key === key)?.label || key;
            const label = tt(`tiebreak.${key}`, fallback);
            return (
              <li key={key} className={styles.breaker}>
                <span className={styles.breakerOrder}>{index + 1}</span>
                <span className={styles.breakerLabel}>{label}</span>
                {canEdit && !meta?.locked && (
                  <span className={styles.breakerActions}>
                    <button type="button" className={styles.iconBtn} disabled={index === 0}
                            aria-label={tt('rules.moveUp', 'Move up')}
                            onClick={() => move(index, -1)}>
                      <LuArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconBtn}
                            disabled={index === chosen.length - 1}
                            aria-label={tt('rules.moveDown', 'Move down')}
                            onClick={() => move(index, 1)}>
                      <LuArrowDown aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconBtn}
                            aria-label={tt('rules.removeBreaker', 'Remove')}
                            onClick={() => removeBreaker(key)}>
                      <LuX aria-hidden="true" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {canEdit && !meta?.locked && available.length > 0 && (
          <div className={styles.presetRow}>
            {available.map(t => (
              <button key={t.key} type="button" className={styles.chip}
                      onClick={() => addBreaker(t.key)}>
                <LuPlus aria-hidden="true" /> {tt(`tiebreak.${t.key}`, t.label)}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <p className={styles.error}>{error}</p>}
      {note && <p className={styles.note}>{note}</p>}

      {canEdit && (
        <button type="button" className={styles.save} onClick={save} disabled={saving || meta?.locked}>
          {saving ? tt('rules.saving', 'Saving…') : tt('rules.save', 'Save these rules')}
        </button>
      )}
    </div>
  );
}
