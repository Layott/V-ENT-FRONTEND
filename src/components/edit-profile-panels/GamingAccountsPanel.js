'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import shared from './editProfileShared.module.css';
import styles from './GamingAccountsPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import Avatar from '@/components/avatar/Avatar';
import { PLATFORM_ICONS } from '@/components/linked-account/platformIcons';
import { LINKABLE, startLink, stopLink, takeLinkOutcomes } from '@/lib/linking';
import { useAutoRefresh } from '@/lib/useLiveData';

// The accounts on your profile, connected by signing in to them.
//
// CEO, 8 October 2026 (inbox 417): "You shouldn't as a user have to input your
// usernames or id for discord or steams, it should show once you connect."
// Then: "for the discord it was only ui, tapping the connect just put it on and
// nothing was triggered." This panel had a Display Name box, a Gamertag box and
// a switch that saved "connected: true" for whatever was typed; the real
// sign-in lived only in Settings. Now Connect goes to Discord or Steam, comes
// back here, and the name and picture shown are the ones the platform gave.
//
// Two platforms, because these are the two that can be confirmed. PSN, Xbox,
// Riot, EA, Epic and Activision have no public way for a site to check that a
// handle belongs to the person typing it.

const PLATFORMS = [
  { id: 'discord', name: 'Discord' },
  { id: 'steam', name: 'Steam' },
];

const GamingAccountsPanel = ({ onCancel, showToast }) => {
  const tt = useT();
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;
  const [linked, setLinked] = useState({});
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  // `quiet` for the background refresh: it never clears an error or shows
  // the loading line over the panel somebody is reading.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token) return;
    if (!quiet) setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/link/status/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'linked.loadFailed', 'Your linked accounts did not load.'));
        return;
      }
      setLinked(body.data?.linked || {});
      setProviders(body.data?.providers || {});
    } catch (err) {
      setError(apiMessage(tt, err, 'linked.loadFailed', 'Your linked accounts did not load.'));
    } finally {
      setLoading(false);
    }
    // `tt` is read for the error sentence only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(); }, [load]);
  // Linked in another tab, or disconnected in Settings: this follows.
  useAutoRefresh(() => load({ quiet: true }));

  // Discord or Steam sends the browser back here with the outcome on the URL.
  useEffect(() => {
    takeLinkOutcomes(LINKABLE, tt).forEach((m) => showToast?.(m));
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async (id) => {
    setBusy(id);
    const problem = await startLink(id, { token, back: 'profile', tt });
    if (problem) {
      showToast?.(problem);
      setBusy('');
    }
  };

  const disconnect = async (id) => {
    setBusy(id);
    const { message } = await stopLink(id, { token, tt });
    showToast?.(message);
    await load();
    setBusy('');
  };

  return (
    <div className={shared.formStack}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>
          {tt('ui.gaming.accounts.d1e0', 'Gaming Accounts')}<InfoTip id="gamingAccounts" />
        </h3>
        <p className={styles.lead}>
          {tt('linked.profileLead', 'Connect by signing in to Discord or Steam. Your name and picture come from there, so nobody has to type a handle and nobody can borrow one.')}
        </p>

        {loading && <p className={styles.note}>{tt('ui.loading.linked.accounts.eadb', 'Loading your linked accounts...')}</p>}
        {!loading && error && (
          <p className={styles.note}>
            {error}{' '}
            <button type="button" className={styles.retry} onClick={() => { setLoading(true); load(); }}>
              {tt('ui.try.again.042c', 'Try again')}
            </button>
          </p>
        )}

        {!loading && !error && (
          <div className={styles.list}>
            {PLATFORMS.map((p) => {
              const state = linked[p.id] || {};
              const connected = Boolean(state.connected && state.verified);
              const configured = providers[p.id]?.configured ?? false;
              const working = busy === p.id;
              return (
                <div className={styles.row} key={p.id}>
                  <div className={styles.platformIcon} aria-hidden="true">{PLATFORM_ICONS[p.id]}</div>
                  <div className={styles.who}>
                    <span className={styles.platformName}>{p.name}</span>
                    {connected ? (
                      <span className={styles.account}>
                        {state.avatar && <Avatar src={state.avatar} name={state.label} size={24} />}
                        <span className={styles.handle}>{state.label}</span>
                      </span>
                    ) : (
                      <span className={styles.muted}>
                        {configured
                          ? tt('linked.notConnected', 'Not connected')
                          : tt('ui.not.set.up.yet.3b91', 'Not set up yet.')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${shared.btn} ${connected ? shared.ghostBTN : shared.goldBTN} ${styles.action}`}
                    disabled={working || (!connected && !configured)}
                    onClick={() => (connected ? disconnect(p.id) : connect(p.id))}
                  >
                    {working
                      ? tt('ui.working.9a03', 'Working...')
                      : connected
                        ? tt('ui.disconnect.5f2b', 'Disconnect')
                        : tt('ui.connect.8e41', 'Connect')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={shared.formFooter}>
        <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={onCancel}>
          {tt('linked.done', 'Done')}
        </button>
      </div>
    </div>
  );
};

export default GamingAccountsPanel;
