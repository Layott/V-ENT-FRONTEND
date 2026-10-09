'use client';

// What has been deleted from the records and can come back (inbox 420): kept
// 90 days, then thrown away by a nightly job. Restoring puts the record and
// everything that went with it back exactly as they were. Throwing one away
// before its time is a super admin's alone, because it is the one thing in
// the records that cannot be undone.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, formatDateTime, formatNumber } from '@/lib/datetime';
import { recordsCall } from '@/lib/adminRecords';
import styles from '../records.module.css';

function BinInner() {
  const tt = useT();
  const toast = useAdminToast();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [purging, setPurging] = useState(null);

  const load = useCallback(async (query = '') => {
    setError('');
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    const { ok, body } = await recordsCall(`/bin/${params}`);
    if (ok) setData(body.data);
    else setError(apiMessage(tt, body, 'adminRecords.binFailed', 'The bin could not be loaded.'));
  }, [tt]);

  useEffect(() => {
    if (!authLoading && admin) load();
  }, [authLoading, admin, load]);

  const restore = async (row) => {
    setBusy(true);
    const { ok, body } = await recordsCall(`/bin/${row.id}/restore/`, { method: 'POST', body: JSON.stringify({}) });
    setBusy(false);
    if (ok) {
      toast.push(tt('adminRecords.restored', 'Restored, with everything that went with it.'), 'success');
      load(q.trim());
    } else {
      toast.push(apiMessage(tt, body, 'adminRecords.restoreFailed', 'That could not be restored.'), 'error');
    }
  };

  const purge = async () => {
    setBusy(true);
    const { ok, body } = await recordsCall(`/bin/${purging.id}/`, { method: 'DELETE' });
    setBusy(false);
    setPurging(null);
    if (ok) {
      toast.push(tt('adminRecords.purged', 'Gone for good.'), 'success');
      load(q.trim());
    } else {
      toast.push(apiMessage(tt, body, 'adminRecords.purgeFailed', 'That could not be thrown away.'), 'error');
    }
  };

  const summary = (counts) => Object.values(counts || {}).reduce((a, b) => a + b, 0);

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
              <h1 className={shared.pageTitle}>{tt('adminRecords.binTitle', 'The bin')}</h1>
              <p className={shared.pageSubtitle}>
                {tt('adminRecords.binSubtitle', 'Records deleted from the console, kept for {days} days. Restoring puts back everything that went with them.').replace('{days}', data ? data.days : 90)}
              </p>
            </div>
          </div>

          <div className={shared.card}>
            <form className={styles.toolbar} role="search" onSubmit={(e) => { e.preventDefault(); load(q.trim()); }}>
              <input className={styles.input} type="search" value={q} onChange={(e) => setQ(e.target.value)}
                     aria-label={tt('adminRecords.binSearch', 'Search the bin')}
                     placeholder={tt('adminRecords.binSearch', 'Search the bin')} />
              <button type="submit" className={styles.button}>{tt('adminRecords.search', 'Search')}</button>
            </form>
            {error ? (
              <div>
                <p className={shared.errorText}>{error}</p>
                <button type="button" className={styles.quiet} onClick={() => load(q.trim())}>{tt('admin.retry', 'Try again')}</button>
              </div>
            ) : !data ? (
              <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>
            ) : data.rows.length === 0 ? (
              <p className={shared.stateText}>{tt('adminRecords.binEmpty', 'The bin is empty.')}</p>
            ) : (
              <ul className={styles.versions}>
                {data.rows.map((row) => (
                  <li key={row.id} className={styles.version}>
                    <div className={styles.versionHead}>
                      <strong>{row.label}</strong>
                      <span className={styles.pk}>{row.model} #{row.pk}</span>
                      <span>{tt('adminRecords.deletedBy', 'Deleted {when} by {who}').replace('{when}', formatDateTime(row.deleted_at)).replace('{who}', row.deleted_by || tt('adminRecords.someone', 'An admin'))}</span>
                    </div>
                    <p className={styles.change}>
                      {row.soft
                        ? tt('adminRecords.binSoft', 'Hidden from the site; nothing else went with it.')
                        : tt('adminRecords.binCount', '{n} records went with it').replace('{n}', formatNumber(summary(row.counts)))}
                    </p>
                    {row.reason && <p className={styles.note}>{row.reason}</p>}
                    <p className={styles.count}>{tt('adminRecords.purgeOn', 'Thrown away on {date}').replace('{date}', formatDate(row.purge_after))}</p>
                    <div className={styles.actions}>
                      {data.may_restore && (
                        <button type="button" className={styles.button} disabled={busy} onClick={() => restore(row)}>
                          {tt('adminRecords.restore', 'Restore')}
                        </button>
                      )}
                      {data.may_purge && (
                        <button type="button" className={styles.danger} disabled={busy} onClick={() => setPurging(row)}>
                          {tt('adminRecords.purge', 'Throw away now')}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>

      {purging && (
        <div className={shared.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="purge-title">
          <div className={shared.modal}>
            <h2 id="purge-title" className={shared.modalTitle}>{tt('adminRecords.purgeTitle', 'Throw this away for good?')}</h2>
            <p className={shared.modalSub}>
              {tt('adminRecords.purgeSub', '{label} cannot be restored after this. Everything else about it stays in the audit log.').replace('{label}', purging.label)}
            </p>
            <div className={shared.modalActions}>
              <button type="button" className={styles.quiet} onClick={() => setPurging(null)}>{tt('adminRecords.cancel', 'Cancel')}</button>
              <button type="button" className={styles.danger} disabled={busy} onClick={purge}>{tt('adminRecords.purgeConfirm', 'Throw it away')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminRecordsBinPage() {
  return <AdminToastProvider><BinInner /></AdminToastProvider>;
}
