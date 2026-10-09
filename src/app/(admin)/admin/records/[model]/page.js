'use client';

// The records of one kind (inbox 420): searchable by name with the forgiving
// match, newest first, fifty to a page. A kind with no name column is found by
// its number.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { recordHref, recordsCall } from '@/lib/adminRecords';
import styles from '../records.module.css';

function KindInner() {
  const tt = useT();
  const { model } = useParams();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set('q', query);
    const { ok, body } = await recordsCall(`/${model}/?${params.toString()}`);
    setLoading(false);
    if (ok) setData(body.data);
    else setError(apiMessage(tt, body, 'adminRecords.loadFailed', 'The records could not be loaded.'));
  }, [model, page, query, tt]);

  useEffect(() => {
    if (!authLoading && admin) load();
  }, [authLoading, admin, load]);

  const submit = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(q.trim());
  };

  if (authLoading) return null;
  return (
    <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <Link href="/admin/records" className={shared.sectionLink}>{tt('adminRecords.backToKinds', 'All kinds of record')}</Link>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{data ? data.name : model}</h1>
              <p className={shared.pageSubtitle}>
                {data && tt('adminRecords.kindCount', '{n} records').replace('{n}', formatNumber(data.count))}
                {data && data.money && <> <span className={styles.tag}>{tt('adminRecords.moneyViewOnly', 'Money: view only')}</span></>}
              </p>
            </div>
          </div>

          <div className={shared.card}>
            <form className={styles.toolbar} onSubmit={submit} role="search">
              <input className={styles.input} type="search" value={q} onChange={(e) => setQ(e.target.value)}
                     aria-label={tt('adminRecords.searchKindLabel', 'Search these records')}
                     placeholder={data && !data.searchable
                       ? tt('adminRecords.searchByNumber', 'Find one by its number')
                       : tt('adminRecords.searchKind', 'Search by name, typos are fine')} />
              <button type="submit" className={styles.button}>{tt('adminRecords.search', 'Search')}</button>
            </form>

            {error ? (
              <div>
                <p className={shared.errorText}>{error}</p>
                <button type="button" className={styles.quiet} onClick={load}>{tt('admin.retry', 'Try again')}</button>
              </div>
            ) : loading && !data ? (
              <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>
            ) : data.rows.length === 0 ? (
              <p className={shared.stateText}>
                {query ? tt('adminRecords.noMatches', 'Nothing matches that name.') : tt('adminRecords.noneOfKind', 'There are none of these yet.')}
              </p>
            ) : (
              <>
                <ul className={styles.list}>
                  {data.rows.map((r) => (
                    <li key={r.pk}>
                      <Link className={styles.rowLink} href={recordHref(data.model, r.pk)}>
                        <span className={styles.rowName}>{r.label}</span>
                        <span className={styles.pk}>#{r.pk}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {data.pages > 1 && (
                  <div className={styles.actions}>
                    <button type="button" className={styles.quiet} disabled={page <= 1 || loading}
                            onClick={() => setPage((p) => p - 1)}>{tt('adminRecords.previous', 'Previous')}</button>
                    <span className={styles.count}>
                      {tt('adminRecords.pageOf', 'Page {page} of {pages}').replace('{page}', page).replace('{pages}', data.pages)}
                    </span>
                    <button type="button" className={styles.quiet} disabled={page >= data.pages || loading}
                            onClick={() => setPage((p) => p + 1)}>{tt('adminRecords.next', 'Next')}</button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminRecordKindPage() {
  return <AdminToastProvider><KindInner /></AdminToastProvider>;
}
