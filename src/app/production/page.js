'use client';

// The production hub: everything you can put on a stream, and where to run it.
//
// Production is run from the console of one tournament or one event, because a
// graphic belongs to the thing it draws from. This page exists because that
// fact was invisible: the sidebar said "Production - Unavailable", the console
// header had a disabled "Production Panel" button titled "not available yet",
// and this address said "LIVE NOW", all on one screen (audit, 2 September
// 2026). Three signals, three answers, and the true one was none of them.
//
// So this page answers plainly: what the two production tools are, and a list
// of what you run with a way into each. Nothing here is a control that acts;
// the acting happens on the console it links to.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import { apiMessage } from '@/lib/apiMessage';
import { appLocale } from '@/lib/appLocale';
import { useViewer } from '@/lib/gating';
import { useT, useTx } from '@/i18n/LanguageProvider';
import {
  API, ventFetch, toTournamentArray, tournamentStatus,
} from '@/components/tournament-lib/tournamentApi';
import styles from './production.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(appLocale(), { day: 'numeric', month: 'short' });
};

export default function ProductionHub() {
  const tt = useT();
  const tx = useTx();
  const viewer = useViewer();

  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tRes, eRes] = await Promise.all([
        ventFetch(API.TOURNAMENT.ORGANIZER_LIST, { token: viewer.token }),
        fetch(`${API_URL}/event/my-events/`, {
          headers: { Authorization: `Bearer ${viewer.token}` },
        }).then((r) => r.json()).catch(() => null),
      ]);
      setTournaments(toTournamentArray(tRes?.data ?? tRes));
      setEvents(eRes?.status === 'success' ? (eRes.data?.results || []) : []);
    } catch (err) {
      setError(apiMessage(tt, err, 'production.loadFailed',
        'Could not load what you run.'));
    } finally {
      setLoading(false);
    }
  }, [viewer.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Decide nothing while the session is still being asked about. `data` alone
  // cannot tell "signed out" from "not answered yet".
  useEffect(() => {
    if (viewer.loading) return;
    if (!viewer.signedIn) { setLoading(false); return; }
    load();
  }, [viewer.loading, viewer.signedIn, load]);

  const running = tournaments.filter((t) => {
    const s = tournamentStatus(t);
    return s !== 'draft' && s !== 'cancelled';
  });

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>{tt('production.title', 'Production')}</h1>
              <p className={styles.pageSub}>
                {tt('production.sub', 'Graphics for a stream, drawn from a tournament or an event and pasted into OBS, vMix or anything that takes a browser source. Everything is run from the console of the thing it draws from.')}
              </p>
            </div>
          </div>

          <section className={styles.tools}>
            <div className={`${styles.tool} ${styles.toolWide}`}>
              <p className={styles.toolName}>{tt('production.studioTitle', 'The studio')}</p>
              <p className={styles.toolBody}>
                {tt('production.studioBody', 'Eight graphics V-ENT draws itself: score bar, standings, lower third, player card, bracket, ticker, intro and outro. Start a broadcast, copy one URL per graphic into your streaming software, then put each on air, correct it, or take it off from the console. The bracket supplies the numbers; you never retype a score.')}
              </p>
            </div>
            <div className={styles.tool}>
              <p className={styles.toolName}>{tt('production.overlaysTitle', 'Your own overlays')}</p>
              <p className={styles.toolBody}>
                {tt('production.overlaysBody', 'Upload an HTML file a designer made, marked with the names the feed sends, and it fills itself with live standings, rosters and scores. Or start from one of ours and restyle it.')}
              </p>
            </div>
          </section>

          {viewer.loading && (
            <p className={styles.muted}>{tt('production.loading', 'Loading what you run...')}</p>
          )}

          {!viewer.loading && !viewer.signedIn && (
            <div className={styles.gate}>
              <NeedsAccount action={tt('production.signedOutAction', 'open the production studio')} />
            </div>
          )}

          {!viewer.loading && viewer.signedIn && (
            <>
              {error && <p className={styles.error}>{error}</p>}
              {loading && !error && (
                <p className={styles.muted}>{tt('production.loading', 'Loading what you run...')}</p>
              )}

              {!loading && !error && running.length === 0 && events.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.emptyText}>
                    {tt('production.nothingYet', 'You are not running a tournament or an event yet. Production opens on the console of one you create.')}
                  </p>
                  <div className={styles.emptyLinks}>
                    <Link href="/tournaments/create-tournament" className={styles.primaryBtn}>
                      {tt('production.createTournament', 'Create a tournament')}
                    </Link>
                    <Link href="/events/create-event" className={styles.ghostBtn}>
                      {tt('production.createEvent', 'Create an event')}
                    </Link>
                  </div>
                </div>
              )}

              {!loading && running.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    {tt('production.tournamentsYouRun', 'Tournaments you run')}
                  </h2>
                  <div className={styles.rows}>
                    {running.map((t) => {
                      const ref = t.slug || t.id;
                      return (
                        <div key={ref} className={styles.row}>
                          <div className={styles.rowMain}>
                            <Link href={`/tournaments/${ref}`} className={styles.rowName}>
                              {t.name || t.tournament_title}
                            </Link>
                            <p className={styles.rowMeta}>
                              {[t.game, tx(tournamentStatus(t))].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <Link href={`/tournaments/${ref}/manage?tab=production`}
                                className={styles.primaryBtn}>
                            {tt('production.openProduction', 'Open production')}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {!loading && events.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    {tt('production.eventsYouRun', 'Events you run')}
                  </h2>
                  <div className={styles.rows}>
                    {events.map((e) => {
                      const ref = e.slug || e.id;
                      return (
                        <div key={ref} className={styles.row}>
                          <div className={styles.rowMain}>
                            <Link href={`/events/${ref}`} className={styles.rowName}>{e.name}</Link>
                            <p className={styles.rowMeta}>
                              {[when(e.start_date), e.venue_name || e.location].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <Link href={`/events/${ref}/manage?tab=production`}
                                className={styles.primaryBtn}>
                            {tt('production.openProduction', 'Open production')}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
