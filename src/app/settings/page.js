'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import AccountPanel from '@/components/settings-panels/AccountPanel';
import NotificationsPanel from '@/components/settings-panels/NotificationsPanel';
import PrivacyPanel from '@/components/settings-panels/PrivacyPanel';
import SecurityPanel from '@/components/settings-panels/SecurityPanel';
import PaymentsPanel from '@/components/settings-panels/PaymentsPanel';
import LanguagePanel from '@/components/settings-panels/LanguagePanel';
import DevicesPanel from '@/components/settings-panels/DevicesPanel';
import LinkedAccountsPanel from '@/components/settings-panels/LinkedAccountsPanel';
import DangerZonePanel from '@/components/settings-panels/DangerZonePanel';
import shared from '@/components/settings-panels/settingsShared.module.css';
import styles from './settings.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Ids are fixed; labels come from the translator, so switching language
// renames the navigation without touching which panel is open.
const PANEL_IDS = [{
  id: 'account',
  key: 'settings.account'
}, {
  id: 'notifications',
  key: 'settings.notifications'
}, {
  id: 'privacy',
  key: 'settings.privacy'
}, {
  id: 'security',
  key: 'settings.security'
}, {
  id: 'payments',
  key: 'settings.payments'
}, {
  id: 'language',
  key: 'settings.language'
}, {
  id: 'devices',
  key: 'settings.devices'
}, {
  id: 'linked',
  key: 'settings.linkedAccounts'
}, {
  id: 'danger',
  key: 'settings.dangerZone',
  danger: true
}];
const SettingsContent = () => {
  const tx = useTx();
  const tt = useT();
  const PANELS = PANEL_IDS.map(p => ({
    ...p,
    label: tt(p.key)
  }));
  const {
    data: session
  } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [devices, setDevices] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    msg: '',
    kind: 'ok'
  });
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const activePanel = (() => {
    const p = searchParams.get('panel');
    return PANEL_IDS.some(pp => pp.id === p) ? p : 'account';
  })();
  const setPanel = id => {
    router.push(`/settings?panel=${id}`, {
      scroll: false
    });
  };
  const showToast = useCallback((msg, kind = 'ok') => {
    setToast({
      msg,
      kind
    });
    setTimeout(() => setToast({
      msg: '',
      kind: 'ok'
    }), 2500);
  }, []);
  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  }), [session?.user?.sessionToken]);

  // ── Initial data load ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      setLoading(true);
      // Wait for the session token before firing authed requests - otherwise
      // /setting/ + /device/list/ go out without an Authorization header and 400.
      const token = session?.user?.sessionToken;
      if (token) {
        try {
          const [setRes, devRes] = await Promise.all([fetch(`${apiBase}/setting/`, {
            headers: authHeaders()
          }), fetch(`${apiBase}/device/list/`, {
            headers: authHeaders()
          })]);
          const setData = await setRes.json();
          const devData = await devRes.json();
          if (!cancelled) {
            if (setData?.status === 'success') {
              setSettings(setData.data?.settings || null);
            }
            if (devData?.status === 'success') {
              setDevices(devData.data?.devices || []);
            }
          }
        } catch (err) {
          console.error('Settings fetch error:', err);
        }
      }

      // Load user profile separately so settings still render even if profile fails.
      try {
        const userId = session?.user?.id;
        if (userId) {
          const res = await fetch(`${apiBase}/auth/get-user-informations/?user_id=${userId}`, {
            headers: authHeaders()
          });
          const data = await res.json();
          if (!cancelled) setUser(data.data || data);
        } else {
          // Fall back to localStorage cache if NextAuth not yet ready.
          try {
            const stored = localStorage.getItem('userProfile');
            if (stored && !cancelled) setUser(JSON.parse(stored));
          } catch {}
        }
      } catch (err) {
        console.error('User profile fetch error:', err);
        try {
          const stored = localStorage.getItem('userProfile');
          if (stored && !cancelled) setUser(JSON.parse(stored));
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [apiBase, authHeaders, session?.user?.id, session?.user?.sessionToken]);

  // ── Generic mock-driven update wrapper ───────────────────────────
  const postUpdate = useCallback(async (path, body) => {
    try {
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body || {})
      });
      return await res.json();
    } catch (err) {
      console.error('Settings update error:', err);
      return {
        status: 'error',
        message: 'Network error'
      };
    }
  }, [apiBase, authHeaders]);

  // ── Handlers per panel ───────────────────────────────────────────
  const handleSaveNotifications = async next => {
    const out = await postUpdate('/setting/notifications/update/', next);
    if (out?.status === 'success') {
      setSettings(prev => ({
        ...(prev || {}),
        notifications: out.data?.notifications || next
      }));
      showToast(tt("msg.notificationPreferencesUpdated", "Notification preferences updated"));
    } else {
      showToast(out?.message || tt("api.saveFailed", "Save failed"), 'error');
    }
  };
  const handleSavePrivacy = async next => {
    const out = await postUpdate('/setting/privacy/update/', next);
    if (out?.status === 'success') {
      setSettings(prev => ({
        ...(prev || {}),
        privacy: out.data?.privacy || next
      }));
      showToast(tt("msg.privacyPreferencesSaved", "Privacy preferences saved"));
    } else {
      showToast(out?.message || tt("api.saveFailed", "Save failed"), 'error');
    }
  };
  const handleSaveSecurity = async next => {
    const out = await postUpdate('/setting/security/update/', next);
    if (out?.status === 'success') {
      setSettings(prev => ({
        ...(prev || {}),
        security: out.data?.security || next
      }));
      showToast(tt("msg.securitySettingsSaved", "Security settings saved"));
    } else {
      showToast(out?.message || tt("api.saveFailed", "Save failed"), 'error');
    }
  };
  const handleSavePayments = async next => {
    const out = await postUpdate('/setting/payments/update/', next);
    if (out?.status === 'success') {
      setSettings(prev => ({
        ...(prev || {}),
        payments: out.data?.payments || next
      }));
      showToast(tt("msg.paymentPreferencesSaved", "Payment preferences saved"));
    } else {
      showToast(out?.message || tt("api.saveFailed", "Save failed"), 'error');
    }
  };
  const handleSaveLanguage = async next => {
    const out = await postUpdate('/setting/update/', next);
    if (out?.status === 'success') {
      setSettings(prev => ({
        ...(prev || {}),
        ...next
      }));
      showToast(tt("msg.languageAmpRegionSaved", "Language &amp; region saved"));
    } else {
      showToast(out?.message || tt("api.saveFailed", "Save failed"), 'error');
    }
  };
  const handleSaveAccount = async payload => {
    const id = session?.user?.id || 'me';
    const out = await postUpdate(`/user/${id}/update/`, payload);
    setUser(prev => ({
      ...(prev || {}),
      ...payload
    }));
    try {
      const stored = localStorage.getItem('userProfile');
      const merged = {
        ...(stored ? JSON.parse(stored) : {}),
        ...payload
      };
      localStorage.setItem('userProfile', JSON.stringify(merged));
      window.dispatchEvent(new Event('vent:profile-updated'));
    } catch {}
    if (out?.status === 'error') {
      showToast(out?.message || tt("api.saveFailed", "Save failed"), 'error');
    } else {
      showToast(tt("msg.accountInfoSaved", "Account info saved"));
    }
  };
  const handleRevokeDevice = async deviceId => {
    const out = await postUpdate(`/device/${deviceId}/revoke/`, {});
    if (out?.status === 'success') {
      setDevices(out.data?.devices || []);
      showToast(tt("msg.sessionSignedOut", "Session signed out"));
    } else {
      showToast(out?.message || tt("api.couldNotSignOutDevice", "Could not sign out device"), 'error');
    }
  };
  const handleRevokeAllOthers = async () => {
    const others = devices.filter(d => !d.is_current);
    for (const d of others) {
      // sequential is fine - small list
      // eslint-disable-next-line no-await-in-loop
      await postUpdate(`/device/${d.id}/revoke/`, {});
    }
    // Re-fetch authoritative list.
    try {
      const res = await fetch(`${apiBase}/device/list/`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data?.status === 'success') setDevices(data.data?.devices || []);
    } catch {}
    showToast(tt("msg.allOtherSessionsSignedOut", "All other sessions signed out"));
  };
  if (loading) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>{tt("ui.settings.c7f7", "Settings")}</h1>
              <p className={styles.pageSub}>{tt("ui.manage.account.security.preferences.848e", "Manage your account, security, and preferences.")}</p>
            </div>
            {/* Mount the panel switcher in the loading state too - the URL
                `?panel=...` is the source of truth and the audit checks the
                tab UI is visible before data lands. */}
            <div className={shared.pageGrid}>
              <aside className={shared.submenuCard}>
                <div className={shared.submenuLabel}>{tt("ui.menu.57f5", "Menu")}</div>
                <ul className={shared.submenuList}>
                  {PANELS.map(p => {
                  const active = activePanel === p.id;
                  const cls = [shared.submenuItem, active ? shared.submenuItemActive : '', p.danger ? shared.submenuItemDanger : ''].filter(Boolean).join(' ');
                  return <li key={p.id} className={cls}>
                        <button type="button" onClick={() => setPanel(p.id)}>
                          {tx(p.label)}
                          <span className={shared.chev}>›</span>
                        </button>
                      </li>;
                })}
                </ul>
              </aside>
              <section>
                <div className={styles.loadingState}>{tt("ui.loading.settings.bdc2", "Loading settings…")}</div>
              </section>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{tt("ui.settings.c7f7", "Settings")}</h1>
            <p className={styles.pageSub}>{tt("ui.manage.account.security.preferences.848e", "Manage your account, security, and preferences.")}</p>
          </div>

          <div className={shared.pageGrid}>
            <aside className={shared.submenuCard}>
              <div className={shared.submenuLabel}>{tt("ui.menu.57f5", "Menu")}</div>
              <ul className={shared.submenuList}>
                {PANELS.map(p => {
                const active = activePanel === p.id;
                const cls = [shared.submenuItem, active ? shared.submenuItemActive : '', p.danger ? shared.submenuItemDanger : ''].filter(Boolean).join(' ');
                return <li key={p.id} className={cls}>
                      <button type="button" onClick={() => setPanel(p.id)}>
                        {tx(p.label)}
                        <span className={shared.chev}>›</span>
                      </button>
                    </li>;
              })}
              </ul>
            </aside>

            <section>
              {activePanel === 'account' && <AccountPanel user={user} onSave={handleSaveAccount} showToast={showToast} />}
              {activePanel === 'notifications' && <NotificationsPanel notifications={settings?.notifications || {}} onSave={handleSaveNotifications} />}
              {activePanel === 'privacy' && <PrivacyPanel privacy={settings?.privacy || {}} onSave={handleSavePrivacy} showToast={showToast} />}
              {activePanel === 'security' && <SecurityPanel security={settings?.security || {}} onSave={handleSaveSecurity} showToast={showToast} />}
              {activePanel === 'payments' && <PaymentsPanel payments={settings?.payments || {}} user={user} onSave={handleSavePayments} showToast={showToast} />}
              {activePanel === 'language' && <LanguagePanel language={settings?.language} timezone={settings?.timezone} onSave={handleSaveLanguage} />}
              {activePanel === 'devices' && <DevicesPanel devices={devices} onRevoke={handleRevokeDevice} onRevokeAllOthers={handleRevokeAllOthers} showToast={showToast} />}
              {activePanel === 'linked' && <LinkedAccountsPanel showToast={showToast} />}
              {activePanel === 'danger' && <DangerZonePanel showToast={showToast} />}
            </section>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast.msg && <div className={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : ''}`}>
          {toast.msg}
        </div>}
    </div>;
};
const Settings = () => {
  const tt = useT();
  return <Suspense fallback={<div style={{
    minHeight: '100vh',
    backgroundColor: '#131316',
    color: '#A7A6A6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
        {tt("ui.loading.33ce", "Loading…")}
      </div>}>
    <SettingsContent />
  </Suspense>;
};
export default Settings;