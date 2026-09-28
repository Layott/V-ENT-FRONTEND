'use client';

// Running a battle royale: lobbies, rooms, results, the table, finishing.
//
// CEO, 28 September 2026: "For battle royale, build it end to end ...
// Everything including uploading results and using OCR."
//
// Who sees what here is what the server says (`can_record`, `can_manage`):
//
//   * a scorekeeper sets each match's room and enters results, by typing or
//     from the end-of-match screenshots;
//   * the organiser also sets how the stage is scored, moves squads between
//     lobbies before they play, adds or removes a match, and finishes it.
//
// A screenshot read is never saved on its own. It comes back as rows to
// check; nothing reaches the table until somebody presses Save, and the save
// goes through the same door as typing. Every name confirmed there is
// remembered, so the next read of the same lobby needs fewer corrections.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCamera, LuPencil, LuPlus, LuTrash2, LuKeyRound } from 'react-icons/lu';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { plural } from '@/lib/plural';
import DateField from '@/components/date-field/DateField';
import { formatWithZone, isoToLocalInput, localInputToISO } from '@/lib/datetime';
import BRSettingsFields, { defaultBR } from './BRSettingsFields';
import BRStandings, { StageMvp, goingThrough, lobbyLabel } from './BRStandings';
import styles from './br.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const netFail = tt => tt('api.NETWORK_UNREACHABLE',
  'Could not reach the server. Check the connection and try again.');

/** MATCH 1, MATCH 2: the house style for every match label. */
export const matchLabel = (tt, number) => tt('br.matchN', 'MATCH {n}').replace('{n}', number);

// ---------------------------------------------------------------- entry

const blankRow = seat => ({
  registration_id: seat.registration_id, name: seat.name,
  played: true, placement: '', kills: '', assists: '', damage: '',
  bonus: '', penalty: '', adjustment_note: '',
  players: (seat.roster || []).map(u => ({ user_id: u.user_id, name: u.username,
                                            kills: '', damage: '', assists: '' })),
  open: false,
});

const fromResult = (seat, result) => {
  const row = blankRow(seat);
  if (!result) return row;
  const lines = new Map((result.players || []).map(p => [p.user_id || `n:${p.name}`, p]));
  return {
    ...row,
    played: result.played,
    placement: result.placement ?? '',
    kills: result.kills ?? '',
    assists: result.assists || '',
    damage: result.damage || '',
    bonus: result.bonus || '',
    penalty: result.penalty || '',
    adjustment_note: result.adjustment_note || '',
    players: row.players.map(p => {
      const had = lines.get(p.user_id);
      return had ? { ...p, kills: had.kills, damage: had.damage || '', assists: had.assists || '' } : p;
    }),
  };
};

const blankish = v => v === '' || v === null || v === undefined;

