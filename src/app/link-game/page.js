'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ErrorState from '@/components/error-state/ErrorState';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/lib/datetime';
import { signInHref, useViewer } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import styles from './link-game.module.css';

// `/link-game` - link a game account to your V-ENT account with the code the
// game shows you (design section 14, item 2).
//
// Two steps on purpose. Typing the code only SHOWS whose game account it is;
// nothing is linked until the person confirms it is theirs. A code somebody
// else made and sent you would otherwise tie their game account to your V-ENT
// account, and every match the game then plays as "you" would be them.
//
// The code is never read from the address: a link carrying a code is a link
// somebody can send you.

const API = process.env.NEXT_PUBLIC_API_URL;

const shape = text => {
  const raw = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
};

export default function LinkGamePage() {
  const tt = useT();
  const viewer = useViewer();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [linked, setLinked] = useState(null);
  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState('');
  const [removing, setRemoving] = useState('');

  const send = async (path, body) => {
    const res = await fetch(`${API}/partners/studios/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewer.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return { res, body: await res.json().catch(() => ({})) };
  };

  const loadLinks = useCallback(async ({ quiet = false } = {}) => {
    if (!viewer.token) return;
    if (!quiet) setLinksLoading(true);
    try {
      const res = await fetch(`${API}/partners/studios/my-links/`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinksError(apiMessage(tt, body, 'partners.linkGame.linksFailed', 'Your linked games did not load.'));
        return;
      }
      setLinks(body.data?.links || []);
      setLinksError('');
    } catch (err) {
      setLinksError(apiMessage(tt, err, 'partners.linkGame.linksFailed', 'Your linked games did not load.'));
    } finally {
      setLinksLoading(false);
    }
  }, [viewer.token, tt]);

  // A link made in another tab, or removed by the studio, shows up here
  // without a reload; quiet, so the list does not flash while it is read.
  useAutoRefresh(() => loadLinks({ quiet: true }));
  useEffect(() => {
    if (viewer.loading) return;
    if (!viewer.signedIn) {
      setLinksLoading(false);
      return;
    }
    loadLinks();
  }, [viewer.loading, viewer.signedIn, loadLinks]);

  const look = async e => {
    e.preventDefault();
    setBusy(true);
    setProblem('');
    setLinked(null);
    try {
      const { res, body } = await send('link/preview/', { code });
      if (!res.ok) {
        setPreview(null);
        setProblem(apiMessage(tt, body, 'partners.linkGame.lookFailed', 'That code did not work.'));
        return;
      }
      setPreview(body.data);
    } catch (err) {
      setProblem(apiMessage(tt, err, 'partners.linkGame.lookFailed', 'That code did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setProblem('');
    try {
      const { res, body } = await send('link/confirm/', { code });
      if (!res.ok) {
        setProblem(apiMessage(tt, body, 'partners.linkGame.confirmFailed', 'The accounts were not linked.'));
        return;
      }
      setLinked(body.data?.link || null);
      setPreview(null);
      setCode('');
      await loadLinks();
    } catch (err) {
      setProblem(apiMessage(tt, err, 'partners.linkGame.confirmFailed', 'The accounts were not linked.'));
    } finally {
      setBusy(false);
    }
  };

  const unlink = async ref => {
    setBusy(true);
    try {
      const { res, body } = await send(`my-links/${encodeURIComponent(ref)}/unlink/`);
      if (!res.ok) {
        setLinksError(apiMessage(tt, body, 'partners.linkGame.unlinkFailed', 'That link was not removed.'));
        return;
      }
      setRemoving('');
      await loadLinks();
    } catch (err) {
      setLinksError(apiMessage(tt, err, 'partners.linkGame.unlinkFailed', 'That link was not removed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <section className={styles.content}>
          <header className={styles.head}>
            <h1 className={styles.title}>{tt('partners.linkGame.title', 'Link a game account')}</h1>
            <p className={styles.sub}>
              {tt('partners.linkGame.sub', 'Your game showed you a code. Type it here to link that game account to your V-ENT account, so your matches can open in the game and count here.')}
            </p>
          </header>

          {viewer.loading && <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>}

          {!viewer.loading && !viewer.signedIn && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>{tt('partners.linkGame.signInTitle', 'Sign in first')}</h2>
              <p className={styles.muted}>
                {tt('partners.linkGame.signInBody', 'The code links a game account to the V-ENT account you are signed in with, so sign in, then type it.')}
              </p>
              <div className={styles.actions}>
                <Link href={signInHref('/link-game')} className={styles.primary}>
                  {tt('partners.linkGame.signIn', 'Sign in')}
                </Link>
              </div>
            </div>
          )}

          {!viewer.loading && viewer.signedIn && (
            <>
              <form className={styles.panel} onSubmit={look} method="post">
                <label className={styles.field}>
                  <span className={styles.label}>{tt('partners.linkGame.codeLabel', 'The code from your game')}</span>
                  <input className={styles.codeInput} value={code} autoComplete="off" spellCheck={false}
                         inputMode="text" placeholder="ABCD-EF23" maxLength={9}
                         onChange={e => { setCode(shape(e.target.value)); setPreview(null); }} />
                </label>
                {problem && <p className={styles.problem} role="alert">{problem}</p>}
                <div className={styles.actions}>
                  <button type="submit" className={styles.primary}
                          disabled={busy || code.replace('-', '').length !== 8}>
                    {busy && !preview ? tt('partners.linkGame.looking', 'Checking...') : tt('partners.linkGame.look', 'Check the code')}
                  </button>
                </div>
              </form>

              {preview && (
                <div className={styles.confirm} role="region" aria-live="polite">
                  <h2 className={styles.panelTitle}>{tt('partners.linkGame.isThisYou', 'Is this your game account?')}</h2>
                  <dl className={styles.meta}>
                    <div>
                      <dt>{tt('partners.linkGame.game', 'Game')}</dt>
                      <dd>{preview.game?.name}{preview.game?.title ? ` (${preview.game.title})` : ''}</dd>
                    </div>
                    <div>
                      <dt>{tt('partners.linkGame.studio', 'Made by')}</dt>
                      <dd>{preview.game?.studio}</dd>
                    </div>
                    <div>
                      <dt>{tt('partners.linkGame.account', 'Game account')}</dt>
                      <dd>{preview.account?.display_name || tt('partners.linkGame.noName', 'No name given')}</dd>
                    </div>
                  </dl>
                  <p className={styles.muted}>
                    {tt('partners.linkGame.warn', 'Only confirm if this is your own account in the game. If somebody sent you this code, do not.')}
                  </p>
                  <div className={styles.actions}>
                    <button type="button" className={styles.primary} onClick={confirm} disabled={busy}>
                      {busy ? tt('partners.linkGame.linking', 'Linking...') : tt('partners.linkGame.confirm', 'Yes, link it')}
                    </button>
                    <button type="button" className={styles.ghost} onClick={() => { setPreview(null); setCode(''); }} disabled={busy}>
                      {tt('partners.linkGame.notMine', 'No, it is not mine')}
                    </button>
                  </div>
                </div>
              )}

              {linked && (
                <p className={styles.success} role="status">
                  {tt('partners.linkGame.done', 'Linked: {account} in {game}.')
                    .replace('{account}', linked.display_name || '')
                    .replace('{game}', linked.game?.name || '')}
                </p>
              )}

              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.linkGame.yours', 'Your linked games')}</h2>
                {linksLoading && <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>}
                {!linksLoading && linksError && <ErrorState message={linksError} onRetry={() => loadLinks()} compact />}
                {!linksLoading && !linksError && links.length === 0 && (
                  <p className={styles.muted}>{tt('partners.linkGame.none', 'No game accounts linked yet.')}</p>
                )}
                {!linksLoading && !linksError && links.length > 0 && (
                  <ul className={styles.list}>
                    {links.map(row => (
                      <li key={row.ref} className={styles.row}>
                        <div className={styles.rowText}>
                          <p className={styles.rowName}>{row.game?.name}</p>
                          <p className={styles.muted}>
                            {row.display_name || tt('partners.linkGame.noName', 'No name given')}
                            {' · '}
                            {tt('partners.linkGame.since', 'Linked {date}').replace('{date}', formatDate(row.linked_at))}
                          </p>
                        </div>
                        {removing === row.ref ? (
                          <div className={styles.actions}>
                            <button type="button" className={styles.danger} onClick={() => unlink(row.ref)} disabled={busy}>
                              {tt('partners.linkGame.unlinkYes', 'Yes, unlink')}
                            </button>
                            <button type="button" className={styles.ghost} onClick={() => setRemoving('')} disabled={busy}>
                              {tt('partners.linkGame.cancel', 'Cancel')}
                            </button>
                          </div>
                        ) : (
                          <button type="button" className={styles.ghost} onClick={() => setRemoving(row.ref)} disabled={busy}>
                            {tt('partners.linkGame.unlink', 'Unlink')}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </main>
      <BottomMenu />
    </div>
  );
}
