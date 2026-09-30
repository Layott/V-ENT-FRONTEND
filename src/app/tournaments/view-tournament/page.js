'use client';

import { withLocalDatesAsISO, formatNumber } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatLabel } from '@/lib/formatLabel';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Avatar from '@/components/avatar/Avatar';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuTrophy, LuCalendar, LuUsers, LuMapPin, LuRadio, LuFileText, LuMessageCircle, LuSearch, LuTicket } from 'react-icons/lu';
import { FaTwitter, FaInstagram, FaTwitch, FaYoutube, FaFacebookF, FaTiktok } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';
import { coinsAsNgn } from '@/lib/currency';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { ventFetch, API, tokenFrom, toTournament, entryFeeVc, followRename } from '@/components/tournament-lib/tournamentApi';
import MvpPanel from '@/components/view-tournament/mvp/MvpPanel';
import StatsPanel from '@/components/view-tournament/stats/StatsPanel';
import styles from './view-tournament.module.css';
import { linkTo } from '@/lib/share';
import ShareCard from '@/components/share/ShareCard';
import StandingsPanel from '@/components/view-tournament/standings/StandingsPanel';
import BracketVisualizer from '@/components/view-tournament/bracket-visualizer/BracketVisualizer';
import RunningOrder from '@/components/view-tournament/running-order/RunningOrder';
import { isLeagueFormat } from '@/components/create-tournament-component/format-participants/league-setup/LeagueSetup';
import CheckInStrip from '@/components/view-tournament/check-in/CheckInStrip';
import EntryChecklist from '@/components/entry-requirements/EntryChecklist';
import { tournamentStatusLabel } from '@/lib/tournamentStatus';
import { useT } from '@/i18n/LanguageProvider';
import AdminBar, { adminSaveResult } from '@/components/admin-bar/AdminBar';
import InvitationBanner from '@/components/view-tournament/invitation-banner/InvitationBanner';
import { useTx } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
import UserChip from '@/components/user-chip/UserChip';
import Tag from '@/components/tag/Tag';
import LegacyIdRoute from '@/components/legacy-id-route/LegacyIdRoute';
import { slotsText } from '@/lib/slots';
import { plural } from '@/lib/plural';
import { mediaUrl } from '@/lib/mediaUrl';
import { entryStatusLabel } from '@/lib/labels';

// Note: `escapeText` is intentionally NOT imported/used here. Every field that
// touches the DOM in this file (description, rules, chat) renders as a plain
// JSX text child, which React already HTML-escapes. Running escapeText on top
// of that would double-escape entities (e.g. "&" -> "&amp;" shown literally).
// escapeText is only needed where a caller uses dangerouslySetInnerHTML, which
// this file deliberately does not do.

const TABS = [{
  id: 'overview',
  label: 'Overview'
}, {
  id: 'rules',
  label: 'Rules'
}, {
  id: 'bracket',
  label: 'Bracket'
}, {
  // Only for a format decided by a table. A knockout has no standings, and a
  // tab that is always empty is worse than no tab.
  id: 'table',
  // "Standings", not "Table": the Bracket tab already reads "Tableau" in
  // French, and two tabs called Tableau and Table beside each other is a
  // riddle rather than a menu.
  label: 'Standings',
  leagueOnly: true
}, {
  // Player stats and the award. Offered whatever the format, because a
  // knockout has an MVP too - it is the standings that are league-only, not
  // the question of who played best.
  id: 'players',
  label: 'Players'
}, {
  // Leaders, every entrant's record and head to head, worked out from the
  // results (inbox 306). Every format: which boards appear is the game's.
  id: 'stats',
  label: 'Stats'
}, {
  id: 'participants',
  label: 'Participants'
}, {
  id: 'prize',
  label: 'Prize'
}, {
  id: 'stream',
  label: 'Stream'
}];
const formatDate = d => d ? new Date(d).toLocaleDateString(appLocale(), {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}) : '-';

// Pick the first defined/non-empty value - used to tolerate field-name drift
// between the mock shape and the real backend contract (e.g. start_date vs.
// start_date_and_time).
const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');
const getOrganizer = t => t?.tournament_creator || t?.organizer || null;

// The backend sends a bare position number. "1" on its own in a prize table is
// ambiguous next to a column of amounts; "1st Place" is not.
const ordinalPlace = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : {
    1: 'st',
    2: 'nd',
    3: 'rd'
  }[n % 10] || 'th';
  return `${n}${suffix} Place`;
};

// Only the channels the organizer actually filled in get an icon. The row used
// to be five hardcoded links pointing at "#", which looked like the tournament
// had a following and went nowhere when clicked.
const SOCIAL_CHANNELS = [{
  field: 'twitter_link',
  label: 'Twitter',
  Icon: FaTwitter
}, {
  field: 'instagram_link',
  label: 'Instagram',
  Icon: FaInstagram
}, {
  field: 'facebook_link',
  label: 'Facebook',
  Icon: FaFacebookF
}, {
  field: 'twitch_link',
  label: 'Twitch',
  Icon: FaTwitch
}, {
  field: 'youtube_link',
  label: 'YouTube',
  Icon: FaYoutube
}, {
  field: 'kick_link',
  label: 'Kick',
  Icon: SiKick
}, {
  field: 'tiktok_link',
  label: 'TikTok',
  Icon: FaTiktok
}];

/* ──────────────── SHELL STATES (loading / error / 404) ──────────────── */

