'use client';

// The operator's control for the words on an overlay.
//
// CEO, 4 September 2026, inbox row 52: "also should be able to add text, change
// the font size, color, position, animation of that text also on any overlay".
//
// "Any overlay" is both of the two kinds this platform has: a graphic V-ENT
// draws, and an HTML file an organiser designed and uploaded. They differ in
// nothing but the address, so this is one component with two bases rather than
// two components that would have drifted inside a week. That drift is the exact
// fault the parity checker exists for, and it has happened five times in a day
// here already.
//
// ## Two things this must not do, both learned on this platform
//
// **It must not render a control that cannot work.** The decision is made on
// session STATUS, never on session data, because data alone cannot tell "signed
// out" from "still asking". A viewer who may not run this broadcast gets no add
// button, and the API refuses them anyway. Both halves, always: the interface
// hides the control, the API is what actually stops anybody.
//
// **A layer is not saved by leaving the box.** The operator presses save and
// the panel says what happened, naming the words that were saved. Somebody
// watching a match does not look back at a form to check that it took.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useViewer } from '@/lib/gating';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import styles from './text-layer-editor.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// The pixel nudge the studio already allows off an anchor. Same number as the
// graphic's own nudge in StudioPanel, because a layer and the graphic under it
// are moved around the same 1920x1080 frame.
const NUDGE_LIMIT = 800;

// The four built in families. Deliberately short: a broadcast look with eleven
// typefaces in it is not a look. An organiser who needs their own puts it in
// the font slot beside this.
const familyLabels = (tt) => ({
  house: tt('layers.fam.house', 'V-ENT house'),
  condensed: tt('layers.fam.condensed', 'Condensed'),
  display: tt('layers.fam.display', 'Display'),
  accent: tt('layers.fam.accent', 'Headline'),
});

// Three weights, not a free number. A weight a face does not have is drawn
// synthetically by the browser and it looks wrong on air.
const weightLabels = (tt) => ({
  400: tt('layers.w.regular', 'Regular'),
  600: tt('layers.w.semibold', 'Semibold'),
  800: tt('layers.w.heavy', 'Heavy'),
});

const alignLabels = (tt) => ({
  left: tt('layers.a.left', 'Left'),
  centre: tt('layers.a.centre', 'Centre'),
  right: tt('layers.a.right', 'Right'),
});

// The nine places on the frame, said in the reader's language. The KEYS are the
// server's own catalogue and the words are the ones the console already uses
// for a graphic's position, so an operator reads the same nine names whether
// they are moving a scorebar or the words on top of it.
//
// No `as_designed` here, unlike a graphic: a run of words has no design of its
// own to sit where, so offering it would be offering a choice that does
// nothing. The parent may pass the server's list instead, and then this is only
// the fallback for a console that has not been given one.
const positionLabels = (tt) => ({
  top_left: tt('studio.pos.topLeft', 'Top left'),
  top_centre: tt('studio.pos.topCentre', 'Top centre'),
  top_right: tt('studio.pos.topRight', 'Top right'),
  middle_left: tt('studio.pos.middleLeft', 'Middle left'),
  centre: tt('studio.pos.centre', 'Middle'),
  middle_right: tt('studio.pos.middleRight', 'Middle right'),
  bottom_left: tt('studio.pos.bottomLeft', 'Bottom left'),
  bottom_centre: tt('studio.pos.bottomCentre', 'Bottom centre'),
  bottom_right: tt('studio.pos.bottomRight', 'Bottom right'),
});

const entryLabels = (tt) => ({
  rise: tt('studio.entry.rise', 'Rises in'),
  fade: tt('studio.entry.fade', 'Fades in'),
  slide_left: tt('studio.entry.slideLeft', 'Slides in from the left'),
  slide_right: tt('studio.entry.slideRight', 'Slides in from the right'),
  none: tt('studio.entry.none', 'Just appears'),
});

const exitLabels = (tt) => ({
  fade: tt('studio.exit.fade', 'Fades out'),
  drop: tt('studio.exit.drop', 'Drops away'),
  slide_left: tt('studio.exit.slideLeft', 'Slides out left'),
  slide_right: tt('studio.exit.slideRight', 'Slides out right'),
  none: tt('studio.exit.none', 'Just goes'),
});

