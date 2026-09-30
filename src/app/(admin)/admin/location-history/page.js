'use client';

/**
 * Admin: location history (inbox 305b, 305c).
 *
 * Where people said they were leaving from for an event, kept for staff after
 * the event hides it from everybody else. Only the separate
 * `view_location_history` permission reaches this page (super admin and
 * moderation admin, not the general admin role); a reason is required, and
 * every search is written to the audit log whether it finds anything or not.
 */
import { useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider } from '@/components/admin/AdminToast';
import UserChip from '@/components/user-chip/UserChip';
import shared from '@/components/admin/admin.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { adminToken } from '@/lib/adminToken';
import { formatDateTime } from '@/lib/datetime';
import { plural } from '@/lib/plural';
import styles from './location-history.module.css';

const VISIBLE_TO = {
  off: ['together.vis.off', 'Nobody'],
  mutuals: ['together.vis.mutuals', 'Mutual follows'],
  event: ['together.vis.event', 'Everyone at the event'],
  approved: ['together.vis.approved', 'Mutual follows and people I approve'],
};

function LocationHistoryInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [event, setEvent] = useState('');
  const [person, setPerson] = useState('');
  const [reason, setReason] = useState('');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ reason: reason.trim() });
      if (event.trim()) params.set('event', event.trim());
      if (person.trim()) params.set('person', person.trim().replace(/^@/, ''));
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/admin/location-history/?${params}`, {
        headers: { Authorization: `Bearer ${adminToken()}` },
      });
      const body = await res.json().catch(() => ({}));
      if (body.status === 'success') {
        setRows(body.data.results || []);
      } else {
        setError(apiMessage(tt, body, 'locationHistory.failed', 'That search could not be run.'));
      }
    } catch {
      setError(tt('msg.connectionError', 'Connection error.'));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return null;
  return <div className={shared.pageContainer}>
    <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
    <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
    <div className={shared.mainContainer}>
      <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
      <main className={shared.contentArea}>
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>{tt('locationHistory.title', 'Location history')}</h1>
            <p className={shared.pageSubtitle}>
              {tt('locationHistory.lead', 'The areas people said they were leaving from for an event. Every search is recorded in the audit log with your reason.')}
            </p>
          </div>
        </div>

        <form className={`${shared.card} ${styles.form}`} onSubmit={search}>
          <label className={styles.field}>
            <span>{tt('locationHistory.event', 'Event (its address name)')}</span>
            <input className={styles.input} value={event} onChange={(e) => setEvent(e.target.value)}
              placeholder="lagos-anime-con" />
          </label>
          <label className={styles.field}>
            <span>{tt('locationHistory.person', 'Person (username)')}</span>
            <input className={styles.input} value={person} onChange={(e) => setPerson(e.target.value)} />
          </label>
          <label className={`${styles.field} ${styles.wide}`}>
            <span>{tt('locationHistory.reason', 'Why you are looking (required, for example a report number)')}</span>
            <input className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} />
          </label>
          <button type="submit" className={`${shared.actBtn} ${shared.actView} ${styles.submit}`}
            disabled={busy || reason.trim().length < 5 || (!event.trim() && !person.trim())}>
            {busy ? tt('ui.loading.33ce', 'Loading…') : tt('locationHistory.search', 'Search')}
          </button>
        </form>

        {error && <p className={shared.errorText} role="alert">{error}</p>}

        {rows !== null && <div className={shared.card}>
          <p className={shared.resultsCount}>{plural(tt, rows.length, 'locationHistory.resultsOne', '{n} record',
            'locationHistory.resultsMany', '{n} records')}</p>
          {rows.length === 0
            ? <p className={shared.stateText}>{tt('locationHistory.none', 'Nothing was recorded for that search.')}</p>
            : <div className={shared.tableWrap}><table className={shared.table}>
              <thead><tr>
                <th>{tt('locationHistory.colPerson', 'Person')}</th>
                <th>{tt('locationHistory.colEvent', 'Event')}</th>
                <th>{tt('locationHistory.colArea', 'Area')}</th>
                <th className={shared.hideMobile}>{tt('locationHistory.colVisible', 'Shown to')}</th>
                <th>{tt('locationHistory.colWhen', 'Set')}</th>
              </tr></thead>
              <tbody>{rows.map((r, i) => <tr key={`${r.person.username}-${r.set_at}-${i}`}>
                <td><UserChip user={r.person} size={24} /></td>
                <td>{r.event.name}</td>
                <td>{r.area || '-'}</td>
                <td className={shared.hideMobile}>{tt(...(VISIBLE_TO[r.visibility] || VISIBLE_TO.off))}</td>
                <td>{formatDateTime(r.set_at)}</td>
              </tr>)}</tbody>
            </table></div>}
        </div>}
      </main>
    </div>
  </div>;
}

export default function LocationHistoryPage() {
  return <AdminToastProvider><LocationHistoryInner /></AdminToastProvider>;
}
