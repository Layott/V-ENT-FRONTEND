'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { useT } from '@/i18n/LanguageProvider';
import { mediaUrl } from '@/lib/mediaUrl';
import FounderBadge from '@/components/founder-badge/FounderBadge';
import styles from './user-picker.module.css';

// Choosing a person, rather than spelling their handle from memory.
//
// The direct-message composer was a plain text box reading "Username, e.g.
// playr". You had to know the exact handle, get the capitalisation right, and
// you found out you were wrong only after writing the message and pressing
// Send. There was no user search endpoint at all until now.
//
// Three things this does that the text box could not:
//
//   * shows the picture and the real name, so you can tell two similar handles
//     apart before you write anything;
//   * says up front when somebody does not accept messages, rather than
//     letting the send fail with a 403 afterwards;
//   * works from a partial name, because people remember what somebody is
//     called more reliably than how they spell their handle.
//
// Typing is debounced and every in-flight request is aborted when the next
// keystroke arrives, so the list cannot arrive out of order and show results
// for a query that is two letters stale.

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

const UserPicker = ({ value, onChange, onSelect, token, disabled = false, autoFocus = false }) => {
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
    if (!user.can_message) return;
    setPicked(user);
    onChange(user.username);
    onSelect?.(user);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    const usable = results.filter((r) => r.can_message);
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

  const usable = results.filter((r) => r.can_message);

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
        placeholder={t('dm.pickerPlaceholder', 'Search for someone by name or handle')}
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
          {t('dm.sendingTo', 'Sending to {name}').replace('{name}', picked.full_name)}
          {' '}
          <span className={styles.pickedHandle}>@{picked.username}</span>
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
                  className={`${styles.row} ${index >= 0 && index === highlight ? styles.rowOn : ''} ${user.can_message ? '' : styles.rowOff}`}
                  disabled={!user.can_message}
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
                  {!user.can_message && (
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
