'use client';
import { PLATFORM_ICONS } from '@/components/linked-account/platformIcons';
import Avatar from '@/components/avatar/Avatar';
import { startLink, stopLink } from '@/lib/linking';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import afcMark from '../../../public/images/afc-mark.svg';
import shared from './settingsShared.module.css';
import styles from './LinkedAccountsPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useTx } from '@/i18n/LanguageProvider';

// Three providers, and no more, because these are the three that can actually be
// confirmed. Google is how an account signs in; Discord has ordinary OAuth2;
// Steam has OpenID 2.0 that anybody may use. PSN, Xbox, Riot, Epic, EA and
// Activision have no public way for a site to prove a handle belongs to the
// person typing it, so they are not offered here at all rather than offered as
// a text box that means nothing.
const ICONS = PLATFORM_ICONS;
// A partner community's own mark, drawn in the same 38px slot as the three
// above so a row does not change shape depending on whether the provider
// shipped a logo. AFC's is their published on-dark vector; see AuthProviders
// for where it comes from and how to refresh it. A partner with no artwork
// falls back to its monogram.
const MARKS = { afc: afcMark };
const PROVIDERS = [{
  id: 'google',
  label: 'Google',
  sub: 'How this account signs in.',
  linkable: false
}, {
  id: 'discord',
  label: 'Discord',
  sub: 'Sign in to Discord, and your name and picture show on your profile.',
  subKey: 'linked.discordSub',
  linkable: true
}, {
  id: 'steam',
  label: 'Steam',
  sub: 'Sign in to Steam, and your name and picture show on your profile.',
  subKey: 'linked.steamSub',
  linkable: true
}];
const LinkedAccountsPanel = ({
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session,
    status: sessionStatus
  } = useSession();
  const token = session?.user?.sessionToken;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const [linked, setLinked] = useState({});
  const [available, setAvailable] = useState({});
  // Communities you can sign in with, and whether this account is one of them.
  // These are not PlatformAccount rows: they are whole sign-ins, so they come
  // back from the same endpoint under their own key.
  const [external, setExternal] = useState({});
  // Whether the SERVER can send a Discord direct message at all, which is a
  // different question from whether this person wants one.
  const [dmConfigured, setDmConfigured] = useState(false);
  // Where to join. Discord refuses a DM from a bot that shares no server
  // with the recipient, so this link is not a nicety: it is the step that
  // makes the switch below actually deliver anything.
  const [discordInvite, setDiscordInvite] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    // A bare `if (!token) return` left the spinner turning forever once the
    // session had resolved to nobody, which reads as a hang rather than as a
    // sign-in problem. Wait while it is still loading; give up once it is not.
    if (!token) {
      if (sessionStatus !== 'loading') {
        setLoading(false);
        setError(tt("msg.signInToSeeLinked", "Sign in to see your linked accounts."));
      }
      return;
    }
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
      setExternal(body?.data?.external || {});
      setDmConfigured(Boolean(body?.data?.dm_configured));
      setDiscordInvite(body?.data?.discord_invite || '');
      setError('');
    } catch {
      setError(tt("msg.couldNotLoadYourLinked", "Could not load your linked accounts."));
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, sessionStatus]);
  useEffect(() => {
    load();
  }, [load]);

  // The provider sends the browser back here with the outcome on the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // The provider names itself on the way back. The outside communities use
    // the same convention, and say more than yes or no: `taken` means that
    // account is already on somebody else's V-ENT profile, which is a
    // different problem from a link that simply failed.
    const OUTCOMES = {
      linked: tt("msg.linkedAccountConnected", "Account connected."),
      already: tt("msg.linkedAccountAlready", "That account is already connected here."),
      taken: tt("msg.linkedAccountTaken", "That account is already connected to another V-ENT profile."),
      failed: tt("msg.linkedAccountFailed", "Connecting did not complete. Try again.")
    };
    ['discord', 'steam', ...Object.keys(external)].forEach(id => {
      const outcome = params.get(id);
      if (!outcome) return;
      showToast?.(OUTCOMES[outcome] || OUTCOMES.failed);
      params.delete(id);
    });
    // `panel` stays. It is what says this panel is open: the settings page
    // reads it out of the URL on every render, so deleting it here made the
    // panel close itself the instant it mounted, and Linked accounts could not
    // be reached at all - not from the menu, not from a link, not on the way
    // back from a provider. Only the outcome parameters are cleaned up, and
    // only when one was actually there, so a reload does not repeat the toast.
    const rest = params.toString();
    if (rest !== new URLSearchParams(window.location.search).toString()) {
      window.history.replaceState({}, '', rest ? `?${rest}` : window.location.pathname);
    }
  }, [showToast, external, tt]);
  const toggleDm = async on => {
    setBusy('discord-dm');
    setError('');
    try {
      const res = await fetch(`${apiBase}/auth/link/discord/dm/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: on }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'api.thatDidNotSave', 'That did not save.'));
        return;
      }
      showToast?.(body.message);
      await load();
    } catch (err) {
      setError(apiMessage(tt, err, 'api.thatDidNotSave', 'That did not save.'));
    } finally {
      setBusy('');
    }
  };

  const connect = async id => {
    setBusy(id);
    const problem = await startLink(id, { token, back: 'settings', tt });
    if (problem) {
      showToast?.(problem);
      setBusy('');
    }
  };
  // Signing in with an outside community, started from here rather than from
  // the login page. The bearer token is what tells the backend this is a link
  // rather than a sign-in: without it the callback would have no idea which
  // V-ENT account to attach the identity to.
  const connectExternal = async slug => {
    setBusy(slug);
    try {
      const res = await fetch(`${apiBase}/partners/inbound/${slug}/start/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const body = await res.json();
      if (!res.ok || !body?.data?.url) {
        showToast?.(body?.message || tt("msg.couldNotStartLinking", "Could not start linking. Try again."));
        setBusy('');
        return;
      }
      window.location.href = body.data.url;
    } catch {
      showToast?.(tt("msg.couldNotStartLinking", "Could not start linking. Try again."));
      setBusy('');
    }
  };
  const disconnectExternal = async slug => {
    setBusy(slug);
    try {
      const res = await fetch(`${apiBase}/partners/inbound/${slug}/disconnect/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const body = await res.json();
      showToast?.(apiMessage(tt, body, "api.linkedAccountDisconnected", "Account disconnected."));
      await load();
    } catch {
      showToast?.(tt("msg.couldNotDisconnect", "Could not disconnect. Try again."));
    } finally {
      setBusy('');
    }
  };
  const disconnect = async id => {
    setBusy(id);
    const { message } = await stopLink(id, { token, tt });
    showToast?.(message);
    await load();
    setBusy('');
  };
  return <div className={shared.formStack}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.linked.accounts.e7cf", "Linked accounts")}</h3>
        <p className={shared.cardSub}>
          {tt("ui.linked.account.confirmed.by.f08e", "A linked account is confirmed by the platform itself: you sign in to Discord or Steam, and the name and picture on your profile come from there. Nothing here is typed, so nobody can wear somebody else's handle.")}
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
                      {connected && state.label ? <span className={styles.account}>
                          {state.avatar && <Avatar src={state.avatar} name={state.label} size={20} />}
                          {state.label}
                        </span> : !configured && p.linkable ? tt("ui.not.set.up.yet.3b91", "Not set up yet.") : p.subKey ? tt(p.subKey, p.sub) : tx(p.sub)}
                    </div>
                  </div>

                  {p.id === 'google' ? <span className={styles.sub}>{connected ? tx("Sign-in method") : tx("Not used")}</span> : <button type="button" className={`${shared.btn} ${shared.btnSm} ${connected ? shared.ghostBTN : shared.goldBTN}`} onClick={() => connected ? disconnect(p.id) : connect(p.id)} disabled={working || !connected && !configured}>
                      {working ? tt("ui.working.9a03", "Working...") : connected ? tt("ui.disconnect.5f2b", "Disconnect") : tt("ui.connect.8e41", "Connect")}
                    </button>}
                </div>;
        })}

            {/* Direct messages on Discord. Its own line under the row rather
                than a third control inside it: this is a preference, not a
                connection, and the two read differently.

                Only when Discord is connected AND the server can actually
                send. A switch that saves a preference nothing can honour is
                worse than no switch. */}
            {linked.discord?.connected && dmConfigured && <div className={styles.item}>
              <div className={styles.iconWrap}>{ICONS.discord}</div>
              <div className={styles.meta}>
                <div className={styles.row1}>
                  <span className={styles.label}>
                    {tt('linked.dmTitle', 'Direct messages on Discord')}
                  </span>
                </div>
                <div className={styles.sub}>
                  {linked.discord?.dm_available === false
                    ? tt('linked.dmReconnect', 'Disconnect and connect Discord again to turn this on.')
                    : linked.discord?.dm_error
                      ? linked.discord.dm_error
                      : tt('linked.dmSub', 'Get your V-ENT notifications as a Discord message. You need to share a server with the V-ENT bot.')}
                  {/* The join link, right here. Discord will not deliver a
                      message from a bot you share no server with, so telling
                      somebody they need to and then not saying where is half
                      an instruction. */}
                  {discordInvite && <>
                    {' '}
                    <a className={styles.inviteLink} href={discordInvite}
                       target="_blank" rel="noopener noreferrer">
                      {tt('linked.dmJoin', 'Join the V-ENT Discord')}
                    </a>
                  </>}
                </div>
              </div>
              <button type="button"
                      className={`${shared.btn} ${shared.btnSm} ${linked.discord?.dm_enabled ? shared.ghostBTN : shared.goldBTN}`}
                      aria-pressed={Boolean(linked.discord?.dm_enabled)}
                      disabled={busy === 'discord-dm' || linked.discord?.dm_available === false}
                      onClick={() => toggleDm(!linked.discord?.dm_enabled)}>
                {busy === 'discord-dm'
                  ? tt('ui.working.9a03', 'Working...')
                  : linked.discord?.dm_enabled
                    ? tt('linked.dmOff', 'Turn off')
                    : tt('linked.dmOn', 'Turn on')}
              </button>
            </div>}

            {/* Communities you can sign in with. Somebody who signed in with
                their African Free Fire Community account was connected in the
                database and told nothing about it here, which is the one place
                anybody would look. */}
            {Object.entries(external).map(([slug, meta]) => {
          const working = busy === slug;
          return <div key={slug} className={styles.item}>
                    <div className={styles.iconWrap}>
                      {MARKS[slug]
              ? <Image src={MARKS[slug]} alt="" aria-hidden="true" className={styles.partnerMark} />
              : <span className={styles.monogram}>{meta.short || slug.toUpperCase().slice(0, 3)}</span>}
                    </div>
                    <div className={styles.meta}>
                      <div className={styles.row1}>
                        <span className={styles.label}>{tx(meta.label)}</span>
                        {meta.connected && <span className={`${shared.verifyBadge} ${shared.verifyBadgeOk}`}>{tt("ui.connected.c2f9", "Connected")}</span>}
                      </div>
                      <div className={styles.sub}>
                        {meta.connected && meta.handle ? meta.handle : meta.connected ? tt("ui.linked.signIn.community.1a7c", "You can sign in with this community.") : !meta.configured ? tt("ui.not.set.up.yet.3b91", "Not set up yet.") : tt("ui.linked.signIn.offer.7d2e", "Sign in with this community instead of a password.")}
                      </div>
                    </div>

                    {meta.is_sign_in_method ? <span className={styles.sub}>{tt("ui.sign.in.method.4c1a", "Sign-in method")}</span> : <button type="button" className={`${shared.btn} ${shared.btnSm} ${meta.connected ? shared.ghostBTN : shared.goldBTN}`} onClick={() => meta.connected ? disconnectExternal(slug) : connectExternal(slug)} disabled={working || !meta.connected && !meta.configured}>
                        {working ? tt("ui.working.9a03", "Working...") : meta.connected ? tt("ui.disconnect.5f2b", "Disconnect") : tt("ui.connect.8e41", "Connect")}
                      </button>}
                  </div>;
        })}
          </div>}
      </div>
    </div>;
};
export default LinkedAccountsPanel;