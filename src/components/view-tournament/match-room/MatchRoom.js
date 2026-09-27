'use client';

// One match, for everybody who has something to do in it.
//
// The bracket tab had a match dialog whose whole player half (report a score,
// confirm the opponent's, dispute it) sat inside a block only the organiser
// could reach, so on this platform a player could never report or confirm
// their own result. This replaces it, and it is the same dialog for all four
// people a match concerns:
//
//   the two sides   check in, post or read the room code, report the score,
//                   confirm or dispute what the other side reported
//   staff           (organiser, scorekeeper, admin) record the result outright
//
// It reads how the match is played from the match itself (best of, draws,
// penalties, legs), because those were fixed when it was drawn. A level score
// in a knockout asks for the penalties in the same form, and a group match
// takes a draw, which the old flow refused outright.
//
// Anybody else is handed the public fixture view by the caller; this dialog is
// never shown to a stranger, and the server refuses them anyway.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatWithZone } from '@/lib/datetime';
import { roomText, statusWord } from './matchWords';
import styles from './match-room.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const OPEN = ['scheduled', 'in_progress'];

async function call(path, { method = 'GET', token, body, form } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(form ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.status === 'success', status: res.status, body: data };
}

const num = value => (value === '' || value == null ? '' : Math.max(0, parseInt(value, 10) || 0));

