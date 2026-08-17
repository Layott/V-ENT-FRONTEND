'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './users.module.css'

const PAGE_SIZE = 20

const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Tanzania', 'Uganda', 'Cameroon']
const STATUSES = [
  { value: '',             label: 'All Statuses' },
  { value: 'active',       label: 'Active' },
  { value: 'banned',       label: 'Banned' },
  { value: 'suspended',    label: 'Suspended' },
  { value: 'kyc_pending',  label: 'KYC Pending' },
]

function statusBadgeClass(s) {
  if (s === 'active')      return shared.sActive
  if (s === 'banned')      return shared.sBanned
  if (s === 'suspended')   return shared.sSuspended
  if (s === 'kyc_pending') return shared.sKyc
  return shared.sDraft
}

function UsersInner() {
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('-date_joined')
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : ''
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page,
        page_size: PAGE_SIZE,
        ordering: sortBy,
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (countryFilter) params.set('country', countryFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.status === 'success') {
        let list = data.data?.results || []
        // Client-side date filter (the mock layer doesn't enforce this)
        if (dateFrom) list = list.filter((u) => new Date(u.date_joined) >= new Date(dateFrom))
        if (dateTo)   list = list.filter((u) => new Date(u.date_joined) <= new Date(dateTo + 'T23:59:59'))
        setUsers(list)
        setTotal(data.data?.count ?? list.length)
      } else {
        setError(data.message || 'Failed to load users.')
      }
    } catch {
      setError('Connection error.')
    } finally {
      setDataLoading(false)
    }
  }, [page, search, statusFilter, countryFilter, dateFrom, dateTo, sortBy])

  useEffect(() => {
    if (!authLoading && admin) fetchUsers()
  }, [authLoading, admin, fetchUsers])

  useEffect(() => { setPage(1) }, [search, statusFilter, countryFilter, dateFrom, dateTo, sortBy])

  async function actOnUser(userId, action, reason) {
    const token = localStorage.getItem('adminToken')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/ban/`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ban: action === 'ban', reason: reason || '' }),
        }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`User ${action}ned successfully.`, 'success')
        fetchUsers()
      } else {
        toast.push(data.message || 'Action failed.', 'error')
      }
    } catch {
      toast.push('Connection error.', 'error')
    }
  }

  async function applyBulkAction(action) {
    if (selected.size === 0) {
      toast.push('Select at least one user first.', 'warn')
      return
    }
    const token = localStorage.getItem('adminToken')
    setBulkLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/bulk/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ids: [...selected] }),
        }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`Bulk ${action}ned ${data.data.count} users.`, 'success')
        setSelected(new Set())
        fetchUsers()
      } else {
        toast.push(data.message || 'Bulk action failed.', 'error')
      }
    } catch {
      toast.push('Connection error.', 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id))

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(users.map((u) => u.id)))
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (authLoading) return null

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
              <h1 className={shared.pageTitle}>Users</h1>
              <p className={shared.pageSubtitle}>Manage registered platform users.</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            {/* Filters */}
            <div className={shared.filtersRow}>
              <select
                className={shared.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select
                className={shared.filterSelect}
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="">All Countries</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="date"
                className={shared.filterSelect}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Joined from"
              />
              <input
                type="date"
                className={shared.filterSelect}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="Joined to"
              />
              <select
                className={shared.filterSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="-date_joined">Newest First</option>
                <option value="date_joined">Oldest First</option>
                <option value="username">Username A-Z</option>
                <option value="-wallet_vc">Wallet (High-Low)</option>
              </select>
              <span className={shared.resultsCount}>{total.toLocaleString()} {total === 1 ? 'user' : 'users'}</span>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className={styles.bulkBar}>
                <span className={styles.bulkCount}>{selected.size} selected</span>
                <button
                  className={`${shared.actBtn} ${shared.actBan}`}
                  onClick={() => applyBulkAction('ban')}
                  disabled={bulkLoading}
                >
                  Ban
                </button>
                <button
                  className={`${shared.actBtn} ${shared.actApprove}`}
                  onClick={() => applyBulkAction('unban')}
                  disabled={bulkLoading}
                >
                  Unban
                </button>
                <button
                  className={`${shared.actBtn} ${shared.actView}`}
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
              </div>
            )}

            {/* Table */}
            {dataLoading ? (
              <p className={shared.stateText}>Loading…</p>
            ) : users.length === 0 ? (
              <p className={shared.stateText}>No users found.</p>
            ) : (
              <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className={styles.checkbox}
                          aria-label="Select all"
                        />
                      </th>
                      <th>User</th>
                      <th className={shared.hideMobile}>Email</th>
                      <th className={shared.hideMobile}>Country</th>
                      <th>Status</th>
                      <th className={shared.hideMobile}>Wallet VC</th>
                      <th className={shared.hideMobile}>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            className={styles.checkbox}
                            aria-label={`Select ${u.username}`}
                          />
                        </td>
                        <td>
                          <Link href={`/admin/users/${u.id}`} className={styles.userLink}>
                            <div className={shared.userCell}>
                              <div className={shared.userAvatar}>
                                {(u.username || 'U').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className={styles.userName}>{u.username}</span>
                                <span className={styles.userId}>#{String(u.id).slice(-4)}</span>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className={shared.hideMobile}>{u.email}</td>
                        <td className={shared.hideMobile}>{u.country}</td>
                        <td>
                          <span className={`${shared.badge} ${statusBadgeClass(u.status)}`}>
                            {u.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={shared.hideMobile}>
                          {u.wallet_vc ? Number(u.wallet_vc).toLocaleString() : '0'}
                        </td>
                        <td className={shared.hideMobile}>
                          {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <div className={shared.actGroup}>
                            <Link href={`/admin/users/${u.id}`} className={`${shared.actBtn} ${shared.actView}`}>
                              View
                            </Link>
                            {u.status === 'banned' ? (
                              <button
                                className={`${shared.actBtn} ${shared.actApprove}`}
                                onClick={() => actOnUser(u.id, 'unban')}
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                className={`${shared.actBtn} ${shared.actBan}`}
                                onClick={() => actOnUser(u.id, 'ban', 'TOS violation')}
                              >
                                Ban
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={shared.pagination}>
                <span className={shared.paginationInfo}>Page {page} of {totalPages}</span>
                <div className={shared.paginationBtns}>
                  <button
                    className={shared.pageBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return (
                      <button
                        key={p}
                        className={`${shared.pageBtn} ${p === page ? shared.pageBtnActive : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    className={shared.pageBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >›</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <AdminToastProvider>
      <UsersInner />
    </AdminToastProvider>
  )
}