// What a new layer starts as. White, heavy, bottom centre, fading in: legible
// on any footage, and where a caption belongs unless somebody says otherwise.
const BLANK = {
  text: '',
  field: '',
  font_size: '64',
  colour: '#FFFFFF',
  family: 'house',
  font_slot: '',
  weight: '800',
  align: 'centre',
  position: 'bottom_centre',
  offset_x: '0',
  offset_y: '0',
  entry: 'fade',
  exit: 'fade',
  delay_ms: '0',
  duration_ms: '0',
  is_active: true,
};

const COLOUR = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/** What a number box holds while it is being typed in.
 *
 *  Digits and one leading minus, and NOT clamped here. Clamping on every
 *  keystroke turns 16 into 8 the moment the 1 is typed and then into 86, which
 *  is a box nobody can type a small number into. The clamp belongs at save,
 *  where the whole value exists.
 */
const digits = (text) => String(text).replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');

/** A typed box as the number the API takes. */
const clamp = (text, min, max, fallback) => {
  const cleaned = digits(text);
  if (cleaned === '' || cleaned === '-') return fallback;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

/** The server's order: `order` first, then `id`, so two layers created in the
 *  same second still paint in a stable order. Mirrored here so a list the
 *  console has just changed is in the order the feed will send it back in. */
const inOrder = (list) => [...list].sort(
  (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || (Number(a.id) - Number(b.id)));

/** A layer as its own row is labelled: the words it draws, or the value it
 *  reads when it has no words of its own. */
const wordsOf = (row) => String(row?.text || '').trim() || String(row?.field || '').trim();

/**
 * Every text layer on one graphic, or on one uploaded overlay.
 *
 * A studio graphic:
 *   <TextLayerEditor ownerKind="event" ownerRef={ref}
 *                    sessionId={live.id} elementKind="lower_third" />
 *
 * An uploaded file:
 *   <TextLayerEditor ownerKind="tournament" ownerRef={ref} overlayId={o.id} />
 *
 * `canEdit` is how a parent that already knows the viewer may not run this
 * broadcast narrows it further. Signed in is proven here from the session's own
 * status and is never assumed; this is the extra the console can add on top.
 *
 * `positions`, `entrances` and `exits` take the server's own catalogues when
 * the parent has them, which it does on a live session. Without them the lists
 * above are used, and they are the same names.
 */
export default function TextLayerEditor({
  ownerKind = 'tournament',
  ownerRef,
  sessionId,
  elementKind,
  overlayId,
  canEdit = true,
  positions,
  entrances,
  exits,
}) {
  const tt = useT();
  const viewer = useViewer();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  // Which row the form is open on: a layer id, the string 'new', or nothing.
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);
  // Remove asks twice. A single press beside four other buttons, on a laptop,
  // during a match, is how a layer gets deleted by the wrong finger.
  const [confirmId, setConfirmId] = useState(null);

  const FAMILY = familyLabels(tt);
  const WEIGHT = weightLabels(tt);
  const ALIGN = alignLabels(tt);
  const PLACE = positionLabels(tt);
  const ENTRY = entryLabels(tt);
  const EXIT = exitLabels(tt);

  const placeNames = positions?.length
    ? positions.filter((p) => p !== 'as_designed') : Object.keys(PLACE);
  const entryNames = entrances?.length ? entrances : Object.keys(ENTRY);
  const exitNames = exits?.length ? exits : Object.keys(EXIT);

  // The two addresses, which are the only thing that differs between a layer on
  // a graphic V-ENT draws and a layer on a file an organiser uploaded.
  const base = overlayId
    ? `${API}/${ownerKind}/${ownerRef}/overlays/${overlayId}/layers/`
    : `${API}/${ownerKind}/${ownerRef}/studio/sessions/${sessionId}/element/${elementKind}/layers/`;

  const ready = Boolean(ownerRef && (overlayId || (sessionId && elementKind)));

  /** The list out of a response, when the response carries one.
   *
   *  Returns false when it does not, and the caller reloads instead. The
   *  contract fixes the request shape and the envelope but does not say what
   *  the four writes put in `data`, so this reads a list if one is there and
   *  asks again if it is not. A console showing a layer that was not saved is
   *  worse than a second request.
   */
  const take = (body) => {
    const list = body?.data?.layers;
    if (!Array.isArray(list)) return false;
    setRows(inOrder(list));
    return true;
  };

  const load = useCallback(async (quiet = false) => {
    if (!viewer.token || !ready) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(base, {
        headers: { Authorization: `Bearer ${viewer.token}` },
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(inOrder(body.data?.layers || []));
        setError('');
      } else {
        setError(apiMessage(tt, body, 'layers.loadFailed',
          'Could not load the text on this overlay.'));
      }
    } catch (err) {
      setError(apiMessage(tt, err, 'layers.loadFailed',
        'Could not load the text on this overlay.'));
    } finally {
      setLoading(false);
    }
  }, [base, ready, viewer.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setConfirmId(null);
    setError('');
    setNote('');
    // A new layer goes on top of the ones already there, which is what somebody
    // adding one during a show expects.
    setDraft({ ...BLANK });
    setEditing('new');
  };

  const openEdit = (row) => {
    setConfirmId(null);
    setError('');
    setNote('');
    setDraft({
      text: row.text || '',
      field: row.field || '',
      font_size: String(row.font_size ?? 64),
      colour: row.colour || '#FFFFFF',
      family: row.family || 'house',
      font_slot: row.font_slot || '',
      weight: String(row.weight ?? 800),
      align: row.align || 'centre',
      position: row.position || 'bottom_centre',
      offset_x: String(row.offset_x ?? 0),
      offset_y: String(row.offset_y ?? 0),
      entry: row.entry || 'fade',
      exit: row.exit || 'fade',
      delay_ms: String(row.delay_ms ?? 0),
      duration_ms: String(row.duration_ms ?? 0),
      is_active: row.is_active !== false,
    });
    setEditing(row.id);
  };

  const close = () => { setEditing(null); setDraft(BLANK); };

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const payloadOf = (d) => ({
    text: d.text.trim(),
    field: d.field.trim(),
    font_size: clamp(d.font_size, 8, 400, 64),
    colour: d.colour.trim().toUpperCase(),
    family: d.family,
    font_slot: d.font_slot.trim(),
    weight: clamp(d.weight, 400, 800, 800),
    align: d.align,
    position: d.position,
    offset_x: clamp(d.offset_x, -NUDGE_LIMIT, NUDGE_LIMIT, 0),
    offset_y: clamp(d.offset_y, -NUDGE_LIMIT, NUDGE_LIMIT, 0),
    entry: d.entry,
    exit: d.exit,
    delay_ms: clamp(d.delay_ms, 0, 60000, 0),
    duration_ms: clamp(d.duration_ms, 0, 600000, 0),
    is_active: d.is_active !== false,
  });

  const write = async (url, payload) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${viewer.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && body.status === 'success', body };
  };

  const submit = async () => {
    // Two things the console can see for itself, said before the round trip
    // rather than after it. Both go through a key, so they are read in the
    // operator's own language like every other refusal.
    if (!draft.text.trim() && !draft.field.trim()) {
      setError(tt('layers.needWords',
        'Type the words, or name a value to read from this broadcast.'));
      return;
    }
    if (!COLOUR.test(draft.colour.trim())) {
      setError(tt('layers.badColour',
        'A colour looks like #F2D024, six characters after the hash.'));
      return;
    }

    setBusy(true);
    setError('');
    setNote('');
    try {
      const making = editing === 'new';
      const payload = payloadOf(draft);
      if (making) payload.order = rows.length;
      const { ok, body } = await write(making ? base : `${base}${editing}/`, payload);
      if (!ok) {
        setError(apiMessage(tt, body, 'layers.saveFailed', 'That text was not saved.'));
        return;
      }
      if (!take(body)) await load(true);
      setNote((making
        ? tt('layers.added', '{words} added.')
        : tt('layers.saved', '{words} saved.'))
        .replace('{words}', wordsOf(payload) || tt('layers.thisText', 'This text')));
      close();
    } catch (err) {
      setError(apiMessage(tt, err, 'layers.saveFailed', 'That text was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  /** Switched off, not deleted. What an operator does to a layer mid show when
   *  it is in the way of something, and wants back two minutes later. */
  const toggle = async (row) => {
    setBusy(true);
    setError('');
    setNote('');
    setConfirmId(null);
    try {
      const on = row.is_active === false;
      const { ok, body } = await write(`${base}${row.id}/`, { is_active: on });
      if (!ok) {
        setError(apiMessage(tt, body, 'layers.saveFailed', 'That text was not saved.'));
        return;
      }
      if (!take(body)) await load(true);
      setNote((on
        ? tt('layers.switchedOn', '{words} is on again.')
        : tt('layers.switchedOff', '{words} is switched off.'))
        .replace('{words}', wordsOf(row) || tt('layers.thisText', 'This text')));
    } catch (err) {
      setError(apiMessage(tt, err, 'layers.saveFailed', 'That text was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (confirmId !== row.id) { setConfirmId(row.id); setNote(''); setError(''); return; }
    setBusy(true);
    setError('');
    setNote('');
    setConfirmId(null);
    try {
      const res = await fetch(`${base}${row.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!(res.ok && body.status === 'success')) {
        setError(apiMessage(tt, body, 'layers.removeFailed', 'That text was not removed.'));
        return;
      }
      if (!take(body)) await load(true);
      if (editing === row.id) close();
      setNote(tt('layers.removed', '{words} removed.')
        .replace('{words}', wordsOf(row) || tt('layers.thisText', 'This text')));
    } catch (err) {
      setError(apiMessage(tt, err, 'layers.removeFailed', 'That text was not removed.'));
    } finally {
      setBusy(false);
    }
  };

  /** Paint order, which is also z order: low first, so the last row in the list
   *  is the one on top.
   *
   *  The whole list is renumbered rather than two values swapped. Two layers can
   *  legitimately hold the same `order`, both created at zero, and swapping two
   *  equal numbers moves nothing while telling the operator it did.
   */
  const move = async (row, delta) => {
    const at = rows.findIndex((r) => r.id === row.id);
    const to = at + delta;
    if (at === -1 || to < 0 || to >= rows.length) return;

    const next = [...rows];
    next.splice(to, 0, next.splice(at, 1)[0]);
    const changed = next
      .map((r, i) => ({ id: r.id, order: i, was: Number(r.order) || 0 }))
      .filter((r) => r.was !== r.order);

    setBusy(true);
    setError('');
    setNote('');
    setConfirmId(null);
    try {
      for (const one of changed) {
        // Sequential on purpose. These are the same field on rows that are read
        // together, and firing them at once leaves the order down to whichever
        // request the server happens to finish first.
        // eslint-disable-next-line no-await-in-loop
        const { ok, body } = await write(`${base}${one.id}/`, { order: one.order });
        if (!ok) {
          setError(apiMessage(tt, body, 'layers.orderFailed', 'The order was not saved.'));
          await load(true);
          return;
        }
      }
      await load(true);
      setNote(tt('layers.reordered', 'The order was saved.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'layers.orderFailed', 'The order was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  // Wired without the address it needs. Nothing is drawn rather than a panel
  // that would answer 404 on every press.
  if (!ready) return null;

  const heading = overlayId
    ? tt('layers.titleOverlay', 'Text on this overlay')
    : tt('layers.title', 'Text on this graphic');

  const numberField = (key, label, hint) => (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input className={styles.input} inputMode="numeric" value={draft[key]}
             onChange={(e) => set(key, digits(e.target.value))} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );

  return (
    <section className={styles.wrap}>
      <h4 className={styles.title}>{heading}</h4>
      <p className={styles.sub}>
        {tt('layers.sub', 'Words drawn on top, in your own colour and typeface. Each one can arrive on its own beat and sit anywhere on the frame, and can read a live value instead of saying the same thing all night.')}
      </p>

      {error && <p className={styles.error}>{error}</p>}
      {note && <p className={styles.note}>{note}</p>}

      {loading && <p className={styles.muted}>{tt('layers.loading', 'Loading...')}</p>}

      {!loading && rows.length === 0 && (
        <p className={styles.empty}>
          {tt('layers.none', 'No text on this one yet.')}
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div className={styles.rows}>
          {rows.map((row, i) => (
            <div key={row.id}
                 className={`${styles.row} ${row.is_active === false ? styles.rowOff : ''}`}>
              {/* The layer's own colour. Data, not a token: it is the client's
                  brand over live video, and the operator is the person who
                  knows what the sponsor's red is. */}
              <span className={styles.swatch}
                    style={{ background: COLOUR.test(String(row.colour || '')) ? row.colour : '#FFFFFF' }} />
              <span className={styles.rowMain}>
                <span className={styles.rowWords}>
                  {wordsOf(row) || tt('layers.thisText', 'This text')}
                </span>
                <span className={styles.rowMeta}>
                  {[
                    `${row.font_size}px`,
                    FAMILY[row.family] || row.family,
                    PLACE[row.position] || row.position,
                    ENTRY[row.entry] || row.entry,
                    row.field ? row.field : null,
                    row.duration_ms
                      ? tt('layers.forMs', 'for {n} ms').replace('{n}', String(row.duration_ms))
                      : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </span>
              {row.is_active === false && (
                <span className={styles.tag}>{tt('layers.offTag', 'Off')}</span>
              )}
              {viewer.signedIn && canEdit && (
                <span className={styles.rowActions}>
                  <button type="button" className={styles.ghost} disabled={busy || i === 0}
                          onClick={() => move(row, -1)}>
                    {tt('layers.up', 'Up')}
                  </button>
                  <button type="button" className={styles.ghost}
                          disabled={busy || i === rows.length - 1}
                          onClick={() => move(row, 1)}>
                    {tt('layers.down', 'Down')}
                  </button>
                  <button type="button" className={styles.ghost} disabled={busy}
                          onClick={() => toggle(row)}>
                    {row.is_active === false
                      ? tt('layers.switchOn', 'Switch on')
                      : tt('layers.switchOff', 'Switch off')}
                  </button>
                  <button type="button" className={styles.ghost} disabled={busy}
                          onClick={() => openEdit(row)}>
                    {tt('layers.edit', 'Edit')}
                  </button>
                  <button type="button" className={styles.danger} disabled={busy}
                          onClick={() => remove(row)}>
                    {confirmId === row.id
                      ? tt('layers.reallyRemove', 'Press again to remove')
                      : tt('layers.remove', 'Remove')}
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {viewer.signedIn && canEdit && editing !== null && (
        <div className={styles.form}>
          <p className={styles.formHead}>
            {editing === 'new'
              ? tt('layers.newHead', 'New text')
              : tt('layers.editHead', 'Editing this text')}
          </p>

          <div className={styles.fields}>
            <label className={`${styles.field} ${styles.wide}`}>
              <span className={styles.label}>{tt('layers.words', 'The words')}</span>
              <input className={styles.input} value={draft.text}
                     placeholder="GRAND FINAL"
                     onChange={(e) => set('text', e.target.value)} />
            </label>

            <label className={`${styles.field} ${styles.wide}`}>
              <span className={styles.label}>{tt('layers.field', 'Or a live value')}</span>
              <input className={styles.input} value={draft.field}
                     placeholder="tournament.title"
                     onChange={(e) => set('field', e.target.value)} />
              <span className={styles.hint}>
                {tt('layers.fieldHint', 'Read from this broadcast and kept up to date on air. When it is empty the words above are drawn instead.')}
              </span>
            </label>

            {numberField('font_size', tt('layers.size', 'Size, in pixels'),
              tt('layers.sizeHint', 'Measured on a 1920 by 1080 frame, which is what your streaming software adds.'))}

            <label className={styles.field}>
              <span className={styles.label}>{tt('layers.colour', 'Colour')}</span>
              <span className={styles.colourRow}>
                <input type="color" className={styles.colourInput}
                       aria-label={tt('layers.colourPick', 'Pick a colour')}
                       value={COLOUR.test(draft.colour) ? draft.colour.slice(0, 7) : '#FFFFFF'}
                       onChange={(e) => set('colour', e.target.value.toUpperCase())} />
                <input className={`${styles.input} ${styles.hexInput}`}
                       aria-label={tt('layers.colourHex', 'Or type the hex')}
                       placeholder="#F2D024" value={draft.colour}
                       onChange={(e) => set('colour', e.target.value)} />
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('layers.family', 'Typeface')}</span>
              <select className={styles.select} value={draft.family}
                      onChange={(e) => set('family', e.target.value)}>
                {Object.entries(FAMILY).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('layers.slot', 'Or a font you uploaded')}</span>
              <input className={styles.input} value={draft.font_slot}
                     placeholder="hero"
                     onChange={(e) => set('font_slot', e.target.value)} />
              <span className={styles.hint}>
                {tt('layers.slotHint', 'The name you gave a font in the studio. It wins over the typeface above.')}
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('layers.weight', 'Weight')}</span>
              <select className={styles.select} value={draft.weight}
                      onChange={(e) => set('weight', e.target.value)}>
                {Object.entries(WEIGHT).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('layers.align', 'Aligned')}</span>
              <select className={styles.select} value={draft.align}
                      onChange={(e) => set('align', e.target.value)}>
                {Object.entries(ALIGN).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('studio.position', 'Sits')}</span>
              <select className={styles.select} value={draft.position}
                      onChange={(e) => set('position', e.target.value)}>
                {placeNames.map((value) => (
                  <option key={value} value={value}>{PLACE[value] || value}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('studio.nudge', 'Nudge, in pixels')}</span>
              <span className={styles.nudge}>
                <input className={`${styles.input} ${styles.nudgeInput}`} inputMode="numeric"
                       aria-label={tt('studio.nudgeX', 'Across')} value={draft.offset_x}
                       onChange={(e) => set('offset_x', digits(e.target.value))} />
                <input className={`${styles.input} ${styles.nudgeInput}`} inputMode="numeric"
                       aria-label={tt('studio.nudgeY', 'Down')} value={draft.offset_y}
                       onChange={(e) => set('offset_y', digits(e.target.value))} />
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('studio.entry', 'Arrives')}</span>
              <select className={styles.select} value={draft.entry}
                      onChange={(e) => set('entry', e.target.value)}>
                {entryNames.map((value) => (
                  <option key={value} value={value}>{ENTRY[value] || value}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{tt('studio.exit', 'Leaves')}</span>
              <select className={styles.select} value={draft.exit}
                      onChange={(e) => set('exit', e.target.value)}>
                {exitNames.map((value) => (
                  <option key={value} value={value}>{EXIT[value] || value}</option>
                ))}
              </select>
            </label>

            {numberField('delay_ms', tt('layers.delay', 'Appears after, in ms'),
              tt('layers.delayHint', 'So a name can land a beat after the title above it.'))}

            {numberField('duration_ms', tt('layers.duration', 'Stays for, in ms'),
              tt('layers.durationHint', 'Zero keeps it up until the graphic itself goes.'))}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.primary} disabled={busy}
                    onClick={() => submit()}>
              {busy ? tt('layers.saving', 'Saving...') : tt('layers.save', 'Save')}
            </button>
            <button type="button" className={styles.ghost} disabled={busy} onClick={close}>
              {tt('ui.cancel.77df', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* The add control. `NeedsAccount` renders nothing while the session is
          still being decided, the button once somebody is signed in, and one
          sentence with a way in when they are not. Nobody is ever handed a
          control that answers 401 after they have filled it in. */}
      {editing === null && (
        <div className={styles.addRow}>
          <NeedsAccount action={tt('layers.action', 'put text on a broadcast overlay')}>
            {canEdit && (
              <button type="button" className={styles.primary} disabled={busy}
                      onClick={openNew}>
                {tt('layers.add', 'Add text')}
              </button>
            )}
          </NeedsAccount>
          {viewer.signedIn && canEdit && error && (
            <button type="button" className={styles.ghost} disabled={busy}
                    onClick={() => load()}>
              {tt('layers.tryAgain', 'Try again')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