const NotFoundShell = () => {
  const tt = useT();
  return <div className={styles.pageContainer}>
    <Header /><MobileHeader />
    <main className={styles.mainContainer}><Sidebar />
      <div className={styles.rightPaneContainer}>
        <p className={styles.errText}>{tt("ui.tournament.not.found.2edd", "Tournament not found.")}</p>
        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Link href="/tournaments"><button className={`${styles.primaryBtn} goldBTN`}>{tt("ui.back.tournaments.534f", "Back to Tournaments")}</button></Link>
        </div>
      </div>
    </main>
    <BottomMenu />
  </div>;
};
const ErrorShell = ({
  message,
  onRetry
}) => {
  const tx = useTx();
  const tt = useT();
  return <div className={styles.pageContainer}>
    <Header /><MobileHeader />
    <main className={styles.mainContainer}><Sidebar />
      <div className={styles.rightPaneContainer}>
        <div className={styles.errorCard}>
          <p className={styles.errText} style={{
            padding: 0
          }}>{message || tx("Something went wrong loading this tournament.")}</p>
          <div className={styles.errorCardActions}>
            <button className={`${styles.primaryBtn} goldBTN`} onClick={onRetry}>{tt("ui.retry.9f5c", "Retry")}</button>
            <Link href="/tournaments"><button className={styles.outlineBtn}>{tt("ui.back.tournaments.534f", "Back to Tournaments")}</button></Link>
          </div>
        </div>
      </div>
    </main>
    <BottomMenu />
  </div>;
};
const SkeletonShell = () => <div className={styles.pageContainer}>
    <Header /><MobileHeader />
    <main className={styles.mainContainer}><Sidebar />
      <div className={styles.rightPaneContainer}>
        <div className={`${styles.heroBanner} ${styles.skeletonBlock}`} />
        <div className={styles.metaStrip}>
          {Array.from({
          length: 4
        }).map((_, i) => <div key={i} className={styles.metaItem}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonIcon}`} />
              <div style={{
            flex: 1
          }}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineMd}`} style={{
              marginTop: 6
            }} />
              </div>
            </div>)}
        </div>
        <div className={styles.panel}>
          <div className={`${styles.skeletonBlock} ${styles.skeletonPanelBlock}`} />
          <div className={`${styles.skeletonBlock} ${styles.skeletonPanelBlock}`} />
        </div>
      </div>
    </main>
    <BottomMenu />
  </div>;

/* ──────────────── MAIN ──────────────── */

