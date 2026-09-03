'use client';

// A player picks the EAFC cards they will use, and the formation they will
// use them in.
//
// CEO, 3 September 2026: "a way to get the eafc cards that the players wanted
// to use as their lineup for the next matches."
//
// The pitch is drawn from the formation the SERVER sends, coordinates and all,
// so adding a formation needs no drawing code here and the picker can never
// offer one the server would refuse. The same list feeds the overlay, which is
// why a lineup looks the same in the console as it does on air.
//
// The deadline is the organiser's, and it is shown before it matters rather
// than discovered on a refused save.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import FutCard from './FutCard';
import styles from './lineup-picker.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const SUBS = 7;
const RESERVES = 5;
const FIRST_SUB = 11;

export default function LineupPicker({ tournamentRef, token, showToast }) {
  const tt = useT();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formations, setFormations] = useState([]);
  const [formation, setFormation] = useState('4-3-3');
  const [window_, setWindow] = useState(null);
  // slot index -> card
  const [picked, setPicked] = useState({});

  const [openSlot, setOpenSlot] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchAt = useRef(0);

  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

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
      setFormations(body.data.formations || []);
      setWindow(body.data.window || null);
      const lineup = body.data.lineup;
      if (lineup) {
        setFormation(lineup.formation);
        const next = {};
        for (const slot of lineup.slots || []) next[slot.slot_index] = slot.card || slot;
        setPicked(next);
      }
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
    setOpenSlot(null);
    setQuery('');
  };

  const clear = (slotIndex) => setPicked((current) => {
    const next = { ...current };
    delete next[slotIndex];
    return next;
  });

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
        return;
      }
      setWindow(body.data.window || window_);
      showToast?.(tt('lineup.saved', 'Lineup saved.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'lineup.saveFailed', 'That lineup was not saved.'));
    } finally {
      setSaving(false);
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

  if (loading) {
    return <p className={styles.muted}>{tt('lineup.loading', 'Loading...')}</p>;
  }

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('lineup.title', 'Your lineup')}</h3>
      <p className={styles.hint}>
        {tt('lineup.hint', 'Pick the cards you will use and the formation you will use them in. This is what a broadcast shows as your squad.')}
      </p>
      <p className={styles.deadline}>{deadline()}</p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.formations}>
        {formations.map((f) => (
          <button key={f.key} type="button" disabled={!canEdit}
                  aria-pressed={f.key === formation}
                  className={`${styles.chip} ${f.key === formation ? styles.chipOn : ''}`}
                  onClick={() => setFormation(f.key)}>
            {f.key}
          </button>
        ))}
      </div>

      {/* The pitch, drawn from the server's own coordinates. */}
      <div className={styles.pitch}>
        {(shape?.slots || []).map((slot) => (
          <div key={slot.index} className={styles.spot}
               style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}>
            <FutCard size="sm" card={picked[slot.index]}
                     slotLabel={slot.position}
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
          <FutCard key={index} size="sm" card={picked[index]}
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
          <FutCard key={index} size="sm" card={picked[index]}
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
        </span>
        {/* Absent rather than live-and-refused when the window is shut: telling
            somebody what they need BEFORE they spend effort, not after. */}
        {canEdit && (
          <button type="button" className={styles.save} disabled={saving}
                  onClick={save}>
            {saving ? tt('lineup.saving', 'Saving...') : tt('lineup.save', 'Save lineup')}
          </button>
        )}
      </div>

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
              <FutCard key={card.id} card={card} size="md"
                       onClick={() => put(openSlot, card)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
