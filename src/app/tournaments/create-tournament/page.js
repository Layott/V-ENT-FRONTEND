'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import CreateTournamentComponent from '@/components/create-tournament-component/CreateTournamentComponent';
import { ventFetch, API, tokenFrom, toTournament } from '@/components/tournament-lib/tournamentApi';
import styles from './create-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
const SOCIAL_LINK_KEYS = ['facebook_link', 'twitter_link', 'instagram_link', 'youtube_link', 'twitch_link', 'kick_link', 'tiktok_link', 'bigolive_link'];

// Maps a fetched tournament/draft payload back into the flat shape the
// wizard persists under localStorage's 'createTournamentData' key, so
// re-opening a draft (?draft_id=…) pre-fills every step. Field names mirror
// what CreateTournamentComponent's submit already sends - see
// tournamentWizardValidation.js for the same field-naming contract.
const mapTournamentToFormData = t => {
  if (!t) return {};
  const webSocialLinks = {};
  SOCIAL_LINK_KEYS.forEach(key => {
    if (t[key]) webSocialLinks[key] = t[key];
  });
  return {
    tournament_title: t.tournament_title ?? t.title ?? t.name ?? '',
    game: t.game ?? t.game_name ?? '',
    game_id: t.game_id ?? null,
    game_mode: t.game_mode ?? '',
    tournament_description: t.tournament_description ?? t.description ?? '',
    tournament_type: t.tournament_type ?? '',
    tournament_location: t.tournament_location ?? t.location ?? '',
    virtual_link: t.virtual_link ?? '',
    hide_location: t.hide_location === true || t.hide_location === 'true',
    start_date_and_time: t.start_date_and_time ?? t.start_date ?? '',
    end_date_and_time: t.end_date_and_time ?? t.end_date ?? '',
    reg_start_date_and_time: t.reg_start_date_and_time ?? '',
    reg_end_date_and_time: t.reg_end_date_and_time ?? '',
    tournament_visibility: t.tournament_visibility ?? t.visibility ?? 'public',
    entry_type: t.entry_type ?? '',
    entry_fee: t.entry_fee ?? t.entry_fee_price ?? '',
    tournament_access: t.tournament_access ?? '',
    team_size: t.team_size ?? '',
    min_number_of_participants: t.min_number_of_participants ?? '',
    max_number_of_participants: t.max_number_of_participants ?? '',
    bracket_type: t.bracket_type ?? '',
    tournament_rules: t.tournament_rules ?? t.rules ?? '',
    prize_distribution_type: t.prize_type ?? t.prize_distribution_type ?? '',
    prize_distribution: Array.isArray(t.prize_distribution) ? t.prize_distribution : [],
    winner_prize: t.winner_prize ?? '',
    sponsors: Array.isArray(t.sponsors) ? t.sponsors : [],
    webSocialLinks,
    ...webSocialLinks
  };
};
function CreateTournamentPageInner() {
  const tt = useT();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft_id');
  const {
    data: session,
    status
  } = useSession();
  const [ready, setReady] = useState(!draftId);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    if (!draftId) {
      setReady(true);
      return undefined;
    }
    if (status === 'loading') return undefined;
    let cancelled = false;
    (async () => {
      try {
        localStorage.removeItem('createTournamentData');
        const token = tokenFrom(session);
        const data = await ventFetch(API.TOURNAMENT.VIEW(draftId), {
          token
        });
        const tournament = toTournament(data);
        if (tournament && !cancelled) {
          localStorage.setItem('createTournamentData', JSON.stringify(mapTournamentToFormData(tournament)));
        }
      } catch {
        // Do NOT fall through to the wizard. It reads its opening values from
        // localStorage, and that still holds the LAST tournament edited - so a
        // failed load here does not open an empty form, it opens somebody
        // else's tournament under this one's id, and Save writes it over the
        // real record. Stop and offer a retry instead.
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId, session, status]);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <h1 className={styles.srOnlyTitle}>
          {tt("createTournament.title", "Create a tournament")}
        </h1>
        {loadFailed ? <div className={styles.loadingState}>
            <div className={styles.loadingCard}>
              <span>{tt("createTournament.loadFailed", "This tournament could not be opened, so the form was left closed rather than risk saving over it.")}</span>
              <button type="button" className="btn grnBTN" onClick={() => window.location.reload()}>
                {tt("ui.tryAgain", "Try again")}
              </button>
            </div>
          </div> : ready ? <CreateTournamentComponent /> : <div className={styles.loadingState}>
            <div className={styles.loadingCard}>
              <div className={styles.spinner} />
              <span>{tt("ui.loading.draft.b83b", "Loading your draft…")}</span>
            </div>
          </div>}
      </main>
      <BottomMenu />
    </div>;
}
const CreateTournament = () => <Suspense fallback={<div className={styles.pageContainer} />}>
    <CreateTournamentPageInner />
  </Suspense>;
export default CreateTournament;