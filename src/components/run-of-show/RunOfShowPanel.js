'use client';

// The organiser's half of the run of show: getting it in, deciding who sees it,
// and correcting it on the day.
//
// The first of those is the one that matters. Nobody writes a run of show in a
// web form; they write it in a spreadsheet and rewrite it four times in the week
// before the show. So the import is the front door and everything else is
// beside it, and the panel opens on the import when there is nothing yet.
//
// It serves an EVENT or a TOURNAMENT through one `kind`, exactly like
// StudioPanel and OverlaysPanel above it on the same tab. Five times in one day
// on 3 September a control turned out to be built on one of those two surfaces
// and not the other; one component for both is the only reliable answer to that.

import { useCallback, useEffect, useRef, useState } from 'react';
import DateField from '@/components/date-field/DateField';
import ShareCard from '@/components/share/ShareCard';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import RunOfShow from './RunOfShow';
import styles from './run-of-show-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const VISIBILITY = [
  ['private', 'ros.visPrivate', 'Only me and my team'],
  ['link', 'ros.visLink', 'Anybody with the link'],
  ['public', 'ros.visPublic', 'On the event page, and findable'],
];

const BLANK_CUE = {
  phase: '', activity: '', owner: '', match: '',
  starts_at: '', ends_at: '', note: '',
};

// "Imported 2 cues over 1 days" is the sentence a template with one plural form
// always ends up printing. Each count carries its own singular, and the sentence
// is assembled from the two, which is also the only shape that survives being
// translated into a language whose plural rules are not English's.
const countCues = (tt, n) => (Number(n) === 1
  ? tt('ros.cueCountOne', '1 cue')
  : tt('ros.cueCount', '{n} cues').replace('{n}', n));

const countDays = (tt, n) => (Number(n) === 1
  ? tt('ros.dayCountOne', '1 day')
  : tt('ros.dayCount', '{n} days').replace('{n}', n));

/**
 * @param kind      'event' or 'tournament'
 * @param ownerRef  the slug
 * @param token     the viewer's session token
 * @param showToast optional, the console's own toast
 */
