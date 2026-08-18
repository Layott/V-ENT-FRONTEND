'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './payouts.module.css'

const PAGE_SIZE = 20

const REJECT_REASONS = [
  'Insufficient documentation',
  'Bank details mismatch',
  'Suspicious activity',
  'Account under review',
  'Duplicate request',
]

function statusBadgeClass(s) {
  if (s === 'pending')  return shared.sPending
  if (s === 'approved') return shared.sApproved
  if (s === 'rejected') return shared.sRejected
  return shared.sDraft
}

function PayoutsInner() {
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [payouts, setPayouts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [sortBy, setSortBy] = useState('-submitted_at')
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [rejectPopover, setRejectPopover] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const fetchPayouts = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE, ordering: sortBy })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.status === 'success') {
        setPayouts(data.data?.results || [])
        setTotal(data.data?.count ?? (data.data?.results || []).length)
      } else {
        setError(data.message || 'Failed to load payouts.')
      }
    } catch {
      setError('Connection error.')
    } finally {
      setDataLoading(false)
    }
  }, [page, search, statusFilter, sortBy])

  useEffect(() => {
    if (!authLoading && admin) fetchPayouts()
  }, [authLoading, admin, fetchPayouts])

  useEffect(() => { setPage(1) }, [search, statusFilter, sortBy])

  async function approvePayout(id) {
    const token = localStorage.getItem('adminToken')
    setActionLoading((p) => ({ ...p, [id]: 'approve' }))
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/${id}/approve/`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push('Payout approved.', 'success')
        fetchPayouts()
      } else toast.push(data.message || 'Failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setActionLoading((p) => ({ ...p, [id]: null }))
  }

  async function rejectPayout(id, reason) {
    const token = localStorage.getItem('adminToken')
    setActionLoading((p) => ({ ...p, [id]: 'reject' }))
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/${id}/reject/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`Payout rejected - ${reason}.`, 'success')
        setRejectPopover(null)
        fetchPayouts()
      } else toast.push(data.message || 'Failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setActionLoading((p) => ({ ...p, [id]: null }))
  }

  async function bulkApprove() {
    const ids = [...selected].filter((id) => {
      const p = payouts.find((x) => x.id === id)
      return p && p.status === 'pending'
    })
    if (ids.length === 0) {
      toast.push('Select pending payouts to bulk-approve.', 'warn')
      return
    }
    const token = localStorage.getItem('adminToken')
    setBulkLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/payouts/bulk-approve/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`Bulk approved ${data.data.count} payouts.`, 'success')
        setSelected(new Set())
        fetchPayouts()
      } else toast.push(data.message || 'Bulk approve failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setBulkLoading(false)
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const pendingPayouts = payouts.filter((p) => p.status === 'pending')
  const allPendingSelected = pendingPayouts.length > 0 && pendingPayouts.every((p) => selected.has(p.id))
  function toggleSelectAll() {
    if (allPendingSelected) setSelected(new Set())
    else setSelected(new Set(pendingPayouts.map((p) => p.id)))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  if (authLoading) return null

  return (
    <div className={shared.pageContainer}>
      <div
        className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <AdminNav
        admin={admin}
        onLogout={logout}
        sidebarOpen={sidebarOpen}
        badges={{ payouts: pendingPayouts.length }}
      />
      <div className={shared.mainContainer}>
        <AdminHeader
          admin={admin}
          onLogout={logout}
          onMenuOpen={() => setSidebarOpen(true)}
          searchValue={search}
          onSearch={setSearch}
        />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>Payouts</h1>
              <p className={shared.pageSubtitle}>Review and process payout requests.</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <div className={shared.filtersRow}>
              <select
                className={shared.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                className={shared.filterSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="-submitted_at">Newest First</option>
                <option value="submitted_at">Oldest First</option>
                <option value="-amount_vc">Amount (High-Low)</option>
                <option value="amount_vc">Amount (Low-High)</option>
              </select>
              <span className={shared.resultsCount}>{total.toLocaleString()} {total === 1 ? 'payout' : 'payouts'}</span>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className={styles.bulkBar}>
                <span className={styles.bulkCount}>{selected.size} selected</span>
                <button
                  className={`${shared.actBtn} ${shared.actApprove}`}
                  onClick={bulkApprove}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? 'Approving…' : 'Bulk Approve'}
                </button>
                <button
                  className={`${shared.actBtn} ${shared.actView}`}
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
              </div>
            )}

            {dataLoading ? (
              <p className={shared.stateText}>Loading…</p>
            ) : payouts.length === 0 ? (
              <p className={shared.stateText}>No payouts found.</p>
            ) : (
              <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      {statusFilter === 'pending' && (
                        <th style={{ width: 36 }}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={allPendingSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all pending"
                          />
                        </th>
                      )}
                      <th>User</th>
                      <th>Amount VC</th>
                      <th className={shared.hideMobile}>NGN equiv.</th>
                      <th className={shared.hideMobile}>Bank</th>
                      <th className={shared.hideMobile}>Account</th>
                      <th className={shared.hideMobile}>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className={p.status !== 'pending' ? shared.rowResolved : ''}>
                        {statusFilter === 'pending' && (
                          <td>
                            {p.status === 'pending' && (
                              <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={selected.has(p.id)}
                                onChange={() => toggleSelect(p.id)}
                                aria-label={`Select ${p.username}`}
                              />
                            )}
                          </td>
                        )}
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
                          {p.status === 'pending' && (
                            <div className={shared.actGroup} style={{ position: 'relative' }}>
                              <button
                                className={`${shared.actBtn} ${shared.actApprove}`}
                                onClick={() => approvePayout(p.id)}
                                disabled={!!actionLoading[p.id]}
                              >
                                {actionLoading[p.id] === 'approve' ? '…' : 'Approve'}
                              </button>
                              <button
                                className={`${shared.actBtn} ${shared.actReject}`}
                                onClick={() => setRejectPopover(rejectPopover?.id === p.id ? null : { id: p.id, reason: REJECT_REASONS[0] })}
                                disabled={!!actionLoading[p.id]}
                              >
                                Reject
                              </button>
                              {rejectPopover?.id === p.id && (
                                <div className={styles.rejectPop}>
                                  <p className={styles.rejectLabel}>Rejection reason</p>
                                  <select
                                    className={styles.rejectSelect}
                                    value={rejectPopover.reason}
                                    onChange={(e) => setRejectPopover((prev) => ({ ...prev, reason: e.target.value }))}
                                  >
                                    {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
                                  </select>
                                  <div className={styles.rejectBtns}>
                                    <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setRejectPopover(null)}>Cancel</button>
                                    <button
                                      className={`${shared.actBtn} ${shared.actReject}`}
                                      onClick={() => rejectPayout(p.id, rejectPopover.reason)}
                                      disabled={!!actionLoading[p.id]}
                                    >
                                      {actionLoading[p.id] === 'reject' ? '…' : 'Confirm'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className={shared.pagination}>
                <span className={shared.paginationInfo}>Page {page} of {totalPages}</span>
                <div className={shared.paginationBtns}>
                  <button className={shared.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return (
                      <button key={p} className={`${shared.pageBtn} ${p === page ? shared.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
                    )
                  })}
                  <button className={shared.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminPayoutsPage() {
  return (
    <AdminToastProvider>
      <PayoutsInner />
    </AdminToastProvider>
  )
}
