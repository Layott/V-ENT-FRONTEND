'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback, useRef } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './payouts.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const PAGE_SIZE = 20;
const REJECT_REASONS = ['Insufficient documentation', 'Bank details mismatch', 'Suspicious activity', 'Account under review', 'Duplicate request'];
function statusBadgeClass(s) {
  if (s === 'pending') return shared.sPending;
  if (s === 'approved') return shared.sApproved;
  if (s === 'rejected') return shared.sRejected;
  return shared.sDraft;
}
function PayoutsInner() {
  const tx = useTx();
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const [payouts, setPayouts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sortBy, setSortBy] = useState('-submitted_at');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectPopover, setRejectPopover] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filter and page changes fire a new request while the previous one is still
  // in flight. Without a guard the slower response wins the race, so a request
  // that failed before the admin token was in localStorage could paint
  // "Connection error." over a table that had already loaded correctly. Each
  // run takes a ticket; only the newest one is allowed to touch state.
  const requestRef = useRef(0);
  const fetchPayouts = useCallback(async () => {
    const ticket = requestRef.current + 1;
    requestRef.current = ticket;
    const token = localStorage.getItem('adminToken');
    setDataLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page,
        page_size: PAGE_SIZE,
        ordering: sortBy
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (requestRef.current !== ticket) return;
      if (data.status === 'success') {
        setPayouts(data.data?.results || []);
        setTotal(data.data?.count ?? (data.data?.results || []).length);
      } else {
        setError(apiMessage(tt, data, "api.failedToLoadPayouts", "Failed to load payouts."));
      }
    } catch {
      if (requestRef.current === ticket) setError(tt("msg.connectionError", "Connection error."));
    } finally {
      if (requestRef.current !== ticket) return;
      setDataLoading(false);
    }
  }, [page, search, statusFilter, sortBy]);
  useEffect(() => {
    if (!authLoading && admin) fetchPayouts();
  }, [authLoading, admin, fetchPayouts]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);
  async function approvePayout(id) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: 'approve'
    }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/${id}/approve/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt("msg.payoutApproved", "Payout approved."), 'success');
        fetchPayouts();
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: null
    }));
  }
  async function rejectPayout(id, reason) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: 'reject'
    }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/${id}/reject/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt('admin.payoutRejected', 'Payout rejected: {reason}').replace('{reason}', reason), 'success');
        setRejectPopover(null);
        fetchPayouts();
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: null
    }));
  }
  async function bulkApprove() {
    const ids = [...selected].filter(id => {
      const p = payouts.find(x => x.id === id);
      return p && p.status === 'pending';
    });
    if (ids.length === 0) {
      toast.push(tt("msg.selectPendingPayoutsToBulk", "Select pending payouts to bulk-approve."), 'warn');
      return;
    }
    const token = localStorage.getItem('adminToken');
    setBulkLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/bulk-approve/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt('admin.bulkApproved', 'Approved {n} payouts.').replace('{n}', data.data.count), 'success');
        setSelected(new Set());
        fetchPayouts();
      } else toast.push(apiMessage(tt, data, "api.bulkApproveFailed", "Bulk approve failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setBulkLoading(false);
  }
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else next.add(id);
      return next;
    });
  }
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const allPendingSelected = pendingPayouts.length > 0 && pendingPayouts.every(p => selected.has(p.id));
  function toggleSelectAll() {
    if (allPendingSelected) setSelected(new Set());else setSelected(new Set(pendingPayouts.map(p => p.id)));
  }
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{
      payouts: pendingPayouts.length
    }} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt("ui.payouts.e0e7", "Payouts")}</h1>
              <p className={shared.pageSubtitle}>{tt("ui.review.process.payout.requests.2aa4", "Review and process payout requests.")}</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <div className={shared.filtersRow}>
              <select className={shared.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">{tt("ui.all.statuses.9cb2", "All Statuses")}</option>
                <option value="pending">{tt("ui.pending.96f6", "Pending")}</option>
                <option value="approved">{tt("ui.approved.41b8", "Approved")}</option>
                <option value="rejected">{tt("ui.rejected.27ee", "Rejected")}</option>
              </select>
              <select className={shared.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="-submitted_at">{tt("ui.newest.first.a40b", "Newest First")}</option>
                <option value="submitted_at">{tt("ui.oldest.first.06dc", "Oldest First")}</option>
                <option value="-amount_vc">{tt("ui.amount.high.low.13a9", "Amount (High-Low)")}</option>
                <option value="amount_vc">{tt("ui.amount.low.high.56f4", "Amount (Low-High)")}</option>
              </select>
              <span className={shared.resultsCount}>{(total === 1 ? tt('admin.countPayoutsOne', '{n} payout') : tt('admin.countPayoutsMany', '{n} payouts')).replace('{n}', total.toLocaleString())}</span>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && <div className={styles.bulkBar}>
                <span className={styles.bulkCount}>{selected.size} {tt("ui.selected.835f", "selected")}</span>
                <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={bulkApprove} disabled={bulkLoading}>
                  {bulkLoading ? tx("Approving…") : tx("Bulk Approve")}
                </button>
                <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setSelected(new Set())}>
                  {tt("ui.clear.719e", "Clear")}
                </button>
              </div>}

            {dataLoading ? <p className={shared.stateText}>{tt("ui.loading.33ce", "Loading…")}</p> : payouts.length === 0 ? <p className={shared.stateText}>{tt("ui.no.payouts.found.cc50", "No payouts found.")}</p> : <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      {statusFilter === 'pending' && <th style={{
                    width: 36
                  }}>
                          <input type="checkbox" className={styles.checkbox} checked={allPendingSelected} onChange={toggleSelectAll} aria-label={tt("ui.select.all.pending.c335", "Select all pending")} />
                        </th>}
                      <th>{tt("ui.user.9f8a", "User")}</th>
                      <th>{tt("ui.amount.vc.7f67", "Amount VC")}</th>
                      <th className={shared.hideMobile}>{tt("ui.ngn.equiv.8b0d", "NGN equiv.")}</th>
                      <th className={shared.hideMobile}>{tt("ui.bank.9e89", "Bank")}</th>
                      <th className={shared.hideMobile}>{tt("ui.account.85df", "Account")}</th>
                      <th className={shared.hideMobile}>{tt("ui.submitted.2e00", "Submitted")}</th>
                      <th>{tt("ui.status.bae7", "Status")}</th>
                      <th>{tt("ui.actions.c3cd", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => <tr key={p.id} className={p.status !== 'pending' ? shared.rowResolved : ''}>
                        {statusFilter === 'pending' && <td>
                            {p.status === 'pending' && <input type="checkbox" className={styles.checkbox} checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} aria-label={`Select ${p.username}`} />}
                          </td>}
                        <td>
                          <div className={shared.userCell}>
                            <div className={shared.userAvatar}>
                              {(p.username || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span>{p.username}</span>
                          </div>
                        </td>
                        <td><strong>{Number(p.amount_vc).toLocaleString()} VC</strong></td>
                        <td className={shared.hideMobile}>₦{Number(p.amount_ngn).toLocaleString()}</td>
                        <td className={shared.hideMobile}>{p.bank_name || '-'}</td>
                        <td className={shared.hideMobile}>
                          <code className={styles.code}>{p.account_number || '-'}</code>
                        </td>
                        <td className={shared.hideMobile}>
                          {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <span className={`${shared.badge} ${statusBadgeClass(p.status)}`}>{p.status}</span>
                        </td>
                        <td>
                          {p.status === 'pending' && <div className={shared.actGroup} style={{
                      position: 'relative'
                    }}>
                              <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={() => approvePayout(p.id)} disabled={!!actionLoading[p.id]}>
                                {actionLoading[p.id] === 'approve' ? '…' : tt('admin.approve', 'Approve')}
                              </button>
                              <button className={`${shared.actBtn} ${shared.actReject}`} onClick={() => setRejectPopover(rejectPopover?.id === p.id ? null : {
                        id: p.id,
                        reason: REJECT_REASONS[0]
                      })} disabled={!!actionLoading[p.id]}>
                                {tt("ui.reject.2b03", "Reject")}
                              </button>
                              {rejectPopover?.id === p.id && <div className={styles.rejectPop}>
                                  <p className={styles.rejectLabel}>{tt("ui.rejection.reason.ee59", "Rejection reason")}</p>
                                  <select className={styles.rejectSelect} value={rejectPopover.reason} onChange={e => setRejectPopover(prev => ({
                          ...prev,
                          reason: e.target.value
                        }))}>
                                    {REJECT_REASONS.map(r => <option key={r} value={r}>{tx(r)}</option>)}
                                  </select>
                                  <div className={styles.rejectBtns}>
                                    <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setRejectPopover(null)}>{tt("ui.cancel.77df", "Cancel")}</button>
                                    <button className={`${shared.actBtn} ${shared.actReject}`} onClick={() => rejectPayout(p.id, rejectPopover.reason)} disabled={!!actionLoading[p.id]}>
                                      {actionLoading[p.id] === 'reject' ? '…' : tt('admin.confirm', 'Confirm')}
                                    </button>
                                  </div>
                                </div>}
                            </div>}
                        </td>
                      </tr>)}
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
export default function AdminPayoutsPage() {
  return <AdminToastProvider>
      <PayoutsInner />
    </AdminToastProvider>;
}