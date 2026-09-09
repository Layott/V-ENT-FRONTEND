'use client';

// How a tournament is shaped, and moving it from one stage to the next.
//
// The backend has composed tournaments out of stages since the catalogue
// learned `can_feed_into`, and nothing in the app ever read it. So every
// tournament here was one format from start to finish, and anybody running
// groups into a playoff made two tournaments and copied the names across.
//
// Three things on this panel, and they are deliberately different weights:
//
//  * READING the plan is public, because the shape of an event is the first
//    thing somebody deciding whether to enter wants to know.
//  * COMPOSING it belongs to the organiser, and only while nothing has been
//    played. Re-planning around a finished group stage would change what that
//    stage was.
//  * ADVANCING is a decision, never something that happens on its own. It
//    names who goes through before it is pressed, because a playoff of the
//    wrong size is not visible until somebody is missing from it.

import { useCallback, useEffect, useState } from 'react';
import { LuArrowDown, LuArrowUp, LuPlus, LuX } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { formatLabel } from '@/lib/formatLabel';
import { useT } from '@/i18n/LanguageProvider';
import styles from './stages-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function StagesPanel({ tournamentRef, token, canManage = false, showToast }) {
  const tt = useT();

  const [rows, setRows] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  // The plan being edited, held apart from what is saved so leaving the panel
  // without pressing Save changes nothing.
  const [draft, setDraft] = useState(null);
  // The stage waiting to be closed, and who the standings say goes through.
  const [closing, setClosing] = useState(null);

  const load = useCallback(async () => {
    if (!tournamentRef) { setLoading(false); return; }
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.stages || []);
        setCatalogue(body.data.catalogue || []);
      } else {
        setProblem(apiMessage(tt, body, 'stages.loadFailed',
          'Could not load how this tournament is shaped.'));
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // One sentence per stage, built here rather than taken from the server's
  // `summary`, which is written in English inside Python and cannot be
  // translated.
  const sentence = (row, index, list) => {
    const name = formatLabel(tt, row.format, row.format_label);
    const last = index === list.length - 1;
    if (last) {
      return tt('stages.lineLast', '{format}. This decides the tournament.')
        .replace('{format}', name);
    }
    if (row.groups > 1) {
      return tt('stages.lineGroups', '{format} in {groups} groups. The top {n} of each group go through.')
        .replace('{format}', name)
        .replace('{groups}', row.groups)
        .replace('{n}', row.advances);
    }
    return tt('stages.line', '{format} in one field. The top {n} go through.')
      .replace('{format}', name)
      .replace('{n}', row.advances);
  };

  const startEditing = () => setDraft(
    rows.length
      ? rows.map(r => ({ format: r.format, label: r.label,
                         advances: r.advances, groups: r.groups }))
      : [{ format: 'round_robin', label: '', advances: 4, groups: 0 },
         { format: 'single_elimination', label: '', advances: 0, groups: 0 }]);

  const setField = (index, key, value) => setDraft(prev => prev.map(
    (row, i) => (i === index ? { ...row, [key]: value } : row)));

  const move = (index, by) => setDraft(prev => {
    const next = [...prev];
    const to = index + by;
    if (to < 0 || to >= next.length) return prev;
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });

  const addRow = () => setDraft(prev => [
    ...prev, { format: 'single_elimination', label: '', advances: 0, groups: 0 }]);

  const removeRow = index => setDraft(prev => prev.filter((_, i) => i !== index));

  const savePlan = async () => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/set/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json',
                   Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({
          stages: draft.map(r => ({
            format: r.format,
            label: r.label || '',
            advances: Number(r.advances) || 0,
            groups: Number(r.groups) || 0,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.stages || []);
        setDraft(null);
        if (showToast) showToast(tt('stages.saved', 'The plan is saved.'));
        return;
      }
      // The server says WHICH row is wrong, so say so rather than refusing the
      // whole plan without pointing at anything.
      const where = Number.isInteger(body.stage_index)
        ? ` ${tt('stages.atStage', '(stage {n})').replace('{n}', body.stage_index + 1)}`
        : '';
      setProblem(apiMessage(tt, body, 'stages.saveFailed',
        'That plan was not saved.') + where);
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Closing a stage. The standings decide who goes through, so they are read
  // first and shown by name: an organiser pressing this is committing to a
  // list of people, and should see the list.
  const prepareClose = async row => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/standings/`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setProblem(apiMessage(tt, body, 'stages.standingsFailed',
          'Could not read the standings this stage finished on.'));
        return;
      }
      const table = body.data.team_table || body.data.player_table || [];
      if (!table.length) {
        setProblem(tt('stages.noStandings',
          'Nothing has been played in this stage yet, so there is no table to advance from.'));
        return;
      }
      const perGroup = row.groups > 1;
      const through = perGroup
        ? Object.values(table.reduce((acc, entry) => {
            const key = entry.group || 0;
            (acc[key] = acc[key] || []).push(entry);
            return acc;
          }, {})).flatMap(list => list.slice(0, row.advances))
        : table.slice(0, row.advances);
      setClosing({ row, table, through });
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmClose = async (ignoreDisputes = false) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/stages/${closing.row.id}/advance/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     Authorization: `Bearer ${token || ''}` },
          body: JSON.stringify({
            standings: closing.table,
            ...(ignoreDisputes ? { ignore_disputes: true } : {}),
          }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setClosing(null);
        await load();
        if (showToast) {
          showToast(tt('stages.advanced', '{n} go through to {next}.')
            .replace('{n}', (body.data.advanced || []).length)
            .replace('{next}', body.data.next?.label || ''));
        }
        return;
      }
      if (body.code === 'DISPUTES_OPEN') {
        setClosing(prev => ({ ...prev, disputes: true }));
        setProblem(tt('stages.disputesOpen',
          'Results on this tournament are still being disputed. Settle them first, or advance anyway and the disputes stay open.'));
        return;
      }
      setProblem(apiMessage(tt, body, 'stages.advanceFailed',
        'That stage was not closed.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const nameOf = entry => entry?.name || entry?.team || entry?.team_name
    || entry?.player || entry?.username || '';

  if (loading) return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;

  const planLocked = rows.some(r => r.status !== 'pending');

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{tt('stages.title', 'How this tournament is shaped')}</h3>
          <p className={styles.hint}>
            {tt('stages.hint',
              'A real event is rarely one format. Groups into a playoff, Swiss into a top cut, lobbies into a final: set the stages here and close each one when its last result is in.')}
          </p>
        </div>
        {canManage && !draft && !planLocked && (
          <button type="button" className={styles.ghost} onClick={startEditing}>
            {rows.length
              ? tt('stages.edit', 'Change the plan')
              : tt('stages.compose', 'Run this in stages')}
          </button>
        )}
      </div>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {/* ------------------------------------------------------ the plan */}
      {!draft && rows.length === 0 && (
        <p className={styles.empty}>
          {tt('stages.none',
            'This tournament runs as one format from start to finish, which is how most of them run.')}
        </p>
      )}

      {!draft && rows.length > 0 && (
        <ol className={styles.list}>
          {rows.map((row, index) => (
            <li key={row.id} className={styles.stage}>
              <span className={styles.order}>{index + 1}</span>
              <div className={styles.stageText}>
                <span className={styles.stageName}>{row.label}</span>
                <span className={styles.stageLine}>{sentence(row, index, rows)}</span>
                {row.status === 'complete' && (
                  <span className={styles.done}>
                    {tt('stages.complete', 'Closed. {n} went through.')
                      .replace('{n}', (row.advanced || []).length)}
                  </span>
                )}
                {row.status === 'running' && (
                  <span className={styles.running}>{tt('stages.running', 'Being played now')}</span>
                )}
              </div>

              {canManage && row.status !== 'complete' && index < rows.length - 1 && (
                <button type="button" className={styles.close} disabled={busy}
                        onClick={() => prepareClose(row)}>
                  {tt('stages.closeStage', 'Close this stage')}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {!draft && planLocked && canManage && (
        <p className={styles.hint}>
          {tt('stages.lockedNote',
            'A stage has been played, so the plan is fixed now. Changing it would restate what a finished stage was.')}
        </p>
      )}

      {/* -------------------------------------------------- the composer */}
      {draft && (
        <div className={styles.editor}>
          {draft.map((row, index) => (
            <div key={index} className={styles.row}>
              <div className={styles.rowTop}>
                <span className={styles.order}>{index + 1}</span>
                <input className={styles.text} value={row.label} disabled={busy}
                       placeholder={tt('stages.labelPlaceholder', 'Name this stage')}
                       onChange={e => setField(index, 'label', e.target.value)} />
                <span className={styles.rowActions}>
                  <button type="button" className={styles.iconBtn} disabled={index === 0 || busy}
                          aria-label={tt('rules.moveUp', 'Move up')}
                          onClick={() => move(index, -1)}>
                    <LuArrowUp aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.iconBtn} disabled={busy
                            || index === draft.length - 1}
                          aria-label={tt('rules.moveDown', 'Move down')}
                          onClick={() => move(index, 1)}>
                    <LuArrowDown aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.iconBtn} disabled={busy
                            || draft.length < 2}
                          aria-label={tt('stages.removeStage', 'Remove this stage')}
                          onClick={() => removeRow(index)}>
                    <LuX aria-hidden="true" />
                  </button>
                </span>
              </div>

              <div className={styles.fields}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{tt('stages.format', 'Played as')}</span>
                  <select className={styles.select} value={row.format} disabled={busy}
                          onChange={e => setField(index, 'format', e.target.value)}>
                    {catalogue.map(f => (
                      <option key={f.key} value={f.key}>
                        {formatLabel(tt, f.key, f.label)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{tt('stages.groups', 'Groups')}</span>
                  <input className={styles.number} type="number" min="0" max="64"
                         value={row.groups} disabled={busy}
                         onChange={e => setField(index, 'groups', e.target.value)} />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {index === draft.length - 1
                      ? tt('stages.advancesLast', 'Nobody advances')
                      : (Number(row.groups) > 1
                        ? tt('stages.advancesEach', 'Through, per group')
                        : tt('stages.advances', 'How many go through'))}
                  </span>
                  <input className={styles.number} type="number" min="0"
                         value={index === draft.length - 1 ? 0 : row.advances}
                         disabled={busy || index === draft.length - 1}
                         onChange={e => setField(index, 'advances', e.target.value)} />
                </label>
              </div>
            </div>
          ))}

          <div className={styles.editorActions}>
            <button type="button" className={styles.ghost} onClick={addRow} disabled={busy}>
              <LuPlus aria-hidden="true" /> {tt('stages.addStage', 'Add a stage')}
            </button>
            <button type="button" className={styles.save} onClick={savePlan} disabled={busy}>
              {busy ? tt('stages.saving', 'Saving…') : tt('stages.savePlan', 'Save the plan')}
            </button>
            <button type="button" className={styles.quiet} onClick={() => setDraft(null)}
                    disabled={busy}>
              {tt('ui.cancel.0f8e', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------- confirming who goes through */}
      {closing && (
        <div className={styles.confirm}>
          <p className={styles.confirmTitle}>
            {tt('stages.confirmTitle', 'Closing {stage}')
              .replace('{stage}', closing.row.label)}
          </p>
          <p className={styles.hint}>
            {tt('stages.confirmHint',
              'These are the ones the table has going through, in this order. Nothing here can be undone from this screen.')}
          </p>
          <ol className={styles.through}>
            {closing.through.map((entry, i) => (
              <li key={`${nameOf(entry)}-${i}`} className={styles.throughRow}>
                <span className={styles.order}>{i + 1}</span>
                <span>{nameOf(entry)}</span>
              </li>
            ))}
          </ol>
          <div className={styles.editorActions}>
            <button type="button" className={styles.save} disabled={busy}
                    onClick={() => confirmClose(Boolean(closing.disputes))}>
              {closing.disputes
                ? tt('stages.advanceAnyway', 'Advance anyway')
                : tt('stages.advanceNow', 'Send these through')}
            </button>
            <button type="button" className={styles.quiet} disabled={busy}
                    onClick={() => { setClosing(null); setProblem(''); }}>
              {tt('ui.cancel.0f8e', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
