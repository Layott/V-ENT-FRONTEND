'use client';

// Every kind of record on the site, and a search across all of them (inbox
// 420, CEO 8 October 2026: "Let it work as a proper CMS for the entire site, if
// we add a new feature let it automatically build the control on the admin
// dashboard ... should be able to check all info for specific").
//
// The list comes from the server, which reads every model Django knows
// (vent_auth/records.py), so a model added next month is here the day it is
// migrated. Why not Django's own admin: docs/adr/0001-admin-records-own-view.md
// in the backend.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { fuzzyFilter } from '@/lib/fuzzy';
import { kindHref, recordHref, recordsCall } from '@/lib/adminRecords';
import styles from './records.module.css';

function RecordsInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const { ok, body } = await recordsCall('/');
    if (ok) setData(body.data);
    else setError(apiMessage(tt, body, 'adminRecords.loadFailed', 'The records could not be loaded.'));
  }, [tt]);

  useEffect(() => {
    if (!authLoading && admin) load();
  }, [authLoading, admin, load]);

  const search = async (event) => {
    event.preventDefault();
    if (q.trim().length < 2) return;
    setSearching(true);
    setSearchError('');
    const { ok, body } = await recordsCall(`/search/?q=${encodeURIComponent(q.trim())}`);
    setSearching(false);
    if (ok) setFound(body.data.results || []);
    else setSearchError(apiMessage(tt, body, 'adminRecords.searchFailed', 'The search did not work. Try again.'));
  };

  const groups = useMemo(() => {
    if (!data) return [];
    if (!filter.trim()) return data.groups;
    return data.groups
      .map((g) => ({ ...g, models: fuzzyFilter(g.models, filter, ['name', 'key']) }))
      .filter((g) => g.models.length);
  }, [data, filter]);

  const kinds = data ? data.groups.reduce((n, g) => n + g.models.length, 0) : 0;

  if (authLoading) return null;
  return (
    <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('adminRecords.title', 'Records')}</h1>
              <p className={shared.pageSubtitle}>
                {tt('adminRecords.subtitle', 'Every record on the site, by kind. Open one to see all of it, change it, or put it in the bin.')}
              </p>
            </div>
            <Link href="/admin/records/bin" className={styles.quiet}>{tt('adminRecords.binLink', 'The bin')}</Link>
          </div>

          <div className={`${shared.card} ${styles.sections}`}>
            <form className={styles.toolbar} onSubmit={search} role="search">
              <input className={styles.input} type="search" value={q} onChange={(e) => setQ(e.target.value)}
                     aria-label={tt('adminRecords.searchLabel', 'Search every record by name')}
                     placeholder={tt('adminRecords.searchPlaceholder', 'Search every record by name, typos are fine')} />
              <button type="submit" className={styles.button} disabled={searching || q.trim().length < 2}>
                {searching ? tt('adminRecords.searching', 'Searching...') : tt('adminRecords.search', 'Search')}
              </button>
            </form>
            {searchError && <p className={shared.errorText}>{searchError}</p>}
            {found && (found.length === 0
              ? <p className={shared.stateText}>{tt('adminRecords.noMatches', 'Nothing matches that name.')}</p>
              : <div className={styles.linked}>
                  {found.map((g) => (
                    <div key={g.model}>
                      <h2 className={styles.linkedTitle}>{g.name}</h2>
                      <ul className={styles.list}>
                        {g.rows.map((r) => (
                          <li key={r.pk}>
                            <Link className={styles.rowLink} href={recordHref(g.model, r.pk)}>
                              <span className={styles.rowName}>{r.label}</span>
                              <span className={styles.pk}>#{r.pk}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>)}
          </div>

          <div className={`${shared.card} ${styles.spaced}`}>
            {error ? (
              <div>
                <p className={shared.errorText}>{error}</p>
                <button type="button" className={styles.quiet} onClick={load}>{tt('admin.retry', 'Try again')}</button>
              </div>
            ) : !data ? (
              <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>
            ) : (
              <>
                <div className={styles.toolbar}>
                  <input className={styles.input} value={filter} onChange={(e) => setFilter(e.target.value)}
                         aria-label={tt('adminRecords.filterLabel', 'Find a kind of record')}
                         placeholder={tt('adminRecords.filterPlaceholder', 'Find a kind of record: tickets, clubs, wallets...')} />
                  <span className={styles.count}>
                    {tt('adminRecords.kindsCount', '{n} kinds').replace('{n}', formatNumber(kinds))}
                  </span>
                </div>
                {groups.length === 0
                  ? <p className={shared.stateText}>{tt('adminRecords.noKinds', 'No kind of record matches that.')}</p>
                  : <div className={styles.groups}>
                      {groups.map((g) => (
                        <section key={g.app} aria-label={tt(`adminRecords.app.${g.app}`, g.name)}>
                          <h2 className={styles.groupTitle}>{tt(`adminRecords.app.${g.app}`, g.name)}</h2>
                          <ul className={styles.kinds}>
                            {g.models.map((m) => (
                              <li key={m.key}>
                                <Link className={styles.rowLink} href={kindHref(m.key)}>
                                  <span className={styles.rowName}>{m.name}</span>
                                  {m.money && <span className={styles.tag}>{tt('adminRecords.money', 'Money')}</span>}
                                  <span className={styles.count}>{formatNumber(m.count)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminRecordsPage() {
  return <AdminToastProvider><RecordsInner /></AdminToastProvider>;
}
