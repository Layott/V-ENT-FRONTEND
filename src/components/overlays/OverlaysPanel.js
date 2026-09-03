'use client';

// Uploading a stream overlay, and the URL that goes into OBS.
//
// CEO, 29 August 2026: "if users can upload html files, we should be able to
// get links to paste inside obs or vmix or any streaming software of choice",
// and "the prompt will be on the production page and should cover everything
// needed by the platform for the html that will be generated to work and to
// also keep the original design."
//
// And on 2 September: "pick from existing stream element templates for
// tournaments and events". So this panel serves both, from one component.
// A second copy for events would have drifted from this one inside a week,
// which is the whole of the one-model rule in miniature.
//
// The prompt is NOT written out here. It used to be, and the backend then
// grew its own copy with different field names, which is exactly the fault
// this feature cannot survive: a prompt that promises names the feed does not
// send produces an overlay that fills with blanks on air and reports nothing.
// One list, on the server, next to the feed that has to satisfy it.

import { apiMessage } from '@/lib/apiMessage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './overlays-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

//: How often a preview plays its load-in again. Long enough to watch an entry
//: animation finish and read the graphic, short enough that somebody who just
//: changed a picture sees it without wondering whether it worked.
const PREVIEW_REPLAY_MS = 10000;

//: The overlay's own address plus a number that changes, so the frame really
//: reloads rather than being handed the page it already has. Kept off the
//: names an overlay uses for itself: `?t=TAG` is the convention every pack
//: uses to say which team it is about, and this must not disturb it.
function replayUrl(url, n) {
  return `${url}${url.includes('?') ? '&' : '?'}vent_replay=${n}`;
}

