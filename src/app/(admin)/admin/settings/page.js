'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './settings.module.css'

const FEATURES = [
  { key: 'tournaments_enabled',     label: 'Tournaments',           hint: 'Phase 1 module' },
  { key: 'events_enabled',          label: 'Events + Ticketing',    hint: 'Phase 2 module' },
  { key: 'wallet_enabled',          label: 'Wallet (VENT COINS)',   hint: 'Phase 1 module' },
  { key: 'marketplace_enabled',     label: 'Marketplace',           hint: 'Phase 4 - locked' },
  { key: 'shop_enabled',            label: 'Vent Shop',             hint: 'Phase 3 - locked' },
  { key: 'anime_enabled',           label: 'Anime Features',        hint: 'Phase 5 - locked' },
  { key: 'wager_enabled',           label: 'Wager System',          hint: 'Phase 6 - legal review' },
  { key: 'referral_program_enabled',label: 'Referral Program',      hint: 'Active' },
]

function SettingsInner() {
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('adminToken')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.status === 'success') setSettings(data.data)
    } catch { toast.push('Failed to load settings.', 'error') }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    if (!authLoading && admin) fetchSettings()
  }, [authLoading, admin, fetchSettings])

  async function save() {
    setSaving(true)
    const token = localStorage.getItem('adminToken')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/settings/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.status === 'success') {
        toast.push('Settings saved.', 'success')
      } else toast.push(data.message || 'Save failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setSaving(false)
  }

  function patch(section, key, value) {
    setSettings((s) => ({ ...s, [section]: { ...s[section], [key]: value } }))
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
        />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>Settings</h1>
              <p className={shared.pageSubtitle}>Platform-level configuration. Changes are logged.</p>
            </div>
            <div className={shared.pageActions}>
              <button
                className={`${shared.actBtn} ${shared.actApprove}`}
                onClick={save}
                disabled={saving || !settings}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          {loading || !settings ? (
            <p className={shared.stateText}>Loading…</p>
          ) : (
            <div className={styles.grid}>
              {/* Platform fees */}
              <div className={shared.card}>
                <p className={styles.sectionTitle}>Platform Fees</p>
                <p className={styles.sectionSub}>Percentage and limits applied across all transactions.</p>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tournament fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={settings.platform_fees.tournament_fee_pct}
                    onChange={(e) => patch('platform_fees', 'tournament_fee_pct', parseFloat(e.target.value || '0'))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Withdrawal fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={settings.platform_fees.withdrawal_fee_pct}
                    onChange={(e) => patch('platform_fees', 'withdrawal_fee_pct', parseFloat(e.target.value || '0'))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Listing fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={settings.platform_fees.listing_fee_pct}
                    onChange={(e) => patch('platform_fees', 'listing_fee_pct', parseFloat(e.target.value || '0'))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Min payout (VC)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={settings.platform_fees.payout_min_vc}
                    onChange={(e) => patch('platform_fees', 'payout_min_vc', parseInt(e.target.value || '0', 10))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Daily top-up cap (₦)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={settings.platform_fees.topup_max_ngn_per_day}
                    onChange={(e) => patch('platform_fees', 'topup_max_ngn_per_day', parseInt(e.target.value || '0', 10))}
                  />
                </div>
              </div>

              {/* Feature flags */}
              <div className={shared.card}>
                <p className={styles.sectionTitle}>Feature Flags</p>
                <p className={styles.sectionSub}>Enable or disable platform modules.</p>
                {FEATURES.map((f) => (
                  <div key={f.key} className={styles.toggleRow}>
                    <div>
                      <p className={styles.toggleLabel}>{f.label}</p>
                      <p className={styles.toggleHint}>{f.hint}</p>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={!!settings.feature_flags[f.key]}
                        onChange={(e) => patch('feature_flags', f.key, e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                ))}
              </div>

              {/* Banner */}
              <div className={shared.card}>
                <p className={styles.sectionTitle}>Site Banner</p>
                <p className={styles.sectionSub}>Show a top-of-app announcement to all users.</p>
                <div className={styles.toggleRow}>
                  <p className={styles.toggleLabel}>Banner enabled</p>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!settings.banner.enabled}
                      onChange={(e) => patch('banner', 'enabled', e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Title</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={settings.banner.title}
                    onChange={(e) => patch('banner', 'title', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Message</label>
                  <textarea
                    className={styles.input}
                    rows={3}
                    value={settings.banner.message}
                    onChange={(e) => patch('banner', 'message', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Banner type</label>
                  <select
                    className={styles.input}
                    value={settings.banner.type}
                    onChange={(e) => patch('banner', 'type', e.target.value)}
                  >
                    <option value="info">Info (blue)</option>
                    <option value="warn">Warning (yellow)</option>
                    <option value="error">Error (red)</option>
                    <option value="success">Success (green)</option>
                  </select>
                </div>
              </div>

              {/* Maintenance */}
              <div className={shared.card}>
                <p className={styles.sectionTitle}>Maintenance Mode</p>
                <p className={styles.sectionSub}>
                  When enabled, the public app shows a maintenance page. Admin portal stays accessible.
                </p>
                <div className={`${styles.toggleRow} ${settings.maintenance.enabled ? styles.dangerRow : ''}`}>
                  <div>
                    <p className={styles.toggleLabel}>Maintenance mode</p>
                    <p className={styles.toggleHint}>
                      {settings.maintenance.enabled ? 'ENABLED - public app is offline' : 'OFF - app live'}
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!settings.maintenance.enabled}
                      onChange={(e) => patch('maintenance', 'enabled', e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Maintenance message</label>
                  <textarea
                    className={styles.input}
                    rows={3}
                    value={settings.maintenance.message}
                    onChange={(e) => patch('maintenance', 'message', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <AdminToastProvider>
      <SettingsInner />
    </AdminToastProvider>
  )
}