export default function MatchRoom({ matchId, tournamentRef, token, canRecord = false,
                                    onClose, onChanged }) {
  const tt = useT();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [shot, setShot] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setProblem('');
    try {
      const got = await call(`/tournament/match/${matchId}/`, { token });
      if (got.ok) {
        setMatch(got.body.data);
        setRoomCode(got.body.data.room_code || '');
        setRoomPassword(got.body.data.room_password || '');
      } else {
        setProblem(apiMessage(tt, got.body, 'match.loadFailed', 'This match could not be opened.'));
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const slot = match?.your_slot || null;
  const one = match?.participant_1?.name || tt('bracket.tbd', 'To be decided');
  const two = match?.participant_2?.name || tt('bracket.tbd', 'To be decided');
  const bothKnown = Boolean(match?.participant_1 && match?.participant_2);
  const open = match && OPEN.includes(match.status);
  const level = s1 !== '' && s2 !== '' && Number(s1) === Number(s2);
  const needsPens = level && match && !match.draw_allowed;
  const pending = match?.status === 'pending_opponent_confirm';

  // The score waiting for confirmation: the newest submission not yet
  // confirmed. The server marks the viewer's own with `mine`, which is the
  // only thing this needs to know: the side that sent it waits, the other
  // side confirms.
  const waiting = useMemo(() => (match?.score_submissions || [])
    .find(s => !s.confirmed) || null, [match]);
  const mineWaiting = Boolean(waiting?.mine);

  const hostSlot = match?.room_host === 'p2' ? 2 : match?.room_host === 'p1' ? 1 : null;
  const iHost = slot && hostSlot === slot;

  const run = async (fn, okText) => {
    setBusy(true);
    setProblem('');
    setNote('');
    try {
      const got = await fn();
      if (got.ok) {
        if (okText) setNote(okText);
        await load();
        if (onChanged) onChanged();
        return true;
      }
      setProblem(apiMessage(tt, got.body, 'match.actionFailed', 'That did not go through.'));
      return false;
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const resultBody = () => ({
    score_p1: Number(s1),
    score_p2: Number(s2),
    ...(needsPens ? { penalties_p1: Number(p1), penalties_p2: Number(p2) } : {}),
  });

  const checkIn = () => run(
    () => call(`/tournament/match/${matchId}/check-in/`, { method: 'POST', token, body: {} }),
    tt('match.checkedIn', 'You are checked in.'));

  const postRoom = () => run(
    () => call(`/tournament/match/${matchId}/room/`, {
      method: 'POST', token, body: { room_code: roomCode.trim(), room_password: roomPassword.trim() },
    }),
    tt('match.roomPosted', 'Room posted. Your opponent can see it now.'));

  const report = () => {
    if (shot) {
      const form = new FormData();
      Object.entries(resultBody()).forEach(([k, v]) => form.append(k, String(v)));
      form.append('screenshot', shot);
      return run(() => call(`/tournament/match/${matchId}/report-score/`,
        { method: 'POST', token, form }),
      tt('match.reported', 'Result sent. Your opponent confirms it next.'));
    }
    return run(() => call(`/tournament/match/${matchId}/report-score/`,
      { method: 'POST', token, body: resultBody() }),
    tt('match.reported', 'Result sent. Your opponent confirms it next.'));
  };

  const confirm = () => run(
    () => call(`/tournament/match/${matchId}/confirm-score/`, { method: 'POST', token, body: { agree: true } }),
    tt('match.confirmed', 'Result confirmed.'));

  const dispute = async () => {
    const path = pending && !mineWaiting
      ? `/tournament/match/${matchId}/confirm-score/`
      : `/tournament/match/${matchId}/raise-dispute/`;
    const body = pending && !mineWaiting
      ? { agree: false, dispute_description: reason.trim() }
      : { description: reason.trim(), evidence_urls: [] };
    const done = await run(() => call(path, { method: 'POST', token, body }),
      tt('match.disputed', 'Dispute sent to the organiser.'));
    if (done) { setDisputing(false); setReason(''); }
  };

  const record = () => run(
    () => call(`/tournament/update-bracket/${tournamentRef}/`, {
      method: 'POST', token, body: { match_id: matchId, ...resultBody() },
    }),
    tt('match.recorded', 'Result recorded. The bracket has moved on.'));

  const scoreReady = s1 !== '' && s2 !== '' && (!needsPens || (p1 !== '' && p2 !== '' && Number(p1) !== Number(p2)));

  // What the organiser asked players to set up in the game. A preset stores
  // a key; an organiser's own words are shown as written.
  const roomSettingsText = roomText(tt, match?.room_settings);

  const bestOfText = match
    ? (match.legs > 1
      ? tt('match.twoLegs', 'Two legs, decided on total goals')
      : match.best_of > 1
        ? tt('match.bestOf', 'Best of {n}. Enter games won.').replace('{n}', match.best_of)
        : tt('match.oneGame', 'One game. Enter the goals.'))
    : '';

  const statusText = status => statusWord(tt, status);

  return (
    <div className={styles.overlay}
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} role="dialog" aria-modal="true"
           aria-label={tt('match.title', 'Match')}>
        <div className={styles.head}>
          <p className={styles.title}>
            {match
              ? tt('match.titleRound', 'Round {r}, match {m}')
                .replace('{r}', match.round_number).replace('{m}', match.match_number)
              : tt('match.title', 'Match')}
          </p>
          <button type="button" className={styles.close} onClick={onClose}
                  aria-label={tt('ui.close.4c1a', 'Close')}>
            <IoClose />
          </button>
        </div>

        {loading && <p className={styles.muted}>{tt('ui.loading.33ce', 'Loading…')}</p>}
        {!loading && problem && !match && (
          <div className={styles.block}>
            <p className={styles.problem} role="alert">{problem}</p>
            <button type="button" className={styles.quiet} onClick={() => { setLoading(true); load(); }}>
              {tt('ui.retry.9f5c', 'Retry')}
            </button>
          </div>
        )}

        {match && <>
          {/* The headline. */}
          <div className={styles.score}>
            <p className={`${styles.side} ${match.winner_registration_id
              && match.winner_registration_id === match.participant_1?.registration_id ? styles.won : ''}`}>
              {one}{slot === 1 && <span className={styles.you}>{tt('match.you', 'You')}</span>}
            </p>
            <p className={styles.nums}>
              {['completed', 'pending_opponent_confirm'].includes(match.status)
                ? `${match.score_p1} - ${match.score_p2}` : tt('match.vs', 'v')}
              {match.penalties_p1 != null && match.penalties_p2 != null && (
                <span className={styles.pens}>
                  {tt('match.onPens', '{a} - {b} on penalties')
                    .replace('{a}', match.penalties_p1).replace('{b}', match.penalties_p2)}
                </span>
              )}
            </p>
            <p className={`${styles.side} ${match.winner_registration_id
              && match.winner_registration_id === match.participant_2?.registration_id ? styles.won : ''}`}>
              {two}{slot === 2 && <span className={styles.you}>{tt('match.you', 'You')}</span>}
            </p>
          </div>

          <dl className={styles.facts}>
            <div><dt>{tt('match.statusLabel', 'Status')}</dt><dd>{statusText(match.status)}</dd></div>
            <div><dt>{tt('match.formatLabel', 'Played as')}</dt><dd>{bestOfText}</dd></div>
            {match.forfeit_reason === 'no_show' && (
              <div><dt>{tt('match.forfeit', 'Forfeit')}</dt>
                <dd>{tt('match.noShow', 'The other side did not check in in time.')}</dd></div>
            )}
            {match.status === 'completed' && match.winner_registration_id == null && (
              <div><dt>{tt('match.resultLabel', 'Result')}</dt><dd>{tt('match.draw', 'A draw')}</dd></div>
            )}
          </dl>

          {note && <p className={styles.ok} role="status">{note}</p>}
          {problem && <p className={styles.problem} role="alert">{problem}</p>}

          {/* ---------------------------------------------------- check-in */}
          {open && bothKnown && match.check_in?.deadline && (
            <section className={styles.block}>
              <p className={styles.blockTitle}>{tt('match.checkInTitle', 'Check in')}</p>
              <p className={styles.muted}>
                {tt('match.checkInBy', 'Both sides check in by {time}. A side that has not, when the other has, loses 0-3.')
                  .replace('{time}', formatWithZone(match.check_in.deadline))}
              </p>
              <ul className={styles.checks}>
                <li className={match.check_in.p1_at ? styles.in : styles.notIn}>
                  {one}: {match.check_in.p1_at
                    ? tt('match.isIn', 'checked in') : tt('match.notIn', 'not yet')}
                </li>
                <li className={match.check_in.p2_at ? styles.in : styles.notIn}>
                  {two}: {match.check_in.p2_at
                    ? tt('match.isIn', 'checked in') : tt('match.notIn', 'not yet')}
                </li>
              </ul>
              {slot && !match.check_in[`p${slot}_at`] && (
                <button type="button" className={styles.primary} disabled={busy} onClick={checkIn}>
                  {tt('match.checkInNow', 'I am here, check me in')}
                </button>
              )}
            </section>
          )}

          {/* --------------------------------------------------------- room */}
          {open && bothKnown && (slot || canRecord) && (
            <section className={styles.block}>
              <p className={styles.blockTitle}>{tt('match.roomTitle', 'The room in the game')}</p>
              {roomSettingsText && <p className={styles.muted}>{roomSettingsText}</p>}
              {match.room_code ? (
                <p className={styles.room}>
                  <span>{tt('match.roomCode', 'Room')}: <strong>{match.room_code}</strong></span>
                  {match.room_password && (
                    <span>{tt('match.roomPassword', 'Password')}: <strong>{match.room_password}</strong></span>
                  )}
                </p>
              ) : (
                <p className={styles.muted}>
                  {iHost || canRecord
                    ? tt('match.roomYouHost', 'You make the room. Create it in the game, then post its code here.')
                    : tt('match.roomWaiting', 'The other side makes the room and posts its code here.')}
                </p>
              )}
              {(iHost || canRecord) && (
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('match.roomCode', 'Room')}</span>
                    <input className={styles.input} value={roomCode} maxLength={64}
                           onChange={e => setRoomCode(e.target.value)} disabled={busy} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('match.roomPassword', 'Password')}</span>
                    <input className={styles.input} value={roomPassword} maxLength={64}
                           onChange={e => setRoomPassword(e.target.value)} disabled={busy} />
                  </label>
                  <button type="button" className={styles.quiet}
                          disabled={busy || !roomCode.trim()} onClick={postRoom}>
                    {match.room_code ? tt('match.roomUpdate', 'Update the room')
                      : tt('match.roomPost', 'Post the room')}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ------------------------------------------------------- result */}
          {bothKnown && ((open && slot) || (canRecord && (open || pending || match.status === 'disputed'))) && (
            <section className={styles.block}>
              <p className={styles.blockTitle}>
                {canRecord && (!slot || !open)
                  ? tt('match.recordTitle', 'Record the result')
                  : tt('match.reportTitle', 'Report the result')}
              </p>
              <div className={styles.scoreInputs}>
                <label className={styles.field}>
                  <span className={styles.label}>{one}</span>
                  <input className={styles.input} type="number" min="0" inputMode="numeric"
                         value={s1} onChange={e => setS1(num(e.target.value))} disabled={busy} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{two}</span>
                  <input className={styles.input} type="number" min="0" inputMode="numeric"
                         value={s2} onChange={e => setS2(num(e.target.value))} disabled={busy} />
                </label>
              </div>
              {needsPens && (
                <>
                  <p className={styles.muted}>
                    {tt('match.pensHint', 'Level in a knockout, so it went to penalties. Enter the shoot-out.')}
                  </p>
                  <div className={styles.scoreInputs}>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('match.pensFor', 'Penalties, {name}').replace('{name}', one)}</span>
                      <input className={styles.input} type="number" min="0" inputMode="numeric"
                             value={p1} onChange={e => setP1(num(e.target.value))} disabled={busy} />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('match.pensFor', 'Penalties, {name}').replace('{name}', two)}</span>
                      <input className={styles.input} type="number" min="0" inputMode="numeric"
                             value={p2} onChange={e => setP2(num(e.target.value))} disabled={busy} />
                    </label>
                  </div>
                </>
              )}
              {level && match.draw_allowed && (
                <p className={styles.muted}>{tt('match.drawCounts', 'A draw counts here. Both sides get the draw points.')}</p>
              )}
              {slot && open && !canRecord && (
                <label className={styles.field}>
                  <span className={styles.label}>{tt('match.screenshot', 'Screenshot of the result')}</span>
                  <input className={styles.file} type="file" accept="image/png,image/jpeg,image/webp"
                         onChange={e => setShot(e.target.files?.[0] || null)} disabled={busy} />
                </label>
              )}
              <button type="button" className={styles.primary}
                      disabled={busy || !scoreReady}
                      onClick={canRecord && (!slot || !open) ? record : report}>
                {canRecord && (!slot || !open)
                  ? tt('match.recordNow', 'Record this result')
                  : tt('match.reportNow', 'Send the result')}
              </button>
              {canRecord && slot && open && (
                <button type="button" className={styles.quiet} disabled={busy || !scoreReady} onClick={record}>
                  {tt('match.recordAsStaff', 'Record it as the organiser instead')}
                </button>
              )}
            </section>
          )}

          {/* --------------------------------------- waiting for confirmation */}
          {pending && (
            <section className={styles.block}>
              <p className={styles.blockTitle}>{tt('match.pendingTitle', 'Waiting for confirmation')}</p>
              {waiting && (
                <p className={styles.muted}>
                  {tt('match.pendingScore', 'Reported: {a} - {b}').replace('{a}', waiting.score_p1).replace('{b}', waiting.score_p2)}
                  {waiting.penalties_p1 != null && ` ${tt('match.onPens', '{a} - {b} on penalties')
                    .replace('{a}', waiting.penalties_p1).replace('{b}', waiting.penalties_p2)}`}
                </p>
              )}
              {waiting?.evidence_url && (
                <a className={styles.link} href={waiting.evidence_url} target="_blank" rel="noopener noreferrer">
                  {tt('match.seeScreenshot', 'See the screenshot')}
                </a>
              )}
              {slot && !mineWaiting && !disputing && (
                <div className={styles.row}>
                  <button type="button" className={styles.primary} disabled={busy} onClick={confirm}>
                    {tt('match.confirmNow', 'That is right, confirm it')}
                  </button>
                  <button type="button" className={styles.quiet} disabled={busy} onClick={() => setDisputing(true)}>
                    {tt('match.disputeNow', 'That is wrong')}
                  </button>
                </div>
              )}
              {slot && mineWaiting && (
                <p className={styles.muted}>{tt('match.waitingOther', 'You sent this. The other side confirms it.')}</p>
              )}
              {canRecord && (
                <p className={styles.muted}>{tt('match.staffCanOverride', 'As staff you can record the result yourself, above, if the two sides do not agree.')}</p>
              )}
            </section>
          )}

          {/* ------------------------------------------------------- dispute */}
          {slot && !disputing && ['completed'].includes(match.status) && (
            <button type="button" className={styles.quiet} disabled={busy} onClick={() => setDisputing(true)}>
              {tt('match.disputeResult', 'Dispute this result')}
            </button>
          )}
          {disputing && (
            <section className={styles.block}>
              <p className={styles.blockTitle}>{tt('match.disputeTitle', 'What is wrong with it')}</p>
              <textarea className={styles.textarea} rows={3} maxLength={500} value={reason}
                        onChange={e => setReason(e.target.value)} disabled={busy}
                        placeholder={tt('match.disputePlaceholder', 'Say what happened. The organiser reads this.')} />
              <div className={styles.row}>
                <button type="button" className={styles.primary} disabled={busy || !reason.trim()} onClick={dispute}>
                  {tt('match.disputeSend', 'Send the dispute')}
                </button>
                <button type="button" className={styles.quiet} disabled={busy}
                        onClick={() => { setDisputing(false); setReason(''); }}>
                  {tt('ui.cancel.0f8e', 'Cancel')}
                </button>
              </div>
            </section>
          )}
        </>}
      </div>
    </div>
  );
}
