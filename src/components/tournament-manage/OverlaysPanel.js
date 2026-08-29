'use client';

// Uploading a stream overlay, and the URL that goes into OBS.
//
// CEO, 29 August 2026: "if users can upload html files, we should be able to
// get links to paste inside obs or vmix or any streaming software of choice",
// and "the prompt will be on the production page and should cover everything
// needed by the platform for the html that will be generated to work and to
// also keep the original design."
//
// So the prompt is on this screen, copyable in one press, and it is the whole
// contract rather than a summary of it. Somebody pasting it into an assistant
// along with their design file should get back a file that works here and looks
// exactly as it did, without having to come back and read anything else.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './overlays-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/** The prompt, in full. Written out here rather than fetched, because the one
 *  moment somebody needs it is the moment they are looking at this screen. */
const PROMPT = `I have an HTML file for a livestream overlay. I want to upload it to V-ENT so
it fills itself from a live tournament and keeps updating while the stream runs.

Please edit my file so the parts that should follow the tournament are marked,
and change NOTHING else. Keep every style, animation, keyframe, font, gradient,
image and piece of layout exactly as it is. Do not reformat, do not tidy, do not
rename a class, and do not remove anything you think is unused. I need to open
the file afterwards and recognise it.

HOW TO MARK IT

- A single value: add data-vent="..." to the element and LEAVE ITS CURRENT TEXT
  in place as the placeholder, so the file still looks right opened on its own.
    <div class="teamname" data-vent="team.name">ALIEN X</div>

- An image: add data-vent-src="..." and leave the existing src alone.
    <img class="crest" src="logos/ax.png" data-vent-src="team.logo" alt="">

- A repeating list (standings table, roster): put data-vent-repeat="..." on the
  container and keep EXACTLY ONE child inside it as the template. Delete the
  other repeated children. Inside the template, address the row's own fields
  with no prefix.
    <tbody data-vent-repeat="standings">
      <tr><td data-vent="place">1</td><td data-vent="name">ALIEN X</td><td data-vent="won">3</td></tr>
    </tbody>

- Something that should disappear when there is no value:
    <div data-vent-show="team.won">...</div>

THE ONLY NAMES THAT EXIST

  tournament.title  tournament.game  tournament.logo
  team.tag  team.name  team.logo  team.place  team.played  team.won  team.lost
  team.points_for  team.points_against
  player.ign  player.id  player.img

  data-vent-repeat may be one of: standings, teams, players, live
  Inside a repeat use the bare field: place, tag, name, logo, played, won,
  lost, points_for, points_against, ign, id, img

Use only those names. If part of my design has no matching name, LEAVE IT
EXACTLY AS IT IS and list at the end which parts you left alone and why.

WHAT NOT TO DO

- Do not add a <script>. V-ENT injects its own runtime ahead of the file.
- Do not fetch, XMLHttpRequest or WebSocket anything. The runtime does that.
- Do not add an <iframe>.
- Do not touch document.cookie or localStorage.
- Do not add a background colour to <body> unless my design already had one:
  an overlay is composited over video and its background must stay transparent.
- Do not change the pixel dimensions of the stage. It is designed for a
  1920x1080 browser source.

WHICH TEAM IT SHOWS

The overlay is pointed at a team with ?t=TAG on its URL. Do not add any
selection logic for that: the runtime reads it and picks the team.

Give me back the complete file.`;

export default function OverlaysPanel({ tournamentRef, token, showToast }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const picker = useRef(null);

  const load = useCallback(async () => {
    if (!tournamentRef || !token) return;
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/overlays/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status === 'success') setRows(data.data?.overlays || []);
    } catch {
      // The list failing is worth less than the upload still working.
    }
  }, [tournamentRef, token]);

  useEffect(() => { load(); }, [load]);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setWarnings([]);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('name', file.name);
      const res = await fetch(`${API}/tournament/${tournamentRef}/overlays/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') {
        setError(data?.message || tt('overlay.failed', 'That did not upload.'));
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
      await fetch(`${API}/tournament/${tournamentRef}/overlays/${id}/${what === 'rotate' ? 'rotate/' : ''}`, {
        method: what === 'rotate' ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const binding = {
    marked: tt('overlay.bindingMarked', 'Follows the tournament'),
    scripted: tt('overlay.bindingScripted', 'Draws itself from the data'),
    none: tt('overlay.bindingNone', 'Nothing on it will change'),
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{tt('overlay.title', 'Stream overlays')}</h3>
      <p className={styles.hint}>
        {tt('overlay.hint',
          'Upload an HTML overlay and you get a URL. Paste it into OBS or vMix as a browser source and it fills itself from this tournament while you stream. Add ?t=TAG to point one at a particular team.')}
      </p>

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
          <textarea className={styles.prompt} readOnly rows={16} value={PROMPT} />
          <button
            type="button"
            className={styles.copy}
            onClick={() => copy(PROMPT, 'prompt')}
          >
            {copied === 'prompt'
              ? tt('overlay.copied', 'Copied')
              : tt('overlay.copyPrompt', 'Copy the prompt')}
          </button>
        </div>
      )}

      <h4 className={styles.subTitle}>{tt('overlay.yours', 'Your overlays')}</h4>
      {rows.length === 0
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
