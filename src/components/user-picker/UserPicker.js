'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { useT } from '@/i18n/LanguageProvider';
import { mediaUrl } from '@/lib/mediaUrl';
import FounderBadge from '@/components/founder-badge/FounderBadge';
import styles from './user-picker.module.css';
import UserChip from '@/components/user-chip/UserChip';

// Choosing a person, rather than spelling their handle from memory.
//
// CEO, 4 September 2026, with a screenshot of the organisation invite form:
// "it sould be showing people with usernames closest to that on the platform,
// same for other places on the website that require you to input username and
// their profile images."
//
// It was written for the direct-message composer, which was a plain text box
// reading "Username, e.g. playr": you had to know the exact handle, get the
// capitalisation right, and found out you were wrong only after writing the
// message and pressing Send. Every other username field on the platform is that
// same text box, so this moved out of `community/` and became the field.
//
// Three things it does that a text box cannot:
//
//   * shows the picture and the real name, so two similar handles can be told
//     apart before anything is committed to;
//   * says up front when somebody cannot be picked, rather than letting the
//     action fail afterwards;
//   * works from a partial name, because people remember what somebody is
//     called more reliably than how they spell their handle.
//
// `purpose` is why the picker is open, and it decides one thing: whether a
// person can be chosen at all. Messaging honours `allow_direct_messages`, so
// somebody who has switched it off is listed and not selectable. Inviting
// somebody to an organisation, naming a scorekeeper or adding a player has no
// such rule, and applying the messaging one there would hide people from an
// organiser for a reason that has nothing to do with them.
//
// Typing is debounced and every in-flight request is aborted when the next
// keystroke arrives, so the list cannot arrive out of order and show results
// for a query that is two letters stale.

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

/**
 * @param purpose      'message' honours allow_direct_messages; anything else
 *                     lets any findable person be chosen
 * @param placeholder  overrides the default, for a field whose label is
 *                     already saying what the person is being picked FOR
 */
const UserPicker = ({
  value, onChange, onSelect, token, disabled = false, autoFocus = false,
  purpose = 'pick', placeholder, id, name,
}) => {
  const gated = purpose === 'message';
  const t = useT();
  const listId = useId();
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [picked, setPicked] = useState(null);
  const wrapRef = useRef(null);
  const abortRef = useRef(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const search = useCallback(async (query) => {
    abortRef.current?.abort();
    if (query.trim().length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/user/search/?q=${encodeURIComponent(query.trim().replace(/^@/, ''))}`,
        {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const body = await res.json();
      if (controller.signal.aborted) return;
      setResults(body?.data?.users || []);
      setHighlight(-1);
    } catch (err) {
      if (err?.name !== 'AbortError') setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (picked && picked.username === value.replace(/^@/, '')) return;
    const id = setTimeout(() => search(value), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value, search, picked]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const choose = (user) => {
    if (gated && !user.can_message) return;
    setPicked(user);
    onChange(user.username);
    onSelect?.(user);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    const usable = gated ? results.filter((r) => r.can_message) : results;
    if (!open || !usable.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % usable.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? usable.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      choose(usable[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const usable = gated ? results.filter((r) => r.can_message) : results;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        id={id}
        name={name}
        placeholder={placeholder
          || t('dm.pickerPlaceholder', 'Search for someone by name or handle')}
        value={value}
        onChange={(e) => {
          setPicked(null);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {picked && (
        <p className={styles.picked}>
          {gated
            ? t('dm.sendingTo', 'Sending to {name}').replace('{name}', '')
            : t('picker.chosen', 'Chosen:')}
          <UserChip user={picked} size={0} secondary link={false}
                    handleClassName={styles.pickedHandle} />
        </p>
      )}

      {open && value.trim().length >= MIN_QUERY && !picked && (
        <ul className={styles.list} id={listId} role="listbox">
          {loading && <li className={styles.note}>{t('dm.searching', 'Searching…')}</li>}

          {!loading && results.length === 0 && (
            <li className={styles.note}>
              {t('dm.noMatches', 'Nobody on V-ENT matches that.')}
            </li>
          )}

          {results.map((user) => {
            const index = usable.indexOf(user);
            return (
              <li key={user.user_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index >= 0 && index === highlight}
                  className={`${styles.row} ${index >= 0 && index === highlight ? styles.rowOn : ''} ${!gated || user.can_message ? '' : styles.rowOff}`}
                  disabled={gated && !user.can_message}
                  onClick={() => choose(user)}
                >
                  <span className={styles.avatar}>
                    {mediaUrl(user.avatar)
                      ? <Image src={mediaUrl(user.avatar)} alt="" aria-hidden="true" width={36} height={36} unoptimized />
                      : <span className={styles.avatarFallback}>{(user.full_name || user.username).charAt(0)}</span>}
                  </span>
                  <span className={styles.who}>
                    <span className={styles.name}>{user.full_name}{user.founder_badge && <FounderBadge size="sm" />}</span>
                    <span className={styles.handle}>@{user.username}</span>
                  </span>
                  {gated && !user.can_message && (
                    <span className={styles.closed}>
                      {t('dm.notAccepting', 'Not accepting messages')}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default UserPicker;