function EntrySheet({ match, lobby, tt, onSave, onClose, busy }) {
  const byReg = useMemo(() => new Map((match.results || []).map(r => [r.registration_id, r])),
    [match.results]);
  const [rows, setRows] = useState(() => lobby.seats.map(s => fromResult(s, byReg.get(s.registration_id))));
  const places = lobby.seats.length;
  const set = (i, key, value) => setRows(prev => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const setPlayer = (i, p, key, value) => setRows(prev => prev.map((r, j) => (j === i
    ? { ...r, players: r.players.map((x, k) => (k === p ? { ...x, [key]: value } : x)) } : r)));

  const taken = rows.filter(r => r.played && r.placement !== '').map(r => Number(r.placement));
  const clash = taken.length !== new Set(taken).size;

  const submit = () => {
    const payload = rows.map(r => {
      const players = r.played ? r.players.filter(p => !blankish(p.kills) || !blankish(p.damage) || !blankish(p.assists))
        .map(p => ({ user_id: p.user_id, name: p.name, kills: Number(p.kills) || 0,
                     damage: Number(p.damage) || 0, assists: Number(p.assists) || 0 })) : [];
      const out = {
        registration_id: r.registration_id, played: r.played,
        placement: r.played ? Number(r.placement) || null : null,
        bonus: Number(r.bonus) || 0, penalty: Number(r.penalty) || 0,
        adjustment_note: r.adjustment_note || '',
      };
      if (players.length) {
        out.players = players;
      } else if (r.played) {
        out.kills = Number(r.kills) || 0;
      }
      if (!blankish(r.assists)) out.assists = Number(r.assists) || 0;
      if (!blankish(r.damage)) out.damage = Number(r.damage) || 0;
      return out;
    });
    onSave(payload);
  };

  return (
    <div className={styles.sheet}>
      <p className={styles.subhead}>
        {tt('br.enterFor', 'Results for {match}').replace('{match}', matchLabel(tt, match.number))}
      </p>
      <p className={styles.note}>
        {tt('br.enterHint', 'Give every squad that played its placement and kills. A squad switched to "Did not play" gets no points for this match. Open a squad to add its players, assists, damage, a bonus or a penalty.')}
      </p>
      <div className={styles.entryRows}>
        {rows.map((r, i) => (
          <div key={r.registration_id} className={styles.entryRow}>
            <div className={styles.entryTop}>
              <span className={styles.entryName}>{r.name}</span>
              <label className={styles.field} style={{ margin: 0 }}>
                <span className={styles.fieldLabel}>{tt('br.placement', 'Place')}</span>
                <select className={styles.select} value={r.played ? r.placement : ''} disabled={busy || !r.played}
                        onChange={e => set(i, 'placement', e.target.value)}>
                  <option value="">-</option>
                  {Array.from({ length: places }, (_, k) => k + 1).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field} style={{ margin: 0 }}>
                <span className={styles.fieldLabel}>{tt('br.kills', 'Kills')}</span>
                <input className={styles.number} type="number" min="0" max="500" inputMode="numeric"
                       value={r.players.some(p => !blankish(p.kills))
                         ? r.players.reduce((a, p) => a + (Number(p.kills) || 0), 0) : r.kills}
                       disabled={busy || !r.played || r.players.some(p => !blankish(p.kills))}
                       onChange={e => set(i, 'kills', e.target.value)} />
              </label>
              <div className={styles.chips}>
                <button type="button" className={`${styles.chip} ${!r.played ? styles.chipOn : ''}`}
                        aria-pressed={!r.played} disabled={busy}
                        onClick={() => set(i, 'played', !r.played)}>
                  {tt('br.didNotPlay', 'Did not play')}
                </button>
                <button type="button" className={`${styles.chip} ${r.open ? styles.chipOn : ''}`}
                        aria-pressed={r.open} disabled={busy}
                        onClick={() => set(i, 'open', !r.open)}>
                  {tt('br.more', 'More')}
                </button>
              </div>
            </div>
            {r.open && (
              <>
                <div className={styles.entryMore}>
                  {[['assists', tt('br.assists', 'Assists')], ['damage', tt('br.damage', 'Damage')],
                    ['bonus', tt('br.bonus', 'Bonus points')], ['penalty', tt('br.penalty', 'Penalty points')]]
                    .map(([key, label]) => (
                      <label key={key} className={styles.field}>
                        <span className={styles.fieldLabel}>{label}</span>
                        <input className={styles.number} type="number" min="0" inputMode="decimal"
                               value={r[key]} disabled={busy || (!r.played && ['assists', 'damage'].includes(key))}
                               onChange={e => set(i, key, e.target.value)} />
                      </label>
                    ))}
                  <label className={styles.field} style={{ flexBasis: '100%' }}>
                    <span className={styles.fieldLabel}>{tt('br.adjustmentNote', 'Why the bonus or penalty')}</span>
                    <input className={styles.text} maxLength={200} value={r.adjustment_note} disabled={busy}
                           onChange={e => set(i, 'adjustment_note', e.target.value)} />
                  </label>
                </div>
                {r.players.length > 0 && r.played && (
                  <div className={styles.players}>
                    <div className={styles.playerRow}>
                      <span className={styles.fieldLabel}>{tt('br.player', 'Player')}</span>
                      <span className={styles.fieldLabel}>{tt('br.kills', 'Kills')}</span>
                      <span className={styles.fieldLabel}>{tt('br.damage', 'Damage')}</span>
                      <span className={styles.fieldLabel}>{tt('br.assists', 'Assists')}</span>
                    </div>
                    {r.players.map((p, k) => (
                      <div key={p.user_id} className={styles.playerRow}>
                        <span className={styles.playerName}>@{p.name}</span>
                        {['kills', 'damage', 'assists'].map(key => (
                          <input key={key} className={styles.number} type="number" min="0" inputMode="numeric"
                                 aria-label={tt(`br.${key}Of`, `${key} for {name}`).replace('{name}', p.name)}
                                 value={p[key]} disabled={busy}
                                 onChange={e => setPlayer(i, k, key, e.target.value)} />
                        ))}
                      </div>
                    ))}
                    <p className={styles.note}>{tt('br.playersNote', 'A squad’s kills are its players’ kills once any are typed. The match MVP is picked from these.')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {clash && <p className={styles.problem}>{tt('br.placeClash', 'Two squads have the same placement.')}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.save} disabled={busy || clash} onClick={submit}>
          {busy ? tt('stages.saving', 'Saving…') : tt('br.saveResults', 'Save these results')}
        </button>
        <button type="button" className={styles.ghost} disabled={busy} onClick={onClose}>
          {tt('ui.cancel.0f8e', 'Cancel')}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ screenshots

function ReadSheet({ match, lobby, tt, tournamentRef, token, ocr, onCommitted, onClose }) {
  const [files, setFiles] = useState([]);
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState(null);
  const [shots, setShots] = useState([]);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const alive = useRef(true);
  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  // Set on every mount, not only at creation: React mounts, unmounts and
  // mounts again in development, and a flag cleared by that first unmount
  // stopped every poll after the first (walk, 28 September 2026).
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => () => shots.forEach(u => URL.revokeObjectURL(u)), [shots]);

  const rosterFor = regId => lobby.seats.find(s => s.registration_id === Number(regId))?.roster || [];

  // The read's rows, in the shape the review edits: each placement given its
  // squad, each player the account the server matched (or none).
  const toReview = read => read.map(r => ({
    placement: r.placement,
    registration_id: r.registration_id || '',
    players: r.players.map(p => ({
      screen_name: p.screen_name, kills: p.kills, damage: p.damage || 0, assists: p.assists || 0,
      user_id: p.match?.user_id || '', confidence: p.confidence || 0,
      wrong_team: p.wrong_team, how: p.match?.how || '', candidates: p.candidates || [],
    })),
  }));

  const loadShots = async (jobId, count) => {
    const urls = [];
    for (let i = 0; i < count; i += 1) {
      try {
        const res = await fetch(`${API}/tournament/${tournamentRef}/br/reads/${jobId}/images/${i}/`, { headers: auth });
        if (res.ok) urls.push(URL.createObjectURL(await res.blob()));
      } catch {
        // A picture that will not load is not a reason to lose the read.
      }
    }
    if (alive.current) setShots(urls);
  };

  // Asks how the read is going: every 2 seconds, doubling when the server
  // says slow down, and stopping the moment it is ready or has failed.
  const poll = useCallback(async (jobId, delay = 2000) => {
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/br/reads/${jobId}/`, { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (!alive.current) return;
      if (res.status === 429) {
        timer.current = setTimeout(() => poll(jobId, Math.min(delay * 2, 30000)), delay * 2);
        return;
      }
      if (!res.ok || body.status !== 'success') {
        setProblem(apiMessage(tt, body, 'br.readFailed', 'The screenshots could not be read. Type the results in instead.'));
        return;
      }
      const j = body.data.job;
      setJob(j);
      if (j.status === 'ready') {
        setRows(toReview(j.rows));
        loadShots(j.id, j.images);
        return;
      }
      if (j.status === 'failed') {
        setProblem(tt(`api.${j.error_code}`, tt('br.readFailed', 'The screenshots could not be read. Type the results in instead.')));
        return;
      }
      timer.current = setTimeout(() => poll(jobId, delay), delay);
    } catch {
      if (!alive.current) return;
      timer.current = setTimeout(() => poll(jobId, Math.min(delay * 2, 30000)), Math.min(delay * 2, 30000));
    }
  }, [tournamentRef, token, tt]); // eslint-disable-line react-hooks/exhaustive-deps

  // A read that finished but was never saved (the page reloaded, the sheet
  // was closed) is picked up again rather than read, and paid for, twice.
  useEffect(() => {
    if (match.open_read) {
      setJob({ id: match.open_read, status: 'reading' });
      poll(match.open_read);
    }
  }, [match.open_read]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    setProblem('');
    try {
      const form = new FormData();
      files.forEach(f => form.append('images', f));
      const res = await fetch(`${API}/tournament/${tournamentRef}/br/matches/${match.id}/read/`, {
        method: 'POST', headers: auth, body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setJob(body.data.job);
        poll(body.data.job.id);
        return;
      }
      setProblem(apiMessage(tt, body, 'br.uploadFailed', 'The screenshots were not uploaded.'));
    } catch {
      setProblem(netFail(tt));
    } finally {
      setBusy(false);
    }
  };

  const setRow = (i, key, value) => setRows(prev => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const setPlayer = (i, k, key, value) => setRows(prev => prev.map((r, j) => (j === i
    ? { ...r, players: r.players.map((p, m) => (m === k ? { ...p, [key]: value } : p)) } : r)));

  const commit = async () => {
    setBusy(true);
    setProblem('');
    try {
      const payload = rows.filter(r => r.registration_id).map(r => ({
        registration_id: Number(r.registration_id), placement: r.placement, played: true,
        players: r.players.map(p => ({ screen_name: p.screen_name, name: p.screen_name,
                                        user_id: p.user_id ? Number(p.user_id) : null,
                                        kills: Number(p.kills) || 0, damage: Number(p.damage) || 0,
                                        assists: Number(p.assists) || 0 })),
      }));
      const res = await fetch(`${API}/tournament/${tournamentRef}/br/reads/${job.id}/commit/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ rows: payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        onCommitted(body.data.current, body.data.learned);
        return;
      }
      setProblem(apiMessage(tt, body, 'br.commitFailed', 'The results were not saved.'));
    } catch {
      setProblem(netFail(tt));
    } finally {
      setBusy(false);
    }
  };

  const reading = job && ['queued', 'reading'].includes(job.status) && !problem;
  const squads = rows ? rows.map(r => Number(r.registration_id)).filter(Boolean) : [];
  const doubled = squads.length !== new Set(squads).size;

  return (
    <div className={styles.sheet}>
      <p className={styles.subhead}>
        {tt('br.readFor', 'Read {match} from screenshots').replace('{match}', matchLabel(tt, match.number))}
      </p>
      {!job && <>
        <p className={styles.note}>
          {tt('br.readHint', 'Upload the end-of-match results screen, up to {n} pictures of {mb} MB each (PNG, JPEG or WebP). The read takes about half a minute. You check every row before anything is saved.')
            .replace('{n}', ocr.max_images).replace('{mb}', ocr.max_mb)}
        </p>
        {ocr.cap != null && (
          <p className={styles.note}>
            {tt('br.readsLeft', '{used} of your {cap} reads today used.')
              .replace('{used}', ocr.used ?? 0).replace('{cap}', ocr.cap)}
          </p>
        )}
        <input className={styles.fileInput} type="file" multiple accept="image/png,image/jpeg,image/webp"
               aria-label={tt('br.chooseShots', 'Choose the screenshots')}
               onChange={e => setFiles(Array.from(e.target.files || []).slice(0, ocr.max_images))} />
        <div className={styles.actions}>
          <button type="button" className={styles.save} disabled={busy || !files.length} onClick={upload}>
            {busy ? tt('br.uploading', 'Uploading…') : tt('br.readThem', 'Read them')}
          </button>
          <button type="button" className={styles.ghost} disabled={busy} onClick={onClose}>
            {tt('ui.cancel.0f8e', 'Cancel')}
          </button>
        </div>
      </>}

      {reading && <p className={styles.state} role="status">{tt('br.reading', 'Reading the screenshots. This takes about half a minute.')}</p>}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {rows && <>
        {shots.length > 0 && (
          <div className={styles.shots}>
            {shots.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} className={styles.shot}
                   alt={tt('br.shotN', 'Screenshot {n} as uploaded').replace('{n}', i + 1)} />
            ))}
          </div>
        )}
        <p className={styles.note}>
          {tt('br.reviewHint', 'Check each placement’s squad and each name. A name marked "check" matched a player in a different squad, which is usually a misread. Names you confirm are remembered for the next read.')}
        </p>
        <div className={styles.entryRows}>
          {rows.map((r, i) => (
            <div key={`${r.placement}-${i}`} className={styles.entryRow}>
              <div className={styles.entryTop}>
                <span className={styles.entryName}>
                  {tt('br.placeN', 'Place {n}').replace('{n}', r.placement)}
                </span>
                <label className={styles.field} style={{ margin: 0, gridColumn: 'span 3' }}>
                  <span className={styles.fieldLabel}>{tt('br.col.squad', 'Squad')}</span>
                  <select className={styles.select} value={r.registration_id} disabled={busy}
                          onChange={e => setRow(i, 'registration_id', e.target.value)}>
                    <option value="">{tt('br.skipRow', 'Not a squad in this lobby (skip)')}</option>
                    {lobby.seats.map(s => (
                      <option key={s.registration_id} value={s.registration_id}>{s.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.players}>
                {r.players.length > 0 && (
                  <div className={styles.reviewRow} aria-hidden="true">
                    <span className={styles.fieldLabel}>{tt('br.onScreen', 'Name on the screen')}</span>
                    <span className={styles.fieldLabel}>{tt('br.player', 'Player')}</span>
                    <span className={styles.fieldLabel}>{tt('br.kills', 'Kills')}</span>
                  </div>
                )}
                {r.players.map((p, k) => (
                  <div key={`${p.screen_name}-${k}`} className={styles.reviewRow}>
                    <span className={styles.playerName}>
                      {p.screen_name}
                      {p.wrong_team && <span className={styles.flag}> {tt('br.check', 'check')}</span>}
                      {p.how === 'alias' && <span className={styles.small}>{tt('br.remembered', 'remembered')}</span>}
                    </span>
                    <select className={styles.select} value={p.user_id} disabled={busy}
                            aria-label={tt('br.whoIs', 'Who is {name}').replace('{name}', p.screen_name)}
                            onChange={e => setPlayer(i, k, 'user_id', e.target.value)}>
                      <option value="">{tt('br.unknownPlayer', 'Not matched')}</option>
                      {rosterFor(r.registration_id).map(u => (
                        <option key={u.user_id} value={u.user_id}>@{u.username}</option>
                      ))}
                    </select>
                    <input className={styles.number} type="number" min="0" value={p.kills} disabled={busy}
                           aria-label={tt('br.killsOf', 'Kills for {name}').replace('{name}', p.screen_name)}
                           onChange={e => setPlayer(i, k, 'kills', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {doubled && <p className={styles.problem}>{tt('br.squadTwice', 'The same squad is on two placements.')}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.save} disabled={busy || doubled} onClick={commit}>
            {busy ? tt('stages.saving', 'Saving…') : tt('br.saveRead', 'Save these results')}
          </button>
          <button type="button" className={styles.ghost} disabled={busy} onClick={onClose}>
            {tt('ui.cancel.0f8e', 'Cancel')}
          </button>
        </div>
      </>}
    </div>
  );
}

// ------------------------------------------------------------------ room

function RoomSheet({ match, tt, onSave, onClose, busy }) {
  const [form, setForm] = useState({
    map_name: match.map_name || '', room_code: match.room_code || '',
    room_password: match.room_password || '',
    scheduled_at: isoToLocalInput(match.scheduled_at) || '',
  });
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  return (
    <div className={styles.sheet}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.mapName', 'Map')}</span>
          <input className={styles.text} maxLength={60} value={form.map_name} disabled={busy}
                 placeholder={tt('br.mapPlaceholder', 'Bermuda, Erangel ...')}
                 onChange={e => set('map_name', e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.startsAt', 'Starts')}</span>
          <DateField withTime value={form.scheduled_at} disabled={busy}
                     onChange={e => set('scheduled_at', e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.roomCode', 'Room ID')}</span>
          <input className={styles.text} maxLength={64} value={form.room_code} disabled={busy}
                 onChange={e => set('room_code', e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.roomPassword', 'Room password')}</span>
          <input className={styles.text} maxLength={64} value={form.room_password} disabled={busy}
                 onChange={e => set('room_password', e.target.value)} />
        </label>
      </div>
      <p className={styles.note}>{tt('br.roomPrivate', 'Only the squads in this lobby and the people running it see the room ID and password.')}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.save} disabled={busy}
                onClick={() => onSave({ ...form,
                  scheduled_at: form.scheduled_at ? localInputToISO(form.scheduled_at) : '' })}>
          {tt('br.saveRoom', 'Save')}
        </button>
        <button type="button" className={styles.ghost} disabled={busy} onClick={onClose}>
          {tt('ui.cancel.0f8e', 'Cancel')}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- console

export default function BattleRoyaleConsole({ tournamentRef, token, gameTitle = '', showToast, onChanged }) {
  const tt = useT();
  const [data, setData] = useState(null);
  const [stageId, setStageId] = useState(null);
  const [lobbyNo, setLobbyNo] = useState(1);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);           // {kind: 'entry'|'read'|'room', id}
  const [settings, setSettings] = useState(null);   // the settings being edited
  const [renaming, setRenaming] = useState(null);   // the lobby being renamed
  const [lobbyName, setLobbyName] = useState('');
  // The first press of a control that cannot be undone: 'finish', or
  // `remove-<match id>`. The second press does it; Keep it clears it.
  const [confirm, setConfirm] = useState(null);
  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentRef) { setLoading(false); return; }
    try {
      const query = stageId ? `?stage=${encodeURIComponent(stageId)}` : '';
      const res = await fetch(`${API}/tournament/${tournamentRef}/br/${query}`, { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setData(body.data);
        setProblem('');
      } else if (!quiet) {
        setProblem(apiMessage(tt, body, 'br.loadFailed', 'Could not load the battle royale.'));
      }
    } catch {
      // A background refresh that fails keeps what is on screen.
      if (!quiet) setProblem(netFail(tt));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token, stageId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // Two people keep score from two devices: each sees the other's entries
  // without a reload, and at once after any save on this page (inbox 312).
  useAutoRefresh(() => load({ quiet: true }), [tournamentRef, stageId]);

  const current = data?.current || null;
  const lobbies = current?.lobbies || [];
  const lobby = lobbies.find(l => l.number === lobbyNo) || lobbies[0] || null;
  const through = useMemo(() => goingThrough(current), [current]);

  const call = async (url, { method = 'POST', body, done, fail }) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/${url}`, {
        method, headers: { 'Content-Type': 'application/json', ...auth },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.status === 'success') {
        if (payload.data?.current) {
          setData(prev => ({ ...prev, current: payload.data.current }));
        } else {
          await load();
        }
        if (done && showToast) showToast(done);
        if (onChanged) onChanged();
        return payload;
      }
      setProblem(apiMessage(tt, payload, fail[0], fail[1]));
    } catch {
      setProblem(netFail(tt));
    } finally {
      setBusy(false);
    }
    return null;
  };

  if (loading) return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  if (!data) return problem ? <p className={styles.problem} role="alert">{problem}</p> : null;
  // Nothing to run here: this tournament has no battle royale in it.
  if (!data.is_battle_royale && !(data.stages || []).length) return null;

  const canManage = Boolean(current?.can_manage || data.can_manage);
  const canRecord = Boolean(current?.can_record);

  // ---- a one-format battle royale before its stage exists
  if (!current) {
    return (
      <section className={styles.panel}>
        <h3 className={styles.title}>{tt('br.consoleTitle', 'Battle royale')}</h3>
        <p className={styles.hint}>
          {tt('br.setupHint', 'Set how the lobbies are scored, then draw them. Squads are spread across lobbies by seed so every lobby gets a fair share of the strongest.')}
        </p>
        {problem && <p className={styles.problem} role="alert">{problem}</p>}
        {canManage
          ? <button type="button" className={styles.save} disabled={busy}
                    onClick={() => call('br/ensure/', { done: null, fail: ['br.setupFailed', 'Could not set up the lobbies.'] })}>
              {tt('br.setup', 'Set up the lobbies')}
            </button>
          : <p className={styles.state}>{tt('br.notDrawnYet', 'The lobbies have not been drawn yet.')}</p>}
      </section>
    );
  }

  const stage = current.stage;
  const drawn = current.drawn;
  const startEditing = () => setSettings({ ...defaultBR(gameTitle), ...(current.settings || {}) });

  const draw = () => call(`stages/${stage.id}/draw/`, {
    body: {}, done: tt('br.drawn', 'The lobbies are drawn.'),
    fail: ['stages.drawFailed', 'That stage was not drawn.'],
  });

  const saveResults = async (match, rows) => {
    const res = await call(`br/matches/${match.id}/results/`, {
      body: { rows }, done: tt('br.resultsSaved', '{match} is saved.').replace('{match}', matchLabel(tt, match.number)),
      fail: ['br.resultsFailed', 'Those results were not saved.'],
    });
    if (res) setOpen(null);
  };

  const firstBr = (data.stages || [])[0]?.id === stage.id;
  const lobbyHasResults = l => (l?.maps || []).some(m => m.status === 'entered');

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{tt('br.consoleTitle', 'Battle royale')}</h3>
          <p className={styles.hint}>
            {drawn
              ? tt('br.consoleHint', 'Pick a lobby, set each match’s room, and enter its results by typing or from the screenshots. The table updates as you save.')
              : tt('br.beforeDraw', 'Check how this stage is scored, then draw the lobbies.')}
          </p>
        </div>
        {canManage && !settings && (
          <button type="button" className={styles.ghost} onClick={startEditing}>
            <LuPencil aria-hidden="true" /> {tt('br.editSettings', 'Scoring and rules')}
          </button>
        )}
      </div>

      {(data.stages || []).length > 1 && (
        <div className={styles.lobbyChips} role="group" aria-label={tt('bracket.stagesLabel', 'Stages of this tournament')}>
          {data.stages.map(s => (
            <button key={s.id} type="button"
                    className={`${styles.lobbyChip} ${s.id === stage.id ? styles.lobbyChipOn : ''}`}
                    aria-pressed={s.id === stage.id}
                    onClick={() => { setStageId(s.id); setLobbyNo(1); setOpen(null); setSettings(null); }}>
              {s.label}
              <span className={styles.lobbyChipState}>
                {s.status === 'complete' ? tt('bracket.stageDone', 'Finished')
                  : s.drawn ? tt('bracket.stageLive', 'Being played') : tt('bracket.stageLater', 'Not drawn yet')}
              </span>
            </button>
          ))}
        </div>
      )}

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {settings && (
        <div className={styles.sheet}>
          {current.has_results && (
            <p className={styles.note}>
              {tt('br.lockedNote', 'Matches have been played under these settings, so only an admin can change them now. Any change rescores every result already entered.')}
            </p>
          )}
          <BRSettingsFields value={settings} onChange={setSettings} disabled={busy || !current.may_change_settings}
                            isLast={current.is_last_stage} drawn={drawn} />
          {!current.is_last_stage && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {settings.advance_by === 'lobby'
                  ? tt('br.advancesLobby', 'How many go through from each lobby')
                  : tt('stages.advances', 'How many go through')}
              </span>
              <input className={styles.number} type="number" min="1" max="256"
                     value={settings.advances ?? stage.advances} disabled={busy || !current.may_change_settings}
                     onChange={e => setSettings(prev => ({ ...prev, advances: e.target.value }))} />
            </label>
          )}
          <div className={styles.actions}>
            {current.may_change_settings && <button type="button" className={styles.save} disabled={busy} onClick={() => {
              const { advances, ...rest } = settings;
              setSettings(rest);
              call(`br/${stage.id}/settings/`, {
                method: 'PUT', body: { settings: rest, ...(advances ? { advances } : {}) },
                done: tt('br.settingsSaved', 'Saved. Every result already entered has been rescored.'),
                fail: ['br.settingsFailed', 'Those settings were not saved.'],
              }).then(res => { if (res) setSettings(null); });
            }}>
              {busy ? tt('stages.saving', 'Saving…') : tt('br.saveSettings', 'Save the settings')}
            </button>}
            <button type="button" className={styles.ghost} disabled={busy} onClick={() => setSettings(null)}>
              {current.may_change_settings ? tt('ui.cancel.0f8e', 'Cancel') : tt('br.closeSettings', 'Close')}
            </button>
          </div>
        </div>
      )}

      {!drawn && (
        <div className={styles.sheet}>
          <p className={styles.note}>
            {tt('br.drawSummary', 'Lobbies of up to {size} squads, {maps} matches each.')
              .replace('{size}', current.settings.lobby_size).replace('{maps}', current.settings.maps)}
          </p>
          {canManage && firstBr && (stage.order === 0 || data.stages.length === 1)
            ? <button type="button" className={styles.save} disabled={busy} onClick={draw}>
                {tt('br.drawLobbies', 'Draw the lobbies')}
              </button>
            : <p className={styles.state}>{tt('bracket.stageNotDrawn', 'This stage is drawn when the one before it finishes.')}</p>}
        </div>
      )}

      {drawn && <>
        {lobbies.length > 1 && (
          <div className={styles.lobbyChips} role="group" aria-label={tt('br.lobbiesHead', 'Lobbies')}>
            {lobbies.map(l => {
              const done = l.maps.filter(m => m.status === 'entered').length;
              return (
                <button key={l.id} type="button"
                        className={`${styles.lobbyChip} ${lobby?.id === l.id ? styles.lobbyChipOn : ''}`}
                        aria-pressed={lobby?.id === l.id} onClick={() => { setLobbyNo(l.number); setOpen(null); }}>
                  {lobbyLabel(tt, l)}
                  <span className={styles.lobbyChipState}>
                    {tt('br.playedOf', '{done} of {all} played').replace('{done}', done).replace('{all}', l.maps.length)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {lobby && (
          <div className={styles.lobby}>
            <div className={styles.lobbyHead}>
              {renaming === lobby.id ? (
                <form className={styles.renameRow} onSubmit={e => {
                  e.preventDefault();
                  call(`br/${stage.id}/lobbies/${lobby.id}/`, {
                    method: 'PATCH', body: { name: lobbyName },
                    done: tt('br.renamed', 'Renamed.'), fail: ['br.renameFailed', 'The lobby was not renamed.'],
                  }).then(res => { if (res) setRenaming(null); });
                }}>
                  <input className={styles.text} maxLength={60} value={lobbyName} disabled={busy}
                         aria-label={tt('br.lobbyNameLabel', 'Name this lobby (blank for its number)')}
                         placeholder={tt('br.lobbyN', 'Lobby {n}').replace('{n}', lobby.number)}
                         onChange={e => setLobbyName(e.target.value)} />
                  <button type="submit" className={styles.save} disabled={busy}>{tt('br.saveRoom', 'Save')}</button>
                  <button type="button" className={styles.ghost} disabled={busy} onClick={() => setRenaming(null)}>
                    {tt('ui.cancel.0f8e', 'Cancel')}
                  </button>
                </form>
              ) : (
                <span className={styles.lobbyName}>
                  {lobbyLabel(tt, lobby)}
                  {' '}<span className={styles.matchMeta}>
                    {tt('br.squadsN', '{n} squads').replace('{n}', lobby.seats.length)}
                  </span>
                </span>
              )}
              {canManage && renaming !== lobby.id && (
                <button type="button" className={styles.iconBtn} disabled={busy}
                        aria-label={tt('br.renameLobby', 'Rename this lobby')}
                        onClick={() => { setRenaming(lobby.id); setLobbyName(lobby.name || ''); }}>
                  <LuPencil aria-hidden="true" />
                </button>
              )}
            </div>

            <ul className={styles.seats}>
              {lobby.seats.map(seat => (
                <li key={seat.registration_id} className={styles.seat}>
                  <span className={styles.seatName}>{seat.name}</span>
                  {seat.carried_points > 0 && (
                    <span className={styles.carry}>+{seat.carried_points}</span>
                  )}
                  {canManage && lobbies.length > 1 && !lobbyHasResults(lobby) && (
                    <select className={styles.select} value={lobby.number} disabled={busy}
                            aria-label={tt('br.moveTo', 'Move {name} to another lobby').replace('{name}', seat.name)}
                            onChange={e => call(`br/${stage.id}/seats/move/`, {
                              body: { registration_id: seat.registration_id, lobby: Number(e.target.value) },
                              done: tt('br.moved', 'Moved.'),
                              fail: ['br.moveFailed', 'That squad was not moved.'],
                            })}>
                      {lobbies.map(l => (
                        <option key={l.number} value={l.number}>
                          {lobbyLabel(tt, l)}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              ))}
            </ul>

            <ul className={styles.matches}>
              {lobby.maps.map((match, index) => {
                const isOpen = open && open.id === match.id;
                const last = index === lobby.maps.length - 1;
                return (
                  <li key={match.id} className={styles.match}>
                    <div className={styles.matchTop}>
                      <span className={styles.matchName}>{matchLabel(tt, match.number)}</span>
                      {match.map_name && <span className={styles.matchMeta}>{match.map_name}</span>}
                      {match.scheduled_at && <span className={styles.matchMeta}>{formatWithZone(match.scheduled_at)}</span>}
                      <span className={match.status === 'entered' ? styles.statusEntered : styles.statusPending}>
                        {match.status === 'entered'
                          ? (match.entered_via === 'ocr'
                            ? tt('br.enteredOcr', 'Entered from screenshots')
                            : tt('br.entered', 'Results in'))
                          : tt('br.toPlay', 'To play')}
                      </span>
                      {canRecord && stage.status !== 'complete' && (
                        <span className={styles.matchActions}>
                          <button type="button" className={styles.matchBtn} disabled={busy || stage.status === 'complete'}
                                  aria-expanded={Boolean(isOpen && open.kind === 'entry')}
                                  onClick={() => setOpen(isOpen && open.kind === 'entry' ? null : { kind: 'entry', id: match.id })}>
                            <LuPencil aria-hidden="true" />
                            {match.status === 'entered' ? tt('br.editResults', 'Edit results') : tt('br.enterResults', 'Enter results')}
                          </button>
                          <button type="button" className={styles.matchBtn}
                                  disabled={busy || !current.ocr.available || stage.status === 'complete'}
                                  title={current.ocr.available ? undefined
                                    : tt('api.OCR_NOT_CONFIGURED', 'Reading screenshots is not switched on. Type the results in.')}
                                  aria-expanded={Boolean(isOpen && open.kind === 'read')}
                                  onClick={() => setOpen(isOpen && open.kind === 'read' ? null : { kind: 'read', id: match.id })}>
                            <LuCamera aria-hidden="true" /> {tt('br.fromScreenshots', 'From screenshots')}
                          </button>
                          <button type="button" className={styles.matchBtn} disabled={busy}
                                  aria-expanded={Boolean(isOpen && open.kind === 'room')}
                                  onClick={() => setOpen(isOpen && open.kind === 'room' ? null : { kind: 'room', id: match.id })}>
                            <LuKeyRound aria-hidden="true" /> {tt('br.room', 'Room')}
                          </button>
                          {canManage && last && match.status !== 'entered' && lobby.maps.length > 1
                            && confirm !== `remove-${match.id}` && (
                            <button type="button" className={styles.iconBtn} disabled={busy}
                                    aria-label={tt('br.removeMatch', 'Remove {match}').replace('{match}', matchLabel(tt, match.number))}
                                    onClick={() => setConfirm(`remove-${match.id}`)}>
                              <LuTrash2 aria-hidden="true" />
                            </button>
                          )}
                          {confirm === `remove-${match.id}` && <>
                            <button type="button" className={styles.danger} disabled={busy}
                                    onClick={() => {
                                      setConfirm(null);
                                      call(`br/matches/${match.id}/`, {
                                        method: 'DELETE', done: tt('br.matchRemoved', 'Match removed.'),
                                        fail: ['br.removeFailed', 'That match was not removed.'],
                                      });
                                    }}>
                              {tt('br.removeMatchAsk', 'Remove {match}?').replace('{match}', matchLabel(tt, match.number))}
                            </button>
                            <button type="button" className={styles.ghost} disabled={busy} onClick={() => setConfirm(null)}>
                              {tt('br.keepIt', 'Keep it')}
                            </button>
                          </>}
                        </span>
                      )}
                    </div>
                    {!current.ocr.available && canRecord && index === 0 && (
                      <p className={styles.note}>{tt('api.OCR_NOT_CONFIGURED', 'Reading screenshots is not switched on. Type the results in.')}</p>
                    )}
                    {(match.room_code || match.room_password) && (
                      <div className={styles.room}>
                        {match.room_code && <span>{tt('br.roomCode', 'Room ID')}: <span className={styles.roomValue}>{match.room_code}</span></span>}
                        {match.room_password && <span>{tt('br.roomPassword', 'Room password')}: <span className={styles.roomValue}>{match.room_password}</span></span>}
                      </div>
                    )}
                    {match.status === 'entered' && (
                      <p className={styles.matchMeta}>
                        {match.results.filter(r => r.played).slice(0, 3)
                          .map(r => `${r.placement}. ${r.name} (${r.total})`).join('   ')}
                        {match.mvp && ` · ${tt('br.mvpIs', 'MVP {name}').replace('{name}', match.mvp.username ? `@${match.mvp.username}` : match.mvp.name)}`}
                      </p>
                    )}
                    {isOpen && open.kind === 'entry' && (
                      <EntrySheet match={match} lobby={lobby} tt={tt} busy={busy}
                                  onSave={rows => saveResults(match, rows)} onClose={() => setOpen(null)} />
                    )}
                    {isOpen && open.kind === 'entry' && match.status === 'entered' && (
                      <button type="button" className={styles.danger} disabled={busy}
                              onClick={() => call(`br/matches/${match.id}/results/`, {
                                method: 'DELETE', done: tt('br.cleared', 'Results cleared.'),
                                fail: ['br.clearFailed', 'The results were not cleared.'],
                              }).then(res => { if (res) setOpen(null); })}>
                        {tt('br.clearResults', 'Clear these results')}
                      </button>
                    )}
                    {isOpen && open.kind === 'read' && (
                      <ReadSheet match={match} lobby={lobby} tt={tt} tournamentRef={tournamentRef} token={token}
                                 ocr={current.ocr} onClose={() => setOpen(null)}
                                 onCommitted={(fresh, learned) => {
                                   if (fresh) setData(prev => ({ ...prev, current: fresh }));
                                   setOpen(null);
                                   if (showToast) {
                                     showToast(tt('br.readSaved', 'Saved. {n} names remembered for next time.').replace('{n}', learned || 0));
                                   }
                                   if (onChanged) onChanged();
                                 }} />
                    )}
                    {isOpen && open.kind === 'room' && (
                      <RoomSheet match={match} tt={tt} busy={busy} onClose={() => setOpen(null)}
                                 onSave={form => call(`br/matches/${match.id}/`, {
                                   method: 'PATCH', body: form, done: tt('br.roomSaved', 'Saved.'),
                                   fail: ['br.roomFailed', 'That was not saved.'],
                                 }).then(res => { if (res) setOpen(null); })} />
                    )}
                  </li>
                );
              })}
            </ul>
            {canManage && stage.status !== 'complete' && (
              <div className={styles.actions}>
                <button type="button" className={styles.ghost} disabled={busy}
                        onClick={() => call(`br/${stage.id}/lobbies/${lobby.id}/matches/`, {
                          done: tt('br.matchAdded', 'A match was added.'),
                          fail: ['br.addFailed', 'The match was not added.'],
                        })}>
                  <LuPlus aria-hidden="true" /> {tt('br.addMatch', 'Add a match')}
                </button>
              </div>
            )}
            <p className={styles.sectionTitle}>{tt('br.lobbyTable', 'This lobby')}</p>
            <BRStandings rows={lobby.standings} byLobby through={through} closed={stage.status === 'complete'} />
          </div>
        )}

        {lobbies.length > 1 && <>
          <p className={styles.sectionTitle}>{tt('br.overall', 'Every squad')}</p>
          <BRStandings rows={current.standings} through={through} lobbies={lobbies.length} closed={stage.status === 'complete'} />
        </>}

        <StageMvp mvp={current.mvp} />

        {canManage && current.is_last_stage && stage.status !== 'complete' && (
          <div className={styles.sheet}>
            <p className={styles.note}>
              {current.finished
                ? tt('br.finishHint', 'Every match is in. Finishing writes the final places, which is what prizes are paid from. Results cannot be changed after it.')
                : plural(tt, current.open_matches, 'br.finishWaitOne', '{n} match still to be entered before this can be finished.',
                  'br.finishWaitMany', '{n} matches still to be entered before this can be finished.')}
            </p>
            {confirm !== 'finish' ? (
              <button type="button" className={styles.save} disabled={busy || !current.finished}
                      onClick={() => setConfirm('finish')}>
                {tt('br.finish', 'Finish the tournament')}
              </button>
            ) : (
              <div className={styles.actions}>
                <button type="button" className={styles.save} disabled={busy}
                        onClick={() => {
                          setConfirm(null);
                          call(`br/${stage.id}/finish/`, {
                            done: tt('br.finished', 'Finished. The final places are written.'),
                            fail: ['br.finishFailed', 'The tournament was not finished.'],
                          });
                        }}>
                  {tt('br.finishYes', 'Yes, finish it')}
                </button>
                <button type="button" className={styles.ghost} disabled={busy} onClick={() => setConfirm(null)}>
                  {tt('br.keepIt', 'Keep it')}
                </button>
              </div>
            )}
          </div>
        )}
        {stage.status === 'complete' && current.is_last_stage && (
          <p className={styles.good}>{tt('br.isFinished', 'Finished. The final places are written.')}</p>
        )}
        {!current.is_last_stage && current.finished && stage.status !== 'complete' && (
          <p className={styles.note}>{tt('br.closeFromStages', 'Every match is in. Close this stage on the Brackets tab to send the squads through.')}</p>
        )}
      </>}
    </section>
  );
}
