'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './audit-log.module.css'

const PAGE_SIZE = 50

const ACTION_BADGE = {
  user_banned:          { cls: 'actionBan',     label: 'Ban' },
  user_unbanned:        { cls: 'actionApprove', label: 'Unban' },
  kyc_approved:         { cls: 'actionApprove', label: 'KYC Approved' },
  kyc_rejected:         { cls: 'actionReject',  label: 'KYC Rejected' },
  payout_approved:      { cls: 'actionApprove', label: 'Payout Approved' },
  payout_rejected:      { cls: 'actionReject',  label: 'Payout Rejected' },
  tournament_cancelled: { cls: 'actionReject',  label: 'Tournament Cancelled' },
  tournament_refunded:  { cls: 'actionWarn',    label: 'Tournament Refunded' },
  admin_login:          { cls: 'actionInfo',    label: 'Admin Login' },
  admin_created:        { cls: 'actionInfo',    label: 'Admin Created' },
  role_changed:         { cls: 'actionWarn',    label: 'Role Changed' },
  config_changed:       { cls: 'actionWarn',    label: 'Config Changed' },
  manual_vc_credit:     { cls: 'actionApprove', label: 'VC Credit' },
  manual_vc_debit:      { cls: 'actionReject',  label: 'VC Debit' },
}

function AuditLogInner() {
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Filter and page changes fire a new request while the previous one is still
  // in flight. Without a guard the slower response wins the race, so a request
  // that failed before the admin token was in localStorage could paint
  // "Connection error." over a table that had already loaded correctly. Each
  // run takes a ticket; only the newest one is allowed to touch state.
  const requestRef = useRef(0)

  const fetchLogs = useCallback(async () => {
    const ticket = requestRef.current + 1
    requestRef.current = ticket
    const token = localStorage.getItem('adminToken')
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
      if (search) params.set('search', search)
      if (actionFilter) params.set('action', actionFilter)
      if (adminFilter) params.set('admin_username', adminFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/audit-log/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (requestRef.current !== ticket) return
      if (data.status === 'success') {
        setLogs(data.data?.results || [])
        setTotal(data.data?.count ?? (data.data?.results || []).length)
      } else setError(data.message || 'Failed to load audit log.')
    } catch {
      if (requestRef.current === ticket) setError('Connection error.')
    }
    setDataLoading(false)
  }, [page, search, actionFilter, adminFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!authLoading && admin) fetchLogs()
  }, [authLoading, admin, fetchLogs])

  useEffect(() => { setPage(1) }, [search, actionFilter, adminFilter, dateFrom, dateTo])

  function exportCsv() {
    if (!logs.length) {
      toast.push('No log entries to export.', 'warn')
      return
    }
    const cols = ['id', 'action', 'description', 'admin_username', 'target_type', 'target_id', 'ip', 'result', 'created_at']
    const rows = logs.map((l) => cols.map((c) => JSON.stringify(l[c] ?? '')).join(','))
    const csv = [cols.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.push(`Exported ${logs.length} entries.`, 'success')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  if (authLoading) return null

  function actionBadge(action) {
    const def = ACTION_BADGE[action] || { cls: 'actionInfo', label: action.replace(/_/g, ' ') }
    return (
      <span className={`${styles.actionBadge} ${styles[def.cls]}`}>
        {def.label}
      </span>
    )
  }

  return (
    <div className={shared.pageContainer}>
      <div
        className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
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
              <h1 className={shared.pageTitle}>Audit Log</h1>
              <p className={shared.pageSubtitle}>Complete record of all admin actions. Read-only.</p>
            </div>
            <div className={shared.pageActions}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={exportCsv}>
                Export CSV
              </button>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <div className={shared.filtersRow}>
              <select
                className={shared.filterSelect}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">All Actions</option>
                {Object.keys(ACTION_BADGE).map((a) => (
                  <option key={a} value={a}>{ACTION_BADGE[a].label}</option>
                ))}
              </select>
              <select
                className={shared.filterSelect}
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
              >
                <option value="">All Admins</option>
                <option value="superadmin">superadmin</option>
                <option value="mod_chidi">mod_chidi</option>
                <option value="finance_tunde">finance_tunde</option>
              </select>
              <input
                type="date"
                className={shared.filterSelect}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From"
              />
              <input
                type="date"
                className={shared.filterSelect}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="To"
              />
              <span className={shared.resultsCount}>{total.toLocaleString()} entries</span>
            </div>

            {dataLoading ? (
              <p className={shared.stateText}>Loading…</p>
            ) : logs.length === 0 ? (
              <p className={shared.stateText}>No log entries found.</p>
            ) : (
              <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Admin</th>
                      <th>Action</th>
                      <th className={shared.hideMobile}>Target</th>
                      <th>Description</th>
                      <th className={shared.hideMobile}>IP</th>
                      <th className={shared.hideMobile}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td className={styles.timeCell}>
                          {l.created_at ? new Date(l.created_at).toLocaleString() : '-'}
                        </td>
                        <td>{l.admin_username || '-'}</td>
                        <td>{actionBadge(l.action)}</td>
                        <td className={shared.hideMobile}>
                          {l.target_type && l.target_id ? `${l.target_type} #${l.target_id}` : '-'}
                        </td>
                        <td className={styles.descCell}>{l.description || '-'}</td>
                        <td className={shared.hideMobile}>
                          <code className={styles.code}>{l.ip || '-'}</code>
                        </td>
                        <td className={shared.hideMobile}>
                          <span className={`${shared.badge} ${l.result === 'success' ? shared.sApproved : shared.sRejected}`}>
                            {l.result || 'success'}
                          </span>
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

export default function AdminAuditLogPage() {
  return (
    <AdminToastProvider>
      <AuditLogInner />
    </AdminToastProvider>
  )
}
