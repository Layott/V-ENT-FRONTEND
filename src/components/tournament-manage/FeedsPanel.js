'use client';

/**
 * Places taken from another tournament the organiser runs (P2, design
 * section 7). CEO, 16 October 2026 (inbox 470): brackets connect across
 * tournaments and events, "so far they have access to those events".
 *
 * Shown inside the stage plan of the tournament that receives the places:
 * the feeds that come in, what each has sent, and a form to add one. The
 * server checks everything (both tournaments yours, same game, room, no
 * circle); a refusal comes back as a code this screen translates.
 *
 * A feed may also come from a circuit's ranking (P5c, design section 13):
 * the top of a season's table into its finals. A ranking never closes by
 * itself, so that kind waits for the organiser here to press Send now.
 */
import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { feedSentence } from '@/lib/feedWords';
import styles from './stages-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const groupLetter = n => String.fromCharCode(64 + Number(n || 1));

const blank = () => ({ kind: 'tournament', source: '', sourceStage: '', circuit: '', placeFrom: 1,
                       placeTo: 2, group: '', targetStage: '', fire: 'after_preview', declineHours: 48,
                       onDecline: 'next', ticketTier: '' });

export default function FeedsPanel({ tournamentRef, stages, token, showToast, onChanged }) {
  const tt = useT();
  const auth = token ? { Authorization: `Bearer ${token}` } : {};
  const [feeds, setFeeds] = useState(null);
  const [failed, setFailed] = useState(false);
  const [mine, setMine] = useState(null);
  const [myCircuits, setMyCircuits] = useState(null);
  const [sourceStages, setSourceStages] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  // A recall shows what it touches before anything changes (CEO 475), and a
  // declined place the organiser fills is picked from the source standings.
  const [recalling, setRecalling] = useState(null);
  const [picking, setPicking] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/feeds/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') { setFeeds(body.data); setFailed(false); return; }
      if (!quiet) setFailed(true);
    } catch {
      if (!quiet) setFailed(true);
    }
  }, [tournamentRef]);

  useEffect(() => { load(); }, [load]);
  // A feed sends when the other tournament's stage closes, which happens
  // while this page is open: quiet refreshes, never a flash of loading.
  useAutoRefresh(() => load({ quiet: true }));

  const startAdding = async () => {
    setDraft({ ...blank(), targetStage: String(stages[0]?.id || '') });
    setProblem('');
    if (mine) return;
    try {
      const res = await fetch(`${API}/tournament/get-organizer-tournaments/`, { headers: auth });
      const body = await res.json().catch(() => ({}));
      const list = Array.isArray(body.data) ? body.data : [];
      setMine(list.filter(t => t.slug && t.slug !== tournamentRef && !t.is_draft));
    } catch {
      setMine([]);
    }
  };

  // The circuits this organiser runs, asked for the first time the circuit
  // kind is chosen. The server still checks the game and the entrants.
  const pickKind = async kind => {
    setDraft(d => ({ ...d, kind }));
    setProblem('');
    if (kind !== 'circuit' || myCircuits) return;
    try {
      const res = await fetch(`${API}/circuits/?mine=1`, { headers: auth });
      const body = await res.json().catch(() => ({}));
      setMyCircuits(res.ok && body.status === 'success' ? (body.data.circuits || []) : []);
    } catch {
      setMyCircuits([]);
    }
  };

  const pickSource = async slug => {
    setDraft(d => ({ ...d, source: slug, sourceStage: '', group: '' }));
    setSourceStages([]);
    if (!slug) return;
    try {
      const res = await fetch(`${API}/tournament/${slug}/stages/`);
      const body = await res.json().catch(() => ({}));
      setSourceStages(res.ok && body.status === 'success' ? (body.data.stages || []) : []);
    } catch {
      setSourceStages([]);
    }
  };

  const save = async () => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/feeds/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(draft.kind === 'circuit'
          ? {
            target_stage: Number(draft.targetStage), source_circuit: draft.circuit,
            place_from: Number(draft.placeFrom), place_to: Number(draft.placeTo),
            fire: 'manual', decline_hours: Number(draft.declineHours), on_decline: 'next',
          }
          : {
            target_stage: Number(draft.targetStage), source_tournament: draft.source,
            source_stage: Number(draft.sourceStage), place_from: Number(draft.placeFrom),
            place_to: Number(draft.placeTo), group: draft.group === '' ? null : Number(draft.group),
            fire: draft.fire, decline_hours: Number(draft.declineHours), on_decline: draft.onDecline,
            // A ticket to this tournament's event for each qualifier (P2d).
            ticket_tier: draft.ticketTier === '' ? null : Number(draft.ticketTier),
          }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDraft(null);
        await load();
        if (showToast) showToast(tt('feeds.saved', 'Feed added.'));
        if (onChanged) onChanged();
        return;
      }
      setProblem(apiMessage(tt, body, 'feeds.saveFailed', 'That feed was not added.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async feed => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/feeds/${feed.id}/`, {
        method: 'DELETE', headers: auth,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        await load();
        if (showToast) showToast(tt('feeds.removed', 'Feed removed.'));
        return;
      }
      setProblem(apiMessage(tt, body, 'feeds.removeFailed', 'That feed was not removed.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const openRecall = async (feed, qualifier) => {
    setProblem('');
    setRecalling({ feed, qualifier, preview: null });
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/qualifiers/${qualifier.registration_id}/recall/`,
        { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRecalling({ feed, qualifier, preview: body.data });
        return;
      }
      setRecalling(null);
      setProblem(apiMessage(tt, body, 'feeds.recallFailed', 'That place was not recalled.'));
    } catch {
      setRecalling(null);
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    }
  };

  const confirmRecall = async mode => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/qualifiers/${recalling.qualifier.registration_id}/recall/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ mode }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRecalling(null);
        await load();
        if (showToast) showToast(tt('feeds.recalledToast', 'Place recalled.'));
        if (onChanged) onChanged();
        return;
      }
      setProblem(apiMessage(tt, body, 'feeds.recallFailed', 'That place was not recalled.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const openPick = async feed => {
    setProblem('');
    setPicking({ feed, rows: null, chosen: '' });
    try {
      const res = await fetch(`${API}/tournament/get-tournament-brackets/${feed.source.tournament.slug}/?stage=${feed.source.stage_id}`, { headers: auth });
      const body = await res.json().catch(() => ({}));
      const rows = res.ok && body.status === 'success' ? (body.data.standings || []) : [];
      setPicking({ feed, rows: rows.filter(r => Number(r.rank) > Number(feed.place_to)), chosen: '' });
    } catch {
      setPicking({ feed, rows: [], chosen: '' });
    }
  };

  const confirmPick = async () => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/feeds/${picking.feed.id}/pick/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ source_registration: Number(picking.chosen) }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setPicking(null);
        await load();
        if (showToast) showToast(tt('feeds.picked', 'Place given.'));
        if (onChanged) onChanged();
        return;
      }
      setProblem(apiMessage(tt, body, 'feeds.pickFailed', 'That place was not given.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  // A qualifier's organiser sends its places from here: its last stage
  // closes by itself, and the plan's own send button covers only the
  // tournament's own links (walk planning, 17 October 2026).
  // A circuit's ranking sends from the tournament it fills (P5c): it has no
  // stage of its own, so its own door.
  const sendNow = async feed => {
    setBusy(true);
    setProblem('');
    const door = feed.source.circuit
      ? `${API}/tournament/${tournamentRef}/feeds/${feed.id}/pull/`
      : `${API}/tournament/${tournamentRef}/stages/${feed.source.stage_id}/lines/${feed.id}/pull/`;
    try {
      const res = await fetch(door, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: '{}',
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        await load();
        if (showToast) {
          showToast(feed.source.circuit
            ? tt('feeds.circuitSentToast', 'Places sent in from the {circuit} ranking.')
              .replace('{circuit}', feed.source.circuit.name)
            : tt('feeds.sentToast', 'Sent to {tournament}.').replace('{tournament}', feed.target.tournament.title));
        }
        if (onChanged) onChanged();
        return;
      }
      setProblem(apiMessage(tt, body, 'feeds.sendFailed', 'Those places were not sent.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const chosenStage = sourceStages.find(s => String(s.id) === String(draft?.sourceStage));
  const fromCircuit = draft?.kind === 'circuit';
  const ready = draft && draft.targetStage && (fromCircuit ? draft.circuit : draft.source && draft.sourceStage);
  const incoming = feeds?.incoming || [];

  return (
    <div className={styles.feeds}>
      <p className={styles.title}>{tt('feeds.titleWithCircuits', 'Places from other tournaments or a circuit')}</p>
      <p className={styles.hint}>
        {tt('feeds.hint', 'Take places from another tournament you run: the top of a qualifier into these finals. Each qualifier is registered here, told, and has time to decline.')}
      </p>
      {failed && <p className={styles.problem}>{tt('feeds.failed', 'The feeds could not be loaded.')}</p>}
      {!failed && feeds === null && <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>}
      {!failed && feeds !== null && incoming.length === 0 && !draft && (
        <p className={styles.empty}>{tt('feeds.none', 'No places come from another tournament yet.')}</p>
      )}
      {incoming.map(feed => (
        <div key={feed.id} className={styles.feedRow}>
          <p className={styles.stageLine}>{feedSentence(tt, feed, 'in')}</p>
          {feed.ticket_tier && (
            <p className={styles.note}>
              {tt('feeds.ticketLine', 'Each qualifier also gets a {tier} ticket.').replace('{tier}', feed.ticket_tier.name)}
            </p>
          )}
          <p className={styles.note}>
            {feed.fired_at
              ? tt('feeds.sent', 'Sent: {n}').replace('{n}', feed.sent_count)
              : feed.source.circuit
                ? tt('feeds.circuitWaits', 'Waits for you: the ranking keeps moving until you send these places in.')
                : tt('feeds.waiting', 'Waits for {stage} to finish').replace('{stage}', feed.source.stage)}
          </p>
          {!feed.fired_at && feed.source.circuit && (
            <button type="button" className={styles.save} disabled={busy} onClick={() => sendNow(feed)}>
              {tt('feeds.sendNow', 'Send now')}
            </button>
          )}
          {!feed.fired_at && (
            <button type="button" className={styles.quiet} disabled={busy} onClick={() => remove(feed)}>
              {tt('feeds.remove', 'Remove')}
            </button>
          )}
          {(feed.qualifiers || []).map(q => (
            <div key={q.registration_id} className={styles.feedQualifier}>
              <span className={styles.stageLine}>
                {tt('feeds.placeName', '{place}. {name}').replace('{place}', q.source_place ?? '').replace('{name}', q.name || '')}
                {q.status === 'declined' ? ` (${tt('feeds.declinedWord', 'declined')})` : ''}
                {q.status === 'withdrawn' ? ` (${tt('feeds.recalledWord', 'recalled')})` : ''}
              </span>
              {['confirmed', 'pending'].includes(q.status) && (
                <button type="button" className={styles.quiet} disabled={busy}
                        onClick={() => openRecall(feed, q)}>
                  {tt('feeds.recall', 'Recall')}
                </button>
              )}
            </div>
          ))}
          {(feed.waiting || []).map((w, i) => (
            <div key={`w-${i}`} className={styles.feedQualifier}>
              <span className={styles.note}>
                {tt('feeds.waitingPlace', 'A declined place waits for you: place {place}.').replace('{place}', w.place ?? '')}
              </span>
              {i === 0 && !feed.source.circuit && (
                <button type="button" className={styles.quiet} disabled={busy} onClick={() => openPick(feed)}>
                  {tt('feeds.pickWho', 'Choose who takes it')}
                </button>
              )}
            </div>
          ))}
          {recalling?.feed.id === feed.id && (
            <div className={styles.feedConfirm}>
              {!recalling.preview ? <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p> : (
                <>
                  <p className={styles.stageLine}>
                    {tt('feeds.recallTitle', 'Recall {name}').replace('{name}', recalling.preview.name || '')}
                  </p>
                  <p className={styles.note}>
                    {tt('feeds.recallPlayed', 'Matches already played: {n}').replace('{n}', recalling.preview.played.length)}
                    {' '}
                    {tt('feeds.recallDrawn', 'Matches still to play: {n}').replace('{n}', recalling.preview.drawn.length)}
                  </p>
                  <p className={styles.note}>
                    {recalling.preview.next
                      ? tt('feeds.recallNext', 'The place goes to {name}, place {place} there.')
                        .replace('{name}', recalling.preview.next.name || '').replace('{place}', recalling.preview.next.source_place ?? '')
                      : tt('feeds.recallNobody', 'Nobody is left there to take the place.')}
                  </p>
                  <div className={styles.editorActions}>
                    <button type="button" className={styles.save} disabled={busy} onClick={() => confirmRecall('hand_on')}>
                      {tt('feeds.recallHandOn', 'Hand the place on, keep the results')}
                    </button>
                    {recalling.preview.played.length > 0 && (
                      <button type="button" className={styles.quiet} disabled={busy} onClick={() => confirmRecall('undo')}>
                        {tt('feeds.recallUndo', 'Undo their results, then hand it on')}
                      </button>
                    )}
                    <button type="button" className={styles.quiet} disabled={busy} onClick={() => setRecalling(null)}>
                      {tt('ui.cancel.0f8e', 'Cancel')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {picking?.feed.id === feed.id && (
            <div className={styles.feedConfirm}>
              {picking.rows === null ? <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p> : (
                <>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('feeds.pickWho', 'Choose who takes it')}</span>
                    <select className={styles.select} value={picking.chosen} disabled={busy}
                            onChange={e => setPicking(p => ({ ...p, chosen: e.target.value }))}>
                      <option value="">{tt('feeds.pick', 'Choose')}</option>
                      {picking.rows.map(r => (
                        <option key={r.registration_id} value={r.registration_id}>
                          {tt('feeds.placeName', '{place}. {name}').replace('{place}', r.rank).replace('{name}', r.name || '')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.editorActions}>
                    <button type="button" className={styles.save} disabled={busy || !picking.chosen} onClick={confirmPick}>
                      {tt('feeds.pickGo', 'Give them the place')}
                    </button>
                    <button type="button" className={styles.quiet} disabled={busy} onClick={() => setPicking(null)}>
                      {tt('ui.cancel.0f8e', 'Cancel')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {(feeds?.outgoing || []).length > 0 && (
        <p className={styles.title}>{tt('feeds.outTitle', 'Places this tournament sends')}</p>
      )}
      {(feeds?.outgoing || []).map(feed => (
        <div key={`out-${feed.id}`} className={styles.feedRow}>
          <p className={styles.stageLine}>{feedSentence(tt, feed, 'out')}</p>
          <p className={styles.note}>
            {/* "Waits for League to finish" read wrong on a League already
                over (walk, 17 October 2026). */}
            {feed.fired_at
              ? tt('feeds.sent', 'Sent: {n}').replace('{n}', feed.sent_count)
              : feed.source.status === 'complete'
                ? tt('feeds.readyToSend', '{stage} is finished: send them when you are ready.').replace('{stage}', feed.source.stage)
                : tt('feeds.waiting', 'Waits for {stage} to finish').replace('{stage}', feed.source.stage)}
          </p>
          {!feed.fired_at && (
            <button type="button" className={styles.save} disabled={busy} onClick={() => sendNow(feed)}>
              {tt('feeds.sendNow', 'Send now')}
            </button>
          )}
        </div>
      ))}

      {!draft && stages.length > 0 && (
        <button type="button" className={styles.quiet} disabled={busy} onClick={startAdding}>
          {tt('feeds.addWithCircuits', 'Take places from another tournament or a circuit ranking')}
        </button>
      )}

      {draft && (
        <div className={styles.feedRow}>
          <div className={styles.chips} role="group" aria-label={tt('feeds.kindLabel', 'Where the places come from')}>
            {[['tournament', tt('feeds.kindTournament', 'Another tournament')],
              ['circuit', tt('feeds.kindCircuit', 'A circuit ranking')]].map(([key, label]) => (
              <button key={key} type="button" disabled={busy} aria-pressed={draft.kind === key}
                      className={`${styles.chip} ${draft.kind === key ? styles.chipOn : ''}`}
                      onClick={() => pickKind(key)}>
                {label}
              </button>
            ))}
          </div>
          {!fromCircuit && mine !== null && mine.length === 0 && (
            <p className={styles.empty}>{tt('feeds.noTournaments', 'You run no other tournament to take places from.')}</p>
          )}
          {fromCircuit && myCircuits !== null && myCircuits.length === 0 && (
            <p className={styles.empty}>{tt('feeds.noCircuits', 'You run no circuit to take places from.')}</p>
          )}
          {fromCircuit && (
            <p className={styles.note}>
              {tt('feeds.circuitHint', 'A ranking never finishes by itself: the places go in when you press Send now, in ranking order. A declined place goes to the next one down.')}
            </p>
          )}
          <div className={styles.fields}>
            {fromCircuit && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{tt('feeds.sourceCircuit', 'From which circuit')}</span>
                <select className={styles.select} value={draft.circuit} disabled={busy || myCircuits === null}
                        onChange={e => set('circuit', e.target.value)}>
                  <option value="">{tt('feeds.pick', 'Choose')}</option>
                  {(myCircuits || []).map(c => (
                    <option key={c.slug} value={c.slug}>{c.season ? `${c.name}, ${c.season}` : c.name}</option>
                  ))}
                </select>
              </label>
            )}
            {!fromCircuit && (<>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.sourceTournament', 'From which tournament')}</span>
              <select className={styles.select} value={draft.source} disabled={busy || mine === null}
                      onChange={e => pickSource(e.target.value)}>
                <option value="">{tt('feeds.pick', 'Choose')}</option>
                {(mine || []).map(t => (
                  <option key={t.slug} value={t.slug}>{t.title || t.tournament_title || t.slug}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.sourceStage', 'Which stage')}</span>
              <select className={styles.select} value={draft.sourceStage} disabled={busy || !sourceStages.length}
                      onChange={e => set('sourceStage', e.target.value)}>
                <option value="">{tt('feeds.pick', 'Choose')}</option>
                {sourceStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            {Number(chosenStage?.groups) > 1 && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{tt('feeds.group', 'Group')}</span>
                <select className={styles.select} value={draft.group} disabled={busy}
                        onChange={e => set('group', e.target.value)}>
                  <option value="">{tt('feeds.eachGroup', 'Each group')}</option>
                  {Array.from({ length: Number(chosenStage.groups) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {tt('bracket.groupN', 'Group {g}').replace('{g}', groupLetter(i + 1))}
                    </option>
                  ))}
                </select>
              </label>
            )}
            </>)}
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.placeFrom', 'From place')}</span>
              <input type="number" className={styles.number} min={1} value={draft.placeFrom} disabled={busy}
                     onChange={e => set('placeFrom', e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.placeTo', 'To place')}</span>
              <input type="number" className={styles.number} min={1} value={draft.placeTo} disabled={busy}
                     onChange={e => set('placeTo', e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.targetStage', 'Into which stage here')}</span>
              <select className={styles.select} value={draft.targetStage} disabled={busy}
                      onChange={e => set('targetStage', e.target.value)}>
                {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            {!fromCircuit && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('stages.lines.when', 'When they go')}</span>
              <select className={styles.select} value={draft.fire} disabled={busy}
                      onChange={e => set('fire', e.target.value)}>
                <option value="after_preview">{tt('stages.lines.fireAfterPreview', 'When I confirm the list')}</option>
                <option value="on_close">{tt('stages.lines.fireOnClose', 'As soon as the stage ends')}</option>
                <option value="manual">{tt('stages.lines.fireManual', 'When I press send')}</option>
              </select>
            </label>
            )}
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.declineHours', 'Hours to decline')}</span>
              <input type="number" className={styles.number} min={1} max={720} value={draft.declineHours}
                     disabled={busy} onChange={e => set('declineHours', e.target.value)} />
            </label>
            {!fromCircuit && (feeds?.ticket_tiers || []).length > 0 && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.ticketTier', 'Qualifiers also get a ticket')}</span>
              <select className={styles.select} value={draft.ticketTier} disabled={busy}
                      onChange={e => set('ticketTier', e.target.value)}>
                <option value="">{tt('feeds.ticketNone', 'No ticket, just the place')}</option>
                {feeds.ticket_tiers.map(tier => (
                  <option key={tier.id} value={tier.id}>
                    {tt('feeds.ticketOption', '{tier} ({event})').replace('{tier}', tier.name).replace('{event}', tier.event)}
                  </option>
                ))}
              </select>
            </label>
            )}
            {!fromCircuit && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{tt('feeds.onDecline', 'A declined place goes to')}</span>
              <select className={styles.select} value={draft.onDecline} disabled={busy}
                      onChange={e => set('onDecline', e.target.value)}>
                <option value="next">{tt('feeds.onDeclineNext', 'The next placement there')}</option>
                <option value="organiser">{tt('feeds.onDeclineOrganiser', 'Whoever I pick')}</option>
              </select>
            </label>
            )}
          </div>
          <div className={styles.editorActions}>
            <button type="button" className={styles.save}
                    disabled={busy || !ready}
                    onClick={save}>
              {tt('feeds.save', 'Add this feed')}
            </button>
            <button type="button" className={styles.quiet} disabled={busy}
                    onClick={() => { setDraft(null); setProblem(''); }}>
              {tt('ui.cancel.0f8e', 'Cancel')}
            </button>
          </div>
        </div>
      )}
      {problem && <p className={styles.problem}>{problem}</p>}
    </div>
  );
}
