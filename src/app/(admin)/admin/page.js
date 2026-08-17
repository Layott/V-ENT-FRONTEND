'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import AdminChart from '@/components/admin/AdminChart'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './overview.module.css'

const KPI_DEFS = [
  { key: 'total_users',         label: 'Total Users',          color: 'ic-blue',   icon: '👤', fmt: 'num' },
  { key: 'active_users_today',  label: 'Active Today',         color: 'ic-grn',    icon: '⚡', fmt: 'num' },
  { key: 'active_tournaments',  label: 'Active Tournaments',   color: 'ic-yellow', icon: '🏆', fmt: 'num' },
  { key: 'pending_payouts',     label: 'Pending Payouts',      color: 'ic-red',    icon: '💸', fmt: 'num', linkTo: '/admin/payouts' },
  { key: 'total_vc_circulation',label: 'Total VC in circulation', color: 'ic-purple', icon: '🪙', fmt: 'num' },
  { key: 'pending_kyc',         label: 'Pending KYC',          color: 'ic-teal',   icon: '🛡', fmt: 'num', linkTo: '/admin/kyc' },
  { key: 'open_disputes',       label: 'Open Disputes',        color: 'ic-red',    icon: '⚠', fmt: 'num' },
]

function fmt(n) {
  if (n == null) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}k`
  return Number(n).toLocaleString()
}

function OverviewInner() {
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [kpis, setKpis] = useState({})
  const [charts, setCharts] = useState([])
  const [activity, setActivity] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchAll = useCallback(async () => {
    setDataLoading(true)
    setError('')
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : ''
    try {
      const [kpisRes, chartsRes, activityRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/metrics/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/charts/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/recent-activity/`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const k = await kpisRes.json()
      const c = await chartsRes.json()
      const a = await activityRes.json()
      if (k.status === 'success') setKpis(k.data || {})
      if (c.status === 'success') setCharts(c.data?.timeline || [])
      if (a.status === 'success') setActivity(a.data?.activity || [])
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && admin) fetchAll()
  }, [authLoading, admin, fetchAll])

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
        badges={{ kyc: kpis.pending_kyc || 0, payouts: kpis.pending_payouts || 0 }}
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
          {/* Page header */}
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>Dashboard</h1>
              <p className={shared.pageSubtitle}>
                Welcome back, {admin?.username}. Platform snapshot · Updated just now.
              </p>
            </div>
            <div className={shared.pageActions}>
              <button
                className={`${shared.actBtn} ${shared.actView}`}
                onClick={() => toast.push('Report exported as CSV.', 'success')}
              >
                Export Report
              </button>
              <button
                className={`${shared.actBtn} ${shared.actApprove}`}
                onClick={() => toast.push('Refreshed.', 'info', 1800) || fetchAll()}
              >
                Refresh
              </button>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          {/* Hero KPI strip */}
          <div className={styles.kpiGrid}>
            {KPI_DEFS.map((k) => (
              <a
                key={k.key}
                href={k.linkTo || '#'}
                className={`${shared.card} ${styles.kpiCard}`}
                onClick={(e) => { if (!k.linkTo) e.preventDefault() }}
              >
                <span className={`${styles.kpiIcon} ${styles[k.color]}`}>{k.icon}</span>
                <p className={shared.metricLabel}>{k.label}</p>
                <p className={shared.metricValue}>
                  {dataLoading ? '…' : fmt(kpis[k.key])}
                </p>
              </a>
            ))}
          </div>

          {/* Charts row */}
          <div className={styles.chartGrid}>
            <AdminChart
              data={charts.map((c) => ({ label: c.label, value: c.signups }))}
              title="30-day Sign-ups"
              subtitle="New user registrations per day"
              type="line"
              color="#64B5F6"
              format={fmt}
            />
            <AdminChart
              data={charts.map((c) => ({ label: c.label, value: c.vc_issued }))}
              title="30-day VC Issued"
              subtitle="VENT COINS issued via top-up + prizes"
              type="bar"
              color="#9C27B0"
              format={fmt}
            />
            <AdminChart
              data={charts.map((c) => ({ label: c.label, value: c.tournament_joins }))}
              title="30-day Tournament Joins"
              subtitle="Player + team registrations"
              type="line"
              color="var(--v-ent-gold)"
              format={fmt}
            />
          </div>

          {/* Recent activity feed */}
          <div className={`${shared.card} ${styles.activityCard}`}>
            <div className={shared.sectionHeader}>
              <p className={shared.sectionTitle}>Recent Activity</p>
              <a href="/admin/audit-log" className={shared.sectionLink}>View full log →</a>
            </div>
            {dataLoading ? (
              <p className={shared.stateText}>Loading…</p>
            ) : activity.length === 0 ? (
              <p className={shared.stateText}>No activity in the last 24 hours.</p>
            ) : (
              <ul className={styles.activityList}>
                {activity.map((a) => (
                  <li key={a.id} className={styles.activityItem}>
                    <span
                      className={styles.activityDot}
                      style={{ background: dotColor(a.action) }}
                    />
                    <div className={styles.activityBody}>
                      <p className={styles.activityText}>{a.description}</p>
                      <p className={styles.activityMeta}>
                        <span>{relativeTime(a.created_at)}</span>
                        {a.admin_username && <span> · by {a.admin_username}</span>}
                        {a.target_type && <span> · {a.target_type}</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function dotColor(action) {
  if (!action) return 'rgba(255,255,255,0.3)'
  if (action.endsWith('_approved')) return 'var(--v-ent-gold)'
  if (action.endsWith('_rejected') || action === 'user_banned' || action === 'tournament_cancelled') return 'var(--v-ent-red)'
  if (action === 'admin_login') return '#64B5F6'
  if (action === 'role_changed' || action === 'config_changed') return '#FFC107'
  return 'rgba(255,255,255,0.5)'
}

function relativeTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60)    return `${sec}s ago`
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export default function AdminOverviewPage() {
  return (
    <AdminToastProvider>
      <OverviewInner />
    </AdminToastProvider>
  )
}
