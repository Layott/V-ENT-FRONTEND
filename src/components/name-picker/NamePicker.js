'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl, teamLogo } from '@/lib/mediaUrl';
import styles from '../user-picker/user-picker.module.css';
import UserChip from '@/components/user-chip/UserChip';
import Avatar from '@/components/avatar/Avatar';

// Choosing a person, a team or an organisation from what you remember of its
// name, rather than spelling it exactly.
//
// CEO, 8 October 2026 (inbox 416): "it should show users with that name close
// to what you typed ... anywhere you have to input a team, player or
// organization name should also trigger drop-downs with similar users or
// accounts that have similar name." Then, on whether somebody who switched
// "Indexable in search" off should appear: "people should be able to do rough
// searches and still find who they were looking for".
//
// This began as the people picker in the direct-message composer (4
// September). It is the same field for all three kinds now, because a team
// picker and an organisation picker written separately would be three copies
// of the debounce, the abort and the keyboard handling, and the third one
// would be the one that forgot to abort.
//
// The server does the forgiving match for every kind (vent_auth/fuzzy.py): a
// person through /user/search/ with purpose=pick, a team through
// /team/list-teams/, an organisation through /organization/list/. The value
// handed back is the reference the rest of the platform resolves: a username
// for a person, a slug for a team or an organisation.
//
// Typing is debounced and every in-flight request is aborted when the next
// keystroke arrives, so the list cannot arrive out of order and show results
// for a query that is two letters stale.

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;
const MAX_ROWS = 8;
const enc = encodeURIComponent;

// What a typed email looks like. A field that also takes an email (pay a
// referral to, hand a stall to, make somebody an admin) keeps the email as
// typed and asks the server nothing about it: a person search cannot answer
// for an address and should not be shown one.
const looksLikeEmail = (value) => /^[^@\s]+@[^@\s]+$/.test(value.trim());

const KINDS = {
  user: {
    path: (q) => `/user/search/?q=${enc(q.replace(/^@/, ''))}&purpose=pick`,
    rows: (body) => body?.data?.users || [],
    key: (row) => `user-${row.user_id}`,
    value: (row) => row.username || '',
  },
  team: {
    path: (q) => `/team/list-teams/?search=${enc(q)}`,
    rows: (body) => body?.data?.teams || [],
    key: (row) => `team-${row.slug || row.team_id || row.id}`,
    value: (row) => row.slug || '',
  },
  org: {
    path: (q) => `/organization/list/?search=${enc(q)}`,
    rows: (body) => body?.data?.organizations || [],
    key: (row) => `org-${row.slug || row.org_id || row.id}`,
    value: (row) => row.slug || '',
  },
};

/**
 * @param kind         'user' (default), 'team' or 'org'
 * @param purpose      'message' honours allow_direct_messages; anything else
 *                     lets any findable person be chosen (people only)
 * @param allowEmail   the field also takes an email address, kept as typed
 * @param placeholder  overrides the default, for a field whose label is
 *                     already saying what is being picked FOR
 */
