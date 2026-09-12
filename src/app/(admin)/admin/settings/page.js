'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './settings.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const FEATURES = [{
  key: 'tournaments_enabled',
  label: 'Tournaments',
  hint: 'Phase 1 module'
}, {
  key: 'events_enabled',
  label: 'Events + Ticketing',
  hint: 'Phase 2 module'
}, {
  key: 'wallet_enabled',
  label: 'Wallet (VENT COINS)',
  hint: 'Phase 1 module'
}, {
  key: 'marketplace_enabled',
  label: 'Marketplace',
  hint: 'Phase 4 - locked'
}, {
  key: 'shop_enabled',
  label: 'Vent Shop',
  hint: 'Phase 3 - locked'
}, {
  key: 'anime_enabled',
  label: 'Anime Features',
  hint: 'Phase 5 - locked'
}, {
  key: 'wager_enabled',
  label: 'Wager System',
  hint: 'Phase 6 - legal review'
}, {
  key: 'referral_program_enabled',
  label: 'Referral Program',
  hint: 'Active'
}];
function SettingsInner() {
  const tx = useTx();
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  // A load that fails left `settings` null and `loading` false, so this page
  // showed "Loading..." for ever with a toast that had already gone. Three
  // admin pages had that exact shape in August; this was the fourth.
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/settings/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success') setSettings(data.data);
      // A refusal is not an exception, and this branch did nothing at all: the
      // page sat on "Loading..." with no reason given.
      else setError(apiMessage(tt, data, 'api.failedToLoadSettings',
        'Could not load the settings.'));
    } catch {
      setError(tt("msg.connectionError", "Connection error."));
    }
    setLoading(false);
  }, [tt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!authLoading && admin) fetchSettings();
  }, [authLoading, admin, fetchSettings]);
  async function save() {
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/settings/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt("msg.settingsSaved", "Settings saved."), 'success');
      } else toast.push(apiMessage(tt, data, "api.saveFailed", "Save failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setSaving(false);
  }
  function patch(section, key, value) {
    setSettings(s => ({
      ...s,
      [section]: {
        ...s[section],
        [key]: value
      }
    }));
  }
  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt("ui.settings.c7f7", "Settings")}</h1>
              <p className={shared.pageSubtitle}>{tt("ui.platform.level.configuration.changes.3f67", "Platform-level configuration. Changes are logged.")}</p>
            </div>
            <div className={shared.pageActions}>
              <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={save} disabled={saving || !settings}>
                {saving ? tx("Saving…") : tx("Save Changes")}
              </button>
            </div>
          </div>

          {error && !loading ? <div className={shared.card}>
              <p className={shared.errorText}>{error}</p>
              <button className={`${shared.actBtn} ${shared.actView}`}
                      onClick={fetchSettings}>
                {tt("ui.retry.9f5c", "Retry")}
              </button>
            </div>
          : loading || !settings ? <p className={shared.stateText}>{tt("ui.loading.33ce", "Loading…")}</p> : <div className={styles.grid}>
              {/* Platform fees */}
              <div className={shared.card}>
                <h2 className={styles.sectionTitle}>{tt("ui.platform.fees.8467", "Platform Fees")}</h2>
                <p className={styles.sectionSub}>{tt("ui.percentage.limits.applied.across.f4e2", "Percentage and limits applied across all transactions.")}</p>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.tournament.fee.b8c9", "Tournament fee (%)")} <InfoTip id="adminTournamentFee" /></span></label>
                  <input type="number" step="0.1" className={styles.input} value={settings.platform_fees.tournament_fee_pct} onChange={e => patch('platform_fees', 'tournament_fee_pct', parseFloat(e.target.value || '0'))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.withdrawal.fee.8715", "Withdrawal fee (%)")} <InfoTip id="adminWithdrawalFee" /></span></label>
                  <input type="number" step="0.1" className={styles.input} value={settings.platform_fees.withdrawal_fee_pct} onChange={e => patch('platform_fees', 'withdrawal_fee_pct', parseFloat(e.target.value || '0'))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.listing.fee.e232", "Listing fee (%)")} <InfoTip id="adminListingFee" /></span></label>
                  <input type="number" step="0.1" className={styles.input} value={settings.platform_fees.listing_fee_pct} onChange={e => patch('platform_fees', 'listing_fee_pct', parseFloat(e.target.value || '0'))} />
                </div>
                {/* The ticket fee: a percentage of the price plus a flat amount per
                    paid ticket, both stamped on the ledger at the sale. Settable
                    through the API since the ledger was built and never drawn
                    here, so 5% + 100 naira (CEO, 12 September) had no field. */}
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt('admin.ticketFeePct', 'Ticket fee (% of the price)')}</span></label>
                  <input type="number" step="0.1" min="0" className={styles.input} value={settings.platform_fees.ticket_fee_pct ?? 5} onChange={e => patch('platform_fees', 'ticket_fee_pct', parseFloat(e.target.value || '0'))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt('admin.ticketFeeFlat', 'Ticket fee, flat (naira per paid ticket)')}</span></label>
                  <input type="number" step="1" min="0" className={styles.input} value={settings.platform_fees.ticket_fee_flat_ngn ?? 100} onChange={e => patch('platform_fees', 'ticket_fee_flat_ngn', parseFloat(e.target.value || '0'))} />
                  <p className={styles.sectionSub}>{tt('admin.ticketFeeHint', 'Applies to tickets sold from now on; what an event already sold keeps the numbers it sold under. Free tickets carry no fee.')}</p>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.min.payout.vc.4d43", "Min payout (VC)")} <InfoTip id="adminMinPayout" /></span></label>
                  <input type="number" className={styles.input} value={settings.platform_fees.payout_min_vc} onChange={e => patch('platform_fees', 'payout_min_vc', parseInt(e.target.value || '0', 10))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.daily.top.up.cap.f3e9", "Daily top-up cap (₦)")} <InfoTip id="adminDailyCap" /></span></label>
                  <input type="number" className={styles.input} value={settings.platform_fees.topup_max_ngn_per_day} onChange={e => patch('platform_fees', 'topup_max_ngn_per_day', parseInt(e.target.value || '0', 10))} />
                </div>
              </div>

              {/* What premium costs. Zero means it is not on sale, and the
                  offer page says so and records who wanted it, rather than
                  telling anybody to come and find an admin. */}
              <div className={shared.card}>
                <h2 className={styles.sectionTitle}>{tt('adminSettings.premiumTitle', 'Premium')}</h2>
                <p className={styles.sectionSub}>
                  {tt('adminSettings.premiumSub', 'What a V-ENT premium subscription costs, in VENT COINS. Leave a price at 0 and premium is not on sale: the offer page says so and records who asked for it.')}
                </p>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <span className="fieldLabelRow">{tt('adminSettings.premiumMonthly', 'Monthly (VC)')}</span>
                  </label>
                  <input type="number" min="0" className={styles.input}
                         value={settings.premium?.price_vc_monthly ?? 0}
                         onChange={e => patch('premium', 'price_vc_monthly', parseInt(e.target.value || '0', 10))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <span className="fieldLabelRow">{tt('adminSettings.premiumYearly', 'Yearly (VC)')}</span>
                  </label>
                  <input type="number" min="0" className={styles.input}
                         value={settings.premium?.price_vc_yearly ?? 0}
                         onChange={e => patch('premium', 'price_vc_yearly', parseInt(e.target.value || '0', 10))} />
                </div>
              </div>

              {/* Feature flags */}
              <div className={shared.card}>
                <h2 className={styles.sectionTitle}>{tt("ui.feature.flags.4f5a", "Feature Flags")}<InfoTip id="adminFeatureFlags" /></h2>
                <p className={styles.sectionSub}>{tt("ui.enable.disable.platform.modules.6bd7", "Enable or disable platform modules.")}</p>
                {FEATURES.map(f => <div key={f.key} className={styles.toggleRow}>
                    <div>
                      <p className={styles.toggleLabel}>{tx(f.label)}</p>
                      <p className={styles.toggleHint}>{tx(f.hint)}</p>
                    </div>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={!!settings.feature_flags[f.key]} onChange={e => patch('feature_flags', f.key, e.target.checked)} />
                      <span className={styles.slider} />
                    </label>
                  </div>)}
              </div>

              {/* Banner */}
              <div className={shared.card}>
                <h2 className={styles.sectionTitle}>{tt("ui.site.banner.a0f0", "Site Banner")}<InfoTip id="adminBannerEnabled" /></h2>
                <p className={styles.sectionSub}>{tt("ui.show.top.app.announcement.b846", "Show a top-of-app announcement to all users.")}</p>
                <div className={styles.toggleRow}>
                  <p className={styles.toggleLabel}>{tt("ui.banner.enabled.56d3", "Banner enabled")}</p>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={!!settings.banner.enabled} onChange={e => patch('banner', 'enabled', e.target.checked)} />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.title.768e", "Title")} <InfoTip id="adminBannerTitle" /></span></label>
                  <input type="text" className={styles.input} value={tx(settings.banner.title)} onChange={e => patch('banner', 'title', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{tt("ui.message.68f4", "Message")}</label>
                  <textarea className={styles.input} rows={3} value={settings.banner.message} onChange={e => patch('banner', 'message', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.banner.type.1cdd", "Banner type")} <InfoTip id="adminBannerType" /></span></label>
                  <select className={styles.input} value={settings.banner.type} onChange={e => patch('banner', 'type', e.target.value)}>
                    <option value="info">{tt("ui.info.blue.0445", "Info (blue)")}</option>
                    <option value="warn">{tt("ui.warning.yellow.7d00", "Warning (yellow)")}</option>
                    <option value="error">{tt("ui.error.red.150b", "Error (red)")}</option>
                    <option value="success">{tt("ui.success.green.a580", "Success (green)")}</option>
                  </select>
                </div>
              </div>

              {/* Maintenance */}
              <div className={shared.card}>
                <h2 className={styles.sectionTitle}>{tt("ui.maintenance.mode.a99b", "Maintenance Mode")}<InfoTip id="adminMaintenanceEnabled" /></h2>
                <p className={styles.sectionSub}>
                  {tt("ui.when.enabled.public.app.4c50", "When enabled, the public app shows a maintenance page. Admin portal stays accessible.")}
                </p>
                <div className={`${styles.toggleRow} ${settings.maintenance.enabled ? styles.dangerRow : ''}`}>
                  <div>
                    <p className={styles.toggleLabel}>{tt("ui.maintenance.mode.98cc", "Maintenance mode")}</p>
                    <p className={styles.toggleHint}>
                      {settings.maintenance.enabled ? tx("ENABLED - public app is offline") : tx("OFF - app live")}
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={!!settings.maintenance.enabled} onChange={e => patch('maintenance', 'enabled', e.target.checked)} />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}><span className="fieldLabelRow">{tt("ui.maintenance.message.ca62", "Maintenance message")} <InfoTip id="adminMaintenance" /></span></label>
                  <textarea className={styles.input} rows={3} value={settings.maintenance.message} onChange={e => patch('maintenance', 'message', e.target.value)} />
                </div>
              </div>
            </div>}
        </main>
      </div>
    </div>;
}
export default function AdminSettingsPage() {
  return <AdminToastProvider>
      <SettingsInner />
    </AdminToastProvider>;
}