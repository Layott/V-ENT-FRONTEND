'use client';

// A player picks the EAFC cards they will use, the formation they will use
// them in, and then SUBMITS the squad.
//
// CEO, 4 September 2026: "i hjave not seen the UI of where the players submit
// and how they pick".
//
// They had not, because it was not here. The endpoints for submitting and for
// the organiser's decision were built, tested and green, and this screen had
// one Save button and nothing else, so a player could build a squad for ever
// and never hand it in. That is the whole of the fault, and the three things
// it needs are below: the rules shown BEFORE the effort, a Submit that is
// separate from Save, and the answer when it comes back.
//
// The pitch is drawn from the formation the SERVER sends, coordinates and all,
// so adding a formation needs no drawing code here and the picker can never
// offer one the server would refuse. Twenty-eight formations are grouped by
// their back line, because twenty-eight loose chips is a wall rather than a
// choice.
//
// Nothing here works out whether a squad is legal. The server answers that,
// on the same engine the submit endpoint uses, and this screen shows the
// answer. A copy of the rules in the browser is the rules written twice.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import FutCard from './FutCard';
import SquadStatus, { violationText } from './SquadStatus';
import styles from './lineup-picker.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const SUBS = 7;
const RESERVES = 5;
const FIRST_SUB = 11;

/** Which band a formation belongs to, from its own name. */
function groupOf(key) {
  const first = String(key).charAt(0);
  if (first === '3') return 'three';
  if (first === '5') return 'five';
  return 'four';
}