export default function RunOfShowPanel({ kind, ownerRef, token, showToast }) {
  const tt = useT();
  const base = `${API}/${kind === 'tournament' ? 'tournament' : 'event'}/${encodeURIComponent(ownerRef || '')}/run-of-show/`;

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [paste, setPaste] = useState('');
  const [pasteLabel, setPasteLabel] = useState('');
  const [mode, setMode] = useState('replace');
  const [showPaste, setShowPaste] = useState(false);
  const [cue, setCue] = useState(BLANK_CUE);
  const [cueDay, setCueDay] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState(BLANK_CUE);

  const fileRef = useRef(null);

  // Said once. The console that hosts this panel already has a place for a
  // message, so when it gives us one we use only that: "Day removed." printed
  // in the console's own strip AND again inside the panel reads as two things
  // having happened.
  const say = useCallback((message) => {
    if (showToast) showToast(message);
    else setNotice(message);
  }, [showToast]);

  const load = useCallback(async () => {
    if (!ownerRef || !token) { setLoading(false); return; }
    try {
      const res = await fetch(base, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setSheet(body.data.sheet || null);
        setError('');
      } else {
        setError(apiMessage(tt, body, 'ros.loadFailed',
          'The run of show could not be loaded.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'We could not reach V-ENT. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [base, ownerRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  /** Every write answers with the whole sheet, so there is one way to apply one. */
  const send = useCallback(async (path, options, okMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body instanceof FormData
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...(options.headers || {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        if (body.data?.sheet !== undefined) setSheet(body.data.sheet);
        if (okMessage) say(okMessage);
        return body.data || {};
      }
      setError(apiMessage(tt, body, 'ros.saveFailed', 'That could not be saved.'));
      return null;
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'We could not reach V-ENT. Check your connection and try again.'));
      return null;
    } finally {
      setBusy(false);
    }
  }, [base, token, say]); // eslint-disable-line react-hooks/exhaustive-deps

  const importFile = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    const data = await send('import/', { method: 'POST', body: form }, null);
    if (data) {
      say(tt('ros.importedCount', 'Imported {cues} over {days}.')
        .replace('{cues}', countCues(tt, data.imported_items))
        .replace('{days}', countDays(tt, data.imported_days)));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const importPaste = async () => {
    const data = await send('import/', {
      method: 'POST',
      body: JSON.stringify({ text: paste, mode, label: pasteLabel || undefined }),
    }, null);
    if (data) {
      setPaste('');
      setShowPaste(false);
      say(tt('ros.importedCount', 'Imported {cues} over {days}.')
        .replace('{cues}', countCues(tt, data.imported_items))
        .replace('{days}', countDays(tt, data.imported_days)));
    }
  };

  const setVisibility = (value) => send('', {
    method: 'POST', body: JSON.stringify({ visibility: value }),
  }, tt('ros.sharingSaved', 'Sharing changed.'));

  const setFlag = (field, value) => send('', {
    method: 'POST', body: JSON.stringify({ [field]: value }),
  }, tt('ros.sharingSaved', 'Sharing changed.'));

  const addCue = async () => {
    if (!cue.activity.trim()) return;
    const ok = await send('items/', {
      method: 'POST',
      body: JSON.stringify({ ...cue, day_id: cueDay || undefined }),
    }, tt('ros.cueAdded', 'Added to the run of show.'));
    if (ok) setCue(BLANK_CUE);
  };

  const saveCue = async (id) => {
    const ok = await send(`items/${id}/`, {
      method: 'PATCH', body: JSON.stringify(editDraft),
    }, tt('ros.cueSaved', 'Saved.'));
    if (ok) setEditing(null);
  };

  const removeCue = (id) => send(`items/${id}/`, { method: 'DELETE' },
    tt('ros.cueRemoved', 'Removed.'));

  const addDay = () => send('days/', {
    method: 'POST', body: JSON.stringify({}),
  }, tt('ros.dayAdded', 'Day added.'));

  const saveDay = (day, patch) => send(`days/${day.id}/`, {
    method: 'PATCH', body: JSON.stringify(patch),
  }, tt('ros.daySaved', 'Day saved.'));

  const removeDay = (day) => send(`days/${day.id}/`, { method: 'DELETE' },
    tt('ros.dayRemoved', 'Day removed.'));

  const shareUrl = sheet?.token ? `/run-of-show/${sheet.token}` : '';
  const publicUrl = sheet?.owner?.slug
    ? `/${sheet.owner.kind === 'event' ? 'events' : 'tournaments'}/${sheet.owner.slug}/run-of-show`
    : '';

  if (loading) {
    return (
      <section className={styles.card} aria-busy="true">
        <span className={styles.skelRow} />
        <span className={styles.skelRow} />
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h2 className={styles.title}>{tt('ros.panelTitle', 'Run of show')}</h2>
        <p className={styles.hint}>
          {tt('ros.panelHint', 'The minute by minute for the day: what happens, who owns it, and how long it runs. Bring in the spreadsheet you already wrote it in, then decide who may see it.')}
        </p>
      </header>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}

      {/* ------------------------------------------------------- bringing it in */}
      <div className={styles.block}>
        <h3 className={styles.blockName}>
          {sheet ? tt('ros.replaceTitle', 'Bring in a newer version')
            : tt('ros.importTitle', 'Start from your spreadsheet')}
        </h3>
        <p className={styles.blockHint}>
          {tt('ros.importHint', 'An .xlsx or a .csv. Every worksheet that looks like a running order becomes a day; the rest are left alone. The columns it reads are PHASE, ACTIVITY, OWNS IT, MATCH, STARTS, ENDS and MINS, matched by name wherever they sit.')}
        </p>

        {sheet ? (
          <div className={styles.modeRow}>
            <button type="button" aria-pressed={mode === 'replace'} disabled={busy}
                    className={`${styles.chip} ${mode === 'replace' ? styles.chipOn : ''}`}
                    onClick={() => setMode('replace')}>
              {tt('ros.modeReplace', 'Replace what is there')}
            </button>
            <button type="button" aria-pressed={mode === 'append'} disabled={busy}
                    className={`${styles.chip} ${mode === 'append' ? styles.chipOn : ''}`}
                    onClick={() => setMode('append')}>
              {tt('ros.modeAppend', 'Add more days')}
            </button>
          </div>
        ) : null}

        <div className={styles.actions}>
          <input
            ref={fileRef}
            className={styles.fileInput}
            type="file"
            accept=".xlsx,.xlsm,.csv,.tsv,.txt"
            onChange={(e) => importFile(e.target.files?.[0])}
          />
          <button type="button" className={styles.primaryBtn} disabled={busy}
                  onClick={() => fileRef.current?.click()}>
            {tt('ros.chooseFile', 'Choose a spreadsheet')}
          </button>
          <button type="button" className={styles.ghostBtn} disabled={busy}
                  onClick={() => setShowPaste((v) => !v)}>
            {showPaste ? tt('ros.pasteHide', 'Never mind')
              : tt('ros.pasteShow', 'Or paste the rows')}
          </button>
        </div>

        {showPaste ? (
          <div className={styles.pasteBox}>
            <label className={styles.label} htmlFor="ros-paste-label">
              {tt('ros.pasteLabel', 'What to call this day')}
            </label>
            <input id="ros-paste-label" className={styles.input} value={pasteLabel}
                   placeholder={tt('ros.pasteLabelHint', 'Day 1')}
                   onChange={(e) => setPasteLabel(e.target.value)} />
            <label className={styles.label} htmlFor="ros-paste">
              {tt('ros.pasteRows', 'Select the rows in your sheet, copy, and paste them here')}
            </label>
            <textarea id="ros-paste" className={styles.textarea} rows={7}
                      value={paste} onChange={(e) => setPaste(e.target.value)}
                      placeholder={'PHASE\tACTIVITY\tOWNS IT\tMATCH\tSTARTS\tENDS\tMINS'} />
            <button type="button" className={styles.primaryBtn}
                    disabled={busy || !paste.trim()} onClick={importPaste}>
              {tt('ros.importPaste', 'Bring these in')}
            </button>
          </div>
        ) : null}
      </div>

      {sheet ? (
        <>
          {/* ------------------------------------------------------ who sees it */}
          <div className={styles.block}>
            <h3 className={styles.blockName}>{tt('ros.whoSees', 'Who can see it')}</h3>
            <p className={styles.blockHint}>
              {tt('ros.whoSeesHint', 'A run of show carries staff names and what is not booked yet, so it starts private. Nothing is published until you choose it here.')}
            </p>
            <div className={styles.modeRow}>
              {VISIBILITY.map(([value, key, fallback]) => (
                <button key={value} type="button" disabled={busy}
                        aria-pressed={sheet.visibility === value}
                        className={`${styles.chip} ${sheet.visibility === value ? styles.chipOn : ''}`}
                        onClick={() => setVisibility(value)}>
                  {tt(key, fallback)}
                </button>
              ))}
            </div>

            <div className={styles.switchRow}>
              <button type="button" disabled={busy}
                      aria-pressed={sheet.show_owners}
                      className={`${styles.chip} ${sheet.show_owners ? styles.chipOn : ''}`}
                      onClick={() => setFlag('show_owners', !sheet.show_owners)}>
                {tt('ros.showOwners', 'Readers see who owns each cue')}
              </button>
              <button type="button" disabled={busy}
                      aria-pressed={sheet.show_notes}
                      className={`${styles.chip} ${sheet.show_notes ? styles.chipOn : ''}`}
                      onClick={() => setFlag('show_notes', !sheet.show_notes)}>
                {tt('ros.showNotes', 'Readers see the notes')}
              </button>
            </div>

            {sheet.visibility === 'private' ? (
              <p className={styles.blockHint}>
                {tt('ros.privateNow', 'Nobody else can open it at the moment. Choose one of the other two to share it.')}
              </p>
            ) : (
              <div className={styles.shareRow}>
                {/* Not compact here. In the console this is the control that
                    hands somebody the address, and an unlabelled icon beside a
                    row of settings is a control nobody presses. */}
                <ShareCard
                  url={sheet.visibility === 'public' && publicUrl ? publicUrl : shareUrl}
                  title={sheet.name || sheet.owner?.name || ''}
                  text={tt('ros.shareText', 'The run of show')}
                  label={tt('ros.shareLabel', 'Share the run of show')}
                />
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------ days */}
          <div className={styles.block}>
            <h3 className={styles.blockName}>{tt('ros.daysTitle', 'Days')}</h3>
            <div className={styles.dayList}>
              {sheet.days.map((day) => (
                <div key={day.id} className={styles.dayRow}>
                  <input className={styles.input} defaultValue={day.label}
                         aria-label={tt('ros.dayName', 'What this day is called')}
                         onBlur={(e) => (e.target.value !== day.label
                           ? saveDay(day, { label: e.target.value }) : null)} />
                  {/* The platform draws its own date field. A native one takes
                      its format from the browser's language rather than the
                      page's, which put mm/dd/yyyy under a French heading. */}
                  <DateField className={styles.input} name={`ros-day-${day.id}`}
                             value={day.date || ''}
                             ariaLabel={tt('ros.dayDate', 'The date it runs')}
                             onChange={(e) => saveDay(day, { date: e.target.value })} />
                  <span className={styles.count}>
                    {countCues(tt, day.items.length)}
                  </span>
                  <button type="button" className={styles.dangerBtn} disabled={busy}
                          onClick={() => removeDay(day)}>
                    {tt('ros.removeDay', 'Remove day')}
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className={styles.ghostBtn} disabled={busy}
                    onClick={addDay}>
              {tt('ros.addDay', 'Add a day')}
            </button>
          </div>

          {/* ------------------------------------------------------- one more cue */}
          <div className={styles.block}>
            <div className={styles.blockHead}>
              <h3 className={styles.blockName}>{tt('ros.addCue', 'Add a cue')}</h3>
              <button type="button" className={styles.ghostBtn}
                      onClick={() => setShowAdd((v) => !v)}>
                {showAdd ? tt('ros.close', 'Close') : tt('ros.open', 'Open')}
              </button>
            </div>

            {showAdd ? (
              <div className={styles.cueForm}>
                <select className={styles.input} value={cueDay}
                        aria-label={tt('ros.whichDay', 'Which day')}
                        onChange={(e) => setCueDay(e.target.value)}>
                  {sheet.days.map((day) => (
                    <option key={day.id} value={day.id}>{day.label}</option>
                  ))}
                </select>
                <input className={styles.input} value={cue.activity}
                       placeholder={tt('ros.fieldActivity', 'What happens')}
                       onChange={(e) => setCue((v) => ({ ...v, activity: e.target.value }))} />
                <input className={styles.input} value={cue.phase}
                       placeholder={tt('ros.fieldPhase', 'Which part of the day')}
                       onChange={(e) => setCue((v) => ({ ...v, phase: e.target.value }))} />
                <input className={styles.input} value={cue.owner}
                       placeholder={tt('ros.fieldOwner', 'Who owns it')}
                       onChange={(e) => setCue((v) => ({ ...v, owner: e.target.value }))} />
                <input className={styles.input} value={cue.match}
                       placeholder={tt('ros.fieldMatch', 'Which match, if any')}
                       onChange={(e) => setCue((v) => ({ ...v, match: e.target.value }))} />
                <input className={styles.input} value={cue.starts_at}
                       placeholder={tt('ros.fieldStarts', 'Starts, 14:30')}
                       onChange={(e) => setCue((v) => ({ ...v, starts_at: e.target.value }))} />
                <input className={styles.input} value={cue.ends_at}
                       placeholder={tt('ros.fieldEnds', 'Ends, 14:45')}
                       onChange={(e) => setCue((v) => ({ ...v, ends_at: e.target.value }))} />
                <button type="button" className={styles.primaryBtn}
                        disabled={busy || !cue.activity.trim()} onClick={addCue}>
                  {tt('ros.addIt', 'Add it')}
                </button>
              </div>
            ) : null}
          </div>

          {/* -------------------------------------------------- correcting a cue */}
          <div className={styles.block}>
            <h3 className={styles.blockName}>
              {tt('ros.correctTitle', 'Correct a cue')}
            </h3>
            <p className={styles.blockHint}>
              {tt('ros.correctHint', 'Press a row to change it. Everything below is exactly what a reader sees.')}
            </p>

            <div className={styles.cueList}>
              {sheet.days.map((day) => (
                <div key={day.id} className={styles.cueDay}>
                  <h4 className={styles.cueDayName}>{day.label}</h4>
                  {day.items.map((item) => (
                    <div key={item.id} className={styles.cueRow}>
                      {editing === item.id ? (
                        <div className={styles.cueForm}>
                          <input className={styles.input} value={editDraft.activity}
                                 placeholder={tt('ros.fieldActivity', 'What happens')}
                                 onChange={(e) => setEditDraft((v) => ({ ...v, activity: e.target.value }))} />
                          <input className={styles.input} value={editDraft.owner}
                                 placeholder={tt('ros.fieldOwner', 'Who owns it')}
                                 onChange={(e) => setEditDraft((v) => ({ ...v, owner: e.target.value }))} />
                          <input className={styles.input} value={editDraft.starts_at}
                                 placeholder={tt('ros.fieldStarts', 'Starts, 14:30')}
                                 onChange={(e) => setEditDraft((v) => ({ ...v, starts_at: e.target.value }))} />
                          <input className={styles.input} value={editDraft.ends_at}
                                 placeholder={tt('ros.fieldEnds', 'Ends, 14:45')}
                                 onChange={(e) => setEditDraft((v) => ({ ...v, ends_at: e.target.value }))} />
                          <button type="button" className={styles.primaryBtn}
                                  disabled={busy} onClick={() => saveCue(item.id)}>
                            {tt('ros.save', 'Save')}
                          </button>
                          <button type="button" className={styles.ghostBtn}
                                  onClick={() => setEditing(null)}>
                            {tt('ros.cancel', 'Cancel')}
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={styles.cueTime}>
                            {item.starts_at || '--:--'}
                          </span>
                          <span className={styles.cueName}>{item.activity}</span>
                          {item.owner ? (
                            <span className={styles.cueOwner}>{item.owner}</span>
                          ) : null}
                          <button type="button" className={styles.ghostBtn}
                                  onClick={() => {
                                    setEditing(item.id);
                                    setEditDraft({
                                      ...BLANK_CUE,
                                      activity: item.activity || '',
                                      owner: item.owner || '',
                                      starts_at: item.starts_at || '',
                                      ends_at: item.ends_at || '',
                                    });
                                  }}>
                            {tt('ros.change', 'Change')}
                          </button>
                          <button type="button" className={styles.dangerBtn}
                                  disabled={busy} onClick={() => removeCue(item.id)}>
                            {tt('ros.remove', 'Remove')}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ---------------------------------------------------------- preview */}
          <div className={styles.block}>
            <h3 className={styles.blockName}>
              {tt('ros.previewTitle', 'What a reader sees')}
            </h3>
            <div className={styles.preview}>
              <RunOfShow sheet={sheet} compact />
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
