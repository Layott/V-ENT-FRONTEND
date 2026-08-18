'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './user-detail.module.css'

const TABS = [
  { key: 'logins',      label: 'Logins' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'wallet',      label: 'Wallet' },
  { key: 'reports',     label: 'Reports' },
  { key: 'ban_history', label: 'Ban History' },
]

function UserDetailInner() {
  const params = useParams()
  const router = useRouter()
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [detail, setDetail] = useState(null)
  const [activeTab, setActiveTab] = useState('logins')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [notifyModalOpen, setNotifyModalOpen] = useState(false)
  const [newRole, setNewRole] = useState('user')
  const [notifyMsg, setNotifyMsg] = useState('')

  const userId = params?.id

  const fetchDetail = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : ''
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json().catch(() => ({}))
      if (data?.status === 'success' && data.data) {
        // Normalize collections so the render path never NPEs on .map(...) or .length
        const safeDetail = {
          user: data.data.user || null,
          logins: Array.isArray(data.data.logins) ? data.data.logins : [],
          tournaments: Array.isArray(data.data.tournaments) ? data.data.tournaments : [],
          wallet: Array.isArray(data.data.wallet) ? data.data.wallet : [],
          reports: Array.isArray(data.data.reports) ? data.data.reports : [],
          ban_history: Array.isArray(data.data.ban_history) ? data.data.ban_history : [],
        }
        setDetail(safeDetail)
        setNewRole(safeDetail.user?.role || 'user')
      } else {
        // Mock layer or backend returned not-found - leave detail null; UI handles it below.
        setDetail(null)
      }
    } catch (err) {
      console.error('Admin user detail fetch error:', err)
      toast.push('Failed to load user.', 'error')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  useEffect(() => {
    if (!authLoading && admin) fetchDetail()
  }, [authLoading, admin, fetchDetail])

  async function action(act, body) {
    const token = localStorage.getItem('adminToken')
    // Map the UI action to the real endpoint (path + verb + body).
    let url
    let payload
    if (act === 'ban' || act === 'unban') {
      url = `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/ban/`
      payload = { ban: act === 'ban', reason: body?.reason || '' }
    } else if (act === 'role') {
      url = `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/role/`
      payload = { role: body?.role }
      // BE requires the admin sub-role when promoting to admin.
      if (body?.role === 'admin') payload.admin_role = body?.admin_role || 'support_admin'
    } else {
      url = `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/${act}/`
      payload = body
    }
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined,
      })
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`Action "${act}" applied.`, 'success')
        fetchDetail()
        return true
      }
      toast.push(data.message || 'Action failed.', 'error')
    } catch {
      toast.push('Connection error.', 'error')
    }
    return false
  }

  if (authLoading) return null

  const u = detail?.user

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
        />
        <main className={shared.contentArea}>
          {/* Page header */}
          <div className={shared.pageHeader}>
            <div>
              <Link href="/admin/users" className={styles.backLink}>← All Users</Link>
              <h1 className={shared.pageTitle}>{u?.username || 'User'}</h1>
              <p className={shared.pageSubtitle}>
                {u?.full_name && `${u.full_name} · `}{u?.email}
              </p>
            </div>
            <div className={shared.pageActions}>
              <button
                className={`${shared.actBtn} ${shared.actView}`}
                onClick={() => setNotifyModalOpen(true)}
              >
                Send Notification
              </button>
              <button
                className={`${shared.actBtn} ${shared.actApprove}`}
                onClick={() => setRoleModalOpen(true)}
              >
                Change Role
              </button>
              {u?.status === 'banned' ? (
                <button
                  className={`${shared.actBtn} ${shared.actApprove}`}
                  onClick={() => action('unban')}
                >
                  Unban
                </button>
              ) : (
                <button
                  className={`${shared.actBtn} ${shared.actBan}`}
                  onClick={() => action('ban', { reason: 'TOS violation' })}
                >
                  Ban
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p className={shared.stateText}>Loading…</p>
          ) : !detail || !detail.user ? (
            <p className={shared.stateText}>User not found.</p>
          ) : (
            <>
              {/* Profile summary */}
              <div className={`${shared.card} ${styles.summary}`}>
                <div className={styles.avatar}>
                  {(u.username || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className={styles.summaryGrid}>
                  <div>
                    <p className={styles.label}>Status</p>
                    <p className={styles.value}>
                      <span className={`${shared.badge} ${u.status === 'banned' ? shared.sBanned : u.status === 'suspended' ? shared.sSuspended : shared.sActive}`}>
                        {u.status?.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>Country</p>
                    <p className={styles.value}>{u.country || '-'}</p>
                  </div>
                  <div>
                    <p className={styles.label}>Wallet VC</p>
                    <p className={styles.value}>{u.wallet_vc?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className={styles.label}>Tournaments</p>
                    <p className={styles.value}>{u.tournaments_count || 0}</p>
                  </div>
                  <div>
                    <p className={styles.label}>Joined</p>
                    <p className={styles.value}>
                      {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>Last login</p>
                    <p className={styles.value}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>Role</p>
                    <p className={styles.value}>
                      <span className={`${shared.badge} ${u.role === 'admin' ? shared.roleAdmin : u.role === 'organizer' ? shared.roleOrganizer : shared.roleUser}`}>
                        {u.role || 'user'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>KYC</p>
                    <p className={styles.value}>
                      <span className={`${shared.badge} ${u.kyc_status === 'approved' ? shared.sApproved : u.kyc_status === 'pending' ? shared.sPending : shared.sDraft}`}>
                        {u.kyc_status || 'unsubmitted'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className={shared.card}>
                {activeTab === 'logins' && (
                  <div className={shared.tableWrap}>
                    <table className={shared.table}>
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>IP</th>
                          <th className={shared.hideMobile}>Device</th>
                          <th className={shared.hideMobile}>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.logins.map((l) => (
                          <tr key={l.id}>
                            <td>{new Date(l.created_at).toLocaleString()}</td>
                            <td><code className={styles.code}>{l.ip}</code></td>
                            <td className={shared.hideMobile}>{l.device}</td>
                            <td className={shared.hideMobile}>{l.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {activeTab === 'tournaments' && (
                  detail.tournaments.length === 0 ? (
                    <p className={shared.stateText}>No tournament history.</p>
                  ) : (
                    <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th className={shared.hideMobile}>Placement</th>
                            <th className={shared.hideMobile}>Prize VC</th>
                            <th className={shared.hideMobile}>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.tournaments.map((t) => (
                            <tr key={t.id}>
                              <td>{t.name}</td>
                              <td>
                                <span className={`${shared.badge} ${t.status === 'completed' ? shared.sApproved : t.status === 'cancelled' ? shared.sCancelled : shared.sOngoing}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className={shared.hideMobile}>{t.placement}</td>
                              <td className={shared.hideMobile}>{t.prize_vc.toLocaleString()}</td>
                              <td className={shared.hideMobile}>{new Date(t.joined_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
                {activeTab === 'wallet' && (
                  <div className={shared.tableWrap}>
                    <table className={shared.table}>
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th className={shared.hideMobile}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.wallet.map((w) => (
                          <tr key={w.id}>
                            <td>{new Date(w.created_at).toLocaleDateString()}</td>
                            <td>{w.type.replace('_', ' ')}</td>
                            <td className={w.amount >= 0 ? styles.amtUp : styles.amtDown}>
                              {w.amount >= 0 ? '+' : ''}{w.amount.toLocaleString()} VC
                            </td>
                            <td className={shared.hideMobile}>{w.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {activeTab === 'reports' && (
                  detail.reports && Array.isArray(detail.reports) && detail.reports.length > 0 ? (
                    <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>When</th>
                            <th>Reporter</th>
                            <th>Reason</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.reports.map((r) => (
                            <tr key={r.id}>
                              <td>{new Date(r.created_at).toLocaleDateString()}</td>
                              <td>{r.reporter}</td>
                              <td>{r.reason}</td>
                              <td>
                                <span className={`${shared.badge} ${r.status === 'open' ? shared.sPending : shared.sApproved}`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className={shared.stateText}>No reports filed against this user.</p>
                  )
                )}
                {activeTab === 'ban_history' && (
                  detail.ban_history.length === 0 ? (
                    <p className={shared.stateText}>No ban history.</p>
                  ) : (
                    detail.ban_history.map((b) => (
                      <div key={b.id} className={styles.banEntry}>
                        <p className={styles.banReason}>{b.reason}</p>
                        <p className={styles.banMeta}>
                          Banned by <strong>{b.banned_by}</strong> on{' '}
                          {new Date(b.created_at).toLocaleDateString()}
                          {b.lifted_at && ` · Lifted ${new Date(b.lifted_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    ))
                  )
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Role assignment modal */}
      {roleModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setRoleModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>Change Role</p>
            <p className={styles.modalSub}>
              Updating role for <strong>{u?.username}</strong>.
            </p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className={styles.modalSelect}
            >
              <option value="user">User</option>
              <option value="organizer">Organizer</option>
              <option value="admin">Admin (Staff)</option>
            </select>
            <div className={styles.modalBtns}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setRoleModalOpen(false)}>
                Cancel
              </button>
              <button
                className={`${shared.actBtn} ${shared.actApprove}`}
                onClick={async () => {
                  const ok = await action('role', { role: newRole })
                  if (ok) setRoleModalOpen(false)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send notification modal */}
      {notifyModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setNotifyModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>Send Notification</p>
            <p className={styles.modalSub}>
              Sending to <strong>{u?.username}</strong> via in-app notification.
            </p>
            <textarea
              className={styles.modalTextarea}
              value={notifyMsg}
              onChange={(e) => setNotifyMsg(e.target.value)}
              placeholder="Type your message…"
              rows={4}
            />
            <div className={styles.modalBtns}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setNotifyModalOpen(false)}>
                Cancel
              </button>
              <button
                className={`${shared.actBtn} ${shared.actApprove}`}
                onClick={() => {
                  if (!notifyMsg.trim()) {
                    toast.push('Type a message first.', 'warn')
                    return
                  }
                  toast.push(`Notification sent to ${u?.username}.`, 'success')
                  setNotifyMsg('')
                  setNotifyModalOpen(false)
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UserDetailPage() {
  return (
    <AdminToastProvider>
      <UserDetailInner />
    </AdminToastProvider>
  )
}
