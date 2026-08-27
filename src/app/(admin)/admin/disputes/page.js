'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback, useRef } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './disputes.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const PAGE_SIZE = 20;
function statusBadgeClass(s) {
  if (s === 'open') return shared.sPending;
  if (s === 'under_review') return shared.sOngoing;
  if (s === 'resolved') return shared.sApproved;
  if (s === 'dismissed') return shared.sDraft;
  return shared.sDraft;
}
const STATUS_LABELS = {
  open: 'open',
  under_review: 'under review',
  resolved: 'resolved',
  dismissed: 'dismissed'
};
function matchLabel(d) {
  if (d?.round_number != null && d?.match_number != null) {
    return `R${d.round_number}·M${d.match_number}`;
  }
  return '-';
}
function DisputesInner() {
  const tx = useTx();
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [resolvePopover, setResolvePopover] = useState(null);

  // Filter and page changes fire a new request while the previous one is still
  // in flight. Without a guard the slower response wins the race, so a request
  // that failed before the admin token was in localStorage could paint
  // "Connection error." over a table that had already loaded correctly. Each
  // run takes a ticket; only the newest one is allowed to touch state.
  const requestRef = useRef(0);
  const fetchDisputes = useCallback(async () => {
    const ticket = requestRef.current + 1;
    requestRef.current = ticket;
    const token = localStorage.getItem('adminToken');
    setDataLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page,
        page_size: PAGE_SIZE
      });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/disputes/?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (requestRef.current !== ticket) return;
      if (data.status === 'success') {
        const rows = data.data?.results || [];
        setDisputes(rows);
        const count = data.data?.count ?? rows.length;
        setTotal(count);
        // The default view is `open`, so its total is the badge count.
        if (statusFilter === 'open') setOpenCount(count);
      } else {
        setError(apiMessage(tt, data, "api.failedToLoadDisputes", "Failed to load disputes."));
      }
    } catch {
      if (requestRef.current === ticket) setError(tt("msg.connectionError", "Connection error."));
    } finally {
      if (requestRef.current !== ticket) return;
      setDataLoading(false);
    }
  }, [page, statusFilter]);
  useEffect(() => {
    if (!authLoading && admin) fetchDisputes();
  }, [authLoading, admin, fetchDisputes]);
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);
  async function resolveDispute(id, resolution, note) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: resolution
    }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/disputes/${id}/resolve/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resolution,
          note
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(resolution === 'dismissed'
        ? tt('admin.disputeDismissed', 'Dispute dismissed.')
        : tt('admin.disputeResolved', 'Dispute resolved.'), 'success');
        setResolvePopover(null);
        fetchDisputes();
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: null
    }));
  }
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  // Client-side narrowing over the current page for the header search box.
  const q = search.trim().toLowerCase();
  const visible = q ? disputes.filter(d => `${d.tournament_title || ''} ${d.raised_by || ''} ${d.description || ''}`.toLowerCase().includes(q)) : disputes;
  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{
      disputes: openCount
    }} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt("ui.disputes.078f", "Disputes")}</h1>
              <p className={shared.pageSubtitle}>{tt("ui.review.resolve.match.disputes.e0a7", "Review and resolve match disputes across tournaments.")}</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <div className={shared.filtersRow}>
              <select className={shared.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="open">{tt("ui.open.cf9b", "Open")}</option>
                <option value="under_review">{tt("ui.under.review.18af", "Under Review")}</option>
                <option value="resolved">{tt("ui.resolved.d999", "Resolved")}</option>
                <option value="dismissed">{tt("ui.dismissed.e8db", "Dismissed")}</option>
                <option value="all">{tt("ui.all.statuses.9cb2", "All Statuses")}</option>
              </select>
              <span className={shared.resultsCount}>{(total === 1 ? tt('admin.countDisputesOne', '{n} dispute') : tt('admin.countDisputesMany', '{n} disputes')).replace('{n}', total.toLocaleString())}</span>
            </div>

            {dataLoading ? <p className={shared.stateText}>{tt("ui.loading.33ce", "Loading…")}</p> : visible.length === 0 ? <p className={shared.stateText}>{tt("ui.no.disputes.found.48a5", "No disputes found.")}</p> : <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>{tt("ui.tournament.a2c1", "Tournament")}</th>
                      <th>{tt("ui.match.0335", "Match")}</th>
                      <th>{tt("ui.raised.7992", "Raised by")}</th>
                      <th className={shared.hideMobile}>{tt("ui.description.55f8", "Description")}</th>
                      <th>{tt("ui.status.bae7", "Status")}</th>
                      <th className={shared.hideMobile}>{tt("ui.created.accf", "Created")}</th>
                      <th>{tt("ui.actions.c3cd", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(d => {
                  const actionable = d.status === 'open' || d.status === 'under_review';
                  return <tr key={d.id} className={!actionable ? shared.rowResolved : ''}>
                          <td><strong>{d.tournament_title || '-'}</strong></td>
                          <td>{matchLabel(d)}</td>
                          <td>
                            <div className={shared.userCell}>
                              <div className={shared.userAvatar}>
                                {(d.raised_by || 'U').slice(0, 2).toUpperCase()}
                              </div>
                              <span>{d.raised_by || '-'}</span>
                            </div>
                          </td>
                          <td className={shared.hideMobile}>
                            <span className={styles.descCell} title={d.description || ''}>
                              {d.description || '-'}
                            </span>
                          </td>
                          <td>
                            <span className={`${shared.badge} ${statusBadgeClass(d.status)}`}>
                              {STATUS_LABELS[d.status] || d.status}
                            </span>
                          </td>
                          <td className={shared.hideMobile}>
                            {d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td>
                            {actionable && <div className={shared.actGroup} style={{
                        position: 'relative'
                      }}>
                                <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={() => setResolvePopover(resolvePopover?.id === d.id && resolvePopover?.resolution === 'resolved' ? null : {
                          id: d.id,
                          resolution: 'resolved',
                          note: ''
                        })} disabled={!!actionLoading[d.id]}>
                                  {actionLoading[d.id] === 'resolved' ? '…' : tt('admin.resolve', 'Resolve')}
                                </button>
                                <button className={`${shared.actBtn} ${shared.actReject}`} onClick={() => setResolvePopover(resolvePopover?.id === d.id && resolvePopover?.resolution === 'dismissed' ? null : {
                          id: d.id,
                          resolution: 'dismissed',
                          note: ''
                        })} disabled={!!actionLoading[d.id]}>
                                  {actionLoading[d.id] === 'dismissed' ? '…' : tt('admin.dismiss', 'Dismiss')}
                                </button>
                                {resolvePopover?.id === d.id && <div className={styles.resolvePop}>
                                    <p className={styles.resolveLabel}>
                                      {resolvePopover.resolution === 'dismissed' ? tx("Dismiss dispute") : tx("Resolve dispute")}
                                    </p>
                                    <textarea className={styles.resolveTextarea} placeholder={tt("ui.resolution.note.optional.f47b", "Resolution note (optional)")} rows={3} value={resolvePopover.note} onChange={e => setResolvePopover(prev => ({
                            ...prev,
                            note: e.target.value
                          }))} />
                                    <div className={styles.resolveBtns}>
                                      <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setResolvePopover(null)}>
                                        {tt("ui.cancel.77df", "Cancel")}
                                      </button>
                                      <button className={`${shared.actBtn} ${resolvePopover.resolution === 'dismissed' ? shared.actReject : shared.actApprove}`} onClick={() => resolveDispute(d.id, resolvePopover.resolution, resolvePopover.note)} disabled={!!actionLoading[d.id]}>
                                        {actionLoading[d.id] ? '…' : tt('admin.confirm', 'Confirm')}
                                      </button>
                                    </div>
                                  </div>}
                              </div>}
                          </td>
                        </tr>;
                })}
                  </tbody>
                </table>
              </div>}

            {totalPages > 1 && <div className={shared.pagination}>
                <span className={shared.paginationInfo}>{tt("ui.page.fb06", "Page")} {page} of {totalPages}</span>
                <div className={shared.paginationBtns}>
                  <button className={shared.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({
                length: Math.min(5, totalPages)
              }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return <button key={p} className={`${shared.pageBtn} ${p === page ? shared.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
                  <button className={shared.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              </div>}
          </div>
        </main>
      </div>
    </div>;
}
export default function AdminDisputesPage() {
  return <AdminToastProvider>
      <DisputesInner />
    </AdminToastProvider>;
}