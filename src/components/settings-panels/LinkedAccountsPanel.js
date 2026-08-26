'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import shared from './settingsShared.module.css';
import styles from './LinkedAccountsPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Three providers, and no more, because these are the three that can actually be
// confirmed. Google is how an account signs in; Discord has ordinary OAuth2;
// Steam has OpenID 2.0 that anybody may use. PSN, Xbox, Riot, Epic, EA and
// Activision have no public way for a site to prove a handle belongs to the
// person typing it, so they are not offered here at all rather than offered as
// a text box that means nothing.
const ICONS = {
  google: <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>,
  discord: <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
      <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 00-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 00-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
    </svg>,
  steam: <svg width="18" height="18" viewBox="0 0 24 24" fill="#c7d5e0" aria-hidden="true">
      <path d="M12 0C5.4 0 .15 5.13.01 11.6L6.45 14.27a3.36 3.36 0 011.94-.61c.06 0 .12 0 .19.01l2.86-4.15v-.06a4.49 4.49 0 014.49-4.5c2.48 0 4.5 2.02 4.5 4.51 0 2.49-2.02 4.51-4.5 4.51h-.1l-4.08 2.92c0 .05.01.1.01.16a3.36 3.36 0 01-6.71.13L1.3 15.51A12 12 0 0012 24c6.63 0 12-5.37 12-12S18.63 0 12 0zM7.55 18.21l-1.48-.61c.26.55.72.97 1.29 1.21 1.27.53 2.74-.07 3.27-1.34a2.5 2.5 0 00-1.34-3.27l-1.53-.63c.61-.23 1.3-.24 1.95.04 1.59.65 2.34 2.51 1.69 4.1-.65 1.59-2.51 2.34-4.1 1.69a3.06 3.06 0 01-1.74-1.81l1.99.62zM18.93 9.46c0-1.66-1.35-3-3-3-1.66 0-3 1.35-3 3s1.35 3 3 3c1.66 0 3-1.35 3-3zm-5.25 0a2.25 2.25 0 014.5 0 2.25 2.25 0 01-4.5 0z" />
    </svg>
};
const PROVIDERS = [{
  id: 'google',
  label: 'Google',
  sub: 'How this account signs in.',
  linkable: false
}, {
  id: 'discord',
  label: 'Discord',
  sub: 'Confirm your Discord handle on your profile.',
  linkable: true
}, {
  id: 'steam',
  label: 'Steam',
  sub: 'Confirm your Steam account on your profile.',
  linkable: true
}];
const LinkedAccountsPanel = ({
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const token = session?.user?.sessionToken;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const [linked, setLinked] = useState({});
  const [available, setAvailable] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/auth/link/status/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setLinked(body?.data?.linked || {});
      setAvailable(body?.data?.providers || {});
      setError('');
    } catch {
      setError(tt("msg.couldNotLoadYourLinked", "Could not load your linked accounts."));
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);
  useEffect(() => {
    load();
  }, [load]);

  // The provider sends the browser back here with the outcome on the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    ['discord', 'steam'].forEach(id => {
      const outcome = params.get(id);
      if (!outcome) return;
      showToast?.(outcome === 'linked' ? `${id[0].toUpperCase()}${id.slice(1)} linked` : `${id[0].toUpperCase()}${id.slice(1)} linking did not complete`);
      params.delete(id);
    });
    if (params.get('panel')) params.delete('panel');
    const rest = params.toString();
    if (window.location.search) {
      window.history.replaceState({}, '', rest ? `/settings?${rest}` : '/settings');
    }
  }, [showToast]);
  const connect = async id => {
    setBusy(id);
    try {
      const res = await fetch(`${apiBase}/auth/link/${id}/start/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const body = await res.json();
      if (res.status === 503) {
        showToast?.(body.message || `${id} linking is not set up yet.`);
        return;
      }
      if (!res.ok || !body?.data?.url) {
        showToast?.('Could not start linking. Try again.');
        return;
      }
      window.location.href = body.data.url;
    } catch {
      showToast?.('Could not start linking. Try again.');
    } finally {
      setBusy('');
    }
  };
  const disconnect = async id => {
    setBusy(id);
    try {
      const res = await fetch(`${apiBase}/auth/link/${id}/disconnect/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const body = await res.json();
      showToast?.(body.message || `${id} disconnected`);
      await load();
    } catch {
      showToast?.('Could not disconnect. Try again.');
    } finally {
      setBusy('');
    }
  };
  return <div className={shared.formStack}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.linked.accounts.e7cf", "Linked accounts")}</h3>
        <p className={shared.cardSub}>
          {tt("ui.linked.account.confirmed.by.f08e", "A linked account is confirmed by the platform itself, so the handle on your profile is\n          proven rather than typed. Handles for PSN, Xbox, Riot, EA, Epic and Activision are entered\n          on your profile instead, because none of them offer a way for us to check them.")}
        </p>

        {loading && <p className={shared.cardSub}>{tt("ui.loading.linked.accounts.eadb", "Loading your linked accounts...")}</p>}
        {!loading && error && <p className={shared.cardSub}>{error}</p>}

        {!loading && !error && <div className={styles.list}>
            {PROVIDERS.map(p => {
          const state = linked[p.id] || {};
          const connected = !!state.connected;
          const configured = p.id === 'google' ? true : available[p.id]?.configured ?? false;
          const working = busy === p.id;
          return <div key={p.id} className={styles.item}>
                  <div className={styles.iconWrap}>{ICONS[p.id]}</div>
                  <div className={styles.meta}>
                    <div className={styles.row1}>
                      <span className={styles.label}>{tx(p.label)}</span>
                      {connected && <span className={`${shared.verifyBadge} ${shared.verifyBadgeOk}`}>{tt("ui.connected.c2f9", "Connected")}</span>}
                    </div>
                    <div className={styles.sub}>
                      {connected && state.label ? state.label : !configured && p.linkable ? tx("Not set up yet.") : p.sub}
                    </div>
                  </div>

                  {p.id === 'google' ? <span className={styles.sub}>{connected ? tx("Sign-in method") : tx("Not used")}</span> : <button type="button" className={`${shared.btn} ${shared.btnSm} ${connected ? shared.ghostBTN : shared.goldBTN}`} onClick={() => connected ? disconnect(p.id) : connect(p.id)} disabled={working || !connected && !configured}>
                      {working ? tx("Working...") : connected ? 'Disconnect' : 'Connect'}
                    </button>}
                </div>;
        })}
          </div>}
      </div>
    </div>;
};
export default LinkedAccountsPanel;