export default function OverlaysPanel({ kind = 'tournament', ownerRef, token, showToast }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [fieldHelp, setFieldHelp] = useState([]);
  const [repeatHelp, setRepeatHelp] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  // How many times the previews have replayed.
  //
  // CEO, 3 September 2026: "THE PREVIEW SHOULD BE REPLAYING IN A LOOP AND ONCE
  // SOMETHING IS EDITED THE PREVIEW UPDATES WITH IT AND CONTINUES PREVIEWING IN
  // A LOOP. IT SHOULD SHOW HOW IT'LL LOAD ON THE LIVE."
  //
  // The overlay polls the feed by itself, so its NUMBERS were already live in
  // the preview. What that does not show is the thing an operator actually
  // wants to judge: how it arrives. A browser source loads the page once and
  // the entry animation plays once, so the only way to see the load-in again
  // is to load it again. Bumping this remounts every frame, which is a real
  // page load and therefore a real rehearsal.
  const [replay, setReplay] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const picker = useRef(null);

  const base = `${API}/${kind}/${ownerRef}/overlays/`;

  const load = useCallback(async () => {
    if (!ownerRef || !token) return;
    try {
      const res = await fetch(`${API}/${kind}/${ownerRef}/overlays/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status === 'success') {
        setRows(data.data?.overlays || []);
        setPrompt(data.data?.prompt || '');
        setFieldHelp(data.data?.field_help || []);
        setRepeatHelp(data.data?.repeat_help || []);
        setTemplates(data.data?.templates || []);
      } else {
        setError(apiMessage(tt, data, 'overlay.loadFailed', 'Could not load your overlays.'));
      }
    } catch {
      setError(tt('overlay.loadFailed', 'Could not load your overlays.'));
    } finally {
      // Always, so a failure shows the message instead of spinning for ever.
      setLoading(false);
    }
  }, [kind, ownerRef, token, tt]);

  useEffect(() => { load(); }, [load]);

  // The loop. Paused while the tab is in the background, because a stack of
  // overlays reloading behind a tab nobody is looking at is a laptop fan and
  // an organiser's data allowance.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setReplay((n) => n + 1);
    }, PREVIEW_REPLAY_MS);
    return () => clearInterval(id);
  }, []);

  // "once something is edited the preview updates with it": an upload, a
  // re-upload or a removal changes this list, and the previews start again
  // from the new file rather than waiting out the rest of the cycle.
  useEffect(() => {
    setReplay((n) => n + 1);
  }, [rows.map((r) => `${r.id}:${r.url}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setWarnings([]);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('name', file.name);
      const res = await fetch(base, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') {
        setError(apiMessage(tt, data, 'overlay.failed', 'That did not upload.'));
        return;
      }
      // Said here, at upload, rather than found on air.
      setWarnings(data.data?.warnings || []);
      showToast?.(tt('overlay.uploaded', 'Overlay uploaded.'));
      await load();
    } catch {
      setError(tt('overlay.failed', 'That did not upload.'));
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = '';
    }
  };

  const copy = async (text, mark) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(mark);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setError(tt('overlay.copyFailed', 'Could not copy. Select it and copy by hand.'));
    }
  };

  const act = async (id, what) => {
    setBusy(true);
    try {
      await fetch(`${base}${id}/${what === 'rotate' ? 'rotate/' : ''}`, {
        method: what === 'rotate' ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const startFrom = async (key) => {
    setBusy(true);
    setError('');
    setWarnings([]);
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template: key }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') {
        setError(apiMessage(tt, data, 'overlay.templateFailed', 'That template did not load.'));
        return;
      }
      setWarnings(data.data?.warnings || []);
      showToast?.(tt('overlay.templateAdded', 'Added. Copy its URL into OBS.'));
      await load();
    } catch {
      setError(tt('overlay.templateFailed', 'That template did not load.'));
    } finally {
      setBusy(false);
    }
  };

  const binding = {
    marked: kind === 'event'
      ? tt('overlay.bindingMarkedEvent', 'Follows the event')
      : tt('overlay.bindingMarked', 'Follows the tournament'),
    scripted: tt('overlay.bindingScripted', 'Draws itself from the data'),
    none: tt('overlay.bindingNone', 'Nothing on it will change'),
  };

  const hint = kind === 'event'
    ? tt('overlay.hintEvent',
      'Upload an HTML overlay and you get a URL. Paste it into OBS or vMix as a browser source and it fills itself from this event while you stream: what is on now, what is next, the door count and your sponsors.')
    : tt('overlay.hint',
      'Upload an HTML overlay and you get a URL. Paste it into OBS or vMix as a browser source and it fills itself from this tournament while you stream. Add ?t=TAG to point one at a particular team.');

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{tt('overlay.title', 'Stream overlays')}</h3>
      <p className={styles.hint}>{hint}</p>

      <div className={styles.actions}>
        <input
          ref={picker}
          className={styles.file}
          type="file"
          accept=".html,.htm"
          aria-label={tt('overlay.choose', 'Choose an HTML file')}
          onChange={(e) => upload(e.target.files?.[0])}
          disabled={busy}
        />
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setShowPrompt((was) => !was)}
        >
          {showPrompt
            ? tt('overlay.hidePrompt', 'Hide the prompt')
            : tt('overlay.showPrompt', 'Get the prompt')}
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setShowFields((was) => !was)}
        >
          {showFields
            ? tt('overlay.hideFields', 'Hide the names')
            : tt('overlay.showFields', 'What it can show')}
        </button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {warnings.length > 0 && (
        <div className={styles.warnings}>
          {warnings.map((w) => <p key={w} className={styles.warning}>{w}</p>)}
        </div>
      )}

      {showPrompt && (
        <div className={styles.promptBox}>
          <p className={styles.promptIntro}>
            {tt('overlay.promptIntro',
              'Paste this into any AI assistant together with your design file. It says everything the platform needs and tells the assistant to leave your design alone.')}
          </p>
          <textarea className={styles.prompt} readOnly rows={16} value={prompt} />
          <button
            type="button"
            className={styles.copy}
            onClick={() => copy(prompt, 'prompt')}
            disabled={!prompt}
          >
            {copied === 'prompt'
              ? tt('overlay.copied', 'Copied')
              : tt('overlay.copyPrompt', 'Copy the prompt')}
          </button>
        </div>
      )}

      {showFields && (
        <div className={styles.fieldBox}>
          <p className={styles.promptIntro}>
            {tt('overlay.fieldsIntro',
              'These are the only names the runtime fills. Anything else stays exactly as you drew it.')}
          </p>
          <div className={styles.fieldRows}>
            {fieldHelp.map((f) => (
              <div key={f.name} className={styles.fieldRow}>
                <code className={styles.fieldName}>{f.name}</code>
                <span className={styles.fieldDetail}>{f.detail}</span>
              </div>
            ))}
          </div>
          {repeatHelp.length > 0 && (
            <>
              <h5 className={styles.subTitle}>
                {tt('overlay.repeats', 'Lists you can repeat a row over')}
              </h5>
              <div className={styles.fieldRows}>
                {repeatHelp.map((r) => (
                  <div key={r.name} className={styles.fieldRow}>
                    <code className={styles.fieldName}>{r.name}</code>
                    <span className={styles.fieldDetail}>
                      {r.detail}
                      {' '}
                      <span className={styles.muted}>({r.fields.join(', ')})</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {templates.length > 0 && (
        <>
          <h4 className={styles.subTitle}>
            {tt('overlay.templates', 'Start from one of ours')}
          </h4>
          <div className={styles.templates}>
            {templates.map((t) => (
              <button
                key={t.key}
                type="button"
                className={styles.template}
                disabled={busy}
                onClick={() => startFrom(t.key)}
              >
                <span className={styles.templateName}>{t.name}</span>
                <span className={styles.templateDetail}>{t.detail}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h4 className={styles.subTitle}>{tt('overlay.yours', 'Your overlays')}</h4>
      {loading
        ? <p className={styles.muted}>{tt('overlay.loading', 'Loading your overlays.')}</p>
        : rows.length === 0
          ? <p className={styles.muted}>{tt('overlay.none', 'Nothing uploaded yet.')}</p>
          : <div className={styles.rows}>
              {rows.map((row) => (
                <div key={row.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <span className={styles.name}>{row.name}</span>
                    <span className={`${styles.binding} ${styles[`binding_${row.binding}`] || ''}`}>
                      {binding[row.binding] || row.binding}
                    </span>
                  </div>
                  {row.bound_to && (
                    <p className={styles.boundTo}>
                      {row.bound_to_kind === 'event'
                        ? tt('overlay.boundToEvent', 'Bound to the event')
                        : tt('overlay.boundToTournament', 'Bound to the tournament')}
                      {': '}
                      <strong>{row.bound_to}</strong>
                    </p>
                  )}
                  {row.bound_fields?.length > 0 && (
                    <p className={styles.boundFields}>
                      {tt('overlay.fills', 'Fills')}
                      {': '}
                      {row.bound_fields.join(', ')}
                    </p>
                  )}
                  {/* What this overlay looks like right now, playing, at the
                      size it will be on air. CEO, 3 September 2026: "the
                      overlays in the studio should always autoplays in small
                      boxes... so we can see how they'll look inside the
                      streaming software when loaded in." The built-in graphics
                      had this and the ones people upload did not, which is the
                      half that matters most: a file somebody wrote themselves
                      is the one they cannot picture.

                      It is the real overlay URL in an iframe, so it polls the
                      feed and fills itself exactly as OBS will. */}
                  <div className={styles.preview}>
                    {/* No sandbox. `allow-scripts` alone puts the frame on an
                        opaque origin, its request for the feed goes out as
                        Origin: null, and the preview shows the raw file with
                        every value still on its placeholder. Which is worse
                        than no preview, because it looks like the overlay is
                        broken. The page is served from our own API host and
                        gets no more here than when OBS opens it directly. */}
                    <iframe key={`${row.id}-${replay}`}
                            className={styles.previewFrame} title={row.name}
                            src={replayUrl(row.url, replay)} loading="lazy" />
                  </div>
                  <code className={styles.url}>{row.url}</code>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.copySmall}
                            onClick={() => copy(row.url, row.id)}>
                      {copied === row.id
                        ? tt('overlay.copied', 'Copied')
                        : tt('overlay.copyUrl', 'Copy the URL')}
                    </button>
                    <button type="button" className={styles.ghostSmall} disabled={busy}
                            onClick={() => act(row.id, 'rotate')}>
                      {tt('overlay.rotate', 'New URL')}
                    </button>
                    <button type="button" className={styles.ghostSmall} disabled={busy}
                            onClick={() => act(row.id, 'delete')}>
                      {tt('overlay.remove', 'Remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>}
    </div>
  );
}
