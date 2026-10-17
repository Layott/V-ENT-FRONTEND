'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import BackLink from '@/components/back-link/BackLink';
import ErrorState from '@/components/error-state/ErrorState';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { signInHref, useViewer } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import { studioStatus, studioStatusLabel } from '@/components/studio-portal/studioLabels';
import styles from './studios.module.css';
import useGames from '@/components/game-modes/useGames';

// `/partners/studios` - a studio's games (bracket structure design, section 14).
//
// CEO, 16 October 2026 (inbox 482): "then even build the section and part for
// integration with game developers." Connect a game once and every V-ENT
// format runs in it. This page lists the studio's games, connects a new one
// and makes a test key; each game's settings live on its own page.
//
// Every state is said on the page: signed out, not a partner yet, waiting for
// review, no games, a failed load. The signing secret and the test key are
// shown once, right after they are made, and never again.

const API = process.env.NEXT_PUBLIC_API_URL;
const EMPTY_FORM = { name: '', game_id: '', session_webhook_url: '', events_webhook_url: '' };

export default function StudiosPage() {
  const tt = useT();
  const viewer = useViewer();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);
  // The game catalogue is public; the picker shows active titles only. Read
  // through the shared hook: this page once kept its own fetch and stored the
  // whole {games, count} answer, which crashed the page (walk, 17 Oct 2026).
  const { games: catalogue } = useGames();
  const titles = catalogue.filter(g => g.active);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [secret, setSecret] = useState(null);
  const [testKey, setTestKey] = useState('');
  const [toast, setToast] = useState('');

  const say = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 4000);
  };

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!viewer.token) return;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${API}/partners/studios/`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(apiMessage(tt, body, 'partners.studios.loadFailed', 'Your games did not load.'));
        return;
      }
      setData(body.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(apiMessage(tt, err, 'partners.studios.loadFailed', 'Your games did not load.'));
    } finally {
      setLoading(false);
    }
  }, [viewer.token, tt]);

  useAutoRefresh(() => load({ quiet: true }));
  useEffect(() => {
    if (viewer.loading) return;
    if (!viewer.signedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [viewer.loading, viewer.signedIn, load]);

  const register = async e => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch(`${API}/partners/studios/register/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${viewer.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          game_id: form.game_id ? Number(form.game_id) : null,
          session_webhook_url: form.session_webhook_url,
          events_webhook_url: form.events_webhook_url,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(apiMessage(tt, body, 'partners.studios.registerFailed', 'The game was not connected.'));
        return;
      }
      setSecret({ slug: body.data.game.slug, name: body.data.game.name, value: body.data.signing_secret });
      setForm(EMPTY_FORM);
      say(tt('partners.studios.registered', 'Game connected.'));
      await load({ quiet: true });
    } catch (err) {
      setFormError(apiMessage(tt, err, 'partners.studios.registerFailed', 'The game was not connected.'));
    } finally {
      setBusy(false);
    }
  };

  const makeTestKey = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/partners/studios/sandbox-key/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${viewer.token}`, 'Content-Type': 'application/json' },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        say(apiMessage(tt, body, 'partners.studios.sandboxFailed', 'The test key was not made.'));
        return;
      }
      setTestKey(body.data.secret);
      say(tt('partners.studios.sandboxMade', 'Test key made.'));
    } catch (err) {
      say(apiMessage(tt, err, 'partners.studios.sandboxFailed', 'The test key was not made.'));
    } finally {
      setBusy(false);
    }
  };

  const games = data?.games || [];
  const refusal = data?.refusal_code;

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <section className={styles.content}>
          <BackLink href="/partners">{tt('partners.studios.back', 'Partner programme')}</BackLink>
          <header className={styles.pageHead}>
            <h1 className={styles.pageTitle}>{tt('partners.studios.title', 'Game studios')}</h1>
            <p className={styles.pageSub}>
              {tt('partners.studios.sub', 'Connect your game once and every V-ENT format runs in it: players link their accounts, matches open lobbies in your game, and the results score the bracket.')}
            </p>
            <div className={styles.actions}>
              <Link href="/partners/docs/studios" className={styles.ghostBtn}>
                {tt('partners.studios.guide', 'Read the guide for game studios')}
              </Link>
            </div>
          </header>

          {(viewer.loading || (viewer.signedIn && loading)) && (
            <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>
          )}

          {!viewer.loading && !viewer.signedIn && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>{tt('partners.studios.signInTitle', 'Sign in to connect a game')}</h2>
              <p className={styles.muted}>
                {tt('partners.studios.signInBody', 'A game belongs to a partner account, and a partner account belongs to a V-ENT account.')}
              </p>
              <div className={styles.actions}>
                <Link href={signInHref('/partners/studios')} className={styles.primaryBtn}>
                  {tt('partners.studios.signIn', 'Sign in')}
                </Link>
              </div>
            </div>
          )}

          {viewer.signedIn && !loading && loadError && (
            <ErrorState message={loadError} onRetry={() => load()} />
          )}

          {viewer.signedIn && !loading && !loadError && refusal === 'NOT_A_PARTNER' && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>{tt('partners.studios.notPartnerTitle', 'Apply to the partner programme first')}</h2>
              <p className={styles.muted}>
                {tt('partners.studios.notPartnerBody', 'A game is connected under a partner account. The base tier is granted as soon as you apply.')}
              </p>
              <div className={styles.actions}>
                <Link href="/partners" className={styles.primaryBtn}>
                  {tt('partners.studios.applyLink', 'Go to the partner programme')}
                </Link>
              </div>
            </div>
          )}

          {viewer.signedIn && !loading && !loadError && refusal === 'STUDIO_PARTNER_NOT_APPROVED' && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>{tt('partners.studios.pendingTitle', 'Your application is waiting for review')}</h2>
              <p className={styles.muted}>
                {tt('partners.studios.pendingBody', 'You can connect a game once an admin has approved your partner account.')}
              </p>
            </div>
          )}

          {viewer.signedIn && !loading && !loadError && data && (
            <>
              {(games.length > 0 || !refusal) && (
                <div className={styles.panel}>
                  <h2 className={styles.panelTitle}>{tt('partners.studios.yourGames', 'Your games')}</h2>
                  {games.length === 0 ? (
                    <p className={styles.muted}>{tt('partners.studios.noGames', 'No games yet. Connect your first one below.')}</p>
                  ) : (
                    <div className={styles.gameList}>
                      {games.map(game => {
                        const state = studioStatus(game);
                        return (
                          <Link key={game.slug} href={`/partners/studios/${game.slug}`} className={styles.gameRow}>
                            <span>
                              <p className={styles.gameName}>{game.name}</p>
                              <span className={styles.muted}>
                                {game.game?.title || tt('partners.studios.noVentGame', 'No V-ENT game chosen')}
                              </span>
                            </span>
                            <span className={`${styles.chip} ${styles[`chip_${state}`] || ''}`}>
                              {studioStatusLabel(tt, state)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {secret && (
                <div className={styles.secretBox} role="status">
                  <p className={styles.secretLabel}>
                    {tt('partners.studios.secretLabel', 'Your signing secret for {name}. Copy it now: it is not shown again.').replace('{name}', secret.name)}
                  </p>
                  <code className={styles.code}>{secret.value}</code>
                  <div className={styles.actions}>
                    <Link href={`/partners/studios/${secret.slug}`} className={styles.ghostBtn}>
                      {tt('partners.studios.openGame', 'Open its settings')}
                    </Link>
                  </div>
                </div>
              )}

              {data.can_register && (
                <form className={styles.panel} onSubmit={register} method="post">
                  <h2 className={styles.panelTitle}>{tt('partners.studios.registerTitle', 'Connect a game')}</h2>
                  <p className={styles.muted}>
                    {tt('partners.studios.registerBody', 'It starts in the sandbox, where it reaches only tournaments you run and the testers you name. Going live is reviewed by V-ENT.')}
                  </p>
                  <div className={`${styles.formGrid} ${styles.spaced}`}>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('partners.studios.name', 'Name')}</span>
                      <input className={styles.input} value={form.name} maxLength={120} required
                             onChange={e => setForm({ ...form, name: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('partners.studios.ventGame', 'The V-ENT game it serves')}</span>
                      <select className={styles.select} value={form.game_id}
                              onChange={e => setForm({ ...form, game_id: e.target.value })}>
                        <option value="">{tt('partners.studios.chooseGame', 'Choose a game')}</option>
                        {titles.map(title => (
                          <option key={title.id} value={title.id}>{title.name}</option>
                        ))}
                      </select>
                      <span className={styles.hint}>
                        {tt('partners.studios.ventGameHint', 'Tournaments of this game may run their matches through your integration.')}
                      </span>
                    </label>
                  </div>
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('partners.studios.sessionUrl', 'Game session address')}</span>
                    <input className={styles.input} value={form.session_webhook_url} inputMode="url"
                           placeholder="https://api.your-studio.com/vent/sessions"
                           onChange={e => setForm({ ...form, session_webhook_url: e.target.value })} />
                    <span className={styles.hint}>
                      {tt('partners.studios.sessionUrlHint', 'We call this to create and cancel lobbies. It must be https.')}
                    </span>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('partners.studios.eventsUrl', 'Events address')}</span>
                    <input className={styles.input} value={form.events_webhook_url} inputMode="url"
                           placeholder="https://api.your-studio.com/vent/events"
                           onChange={e => setForm({ ...form, events_webhook_url: e.target.value })} />
                    <span className={styles.hint}>
                      {tt('partners.studios.eventsUrlHint', 'We send events here. Leave it empty to use the game session address.')}
                    </span>
                  </label>
                  {formError && <p className={styles.problem} role="alert">{formError}</p>}
                  <div className={styles.actions}>
                    <button type="submit" className={styles.primaryBtn} disabled={busy || !form.name.trim()}>
                      {busy ? tt('partners.studios.registering', 'Connecting...') : tt('partners.studios.register', 'Connect the game')}
                    </button>
                  </div>
                </form>
              )}

              {data.can_register && (
                <div className={styles.panel}>
                  <h2 className={styles.panelTitle}>{tt('partners.studios.sandboxTitle', 'Test keys')}</h2>
                  <p className={styles.muted}>
                    {tt('partners.studios.sandboxBody', 'A test key starts vent_pk_test_ and works only with your sandbox games. Build with it; ask for a live game when you are ready.')}
                  </p>
                  {testKey && (
                    <div className={styles.secretBox} role="status">
                      <p className={styles.secretLabel}>
                        {tt('partners.studios.keyLabel', 'Your test key. Copy it now: it is not shown again.')}
                      </p>
                      <code className={styles.code}>{testKey}</code>
                    </div>
                  )}
                  <div className={styles.actions}>
                    <button type="button" className={styles.ghostBtn} onClick={makeTestKey} disabled={busy}>
                      {tt('partners.studios.sandboxMake', 'Make a test key')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {toast && <div className={styles.toast}>{toast}</div>}
        </section>
      </main>
      <BottomMenu />
    </div>
  );
}
