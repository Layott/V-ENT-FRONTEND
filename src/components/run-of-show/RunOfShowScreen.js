'use client';

// The page shell around a run of show, at all three of its addresses.
//
// One shell rather than three, so a caster opening a share link and a viewer
// opening it off the event page get the same screen. The only difference is how
// it was found.
//
// `sheet` arrives from the server component when the sheet is public or link
// only, so the running order is in the HTML that a crawler and a link preview
// read. When it is private, the server has nothing to give and the loader below
// asks again with the viewer's own token, which is the only way an organiser
// sees their own unpublished sheet.

import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ShareCard from '@/components/share/ShareCard';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';
import RunOfShow, { RunOfShowLoader } from './RunOfShow';
import styles from './run-of-show-screen.module.css';

export default function RunOfShowScreen({ sheet, kind, ownerRef, token, sharePath }) {
  const tt = useT();
  const viewer = useViewer();

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />

      <main className={styles.main}>
        <Sidebar />

        <div className={styles.pane}>
          {sheet ? (
            <>
              <RunOfShow sheet={sheet} />
              {sharePath ? (
                <div className={styles.shareRow}>
                  <ShareCard
                    compact
                    url={sharePath}
                    title={sheet.name || sheet.owner?.name || ''}
                    text={tt('ros.shareText', 'The run of show')}
                    label={tt('ros.shareLabel', 'Share the run of show')}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Nothing came back unauthenticated. Either it is private and
                  this viewer runs it, or there is nothing here. The loader
                  tells those apart with the viewer's own token; it is never
                  asked to decide while the session is still resolving. */}
              {viewer.loading ? (
                <div className={styles.waiting} role="status" aria-busy="true">
                  <span className={styles.skel} />
                  <span className={styles.skel} />
                </div>
              ) : (
                <RunOfShowLoader
                  token={token}
                  kind={kind}
                  ownerRef={ownerRef}
                  authToken={viewer.token}
                />
              )}
              {!viewer.loading && !viewer.signedIn ? (
                <p className={styles.signedOut}>
                  {tt('ros.signInHint', 'If this run of show is yours, sign in to see it.')}
                  {' '}
                  <Link className={styles.signInLink} href="/login">
                    {tt('ros.signIn', 'Sign in')}
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}