export const ViewTournamentContent = ({
  slug
}) => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const token = tokenFrom(session);

  // `/tournaments/naija-weekly` passes the slug down; `?id=25` still works, so
  // every link already shared keeps resolving.
  const id = slug || searchParams.get('id');
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Sharing needs somewhere to say what happened, including the case where the
  // clipboard is refused and the link itself has to be shown.

  // Keep tab in sync with URL when search params change (the audit checks
  // that ?tab=prize actually selects the prize tab regardless of mount order).
  useEffect(() => {
    const t = searchParams.get('tab') || 'overview';
    if (t !== activeTab) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  useEffect(() => {
    if (!id) {
      setLoading(false);
      setTournament(null);
      setError(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await ventFetch(API.TOURNAMENT.VIEW(id), {
          token
        });
        if (cancelled) return;
        setTournament(toTournament(data));
      } catch (err) {
        if (cancelled) return;
        // Renamed since this link was shared: swap the address for the current
        // one and stay loading, because the page is about to load again.
        if (followRename(err, router)) return;
        setError(err);
        setTournament(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, reloadKey]);
  const retryLoad = useCallback(() => setReloadKey(k => k + 1), []);
  const sessionUserId = session?.user?.user_id ?? session?.user?.id;
  const creatorId = tournament?.tournament_creator?.user_id ?? tournament?.organizer?.id;
  const creatorName = tournament?.tournament_creator?.username ?? tournament?.organizer?.username;
  // Two ways to be the same person, because `session.user.id` is not reliably
  // an id: authOptions falls back to the username when the login response
  // carries no user_id, so comparing it against a numeric creator id silently
  // fails and the organiser of a tournament loses every control on their own
  // page. The event page already matched on both; this one did not.
  const isOrganizer = !!(
    (sessionUserId != null && creatorId != null
      && String(sessionUserId) === String(creatorId))
    || (creatorName && session?.user?.username
      && String(creatorName) === String(session.user.username))
  );
  // Shortening this tournament's address.
  //
  // CEO, 2 September: "NO SHORTEN LINK OPTION?" - the events side had this and
  // tournaments did not, because ShortLink.event was a required foreign key so
  // a tournament had nowhere to hang one. A tournament link is long for the
  // same reasons and shortened for the same ones: read aloud on a stream,
  // printed on a flyer, dropped into a group chat.
  //
  // Passed to ShareCard only when the viewer is the organiser, because only an
  // organiser may create one. Everybody else sees the card without the control
  // rather than with a control that answers 403 after they press it.
  const shortenTournamentLink = useCallback(async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tournament/${id}/short-links/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
        },
        body: JSON.stringify({ target: `/tournaments/${id}` }),
      });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.status !== 'success') throw new Error('shorten failed');
    return body.data.link.url;
  }, [id, session?.user?.sessionToken]);

  const registrationClosed = ['live', 'in_progress', 'completed', 'cancelled', 'registration_closed'].includes(tournament?.status);
  if (!id) return <NotFoundShell />;
  if (loading) return <SkeletonShell />;
  if (error) {
    if (error.status === 404) return <NotFoundShell />;
    return <ErrorShell message={tx("We could not load this tournament just now.")} onRetry={retryLoad} />;
  }
  if (!tournament) return <NotFoundShell />;

  // The map only covered three of the seven lifecycle statuses, so a tournament
  // taking entries showed the raw enum: "REGISTRATION_OPEN".
  // In the reader's language: a Portuguese page read "COMPLETED" (second
  // bracket walk, 28 September 2026). One set of keys, shared with the console.
  const statusLabel = tournamentStatusLabel(tt, tournament.status);
  const organizer = getOrganizer(tournament);
  const organizerDisplayName = organizer?.full_name || organizer?.username || 'Unknown organizer';
  const bannerUrl = mediaUrl(tournament.banner_image || tournament.banner);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Renders nothing for an ordinary reader. For an admin it offers the
              same edit the console offers, through the same endpoint, so the
              two cannot drift apart. */}
          {tournament?.id && <AdminBar permission="cancel_tournament" consoleHref="/admin/tournaments" title={tt('admin.editTournamentTitle', 'Edit tournament')} fields={[{
          key: 'tournament_title',
          label: tt('admin.fieldTitle', 'Title')
        }, {
          key: 'tournament_description',
          label: tt('admin.fieldDescription', 'Description')
        }, {
          key: 'tournament_rules',
          label: tt('admin.fieldRules', 'Rules')
        }, {
          key: 'tournament_location',
          label: tt('admin.fieldLocation', 'Location')
        }, {
          key: 'start_date_and_time',
          label: tt('admin.fieldStart', 'Starts'),
          type: 'datetime-local'
        }, {
          key: 'end_date_and_time',
          label: tt('admin.fieldEnd', 'Ends'),
          type: 'datetime-local'
        }]} load={async () => {
          const at = v => v ? String(v).slice(0, 16) : '';
          return {
            tournament_title: tournament.tournament_title || tournament.name || '',
            tournament_description: tournament.tournament_description || '',
            tournament_rules: tournament.tournament_rules || '',
            tournament_location: tournament.tournament_location || '',
            start_date_and_time: at(tournament.start_date_and_time),
            end_date_and_time: at(tournament.end_date_and_time)
          };
        }} save={async payload => {
          payload = withLocalDatesAsISO(payload, ['start_date_and_time', 'end_date_and_time']);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/edit-tournament/${tournament.id}/`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${session?.user?.sessionToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          return adminSaveResult(tt, await res.json());
        }} />}

          {/* Hero banner */}
          <div className={styles.heroBanner} style={bannerUrl ? {
          backgroundImage: `url(${bannerUrl})`
        } : undefined}>
            <div className={styles.heroOverlay}>
              <Link href="/tournaments" className={styles.backLink}>{tt("ui.back.tournaments.407d", "← Back to Tournaments")}</Link>
              <div className={styles.heroContent}>
                <div className={styles.heroLeft}>
                  <div className={styles.heroTags}>
                    <Tag on="card">{tournament.game || 'Game'}</Tag>
                    <span className={`${styles.statusBadge} ${styles[`status_${tournament.status}`] || ''}`}>
                      {(tournament.status === 'in_progress' || tournament.status === 'live') && <LuRadio />} {statusLabel}
                    </span>
                  </div>
                  <h1 className={styles.heroTitle}>{tournament.name || tournament.tournament_title || tx("Untitled Tournament")}</h1>
                  <p className={styles.heroOrganizer}>{tt('tournament.byName', 'by {name}').replace('{name}', organizerDisplayName)}</p>
                </div>
                <div className={styles.heroActions}>
                  {/* Copying a link was all this did. A tournament spreads by
                      somebody holding a phone up in a venue or dropping a
                      screenshot into a WhatsApp group, and neither of those
                      carries a clipboard, so it shows the QR too. */}
                  <ShareCard
                    shorten={isOrganizer ? shortenTournamentLink : null}
                    url={linkTo.tournament(tournament)}
                    title={tournament?.name || tournament?.tournament_title}
                    text={tt('share.tournamentText', 'Brackets and entry for {name} on V-ENT.')
                      .replace('{name}', tournament?.name || tournament?.tournament_title || '')}
                    embed={tournament?.slug ? { kind: 'tournament', slug: tournament.slug } : null}
                  />
                  {/* The run of show, when the organiser has published one.
                      The event page carries the same link decided the same
                      way, so the two cannot disagree about whether there is
                      one. Only `public` counts; a link only sheet is unlisted
                      by definition. */}
                  {tournament?.has_run_of_show && <Link
                    className={styles.runOfShowLink}
                    href={`/tournaments/${tournament?.slug || id}/run-of-show`}>
                    {tt('ros.openFromEvent', 'Open the run of show, minute by minute')}
                  </Link>}
                  {isOrganizer ? <Link href={`/tournaments/${id}/manage`}>
                      <button className={`${styles.primaryBtn} goldBTN`}>{tt("ui.manage.bf58", "Manage")}</button>
                    </Link> : tournament.is_registered ?
                // The API refuses a second registration, so say so instead
                // of offering a button that always errors.
                <button className={styles.primaryBtn} disabled>
                      {tt("ui.registered.b109", "You are registered")}
                    </button> : registrationClosed ?
                // The API refuses registrations once the bracket is live or
                // the tournament is over, so do not offer the button.
                <button className={styles.primaryBtn} disabled>
                      {tournament.status === 'completed' ? tx("Tournament over") : tx("Registration closed")}
                    </button> : <Link href={`/tournaments/${id}/register`}>
                      <button className={`${styles.primaryBtn} goldBTN`}>{tt("ui.register.d672", "Register")}</button>
                    </Link>}
                </div>
              </div>
            </div>
          </div>

          {/* Check-in. Renders only when this tournament uses one and the
              viewer is either an entrant or the organiser. */}
          <CheckInStrip tournamentId={tournament.tournament_id || tournament.id || id} session={session} isOrganizer={isOrganizer} />

          {/* Parent event. Only rendered when this tournament runs inside one. */}
          {tournament.event && <div className={styles.eventStrip}>
              <div className={styles.eventStripMain}>
                <p className={styles.eventStripLabel}>{tt("ui.part.2c1a", "Part of")}</p>
                <Link href={`/events/${tournament.event.slug || tournament.event.id}`} className={styles.eventStripName}>
                  {tournament.event.name}
                </Link>
                <p className={styles.eventStripMeta}>
                  {formatDate(tournament.event.start_date)}
                  {tournament.event.location ? ` · ${tournament.event.location}` : ''}
                </p>
              </div>
              {tournament.entry_covered_by_ticket ? <p className={styles.eventCovered}>
                  <LuTicket /> {tt("ui.event.ticket.covers.entry.9cea", "Your event ticket covers entry")}
                </p> : tournament.shared_ticketing ? <Link href={`/events/${tournament.event.slug || tournament.event.id}?tab=tickets`} className={styles.eventTicketLink}>
                  <LuTicket /> {tt("ui.entry.free.event.ticket.6628", "Entry is free with an event ticket")}
                </Link> : null}
            </div>}

          {/* Meta strip */}
          <div className={styles.metaStrip}>
            <div className={styles.metaItem}>
              <LuTrophy className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>{tt("ui.prize.pool.548a", "Prize Pool")}</p>
                <p className={styles.metaValueBig}>{Number(tournament.prize_pool || 0).toLocaleString()} VC</p>
              </div>
            </div>
            <div className={styles.metaItem}>
              <LuCalendar className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>{tt("ui.start.date.9d7a", "Start Date")}</p>
                <p className={styles.metaValue}>{formatDate(pick(tournament.start_date, tournament.start_date_and_time))}</p>
              </div>
            </div>
            <div className={styles.metaItem}>
              <LuUsers className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>{tt("ui.slots.0c1a", "Slots")}</p>
                <p className={styles.metaValue}>{slotsText(tt, tournament.current_participants, tournament.max_participants)}</p>
              </div>
            </div>
            <div className={styles.metaItem}>
              <LuMapPin className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>{tt("ui.format.041a", "Format")}</p>
                {/* A tournament in stages is its plan, not its bracket_type:
                    this read "Round robin" for groups into a playoff. */}
                <p className={styles.metaValue}>{tournament.stages?.length
                  ? tournament.stages.map(st => formatLabel(tt, st.format, st.format_label))
                    .join(tt('stages.thenSeparator', ', then '))
                  : formatLabel(tt, tournament.format || tournament.bracket_type)}</p>
              </div>
            </div>
          </div>

          {/* An invitation addressed to this viewer, with the two buttons that
              answer it. Above the tabs because it is about whether they are in
              this tournament at all, not about one part of it. */}
          <InvitationBanner tournamentRef={id} token={session?.user?.sessionToken} />

          {/* Sticky tab nav */}
          <div className={styles.stickyTabs}>
            <div className={styles.tabBar}>
              {TABS.filter(t => !t.leagueOnly || isLeagueFormat(tournament?.bracket_type))
                .map(t => <button key={t.id} className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab(t.id)}>
                  {tx(t.label)}
                </button>)}
            </div>
          </div>

          {/* Panel content */}
          <div className={styles.panel}>
            {activeTab === 'overview' && <OverviewPanel tournament={tournament} token={token}
              isOrganizer={isOrganizer} tournamentRef={id} />}
            {activeTab === 'rules' && <RulesPanel tournament={tournament} />}
            {activeTab === 'bracket' && <BracketPanel tournamentId={id}
              /* The fixtures endpoint takes the numeric id, not the slug, and
                 the panel is addressed by slug like the rest of the page. */
              numericId={tournament?.tournament_id || tournament?.id}
              isOrganizer={isOrganizer} token={token} tournament={tournament} />}
            {activeTab === 'table' && <StandingsPanel
              tournamentId={tournament?.tournament_id || tournament?.id} />}
            {activeTab === 'players' && <MvpPanel
              tournamentId={tournament?.tournament_id || tournament?.id} />}
            {activeTab === 'stats' && <StatsPanel tournamentId={id} />}
            {activeTab === 'participants' && <ParticipantsPanel tournamentId={id} token={token} />}
            {activeTab === 'prize' && <PrizePanel tournament={tournament} />}
            {activeTab === 'stream' && <StreamPanel tournament={tournament} session={session} />}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};

/* ──────────────── OVERVIEW ──────────────── */
const OverviewPanel = ({
  tournament,
  token,
  // Whether the reader runs this, and the slug to build their links from. The
  // panel had neither, so the organiser's own routes had nowhere to live and
  // "Manage" on the hero was the only one anywhere.
  isOrganizer,
  tournamentRef
}) => {
  const tt = useT();
  const organizer = getOrganizer(tournament);
  const organizerHandle = organizer?.username || organizer?.handle || '';
  const sponsors = Array.isArray(tournament?.sponsors) ? tournament.sponsors : [];
  const startDate = pick(tournament?.start_date, tournament?.start_date_and_time);
  const endDate = pick(tournament?.end_date, tournament?.end_date_and_time);
  const regDeadline = tournament?.registration_deadline;
  const createdAt = tournament?.created_at;
  const hasSchedule = !!(startDate || endDate || regDeadline || createdAt);
  const entryFee = entryFeeVc(tournament);
  // The API sends the organizer's blurb as `tournament_description`. Reading
  // only `description` meant the About section never appeared on any tournament.
  const about = pick(tournament?.description, tournament?.tournament_description);
  const socials = SOCIAL_CHANNELS.map(channel => ({
    ...channel,
    url: tournament?.[channel.field]
  })).filter(channel => channel.url);
  return <div className={styles.overviewGrid}>
      <div className={styles.overviewMain}>
        {/* What this tournament asks for before somebody can register, read on
            the page they are already on rather than after they have filled in a
            form and pressed pay. Draws nothing when nothing is required, and
            carries its own surface, so there is no section wrapper here to
            leave an empty box behind when it draws nothing.

            The numeric id, not the route's slug: the requirements endpoint is
            addressed by id, and a slug reaches it as a 404 that shows up as an
            empty list rather than an error. */}
        {tournament?.id && token && (
          <EntryChecklist tournamentId={tournament.id} token={token} />
        )}

        {about && <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{tt("ui.about.tournament.1008", "About this tournament")}</h2>
            <p className={styles.sectionText}>{about}</p>
          </section>}

        {hasSchedule && <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{tt("ui.schedule.0a8a", "Schedule")}</h2>
            <div className={styles.scheduleGrid}>
              {createdAt && <div>
                  <p className={styles.metaLabel}>{tt("ui.registration.opens.1695", "Registration Opens")}</p>
                  <p className={styles.metaValue}>{formatDate(createdAt)}</p>
                </div>}
              {regDeadline && <div>
                  <p className={styles.metaLabel}>{tt("ui.registration.closes.f600", "Registration Closes")}</p>
                  <p className={styles.metaValue}>{formatDate(regDeadline)}</p>
                </div>}
              {startDate && <div>
                  <p className={styles.metaLabel}>{tt("ui.tournament.start.60d2", "Tournament Start")}</p>
                  <p className={styles.metaValue}>{formatDate(startDate)}</p>
                </div>}
              {endDate && <div>
                  <p className={styles.metaLabel}>{tt("ui.tournament.end.cf76", "Tournament End")}</p>
                  <p className={styles.metaValue}>{formatDate(endDate)}</p>
                </div>}
              <div>
                <p className={styles.metaLabel}>{tt("ui.entry.fee.a428", "Entry Fee")}</p>
                <p className={styles.metaValue}>{entryFee > 0 ? `${entryFee.toLocaleString()} VC` : 'Free'}</p>
              </div>
            </div>
          </section>}

        {sponsors.length > 0 && <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{tt("ui.sponsors.82ce", "Sponsors")}</h2>
            <div className={styles.sponsorsRow}>
              {sponsors.map((s, i) => {
            const name = typeof s === 'string' ? s : s?.name || s?.sponsor_name || 'Sponsor';
            const tier = typeof s === 'string' ? '' : s?.tier || '';
            // A sponsor sent as a bare string has no logo, which is why this
            // is read defensively rather than assumed.
            const logo = typeof s === 'string' ? null : s?.logo || s?.logo_url || null;
            return <div key={s?.id || `${name}_${i}`} className={styles.sponsorCard}>
                    {/* A sponsor has a logo, and drawing the first letter
                        of their name instead is the same fault as drawing an
                        initial where a face belongs. */}
                    <Avatar src={logo} size={40} rounded={false} name={name} />
                    <p className={styles.sponsorName}>{name}</p>
                    {tier && <p className={styles.sponsorTier}>{tier}</p>}
                  </div>;
          })}
            </div>
          </section>}
      </div>

      <div className={styles.overviewSide}>
        {organizer && <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{tt("ui.organizer.debd", "Organizer")}</h2>
            <div className={styles.organizerCard}>
              {/* The organiser is a person, drawn the way every other person
                  on the platform is drawn.

                  This used to hand-roll a circle with the first letter of
                  their name in it and pass size={0} to switch UserChip's
                  avatar off, so the organiser's picture could never appear
                  however well the API reported it - and the founder badge
                  could not either, because nothing was sent to show. One
                  component draws both. */}
              <UserChip user={organizer} size={44} secondary
                        nameClassName={styles.organizerName}
                        handleClassName={styles.organizerHandle} />
            </div>
            {/* Running it yourself. These were on the hero as a single
                "Manage" button and nowhere else, so an organiser looking at
                their own tournament had no route to editing it. */}
            {isOrganizer && <div className={styles.ownerLinks}>
                <Link href={`/tournaments/${tournamentRef}/manage`} className={styles.ownerLink}>
                  <span>{tt('tournament.editThis', 'Edit this tournament')}</span>
                  <span className={styles.ownerArrow} aria-hidden="true">→</span>
                </Link>
                <Link href={`/tournaments/${tournamentRef}/manage?tab=bracket`} className={styles.ownerLink}>
                  <span>{tt('tournament.runBracket', 'Bracket and scores')}</span>
                  <span className={styles.ownerArrow} aria-hidden="true">→</span>
                </Link>
                <Link href={`/tournaments/${tournamentRef}/manage?tab=participants`} className={styles.ownerLink}>
                  <span>{tt('tournament.entrants', 'Entrants and check-in')}</span>
                  <span className={styles.ownerArrow} aria-hidden="true">→</span>
                </Link>
              </div>}
            {/* This was a button with no onClick: inert for everybody, signed
                in or out, since the day it was written. There is no endpoint
                for following a person - the only follow the platform has is of
                an organisation - so rather than wire a promise to nothing, it
                does the thing it can actually do. */}
            {!isOrganizer && organizerHandle && <Link
              href={`/u/${organizerHandle}`}
              className={styles.outlineBtn}
              style={{ marginTop: '0.75rem', width: '100%', display: 'block', textAlign: 'center' }}
            >
              {tt('tournament.viewOrganizer', 'View organiser')}
            </Link>}
          </section>}

        {socials.length > 0 && <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{tt("ui.social.41a5", "Social")}</h2>
            <div className={styles.socialRow}>
              {socials.map(({
            field,
            label,
            Icon,
            url
          }) => <a key={field} className={styles.socialBtn} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon />
                </a>)}
            </div>
          </section>}
      </div>
    </div>;
};

/* ──────────────── RULES ──────────────── */
const RulesPanel = ({
  tournament
}) => {
  const tx = useTx();
  const tt = useT();
  const rulesText = tournament?.tournament_rules || tournament?.rules;
  const rulesDoc = tournament?.rules_document;

  // The document, offered wherever the rules are. It is the version somebody
  // argues a call from, so it sits with the text rather than in a corner.
  const documentBlock = rulesDoc ? <a className={styles.rulesDoc} href={rulesDoc}
      target="_blank" rel="noopener noreferrer">
      <LuFileText aria-hidden="true" />
      <span>
        {tt('rules.download', 'Download the full rules document')}
        <span className={styles.rulesDocHint}>
          {tt('rules.downloadHint', "The organiser's own file. Opens in a new tab.")}
        </span>
      </span>
    </a> : null;

  if (rulesText || rulesDoc) {
    return <div>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{tt("ui.tournament.rules.df25", "Tournament Rules")}</h2>
          {rulesText && <div className={styles.sectionText} style={{
          whiteSpace: 'pre-wrap'
        }}>{rulesText}</div>}
          {documentBlock}
        </section>
      </div>;
  }

  // No rules written yet. This used to print five invented ones - "All matches
  // are best-of-3", "check in 15 minutes before" - as though the organiser had
  // set them. Somebody could be disqualified citing a rule that exists nowhere
  // but this file, so it now says plainly that there are none.
  return <div>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{tt("ui.tournament.rules.df25", "Tournament Rules")}</h2>
        <p className={styles.sectionText}>
          {tt('rules.none', 'The organiser has not published rules for this tournament yet.')}
        </p>
      </section>
    </div>;
};
/*
 * The bracket tab.
 *
 * Until 27 September 2026 this drew its own chart and match dialog, and both
 * sat inside a block only the ORGANISER could reach. The dialog's player half
 * (report a score, confirm the opponent's, dispute it) was therefore dead
 * code: a player on V-ENT could never report or confirm their own result. It
 * also printed "Best of 3" for every match and refused every draw.
 *
 * It is now the one bracket everybody reads (BracketVisualizer), stage by
 * stage, and the one match room everybody who plays or runs a match opens
 * from it (MatchRoom): the two sides check in, share the room and report,
 * staff record. The organiser's running order stays underneath.
 */
const BracketPanel = ({
  tournamentId,
  numericId,
  isOrganizer,
  token,
  tournament
}) => <div className={styles.bracketWrap}>
    <BracketVisualizer tournamentId={numericId || tournamentId}
      tournamentRef={tournament?.slug || tournamentId} token={token} />

    {/* The organiser's schedule builder, under the picture of the fixtures
        it schedules. Only they see it: it is an editing surface, and the
        resulting order is public through the visualizer above. */}
    {/* Not once it is over: a finished tournament offered to slot four
        played matches into a day (walk, 28 September 2026). */}
    {isOrganizer && !['completed', 'cancelled'].includes(tournament?.status) && <RunningOrder tournamentId={numericId || tournamentId}
      token={token} />}
  </div>;

/* ──────────────── PARTICIPANTS ──────────────── */
const ParticipantsPanel = ({
  tournamentId,
  token
}) => {
  const tx = useTx();
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await ventFetch(API.TOURNAMENT.PARTICIPANTS(tournamentId), {
          token
        });
        if (cancelled) return;
        setRows(Array.isArray(data?.participants) ? data.participants : []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, token, reloadKey]);

  // The API nests the entrant under `participant` and does not send `team` or
  // `user` at the top level. Reading those made every row render as "Unknown".
  const normalized = useMemo(() => rows.map((r, i) => {
    const entrant = r?.participant || {};
    const played = Number(r?.matches_played ?? 0);
    return {
      key: r?.registration_id ?? i,
      seed: r?.seed ?? i + 1,
      name: entrant.name || entrant.username || 'Unknown',
      tag: r?.type === 'team' ? 'Team' : entrant.username && entrant.username !== entrant.name ? `@${entrant.username}` : '',
      region: entrant.country || '-',
      captain: entrant.captain || '-',
      played,
      record: played ? `${r?.wins ?? 0}W ${r?.losses ?? 0}L` : 'Not played yet',
      winRate: r?.win_rate === null || r?.win_rate === undefined ? null : Number(r.win_rate),
      status: r?.status || 'pending'
    };
  }), [rows]);
  const filtered = normalized.filter(r => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return r.name.toLowerCase().includes(q) || r.captain.toLowerCase().includes(q) || r.region.toLowerCase().includes(q);
  });
  return <div>
      <div className={styles.partHeader}>
        <h2 className={styles.sectionTitle}>{tt("ui.participants.1fd9", "Participants (")}{normalized.length})</h2>
        <div className={styles.searchBarSmall}>
          <LuSearch />
          <input type="text" placeholder={tt("ui.search.teams.captains.regions.1949", "Search teams, captains, regions...")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <div className={styles.tableWrap} style={{
      display: 'block'
    }}>
          {Array.from({
        length: 6
      }).map((_, i) => <div key={i} className={styles.tableRow}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} style={{
          width: '100%',
          height: '18px'
        }} />
            </div>)}
        </div>}

      {!loading && error && <div>
          <p className={styles.errText}>{tx("Could not load participants.")}</p>
          <div style={{
        display: 'flex',
        justifyContent: 'center'
      }}>
            <button className={`${styles.primaryBtn} goldBTN`} onClick={() => setReloadKey(k => k + 1)}>{tt("ui.retry.9f5c", "Retry")}</button>
          </div>
        </div>}

      {!loading && !error && normalized.length === 0 && <p className={styles.errText}>{tt("ui.no.participants.yet.8847", "No participants yet.")}</p>}

      {!loading && !error && normalized.length > 0 && <>
          {/* Desktop table */}
          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <div className={styles.colSeed}>{tt("ui.seed.32fe", "Seed")}</div>
              <div>{tt("ui.team.player.bf87", "Team / Player")}</div>
              <div>{tt("ui.country.d523", "Country")}</div>
              <div>{tt("ui.captain.0a98", "Captain")}</div>
              <div className={styles.colWR}>{tt("ui.record.1c54", "Record")}</div>
              <div>{tt("ui.status.bae7", "Status")}</div>
            </div>
            {filtered.map(r => <div key={r.key} className={styles.tableRow}>
                <div className={styles.colSeed}>#{r.seed}</div>
                <div>
                  <div className={styles.teamCell}>
                    <Avatar src={r.avatar || r.logo} size={28} name={r.name} />
                    <div>
                      <p className={styles.teamCellName}>{r.name}</p>
                      {r.tag && <p className={styles.teamCellTag}>{r.tag}</p>}
                    </div>
                  </div>
                </div>
                <div>{r.region}</div>
                <div>@{r.captain}</div>
                <div className={styles.colWR}>
                  {r.winRate === null ? <span>{r.record}</span> : <>
                      <div className={styles.wrBar}>
                        <div className={styles.wrFill} style={{
                  width: `${Math.min(100, Math.max(0, r.winRate))}%`
                }} />
                      </div>
                      <span>{r.record}</span>
                    </>}
                </div>
                <div>
                  <span className={`${styles.partStatus} ${styles[`partStatus_${r.status}`] || ''}`}>
                    {entryStatusLabel(tt, r.status)}
                  </span>
                </div>
              </div>)}
          </div>

          {/* Mobile cards */}
          <div className={styles.partCardList}>
            {filtered.map(r => <div key={r.key} className={styles.partCard}>
                <div className={styles.partCardHead}>
                  <div className={styles.teamCell}>
                    <Avatar src={r.avatar || r.logo} size={28} name={r.name} />
                    <div>
                      <p className={styles.teamCellName}>{r.name}</p>
                      <p className={styles.teamCellTag}>{r.tag ? `${r.tag} · ` : ''}{tt("ui.seed.2318", "Seed #")}{r.seed}</p>
                    </div>
                  </div>
                  <span className={`${styles.partStatus} ${styles[`partStatus_${r.status}`] || ''}`}>{entryStatusLabel(tt, r.status)}</span>
                </div>
                <div className={styles.partCardBody}>
                  <div><span className={styles.cardLabel}>{tt("ui.country.d523", "Country")}</span><span>{r.region}</span></div>
                  <div><span className={styles.cardLabel}>{tt("ui.captain.0a98", "Captain")}</span><span>@{r.captain}</span></div>
                  <div><span className={styles.cardLabel}>{tt("ui.record.1c54", "Record")}</span><span style={{
                color: 'var(--v-ent-gold)',
                fontWeight: 600
              }}>{r.record}</span></div>
                </div>
              </div>)}
          </div>
        </>}
    </div>;
};

/* ──────────────── PRIZE ──────────────── */
const PrizePanel = ({
  tournament
}) => {
  const tx = useTx();
  const tt = useT();
  // Defensive coercion - if the backend payload is partial, total can be
  // undefined and .toLocaleString() would NPE.
  const total = Number(tournament?.prize_pool ?? 0) || 0;
  const realDist = Array.isArray(tournament?.prize_distribution) && tournament.prize_distribution.length ? tournament.prize_distribution : null;
  const dist = realDist ? realDist.map((d, i) => {
    const amount = d.prize != null ? Number(d.prize) : null;
    // The API sends amounts, not percentages. Every row read "-" because it
    // waited for a `percent` the backend has never sent.
    const percent = d.percent != null ? Number(d.percent) : amount != null && total > 0 ? Math.round(amount / total * 100) : null;
    return {
      pos: ordinalPlace(d.position ?? d.pos ?? i + 1),
      percent,
      amount,
      label: d.label || '',
      count: d.count
    };
  }) : [];
  // With no split set, this tab used to invent one: 50/25/12/8/5 with
  // "Semi-Final" and "Quarter-Final" under the places, on a five-player
  // stepladder and a battle royale alike (walk, 28 September 2026). A split
  // nobody chose is not shown; the tab says it has not been set.
  const sponsors = Array.isArray(tournament?.sponsors) ? tournament.sponsors : [];
  return <div>
      <div className={styles.prizeHero}>
        <p className={styles.metaLabel}>{tt("ui.total.prize.pool.a6fe", "Total Prize Pool")}</p>
        <p className={styles.prizeAmount}>{formatNumber(total)} <span className={styles.vcUnit}>VC</span></p>
        <p className={styles.prizeFiat}>≈ {coinsAsNgn(total)} NGN</p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{tt("ui.distribution.1d3c", "Distribution")}</h2>
        <div className={styles.prizeTable}>
          <div className={styles.prizeTableHeader}>
            <span>{tt("ui.position.cf1c", "Position")}</span>
            <span>{tt("ui.amount.43dc", "Amount")}</span>
            <span>{tt("ui.percent.ac55", "Percent")}</span>
          </div>
          {dist.length === 0 && (
            <p className={styles.prizeLabel}>
              {tt('prize.noSplit', 'The organiser has not set how the prize pool is split yet.')}
            </p>
          )}
          {dist.map((d, i) => {
          const amount = d.amount != null ? d.amount : Math.round(total * (d.percent || 0) / 100);
          return <div key={d.pos || i} className={styles.prizeTableRow}>
                <div>
                  <p className={styles.prizePos}>{d.pos}</p>
                  {(d.label || d.count) && <p className={styles.prizeLabel}>
                    {d.label}{d.label && d.count ? ' · ' : ''}{d.count ? plural(tt, d.count, 'slots.teamOne', '{n} team', 'slots.teams', '{n} teams') : ''}
                  </p>}
                </div>
                <span className={styles.prizeAmtCell}>{formatNumber(Number(amount || 0))} VC</span>
                <span className={styles.prizePercent}>{d.percent != null ? `${d.percent}%` : '-'}</span>
              </div>;
        })}
        </div>
      </section>

      {sponsors.length > 0 && <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{tt("ui.sponsor.breakdown.60d2", "Sponsor Breakdown")}</h2>
          <div className={styles.sponsorBreakdown}>
            {sponsors.map((s, i) => {
          const name = typeof s === 'string' ? s : s?.name || s?.sponsor_name || 'Sponsor';
          const tier = typeof s === 'string' ? '' : s?.tier || '';
          const cut = typeof s === 'object' && s?.contribution_percent != null ? Number(s.contribution_percent) : null;
          const amount = cut != null ? Math.round(total * cut / 100) : null;
          const logo = typeof s === 'string' ? null : s?.logo || s?.logo_url || null;
          return <div key={s?.id || `${name}_${i}`} className={styles.sbRow}>
                  <Avatar src={logo} size={32} rounded={false} name={name} />
                  <div className={styles.sbInfo}>
                    <p className={styles.sbName}>{name}</p>
                    {tier && <p className={styles.sbTier}>{tier}</p>}
                  </div>
                  {amount != null && <p className={styles.sbAmount}>{formatNumber(amount)} VC</p>}
                </div>;
        })}
          </div>
        </section>}
    </div>;
};

/* ──────────────── STREAM ──────────────── */
// This tab used to show a Twitch placeholder reading "Live in mock mode", 2,148
// invented viewers, two invented casters and seven invented chat messages - on
// every tournament, including one created five minutes earlier. It shows the
// stream the organiser actually linked, or says there is not one yet.

const STREAM_SOURCES = [{
  key: 'twitch_link',
  label: 'Twitch'
}, {
  key: 'youtube_link',
  label: 'YouTube'
}, {
  key: 'kick_link',
  label: 'Kick'
}, {
  key: 'tiktok_link',
  label: 'TikTok'
}, {
  key: 'facebook_link',
  label: 'Facebook'
}, {
  key: 'bigolive_link',
  label: 'Bigo Live'
}];

// Turn a channel or video link into something an iframe can show. Anything we
// cannot embed is offered as a link out instead of a dead black rectangle.
const toEmbed = (url, label) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'v-ent.co';
    if (host.endsWith('twitch.tv')) {
      const channel = u.pathname.split('/').filter(Boolean)[0];
      if (!channel) return null;
      return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}`;
    }
    if (host.endsWith('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
      const live = u.pathname.match(/\/live\/([^/]+)/);
      if (live) return `https://www.youtube.com/embed/${encodeURIComponent(live[1])}`;
      return null;
    }
    if (host.endsWith('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    return null;
  } catch {
    return null;
  }
};
const StreamPanel = ({
  tournament
}) => {
  const tx = useTx();
  const tt = useT();
  const tournamentName = tournament?.name || tournament?.tournament_title || 'This tournament';
  const source = STREAM_SOURCES.map(s => ({
    ...s,
    url: tournament?.[s.key]
  })).find(s => s.url);
  if (!source) {
    return <div className={styles.streamWrap}>
        <div className={styles.streamMain}>
          <div className={styles.emptyState}>
            <h2 className={styles.sectionTitle}>{tt("ui.no.stream.linked.yet.a70f", "No stream linked yet")}</h2>
            <p className={styles.sectionText}>
              {tt("ui.when.organiser.adds.twitch.491e", "When the organiser adds a Twitch, YouTube or Kick link to")} {tournamentName}{tt("ui.broadcast.appears.here.06a3", ",\n              the broadcast appears here.")}
            </p>
          </div>
        </div>
      </div>;
  }
  const embed = toEmbed(source.url, source.label);
  return <div className={styles.streamWrap}>
      <div className={styles.streamMain}>
        <div className={styles.streamFrame}>
          {embed ? <iframe title={`${tournamentName} stream`} src={embed} className={styles.streamIframe} allowFullScreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" /> : <div className={styles.streamPlaceholder}>
              <LuRadio className={styles.streamIcon} />
              <p className={styles.streamPlaceholderTitle}>{tt("ui.watch.4e5a", "Watch on")} {tx(source.label)}</p>
              <p className={styles.streamPlaceholderSub}>
                {tx(source.label)} {tt("ui.does.not.allow.broadcast.1165", "does not allow the broadcast to be embedded here.")}
              </p>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className={`${styles.primaryBtn} goldBTN`}>
                {tt("ui.open.stream.58d9", "Open the stream")}
              </a>
            </div>}
        </div>
        <div className={styles.streamCaption}>
          <h2 className={styles.sectionTitle} style={{
          marginBottom: '0.4rem'
        }}>{tournamentName}</h2>
          <p className={styles.sectionText}>
            {tt("ui.streamed.ea46", "Streamed on")} {tx(source.label)} {tt("ui.by.organiser.b971", "by the organiser.")}{' '}
            <a href={source.url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
              {tt("ui.open.it.42f2", "Open it on")} {tx(source.label)}
            </a>
            .
          </p>
        </div>
      </div>
    </div>;
};
const ViewTournament = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <ViewTournamentContent />
  </Suspense>;
// The old `?id=` address. It renders nothing itself any more: it resolves the
// record, learns its name, and replaces itself with the named address. The
// component above is still the one implementation - `/tournaments/[slug]` imports it.
//
// Kept rather than deleted because this address has been shared and
// bookmarked, and the slug rule says every address a thing has ever had keeps
// working. See src/components/legacy-id-route/LegacyIdRoute.js.
const ViewTournamentLegacy = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <LegacyIdRoute
      resolve={async id => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/view-tournament/${id}/`);
      const body = await res.json().catch(() => null);
      // Two shapes, because the two endpoints answer differently: an event
      // nests under `data.event`, a tournament sits directly on `data`.
      // Reading only the nested one sent every tournament to the fallback
      // listing instead of to the tournament, which is a redirect that looks
      // like it worked.
      return body?.data?.slug || body?.data?.tournament?.slug || null;
      }}
      to={slug => `/tournaments/${encodeURIComponent(slug)}`}
      fallback="/tournaments"
    />
  </Suspense>
);

export default ViewTournamentLegacy;