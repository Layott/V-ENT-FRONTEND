'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { LuTicket, LuCheck, LuUsers } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './attendees.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const AttendeesContent = ({ slug: slugFromPath }) => {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;
  const eventId = slugFromPath || searchParams.get('id');

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ count: 0, checked_in: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [scanState, setScanState] = useState(null); // { ok, message }
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    if (!token || !eventId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/event/${eventId}/attendees/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(body.message || 'Could not load the attendee list.');
        setRows([]);
        return;
      }
      setRows(body.data.attendees || []);
      setCounts({ count: body.data.count || 0, checked_in: body.data.checked_in || 0 });
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => { load(); }, [load]);

  const checkIn = async (ticketCode) => {
    const value = (ticketCode || '').trim().toUpperCase();
    if (!value) return;
    setChecking(true);
    setScanState(null);
    try {
      const res = await fetch(`${API}/event/ticket/${encodeURIComponent(value)}/check-in/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      setScanState({ ok: body.status === 'success', message: body.message });
      if (body.status === 'success') {
        setCode('');
        load();
      }
    } catch {
      setScanState({ ok: false, message: 'Connection error.' });
    } finally {
      setChecking(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.attendee_name, r.username, r.code, r.tier].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [rows, search]);

  const body = () => {
    if (!eventId) return <p className={styles.stateText}>No event selected.</p>;
    if (loading) return <p className={styles.stateText}>Loading attendees…</p>;
    if (error) {
      return (
        <div className={styles.errorBox}>
          <p className={styles.errorTitle}>{error}</p>
          <p className={styles.errorSub}>Only the organizer of this event can see its attendee list.</p>
          <Link href="/events" className={styles.backLink}>← Back to events</Link>
        </div>
      );
    }

    return (
      <>
        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <LuTicket className={styles.statIcon} />
            <div>
              <p className={styles.statValue}>{counts.count}</p>
              <p className={styles.statLabel}>Tickets sold</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <LuCheck className={styles.statIcon} />
            <div>
              <p className={styles.statValue}>{counts.checked_in}</p>
              <p className={styles.statLabel}>Checked in</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <LuUsers className={styles.statIcon} />
            <div>
              <p className={styles.statValue}>{Math.max(counts.count - counts.checked_in, 0)}</p>
              <p className={styles.statLabel}>Still expected</p>
            </div>
          </div>
        </div>

        <div className={styles.scanCard}>
          <p className={styles.scanTitle}>Check someone in</p>
          <div className={styles.scanRow}>
            <input
              className={styles.scanInput}
              placeholder="Ticket code, e.g. VT-9L57BUDE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') checkIn(code); }}
            />
            <button
              className={`${styles.scanBtn} grnBTN`}
              onClick={() => checkIn(code)}
              disabled={checking || !code.trim()}
              type="button"
            >
              {checking ? 'Checking…' : 'Check in'}
            </button>
          </div>
          {scanState && (
            <p className={scanState.ok ? styles.scanOk : styles.scanErr}>{scanState.message}</p>
          )}
        </div>

        <div className={styles.searchRow}>
          <CiSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name, username, code or tier"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className={styles.stateText}>
            {rows.length === 0 ? 'No tickets sold yet.' : 'Nobody matches that search.'}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Ticket</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Checked in</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.code}>
                    <td>
                      <span className={styles.name}>{r.attendee_name || r.full_name || r.username}</span>
                      <span className={styles.handle}>@{r.username}</span>
                    </td>
                    <td className={styles.code}>{r.code}</td>
                    <td>{r.tier}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge_${r.status}`] || ''}`}>
                        {r.status === 'checked_in' ? 'checked in' : r.status}
                      </span>
                    </td>
                    <td className={styles.muted}>
                      {r.checked_in_at ? new Date(r.checked_in_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <Link href={`/events/${eventId || ''}`} className={styles.backLink}>← Back to event</Link>
            <h1 className={styles.pageTitle}>Door list</h1>
            <p className={styles.pageSubtitle}>Everyone holding a ticket, and who has arrived.</p>
          </div>
          {body()}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

const Attendees = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <AttendeesContent />
  </Suspense>
);

export default Attendees;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { AttendeesContent };
