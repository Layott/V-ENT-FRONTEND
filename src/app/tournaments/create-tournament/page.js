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
import { clearDraft, readDraft, writeDraft } from '@/lib/wizardDraft';
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
    // The wizard says *_participants; the API answers *_teams, and there is
    // no *_participants key on the payload at all. Reading only the wizard's
    // own name meant re-opening a draft found nothing, drew an empty box, and
    // sent the default 32 back - which is why a tournament set to 5 teams
    // went on reporting 0/32.
    min_number_of_participants:
      t.min_number_of_participants ?? t.min_number_of_teams ?? '',
    max_number_of_participants:
      t.max_number_of_participants ?? t.max_number_of_teams ?? t.player_size ?? '',
    number_of_teams:
      t.max_number_of_participants ?? t.max_number_of_teams ?? t.player_size ?? '',
    bracket_type: t.bracket_type ?? '',
    tournament_rules: t.tournament_rules ?? t.rules ?? '',
    prize_distribution_type: t.prize_type ?? t.prize_distribution_type ?? '',
    prize_distribution: Array.isArray(t.prize_distribution) ? t.prize_distribution : [],
    winner_prize: t.winner_prize ?? '',
    sponsors: Array.isArray(t.sponsors) ? t.sponsors : [],

    // Everything below was collected by the wizard and dropped on the way
    // back in, so re-opening a draft asked for it all again.
    //
    // `options` is the whole of step 2 - who may enter, check-in, rosters,
    // the country restriction. `series_id` is the game edition. `event` is the
    // event this tournament belongs to. The league block is what makes an
    // aggregate table score correctly. The two image URLs are so the step can
    // show what is already saved rather than an empty box, which reads as
    // "your upload was lost".
    options: t.options && typeof t.options === 'object' ? t.options : {},
    series_id: t.series_id ?? t.tournament_series_id ?? '',
    event: t.event ?? t.event_id ?? '',
    points_win: t.points_win ?? t.league?.points_win ?? 3,
    points_draw: t.points_draw ?? t.league?.points_draw ?? 1,
    points_loss: t.points_loss ?? t.league?.points_loss ?? 0,
    players_per_team: t.players_per_team ?? t.league?.players_per_team ?? '',
    tiebreakers: Array.isArray(t.tiebreakers) ? t.tiebreakers
      : (Array.isArray(t.league?.tiebreakers) ? t.league.tiebreakers : []),
    existing_logo: t.tournament_logo ?? null,
    existing_banner: t.tournament_banner ?? null,

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
      // Anything stamped for a draft is refused by readDraft anyway, but
      // clearing it here means a browser that has been carrying somebody's
      // half-finished draft since before the stamp existed stops carrying it.
      const held = readDraft(localStorage, null);
      if (!Object.keys(held).length) clearDraft(localStorage);
      setReady(true);
      return undefined;
    }
    if (status === 'loading') return undefined;
    let cancelled = false;
    (async () => {
      try {
        clearDraft(localStorage);
        const token = tokenFrom(session);
        const data = await ventFetch(API.TOURNAMENT.VIEW(draftId), {
          token
        });
        const tournament = toTournament(data);
        if (tournament && !cancelled) {
          // Stamped with the draft it belongs to, so the "start a new
          // tournament" route cannot open pre-filled with it and POST a
          // second row - which is how one tournament became two.
          writeDraft(localStorage, mapTournamentToFormData(tournament), draftId);
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
          </div> : ready ? <CreateTournamentComponent draftId={draftId} /> : <div className={styles.loadingState}>
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