const NamePicker = ({
  kind = 'user', value, onChange, onSelect, token, disabled = false, autoFocus = false,
  purpose = 'pick', allowEmail = false, placeholder, id, name, ariaLabel,
}) => {
  const cfg = KINDS[kind] || KINDS.user;
  const gated = kind === 'user' && purpose === 'message';
  const t = useT();
  const listId = useId();
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // A search that could not reach the server said "Nobody on V-ENT matches
  // that", which sends somebody retyping a name that exists.
  const [searchError, setSearchError] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const [picked, setPicked] = useState(null);
  const wrapRef = useRef(null);
  const abortRef = useRef(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const text = String(value || '');
  const isEmail = allowEmail && looksLikeEmail(text);

  const search = useCallback(async (query) => {
    abortRef.current?.abort();
    if (query.trim().length < MIN_QUERY || (allowEmail && looksLikeEmail(query))) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setSearchError('');
    try {
      const res = await fetch(`${apiBase}${cfg.path(query.trim())}`, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!res.ok || body?.status !== 'success') {
        setResults([]);
        setSearchError(apiMessage(t, body, 'dm.searchFailed', 'The search did not reach the server.'));
        return;
      }
      setResults(cfg.rows(body).slice(0, MAX_ROWS));
      setHighlight(-1);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setResults([]);
        setSearchError(apiMessage(t, err, 'dm.searchFailed', 'The search did not reach the server.'));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    // `t` is read for the error sentence only; it changes identity on most
    // renders and naming it would rebuild the debounced search each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, token, kind, allowEmail]);

  // The debounce fires through a ref, so it restarts when what somebody TYPED
  // changes and for no other reason. Naming `search` in the timer effect would
  // restart it on every render the day `search` stops being stable, and the
  // search would silently stop happening.
  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; }, [search]);

  useEffect(() => {
    if (picked && cfg.value(picked) === text.replace(/^@/, '')) return undefined;
    const timer = setTimeout(() => searchRef.current(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, picked]);

  // A different kind (the admin forms switch person / team / organisation
  // above the field) is a different question, so what was picked goes.
  useEffect(() => { setPicked(null); setResults([]); }, [kind]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const choose = (row) => {
    if (gated && !row.can_message) return;
    setPicked(row);
    onChange(cfg.value(row));
    onSelect?.(row);
    setOpen(false);
  };

  const usable = gated ? results.filter((r) => r.can_message) : results;

  const onKeyDown = (e) => {
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

  const defaultPlaceholder = kind === 'team'
    ? t('picker.findTeam', 'Start typing a team name')
    : kind === 'org'
      ? t('picker.findOrg', 'Start typing an organisation name')
      : t('dm.pickerPlaceholder', 'Search for someone by name or handle');

  const noMatches = kind === 'team'
    ? t('picker.noTeams', 'No team on V-ENT matches that.')
    : kind === 'org'
      ? t('picker.noOrgs', 'No organisation on V-ENT matches that.')
      : t('dm.noMatches', 'Nobody on V-ENT matches that.');

  const showList = open && !picked && !isEmail && text.trim().length >= MIN_QUERY;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel || placeholder || defaultPlaceholder}
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        id={id}
        name={name}
        placeholder={placeholder || defaultPlaceholder}
        value={text}
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
          {kind === 'user'
            ? <UserChip user={picked} size={0} secondary link={false}
                        handleClassName={styles.pickedHandle} />
            : <span className={styles.pickedHandle}> {picked.name}</span>}
        </p>
      )}

      {showList && (
        <ul className={styles.list} id={listId} role="listbox">
          {loading && <li className={styles.note}>{t('dm.searching', 'Searching…')}</li>}

          {!loading && searchError && <li className={styles.note}>{searchError}</li>}

          {!loading && !searchError && results.length === 0 && (
            <li className={styles.note}>{noMatches}</li>
          )}

          {results.map((row) => {
            const index = usable.indexOf(row);
            const on = index >= 0 && index === highlight;
            const off = gated && !row.can_message;
            return (
              <li key={cfg.key(row)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`${styles.row} ${on ? styles.rowOn : ''} ${off ? styles.rowOff : ''}`}
                  disabled={off}
                  onClick={() => choose(row)}
                >
                  {kind === 'user' ? <>
                    <span className={styles.avatar}>
                      <Avatar src={mediaUrl(row.avatar)} name={row.username || row.full_name} size={36} />
                    </span>
                    <span className={styles.who}>
                      <span className={styles.name}>
                        <UserChip user={row} size={0} link={false} />
                      </span>
                      <span className={styles.handle}>@{row.username}</span>
                    </span>
                    {off && (
                      <span className={styles.closed}>
                        {t('dm.notAccepting', 'Not accepting messages')}
                      </span>
                    )}
                  </> : <>
                    <span className={styles.avatar}>
                      <Avatar src={mediaUrl(kind === 'team' ? teamLogo(row) : row.logo)}
                              name={row.name} size={36} />
                    </span>
                    <span className={styles.who}>
                      <span className={styles.name}>{row.name}</span>
                      <span className={styles.handle}>
                        {[row.tag, kind === 'team' ? (row.game || row.core_game) : row.region]
                          .filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NamePicker;
