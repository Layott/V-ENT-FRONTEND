'use client';

import { useState, useEffect, useCallback } from 'react';
import { LuUsers, LuActivity, LuTrophy, LuBanknote, LuCoins, LuShield, LuGavel } from 'react-icons/lu';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import AdminChart from '@/components/admin/AdminChart';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './overview.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const KPI_DEFS = [
// Icons come from the set the admin nav already uses, not emoji: emoji render
// as a different picture on every operating system and read as decoration on a
// console people work in.
//
// Colour is meaning, not decoration. The tiles were six different hues with no
// system behind them. Now: red is a queue waiting on a human, gold is money,
// everything else is neutral.
{
  key: 'total_users',
  label: 'Total Users',
  color: 'ic-neutral',
  Icon: LuUsers,
  fmt: 'num'
}, {
  key: 'active_users_today',
  label: 'Active Today',
  color: 'ic-neutral',
  Icon: LuActivity,
  fmt: 'num'
}, {
  key: 'active_tournaments',
  label: 'Active Tournaments',
  color: 'ic-neutral',
  Icon: LuTrophy,
  fmt: 'num'
}, {
  key: 'pending_payouts',
  label: 'Pending Payouts',
  color: 'ic-red',
  Icon: LuBanknote,
  fmt: 'num',
  linkTo: '/admin/payouts'
}, {
  key: 'total_vc_circulation',
  label: 'VC in circulation',
  color: 'ic-gold',
  Icon: LuCoins,
  fmt: 'num'
  // The "Pending KYC" tile used to sit here. KYC is switched off for now (CEO,
  // 2026-08-27), so it and its link to /admin/kyc are out. The endpoint still
  // returns the count, so bringing it back is one entry rather than a rebuild.
}, {
  key: 'open_disputes',
  label: 'Open Disputes',
  color: 'ic-red',
  Icon: LuGavel,
  fmt: 'num',
  linkTo: '/admin/disputes'
}];
function fmt(n) {
  if (n == null) return '-';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return Number(n).toLocaleString();
}
function OverviewInner() {
  const tx = useTx();
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const [kpis, setKpis] = useState({});
  const [charts, setCharts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    setError('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : '';
    try {
      const [kpisRes, chartsRes, activityRes] = await Promise.all([fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/metrics/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }), fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/charts/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }), fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/recent-activity/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })]);
      const k = await kpisRes.json().catch(() => ({}));
      const c = await chartsRes.json().catch(() => ({}));
      const a = await activityRes.json().catch(() => ({}));
      if (k.status === 'success') setKpis(k.data || {});
      if (c.status === 'success') setCharts(c.data?.timeline || []);
      if (a.status === 'success') setActivity(a.data?.activity || []);

      // A refused request is not an empty console.
      //
      // Every branch above is an `if (success)`, so a 401 or a 403 set nothing
      // and said nothing: the tiles fell back to `fmt(null)`, which is a dash,
      // and an operator saw a dashboard reading "-" everywhere with no reason
      // given. The server's own sentence is more use than any wording invented
      // here, so it is preferred when there is one.
      if (k.status !== 'success') {
        setError(k.message
          || tt('msg.failedToLoadDashboardData', 'Failed to load dashboard data.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setDataLoading(false);
    }
  }, [tt]);
  useEffect(() => {
    if (!authLoading && admin) fetchAll();
  }, [authLoading, admin, fetchAll]);
  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{
      kyc: kpis.pending_kyc || 0,
      payouts: kpis.pending_payouts || 0
    }} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} searchValue={search} onSearch={setSearch} pending={{ payouts: kpis.pending_withdrawals || 0, disputes: kpis.open_disputes || 0 }} />
        <main className={shared.contentArea}>
          {/* Page header */}
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt("ui.dashboard.d87f", "Dashboard")}</h1>
              <p className={shared.pageSubtitle}>
                {tt("ui.welcome.back.8c8b", "Welcome back,")} {admin?.username}{tt("ui.platform.snapshot.updated.just.2d57", ". Platform snapshot · Updated just now.")}
              </p>
            </div>
            <div className={shared.pageActions}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => toast.push(tt("msg.reportExportedAsCsv", "Report exported as CSV."), 'success')}>
                {tt("ui.export.report.95a4", "Export Report")}
              </button>
              <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={() => toast.push(tt("msg.refreshed", "Refreshed."), 'info', 1800) || fetchAll()}>
                {tt("ui.refresh.56e3", "Refresh")}
              </button>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          {/* Hero KPI strip */}
          <div className={styles.kpiGrid}>
            {KPI_DEFS.map(k => <a key={k.key} href={k.linkTo || '#'} className={`${shared.card} ${styles.kpiCard}`} onClick={e => {
            if (!k.linkTo) e.preventDefault();
          }}>
                <span className={`${styles.kpiIcon} ${styles[k.color]}`}><k.Icon /></span>
                <p className={shared.metricLabel}>{tx(k.label)}</p>
                <p className={shared.metricValue}>
                  {dataLoading ? '…' : fmt(kpis[k.key])}
                </p>
              </a>)}
          </div>

          {/* Charts row */}
          <div className={styles.chartGrid}>
            <AdminChart data={charts.map(c => ({
            label: c.label,
            value: c.signups
          }))} title={tt("ui.day.sign.ups.251f", "30-day Sign-ups")} subtitle={tt("admin.chart.signups", "New user registrations per day")} type="line" color="var(--v-ent-gold)" format={fmt} />
            <AdminChart data={charts.map(c => ({
            label: c.label,
            value: c.vc_issued
          }))} title={tt("ui.day.vc.issued.17a8", "30-day VC Issued")} subtitle={tt("admin.chart.coins", "VENT COINS issued through top-ups and prizes")} type="bar" color="var(--v-ent-gold)" format={fmt} />
            <AdminChart data={charts.map(c => ({
            label: c.label,
            value: c.tournament_joins
          }))} title={tt("ui.day.tournament.joins.d1af", "30-day Tournament Joins")} subtitle={tt("admin.chart.registrations", "Player and team registrations")} type="line" color="var(--v-ent-gold)" format={fmt} />
          </div>

          {/* Recent activity feed */}
          <div className={`${shared.card} ${styles.activityCard}`}>
            <div className={shared.sectionHeader}>
              <p className={shared.sectionTitle}>{tt("ui.recent.activity.8aeb", "Recent Activity")}</p>
              <a href="/admin/audit-log" className={shared.sectionLink}>{tt("ui.view.full.log.2856", "View full log →")}</a>
            </div>
            {dataLoading ? <p className={shared.stateText}>{tt("ui.loading.33ce", "Loading…")}</p> : activity.length === 0 ? <p className={shared.stateText}>{tt("ui.no.activity.last.hours.00b2", "No activity in the last 24 hours.")}</p> : <ul className={styles.activityList}>
                {activity.map(a => <li key={a.id} className={styles.activityItem}>
                    <span className={styles.activityDot} style={{
                background: dotColor(a.action)
              }} />
                    <div className={styles.activityBody}>
                      <p className={styles.activityText}>{tx(a.description)}</p>
                      <p className={styles.activityMeta}>
                        <span>{relativeTime(a.created_at)}</span>
                        {a.admin_username && <span> · by {a.admin_username}</span>}
                        {a.target_type && <span> · {a.target_type}</span>}
                      </p>
                    </div>
                  </li>)}
              </ul>}
          </div>
        </main>
      </div>
    </div>;
}
function dotColor(action) {
  if (!action) return 'rgba(255,255,255,0.3)';
  if (action.endsWith('_approved')) return 'var(--v-ent-gold)';
  if (action.endsWith('_rejected') || action === 'user_banned' || action === 'tournament_cancelled') return 'var(--v-ent-red)';
  if (action === 'admin_login') return '#64B5F6';
  if (action === 'role_changed' || action === 'config_changed') return '#FFC107';
  return 'rgba(255,255,255,0.5)';
}
function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
export default function AdminOverviewPage() {
  return <AdminToastProvider>
      <OverviewInner />
    </AdminToastProvider>;
}