export default function LineupPicker({ tournamentRef, token, showToast,
                                      onSubmitted }) {
  const tt = useT();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formations, setFormations] = useState([]);
  const [formation, setFormation] = useState('4-3-3');
  const [window_, setWindow] = useState(null);
  const [lineup, setLineup] = useState(null);
  const [squadRules, setSquadRules] = useState(null);
  const [violations, setViolations] = useState([]);
  const [spend, setSpend] = useState(0);
  // Whether what is on screen has been saved. Submitting reads the SAVED
  // squad, so handing in while a change is unsaved would submit the old one.
  const [dirty, setDirty] = useState(false);

  // slot index -> card
  const [picked, setPicked] = useState({});

  const [openSlot, setOpenSlot] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchAt = useRef(0);

  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

  /** Everything the server just told us about this squad, in one place. */
  const absorb = useCallback((data) => {
    if (!data) return;
    if (data.formations) setFormations(data.formations);
    if (data.window) setWindow(data.window);
    if ('squad_rules' in data) setSquadRules(data.squad_rules);
    if ('violations' in data) setViolations(data.violations || []);
    if ('spend' in data) setSpend(data.spend || 0);
    if ('lineup' in data) {
      const found = data.lineup;
      setLineup(found);
      if (found) {
        setFormation(found.formation);
        const next = {};
        for (const slot of found.slots || []) next[slot.slot_index] = slot.card || slot;
        setPicked(next);
      }
    }
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    if (!tournamentRef || !token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/lineup/`,
        { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'lineup.loadFailed', 'Could not load your lineup.'));
        return;
      }
      absorb(body.data);
      setError('');
    } catch (err) {
      setError(apiMessage(tt, err, 'lineup.loadFailed', 'Could not load your lineup.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const shape = useMemo(
    () => formations.find((f) => f.key === formation) || formations[0] || null,
    [formations, formation]);

  // Twenty-eight formations in three bands. Grouping is how a player finds
  // their own shape: somebody who plays a back three does not read the
  // eighteen names that start with a four.
  const grouped = useMemo(() => {
    const bands = { four: [], three: [], five: [] };
    for (const f of formations) bands[groupOf(f.key)].push(f);
    return [
      ['four', tt('lineup.backFour', 'Back four'), bands.four],
      ['three', tt('lineup.backThree', 'Back three'), bands.three],
      ['five', tt('lineup.backFive', 'Back five'), bands.five],
    ].filter(([, , rows]) => rows.length > 0);
  }, [formations, tt]);

  // The search, debounced. A typeahead firing on every keystroke is a request
  // per letter against somebody's data allowance.
  useEffect(() => {
    if (openSlot === null) return undefined;
    const at = ++searchAt.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const url = new URL(`${API}/cards/search/`);
        if (query.trim()) url.searchParams.set('q', query.trim());
        url.searchParams.set('limit', '24');
        const res = await fetch(url);
        const body = await res.json().catch(() => ({}));
        // A slower earlier search must not overwrite a faster later one.
        if (at !== searchAt.current) return;
        setResults(body?.data?.cards || []);
      } catch {
        if (at === searchAt.current) setResults([]);
      } finally {
        if (at === searchAt.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, openSlot]);

  const canEdit = Boolean(window_?.can_edit);

  const put = (slotIndex, card) => {
    setPicked((current) => {
      const next = { ...current };
      // The same person cannot be in the side twice, so picking them again
      // moves them rather than duplicating them. Refusing would be correct and
      // annoying; moving is what somebody meant.
      for (const [at, existing] of Object.entries(next)) {
        if (existing && existing.slug === card.slug) delete next[at];
      }
      next[slotIndex] = card;
      return next;
    });
    setDirty(true);
    setOpenSlot(null);
    setQuery('');
  };

  const clear = (slotIndex) => {
    setPicked((current) => {
      const next = { ...current };
      delete next[slotIndex];
      return next;
    });
    setDirty(true);
  };

  const chooseFormation = (key) => {
    setFormation(key);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const slots = Object.entries(picked)
        .filter(([, card]) => card)
        .map(([index, card]) => ({ slot_index: Number(index), card_id: card.id }));
      const res = await fetch(`${API}/tournament/${tournamentRef}/lineup/`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation, slots }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'lineup.saveFailed', 'That lineup was not saved.'));
        return false;
      }
      absorb(body.data);
      showToast?.(tt('lineup.saved', 'Lineup saved.'));
      return true;
    } catch (err) {
      setError(apiMessage(tt, err, 'lineup.saveFailed', 'That lineup was not saved.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Hand it in. Saves first, because submitting reads the stored squad. */
  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (dirty) {
        const ok = await save();
        if (!ok) return;
      }
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/lineup/submit/`,
        { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
          body: '{}' });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        // A refusal carries which rule and by how much, so it is shown as the
        // list rather than flattened into one sentence.
        const found = body?.violations || body?.data?.violations || [];
        if (found.length) setViolations(found);
        setError(found.length
          ? violationText(tt, found[0])
          : apiMessage(tt, body, 'lineup.submitFailed', 'That squad was not submitted.'));
        return;
      }
      setLineup(body.data.lineup);
      setViolations([]);
      showToast?.(tt('lineup.submitted', 'Squad submitted.'));
      // The organiser's queue is on the same screen when an organiser is also
      // playing, and it had already loaded. Without this it went on showing
      // the previous decision with no Accept button, next to a squad that had
      // just been handed in.
      onSubmitted?.();
    } catch (err) {
      setError(apiMessage(tt, err, 'lineup.submitFailed', 'That squad was not submitted.'));
    } finally {
      setSubmitting(false);
    }
  };

  const when = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  const deadline = () => {
    if (!window_) return '';
    if (window_.state === 'off') return tt('lineup.off', 'This tournament is not using lineups.');
    if (window_.state === 'not_yet') {
      return tt('lineup.opensAt', 'Lineups open {when}.').replace('{when}', when(window_.opens_at));
    }
    if (window_.state === 'closed') {
      return tt('lineup.closedAt', 'Lineups closed {when}.').replace('{when}', when(window_.closes_at));
    }
    if (window_.state === 'changes_only') {
      return tt('lineup.changesOnly', 'The deadline has passed. A limited change is open until {when}.')
        .replace('{when}', when(window_.closes_at));
    }
    if (window_.closes_at) {
      return tt('lineup.closesAt', 'Lineups close {when}.').replace('{when}', when(window_.closes_at));
    }
    return tt('lineup.noDeadline', 'No deadline set.');
  };

  const filled = Object.keys(picked).filter((i) => Number(i) < FIRST_SUB).length;
  const status = lineup?.status || 'draft';
  // Only what the server has actually seen may be handed in, and only when it
  // said nothing is wrong with it. Anything else and Submit would be a button
  // that fails when pressed, which is the thing the rules forbid.
  const canSubmit = canEdit && !dirty && violations.length === 0
    && status !== 'submitted' && status !== 'accepted';

  if (loading) {
    return <p className={styles.muted}>{tt('lineup.loading', 'Loading...')}</p>;
  }

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('lineup.title', 'Your lineup')}</h3>
      <p className={styles.hint}>
        {tt('lineup.hint', 'Pick the cards you will use and the formation you will use them in. Save while you are still deciding, then submit it for the organiser to check. This is what a broadcast shows as your squad.')}
      </p>
      <p className={styles.deadline}>{deadline()}</p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* The rules, and where this squad stands, ABOVE the pitch: somebody
          should know what they are building to before they build it. */}
      <SquadStatus rules={squadRules} violations={violations} spend={spend}
                   status={status} note={lineup?.review_note}
                   reviewedBy={lineup?.reviewed_by} />

      {grouped.map(([band, label, rows]) => (
        <div key={band} className={styles.formationGroup}>
          <span className={styles.groupLabel}>{label}</span>
          <div className={styles.formations}>
            {rows.map((f) => (
              <button key={f.key} type="button" disabled={!canEdit}
                      aria-pressed={f.key === formation}
                      className={`${styles.chip} ${f.key === formation ? styles.chipOn : ''}`}
                      onClick={() => chooseFormation(f.key)}>
                {f.key}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* The pitch, drawn from the server's own coordinates. */}
      <div className={styles.pitch}>
        {(shape?.slots || []).map((slot) => (
          <div key={slot.index} className={styles.spot}
               style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}>
            <FutCard size="fit" card={picked[slot.index]}
                     slotLabel={slot.position}
                     /* Only when it says something the card does not: a CM
                        played at CDM is worth marking, a CB at CB is noise. */
                     caption={picked[slot.index]
                       && picked[slot.index].position !== slot.position
                       ? slot.position : ''}
                     emptyLabel={tt('lineup.pickFor', 'Pick a card for {slot}')
                       .replace('{slot}', slot.position)}
                     removeLabel={tt('lineup.remove', 'Take this card out')}
                     onClick={canEdit ? () => setOpenSlot(slot.index) : undefined}
                     onRemove={canEdit && picked[slot.index]
                       ? () => clear(slot.index) : undefined} />
          </div>
        ))}
      </div>

      <h4 className={styles.subTitle}>{tt('lineup.bench', 'Bench')}</h4>
      <div className={styles.bench}>
        {Array.from({ length: SUBS }, (_, i) => FIRST_SUB + i).map((index) => (
          <FutCard key={index} size="fit" card={picked[index]}
                   slotLabel={String(index - FIRST_SUB + 1)}
                   emptyLabel={tt('lineup.pickSub', 'Pick a substitute')}
                   removeLabel={tt('lineup.remove', 'Take this card out')}
                   onClick={canEdit ? () => setOpenSlot(index) : undefined}
                   onRemove={canEdit && picked[index] ? () => clear(index) : undefined} />
        ))}
      </div>

      <h4 className={styles.subTitle}>{tt('lineup.reserves', 'Reserves')}</h4>
      <div className={styles.bench}>
        {Array.from({ length: RESERVES }, (_, i) => FIRST_SUB + SUBS + i).map((index) => (
          <FutCard key={index} size="fit" card={picked[index]}
                   slotLabel={String(index - FIRST_SUB - SUBS + 1)}
                   emptyLabel={tt('lineup.pickReserve', 'Pick a reserve')}
                   removeLabel={tt('lineup.remove', 'Take this card out')}
                   onClick={canEdit ? () => setOpenSlot(index) : undefined}
                   onRemove={canEdit && picked[index] ? () => clear(index) : undefined} />
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.count}>
          {tt('lineup.filled', '{n} of 11 picked').replace('{n}', String(filled))}
          {dirty && (
            <span className={styles.unsaved}>
              {' '}
              {tt('lineup.unsaved', 'Not saved yet.')}
            </span>
          )}
        </span>

        {/* Absent rather than live-and-refused when the window is shut: telling
            somebody what they need BEFORE they spend effort, not after. */}
        {canEdit && (
          <button type="button" className={styles.save} disabled={saving || submitting}
                  onClick={save}>
            {saving ? tt('lineup.saving', 'Saving...') : tt('lineup.save', 'Save draft')}
          </button>
        )}

        {canEdit && (
          <button type="button" className={styles.submit}
                  disabled={!canSubmit || saving || submitting}
                  onClick={submit}>
            {submitting
              ? tt('lineup.submitting', 'Submitting...')
              : tt('lineup.submit', 'Submit squad')}
          </button>
        )}
      </div>

      {/* Why the button cannot be pressed, said where the button is. A control
          that is merely disabled tells somebody nothing. */}
      {canEdit && !canSubmit && (
        <p className={styles.whyNot}>
          {status === 'submitted'
            ? tt('lineup.alreadyIn', 'Already submitted. Change anything and it goes back for checking.')
            : status === 'accepted'
              ? tt('lineup.alreadyAccepted', 'Accepted. Change anything and it goes back for checking.')
              : dirty
                ? tt('lineup.saveFirst', 'Save the draft first, then it can be submitted.')
                : tt('lineup.fixFirst', 'Fix what is listed above, then it can be submitted.')}
        </p>
      )}

      {openSlot !== null && (
        <div className={styles.search}>
          <div className={styles.searchHead}>
            <input className={styles.input} autoFocus value={query}
                   placeholder={tt('lineup.searchPlaceholder', 'Search a player')}
                   aria-label={tt('lineup.searchPlaceholder', 'Search a player')}
                   onChange={(e) => setQuery(e.target.value)} />
            <button type="button" className={styles.ghost}
                    onClick={() => { setOpenSlot(null); setQuery(''); }}>
              {tt('lineup.close', 'Close')}
            </button>
          </div>
          {searching && <p className={styles.muted}>{tt('lineup.searching', 'Looking...')}</p>}
          {!searching && results.length === 0 && (
            <p className={styles.muted}>
              {query.trim()
                ? tt('lineup.noResults', 'No card by that name.')
                : tt('lineup.startTyping', 'Type a name to find a card.')}
            </p>
          )}
          <div className={styles.results}>
            {results.map((card) => (
              <FutCard key={card.id} card={card} size="fit"
                       onClick={() => put(openSlot, card)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
