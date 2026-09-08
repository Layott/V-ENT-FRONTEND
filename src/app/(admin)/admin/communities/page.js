'use client';

// Communities, from the console.
//
// CEO, 7 September 2026, from the admin dashboard spec: "Manage Communities:
// moderate discussions, enforce community guidelines, highlight community
// content. View Community Analytics: track community engagement and
// participation metrics."
//
// A club IS the community model on this platform - `vent_auth.Club` - so this
// reports on those rather than inventing a second thing called a community.
// One model per concept.
//
// This page READS. Moderating a single message already lives on the club
// itself, where the person doing it can see what they are moderating; a
// second place to delete a message from, with no context around it, is how
// the wrong one gets deleted.

import { useCallback, useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider } from '@/components/admin/AdminToast';
import { useAutoRefresh } from '@/lib/useLiveData';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import shared from '@/components/admin/admin.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function CommunitiesInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async ({ quiet = false } = {}) => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('adminToken') : '';
    if (!token) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      const res = await fetch(`${API}/auth/admin/communities/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        // A failed REFRESH never blanks the screen. Only the first load may
        // put an error where content was.
        if (!quiet) {
          setError(apiMessage(tt, body, 'api.couldNotLoad',
            'Could not load communities.'));
        }
      } else {
        setRows(body.data.results || []);
        setError('');
      }
    } catch {
      if (!quiet) setError(tt('api.networkProblem',
        'The network is not answering. Try again.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [search, tt]);

  useEffect(() => { load(); }, [load, tick]);
  useAutoRefresh(() => setTick((t) => t + 1), [], { interval: 30000 });

  if (authLoading) return null;

  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('adminClubs.title', 'Communities')}</h1>
              <p className={shared.pageSubtitle}>{tt('adminClubs.sub', 'Every club on the platform, how many people are in it, and how busy it is.')}</p>
            </div>
          </div>

          {error ? <p className={shared.errorText}>{error}</p> : null}

          <div className={shared.card}>
            {loading ? <p className={shared.emptyText}>{tt('ui.loading', 'Loading...')}</p>
              : rows.length === 0 ? <p className={shared.emptyText}>
                  {search ? tt('adminClubs.noneMatch', 'No community matches that.')
                    : tt('adminClubs.none', 'There are no communities yet.')}
                </p>
              : <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>{tt('adminClubs.colName', 'Community')}</th>
                      <th>{tt('adminClubs.colMembers', 'Members')}</th>
                      <th>{tt('adminClubs.colMessages', 'Messages')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(club => <tr key={club.slug}>
                        <td><strong>{club.name}</strong></td>
                        <td>{formatNumber(club.members)}</td>
                        <td>{formatNumber(club.messages)}</td>
                      </tr>)}
                  </tbody>
                </table>}
          </div>
        </main>
      </div>
    </div>;
}

export default function AdminCommunitiesPage() {
  return <AdminToastProvider><CommunitiesInner /></AdminToastProvider>;
}
