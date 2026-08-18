'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LuTrophy, LuCalendar, LuUsers, LuMapPin, LuShare2,
  LuRadio, LuMessageCircle, LuX, LuSearch, LuInfo, LuTriangleAlert, LuTicket,
} from 'react-icons/lu';
import { FaTwitter, FaInstagram, FaTwitch, FaYoutube, FaFacebookF, FaTiktok } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';
import { coinsAsNgn } from '@/lib/currency';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { ventFetch, API, tokenFrom, toTournament, entryFeeVc } from '@/components/tournament-lib/tournamentApi';
import styles from './view-tournament.module.css';

// Note: `escapeText` is intentionally NOT imported/used here. Every field that
// touches the DOM in this file (description, rules, chat) renders as a plain
// JSX text child, which React already HTML-escapes. Running escapeText on top
// of that would double-escape entities (e.g. "&" -> "&amp;" shown literally).
// escapeText is only needed where a caller uses dangerouslySetInnerHTML, which
// this file deliberately does not do.

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'rules', label: 'Rules' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'participants', label: 'Participants' },
  { id: 'prize', label: 'Prize' },
  { id: 'stream', label: 'Stream' },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '-';

const formatLabel = (f) => ({
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
}[f] || (f ? String(f).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-'));

// Pick the first defined/non-empty value - used to tolerate field-name drift
// between the mock shape and the real backend contract (e.g. start_date vs.
// start_date_and_time).
const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

const getOrganizer = (t) => t?.tournament_creator || t?.organizer || null;

// The backend sends a bare position number. "1" on its own in a prize table is
// ambiguous next to a column of amounts; "1st Place" is not.
const ordinalPlace = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${suffix} Place`;
};

// Only the channels the organizer actually filled in get an icon. The row used
// to be five hardcoded links pointing at "#", which looked like the tournament
// had a following and went nowhere when clicked.
const SOCIAL_CHANNELS = [
  { field: 'twitter_link', label: 'Twitter', Icon: FaTwitter },
  { field: 'instagram_link', label: 'Instagram', Icon: FaInstagram },
  { field: 'facebook_link', label: 'Facebook', Icon: FaFacebookF },
  { field: 'twitch_link', label: 'Twitch', Icon: FaTwitch },
  { field: 'youtube_link', label: 'YouTube', Icon: FaYoutube },
  { field: 'kick_link', label: 'Kick', Icon: SiKick },
  { field: 'tiktok_link', label: 'TikTok', Icon: FaTiktok },
];

/* ──────────────── SHELL STATES (loading / error / 404) ──────────────── */

const NotFoundShell = () => (
  <div className={styles.pageContainer}>
    <Header /><MobileHeader />
    <main className={styles.mainContainer}><Sidebar />
      <div className={styles.rightPaneContainer}>
        <p className={styles.errText}>Tournament not found.</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link href="/tournaments"><button className={`${styles.primaryBtn} goldBTN`}>Back to Tournaments</button></Link>
        </div>
      </div>
    </main>
    <BottomMenu />
  </div>
);

const ErrorShell = ({ message, onRetry }) => (
  <div className={styles.pageContainer}>
    <Header /><MobileHeader />
    <main className={styles.mainContainer}><Sidebar />
      <div className={styles.rightPaneContainer}>
        <div className={styles.errorCard}>
          <p className={styles.errText} style={{ padding: 0 }}>{message || 'Something went wrong loading this tournament.'}</p>
          <div className={styles.errorCardActions}>
            <button className={`${styles.primaryBtn} goldBTN`} onClick={onRetry}>Retry</button>
            <Link href="/tournaments"><button className={styles.outlineBtn}>Back to Tournaments</button></Link>
          </div>
        </div>
      </div>
    </main>
    <BottomMenu />
  </div>
);

const SkeletonShell = () => (
  <div className={styles.pageContainer}>
    <Header /><MobileHeader />
    <main className={styles.mainContainer}><Sidebar />
      <div className={styles.rightPaneContainer}>
        <div className={`${styles.heroBanner} ${styles.skeletonBlock}`} />
        <div className={styles.metaStrip}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.metaItem}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonIcon}`} />
              <div style={{ flex: 1 }}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineMd}`} style={{ marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.panel}>
          <div className={`${styles.skeletonBlock} ${styles.skeletonPanelBlock}`} />
          <div className={`${styles.skeletonBlock} ${styles.skeletonPanelBlock}`} />
        </div>
      </div>
    </main>
    <BottomMenu />
  </div>
);

/* ──────────────── MAIN ──────────────── */

const ViewTournamentContent = () => {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = tokenFrom(session);

  const id = searchParams.get('id');
  const initialTab = searchParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Keep tab in sync with URL when search params change (the audit checks
  // that ?tab=prize actually selects the prize tab regardless of mount order).
  useEffect(() => {
    const t = searchParams.get('tab') || 'overview';
    if (t !== activeTab) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!id) { setLoading(false); setTournament(null); setError(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await ventFetch(API.TOURNAMENT.VIEW(id), { token });
        if (cancelled) return;
        setTournament(toTournament(data));
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setTournament(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token, reloadKey]);

  const retryLoad = useCallback(() => setReloadKey((k) => k + 1), []);

  const sessionUserId = session?.user?.user_id ?? session?.user?.id;
  const creatorId = tournament?.tournament_creator?.user_id ?? tournament?.organizer?.id;
  const isOrganizer = !!(sessionUserId != null && creatorId != null && String(sessionUserId) === String(creatorId));
  const registrationClosed = ['live', 'in_progress', 'completed', 'cancelled', 'registration_closed']
    .includes(tournament?.status);

  if (!id) return <NotFoundShell />;
  if (loading) return <SkeletonShell />;
  if (error) {
    if (error.status === 404) return <NotFoundShell />;
    return <ErrorShell message={error.message} onRetry={retryLoad} />;
  }
  if (!tournament) return <NotFoundShell />;

  // The map only covered three of the seven lifecycle statuses, so a tournament
  // taking entries showed the raw enum: "REGISTRATION_OPEN".
  const statusLabel = {
    draft: 'Draft',
    published: 'Published',
    registration_open: 'Registration open',
    registration_closed: 'Registration closed',
    upcoming: 'Upcoming',
    live: 'Live',
    in_progress: 'Live',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }[tournament.status]
    || (tournament.status ? String(tournament.status).replace(/_/g, ' ') : 'Status unknown');
  const organizer = getOrganizer(tournament);
  const organizerDisplayName = organizer?.full_name || organizer?.username || 'Unknown organizer';
  const bannerUrl = tournament.banner_image || tournament.banner;

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Hero banner */}
          <div className={styles.heroBanner} style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}>
            <div className={styles.heroOverlay}>
              <Link href="/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
              <div className={styles.heroContent}>
                <div className={styles.heroLeft}>
                  <div className={styles.heroTags}>
                    <span className={styles.gameTag}>{tournament.game || 'Game'}</span>
                    <span className={`${styles.statusBadge} ${styles[`status_${tournament.status}`] || ''}`}>
                      {(tournament.status === 'in_progress' || tournament.status === 'live') && <LuRadio />} {statusLabel}
                    </span>
                  </div>
                  <h1 className={styles.heroTitle}>{tournament.name || tournament.tournament_title || 'Untitled Tournament'}</h1>
                  <p className={styles.heroOrganizer}>by {organizerDisplayName}</p>
                </div>
                <div className={styles.heroActions}>
                  <button className={styles.shareBtn}><LuShare2 /> Share</button>
                  {isOrganizer ? (
                    <Link href={`/tournaments/my-tournaments/manage?id=${id}`}>
                      <button className={`${styles.primaryBtn} goldBTN`}>Manage</button>
                    </Link>
                  ) : tournament.is_registered ? (
                    // The API refuses a second registration, so say so instead
                    // of offering a button that always errors.
                    <button className={styles.primaryBtn} disabled>
                      You are registered
                    </button>
                  ) : registrationClosed ? (
                    // The API refuses registrations once the bracket is live or
                    // the tournament is over, so do not offer the button.
                    <button className={styles.primaryBtn} disabled>
                      {tournament.status === 'completed' ? 'Tournament over' : 'Registration closed'}
                    </button>
                  ) : (
                    <Link href={`/tournaments/register-tournament?id=${id}`}>
                      <button className={`${styles.primaryBtn} goldBTN`}>Register</button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Parent event. Only rendered when this tournament runs inside one. */}
          {tournament.event && (
            <div className={styles.eventStrip}>
              <div className={styles.eventStripMain}>
                <p className={styles.eventStripLabel}>Part of</p>
                <Link
                  href={`/events/view-event?id=${tournament.event.id}`}
                  className={styles.eventStripName}
                >
                  {tournament.event.name}
                </Link>
                <p className={styles.eventStripMeta}>
                  {formatDate(tournament.event.start_date)}
                  {tournament.event.location ? ` · ${tournament.event.location}` : ''}
                </p>
              </div>
              {tournament.entry_covered_by_ticket ? (
                <p className={styles.eventCovered}>
                  <LuTicket /> Your event ticket covers entry
                </p>
              ) : tournament.shared_ticketing ? (
                <Link
                  href={`/events/view-event?id=${tournament.event.id}&tab=tickets`}
                  className={styles.eventTicketLink}
                >
                  <LuTicket /> Entry is free with an event ticket
                </Link>
              ) : null}
            </div>
          )}

          {/* Meta strip */}
          <div className={styles.metaStrip}>
            <div className={styles.metaItem}>
              <LuTrophy className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>Prize Pool</p>
                <p className={styles.metaValueBig}>{Number(tournament.prize_pool || 0).toLocaleString()} VC</p>
              </div>
            </div>
            <div className={styles.metaItem}>
              <LuCalendar className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>Start Date</p>
                <p className={styles.metaValue}>{formatDate(pick(tournament.start_date, tournament.start_date_and_time))}</p>
              </div>
            </div>
            <div className={styles.metaItem}>
              <LuUsers className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>Slots</p>
                <p className={styles.metaValue}>{tournament.current_participants ?? 0}/{tournament.max_participants ?? '-'}</p>
              </div>
            </div>
            <div className={styles.metaItem}>
              <LuMapPin className={styles.metaIcon} />
              <div>
                <p className={styles.metaLabel}>Format</p>
                <p className={styles.metaValue}>{formatLabel(tournament.format)}</p>
              </div>
            </div>
          </div>

          {/* Sticky tab nav */}
          <div className={styles.stickyTabs}>
            <div className={styles.tabBar}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panel content */}
          <div className={styles.panel}>
            {activeTab === 'overview' && <OverviewPanel tournament={tournament} />}
            {activeTab === 'rules' && <RulesPanel tournament={tournament} />}
            {activeTab === 'bracket' && <BracketPanel tournamentId={id} isOrganizer={isOrganizer} token={token} tournament={tournament} session={session} />}
            {activeTab === 'participants' && <ParticipantsPanel tournamentId={id} token={token} />}
            {activeTab === 'prize' && <PrizePanel tournament={tournament} />}
            {activeTab === 'stream' && <StreamPanel tournament={tournament} session={session} />}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

/* ──────────────── OVERVIEW ──────────────── */
const OverviewPanel = ({ tournament }) => {
  const organizer = getOrganizer(tournament);
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
  const socials = SOCIAL_CHANNELS
    .map((channel) => ({ ...channel, url: tournament?.[channel.field] }))
    .filter((channel) => channel.url);

  return (
    <div className={styles.overviewGrid}>
      <div className={styles.overviewMain}>
        {about && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>About this tournament</h3>
            <p className={styles.sectionText}>{about}</p>
          </section>
        )}

        {hasSchedule && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Schedule</h3>
            <div className={styles.scheduleGrid}>
              {createdAt && (
                <div>
                  <p className={styles.metaLabel}>Registration Opens</p>
                  <p className={styles.metaValue}>{formatDate(createdAt)}</p>
                </div>
              )}
              {regDeadline && (
                <div>
                  <p className={styles.metaLabel}>Registration Closes</p>
                  <p className={styles.metaValue}>{formatDate(regDeadline)}</p>
                </div>
              )}
              {startDate && (
                <div>
                  <p className={styles.metaLabel}>Tournament Start</p>
                  <p className={styles.metaValue}>{formatDate(startDate)}</p>
                </div>
              )}
              {endDate && (
                <div>
                  <p className={styles.metaLabel}>Tournament End</p>
                  <p className={styles.metaValue}>{formatDate(endDate)}</p>
                </div>
              )}
              <div>
                <p className={styles.metaLabel}>Entry Fee</p>
                <p className={styles.metaValue}>{entryFee > 0 ? `${entryFee.toLocaleString()} VC` : 'Free'}</p>
              </div>
            </div>
          </section>
        )}

        {sponsors.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Sponsors</h3>
            <div className={styles.sponsorsRow}>
              {sponsors.map((s, i) => {
                const name = typeof s === 'string' ? s : (s?.name || s?.sponsor_name || 'Sponsor');
                const tier = typeof s === 'string' ? '' : (s?.tier || '');
                return (
                  <div key={s?.id || `${name}_${i}`} className={styles.sponsorCard}>
                    <div className={styles.sponsorLogo}>{name.charAt(0)}</div>
                    <p className={styles.sponsorName}>{name}</p>
                    {tier && <p className={styles.sponsorTier}>{tier}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className={styles.overviewSide}>
        {organizer && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Organizer</h3>
            <div className={styles.organizerCard}>
              <div className={styles.organizerAvatar}>{(organizer.full_name || organizer.username || 'O').charAt(0)}</div>
              <div>
                <p className={styles.organizerName}>{organizer.full_name || organizer.username || 'Organizer'}</p>
                {organizer.username && <p className={styles.organizerHandle}>@{organizer.username}</p>}
              </div>
            </div>
            <button className={styles.outlineBtn} style={{ marginTop: '0.75rem', width: '100%' }}>Follow Organizer</button>
          </section>
        )}

        {socials.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Social</h3>
            <div className={styles.socialRow}>
              {socials.map(({ field, label, Icon, url }) => (
                <a
                  key={field}
                  className={styles.socialBtn}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

/* ──────────────── RULES ──────────────── */
const RulesPanel = ({ tournament }) => {
  const rulesText = tournament?.tournament_rules || tournament?.rules;

  if (rulesText) {
    return (
      <div className={styles.rulesContainer}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Tournament Rules</h3>
          <div className={styles.sectionText} style={{ whiteSpace: 'pre-wrap' }}>{rulesText}</div>
        </section>
      </div>
    );
  }

  // Fallback static rules - only shown when the backend hasn't provided
  // rules text for this tournament yet.
  return (
    <div className={styles.rulesContainer}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tournament Rules</h3>
        <ol className={styles.ruleList}>
          <li>All matches are best-of-3 unless stated otherwise. Finals are best-of-5.</li>
          <li>Players must check in 15 minutes before their scheduled match time.</li>
          <li>Each match must be played on the agreed game version and platform.</li>
          <li>Disconnects: a player who disconnects before the 5-minute mark may pause; afterwards the match stands.</li>
          <li>{tournament?.participant_type === 'team' ? 'Team rosters are locked at registration close.' : 'Substitutes are not permitted in solo brackets.'}</li>
        </ol>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Code of Conduct</h3>
        <ul className={styles.ruleList}>
          <li>No toxic behaviour. Harassment leads to immediate disqualification.</li>
          <li>No cheating, exploits, or unauthorized macros.</li>
          <li>All in-game communication must be in English or Pidgin.</li>
          <li>Players must keep their stream camera on for the duration of finals matches.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Dispute Process</h3>
        <ol className={styles.ruleList}>
          <li>File disputes with screenshots within 10 minutes of the disputed event.</li>
          <li>An admin will review and respond inside the official Discord ticket.</li>
          <li>Decisions are final once delivered. Re-matches only at admin discretion.</li>
        </ol>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Penalty Schedule</h3>
        <div className={styles.penaltyTable}>
          <div className={styles.penaltyRow}><span>Late check-in</span><span>−1 map</span></div>
          <div className={styles.penaltyRow}><span>Verbal abuse</span><span>Warning + DQ on repeat</span></div>
          <div className={styles.penaltyRow}><span>Cheating / exploits</span><span>Permanent DQ + 3-month ban</span></div>
          <div className={styles.penaltyRow}><span>No-show</span><span>Forfeit + entry fee held</span></div>
        </div>
      </section>
    </div>
  );
};

/* ──────────────── BRACKET ──────────────── */

// A match's score can arrive either on the match itself (score_p1/score_p2 -
// the real contract) or per-participant (participant.score - the mock/legacy
// shape). Normalize to participant.score so the render logic only has one
// shape to deal with.
const normalizeMatch = (m) => {
  // Real backend shape (get-tournament-brackets): participant_1/participant_2
  // objects + score_p1/score_p2 + match_id + winner:{id}. Mock/legacy shape:
  // participants[] array with per-participant score. Bridge both to a single
  // participants[] shape so the render logic is uniform.
  const parts = Array.isArray(m?.participants)
    ? m.participants
    : [m?.participant_1 || {}, m?.participant_2 || {}];
  const p0 = parts[0] || {};
  const p1 = parts[1] || {};
  const score0 = p0.score ?? m?.score_p1 ?? null;
  const score1 = p1.score ?? m?.score_p2 ?? null;
  const winnerId = m?.winner?.id ?? m?.winner_registration_id ?? m?.winner ?? null;
  const idOf = (p) => p?.id ?? p?.registration_id ?? p?.user_id;
  return {
    ...m,
    id: m?.id ?? m?.match_id,
    participants: [
      { ...p0, score: score0, is_winner: p0.is_winner ?? (winnerId != null && idOf(p0) != null && String(idOf(p0)) === String(winnerId)) },
      { ...p1, score: score1, is_winner: p1.is_winner ?? (winnerId != null && idOf(p1) != null && String(idOf(p1)) === String(winnerId)) },
    ],
  };
};

const normalizeRounds = (rounds) => {
  if (!Array.isArray(rounds)) return [];
  return rounds.map((r) => ({
    ...r,
    matches: Array.isArray(r?.matches) ? r.matches.map(normalizeMatch) : [],
  }));
};

// Best-effort match between the logged-in session and one side of a match.
// Backends have been seen shaping participant rows as team registrations
// (registration_id) or bare users (user_id) - try every plausible id field
// plus a username fallback before giving up.
const identifyParticipant = (match, session) => {
  const none = { isParticipant: false, mySide: -1, myParticipant: null, opponentSide: -1, opponentParticipant: null };
  const parts = Array.isArray(match?.participants) ? match.participants : [];
  if (!session?.user || !parts.length) return none;
  const sessionUserId = session.user.user_id ?? session.user.id;
  const sessionUsername = session.user.username;
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i] || {};
    const idCandidates = [p.user_id, p.id, p.registration_id].filter((v) => v != null).map(String);
    const matchesId = sessionUserId != null && idCandidates.includes(String(sessionUserId));
    const matchesUsername = !!sessionUsername && sessionUsername === p.username;
    if (matchesId || matchesUsername) {
      const opponentSide = i === 0 ? 1 : 0;
      return { isParticipant: true, mySide: i, myParticipant: p, opponentSide, opponentParticipant: parts[opponentSide] || null };
    }
  }
  return none;
};

// The BE contract doesn't pin down the exact field name the match uses to
// record who filed the score report - try the plausible spellings. Returns
// null when undeterminable (mock data, or a BE shape we haven't seen yet).
const getReporterRegistrationId = (match) => {
  const raw = match?.reported_by_registration_id ?? match?.reported_by ?? match?.score_reported_by
    ?? match?.reporter_registration_id ?? match?.reporter_id ?? null;
  return raw != null ? String(raw) : null;
};

const BracketPanel = ({ tournamentId, isOrganizer, token, tournament, session }) => {
  const [rounds, setRounds] = useState([]);
  const [bracketType, setBracketType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [openMatch, setOpenMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pendingBanner, setPendingBanner] = useState(false);

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Participant score-report flow.
  const [reportScoreA, setReportScoreA] = useState(0);
  const [reportScoreB, setReportScoreB] = useState(0);
  const [reportScreenshotUrl, setReportScreenshotUrl] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Opponent confirm/dispute flow (CONFIRM_SCORE).
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmDisputeOpen, setConfirmDisputeOpen] = useState(false);
  const [confirmDisputeText, setConfirmDisputeText] = useState('');
  const [confirmDisputeSubmitting, setConfirmDisputeSubmitting] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const loadBrackets = useCallback(async () => {
    if (!tournamentId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await ventFetch(API.TOURNAMENT.BRACKETS(tournamentId), { token });
      setRounds(normalizeRounds(data?.rounds));
      setBracketType(data?.bracket_type || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, token]);

  useEffect(() => { loadBrackets(); }, [loadBrackets, reloadKey]);

  const openModal = (match, round) => {
    setOpenMatch({ match, round });
    setScoreA(match.participants?.[0]?.score ?? 0);
    setScoreB(match.participants?.[1]?.score ?? 0);
    setDisputeOpen(false);
    setDisputeText('');
    setReportScoreA(0);
    setReportScoreB(0);
    setReportScreenshotUrl('');
    setConfirmDisputeOpen(false);
    setConfirmDisputeText('');
  };

  const closeModal = () => {
    setOpenMatch(null);
    setDisputeOpen(false);
    setDisputeText('');
    setReportScoreA(0);
    setReportScoreB(0);
    setReportScreenshotUrl('');
    setConfirmDisputeOpen(false);
    setConfirmDisputeText('');
  };

  // score_confirmation_mode: 'organizer_only' | 'two_player' | 'screenshot_required' | absent.
  // Absent is ambiguous - only light up the participant flow when we can
  // confidently place the session user in the match; otherwise fall back to
  // organizer-editor-only (safer than guessing wrong on money-adjacent flows).
  const scoreMode = tournament?.score_confirmation_mode || null;
  const participantInfo = useMemo(
    () => identifyParticipant(openMatch?.match, session),
    [openMatch, session],
  );
  const { isParticipant, myParticipant } = participantInfo;
  const participantFlowEnabled = scoreMode === 'organizer_only'
    ? false
    : (scoreMode === 'two_player' || scoreMode === 'screenshot_required' || isParticipant);

  const handleActionError = (err, fallbackMsg) => {
    if (err?.isPendingBackend) { setPendingBanner(true); return; }
    if (err?.code === 'ORGANIZER_ONLY_MODE') { showToast('Only the organizer can set scores in this tournament.'); return; }
    showToast(err?.message || fallbackMsg);
  };

  const saveScore = async () => {
    if (!openMatch) return;
    const { match, round } = openMatch;
    const previousRounds = rounds;
    const p0 = match.participants?.[0] || {};
    const p1 = match.participants?.[1] || {};
    const winnerId = scoreA > scoreB ? p0?.id : scoreB > scoreA ? p1?.id : null;

    // Optimistic local update - reflect the edit immediately, roll back on error.
    const optimistic = rounds.map((r) => {
      if (r.id !== round.id) return r;
      return {
        ...r,
        matches: r.matches.map((m) => {
          if (m.id !== match.id) return m;
          return {
            ...m,
            status: 'completed',
            participants: [
              { ...p0, score: scoreA, is_winner: winnerId ? p0?.id === winnerId : false },
              { ...p1, score: scoreB, is_winner: winnerId ? p1?.id === winnerId : false },
            ],
          };
        }),
      };
    });
    setRounds(optimistic);
    closeModal();
    setSaving(true);

    try {
      await ventFetch(API.TOURNAMENT.UPDATE_BRACKET(tournamentId), {
        method: 'POST',
        token,
        body: { match_id: match.id, score_p1: scoreA, score_p2: scoreB, winner_registration_id: winnerId },
      });
      showToast('Score saved · Bracket updated');
      await loadBrackets();
    } catch (err) {
      setRounds(previousRounds);
      handleActionError(err, 'Could not save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitDispute = async () => {
    if (!openMatch || !disputeText.trim()) return;
    setDisputeSubmitting(true);
    try {
      await ventFetch(API.TOURNAMENT.MATCH_DISPUTE(openMatch.match.id), {
        method: 'POST',
        token,
        body: { description: disputeText.trim(), evidence_urls: [] },
      });
      showToast('Dispute submitted for review.');
      closeModal();
      await loadBrackets();
    } catch (err) {
      handleActionError(err, 'Could not submit dispute. Please try again.');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const reportScore = async () => {
    if (!openMatch) return;
    const url = reportScreenshotUrl.trim();
    if (scoreMode === 'screenshot_required' && !url) {
      showToast('A screenshot URL is required to report this score.');
      return;
    }
    setReportSubmitting(true);
    try {
      await ventFetch(API.TOURNAMENT.REPORT_SCORE(openMatch.match.id), {
        method: 'POST',
        token,
        body: {
          score_p1: reportScoreA,
          score_p2: reportScoreB,
          ...(url ? { screenshot_url: url } : {}),
        },
      });
      showToast('Score reported · awaiting opponent confirmation');
      closeModal();
      await loadBrackets();
    } catch (err) {
      handleActionError(err, 'Could not report score. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const confirmMatchScore = async () => {
    if (!openMatch) return;
    setConfirmSubmitting(true);
    try {
      await ventFetch(API.TOURNAMENT.CONFIRM_SCORE(openMatch.match.id), {
        method: 'POST',
        token,
        body: { agree: true },
      });
      showToast('Score confirmed · Bracket updated');
      closeModal();
      await loadBrackets();
    } catch (err) {
      handleActionError(err, 'Could not confirm score. Please try again.');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const submitConfirmDispute = async () => {
    if (!openMatch || !confirmDisputeText.trim()) return;
    setConfirmDisputeSubmitting(true);
    try {
      await ventFetch(API.TOURNAMENT.CONFIRM_SCORE(openMatch.match.id), {
        method: 'POST',
        token,
        body: { agree: false, dispute_description: confirmDisputeText.trim() },
      });
      showToast('Dispute raised · awaiting admin review');
      closeModal();
      await loadBrackets();
    } catch (err) {
      handleActionError(err, 'Could not submit dispute. Please try again.');
    } finally {
      setConfirmDisputeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.bracketWrap}>
        <div className={styles.bracketScroll}>
          <div className={styles.bracketChart}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.roundCol} style={{ '--round-idx': i }}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineMd}`} style={{ marginBottom: '0.85rem' }} />
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className={`${styles.skeletonBlock} ${styles.skeletonMatchCard}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.bracketWrap}>
        <p className={styles.errText}>{error.message || 'Could not load the bracket.'}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button className={`${styles.primaryBtn} goldBTN`} onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
        </div>
      </div>
    );
  }

  if (!rounds.length) {
    return (
      <div className={styles.bracketWrap}>
        <p className={styles.errText}>Bracket not generated yet.</p>
      </div>
    );
  }

  const teamsCount = rounds[0]?.matches?.length
    ? rounds[0].matches.length * (rounds[0].matches[0]?.participants?.length || 2)
    : null;
  const entrantWord = tournament?.participant_type === 'team' ? 'Teams' : 'Players';

  return (
    <div className={styles.bracketWrap}>
      <div className={styles.bracketHeader}>
        <p className={styles.bracketSub}>{formatLabel(bracketType)}{teamsCount ? ` · ${teamsCount} ${entrantWord}` : ''}</p>
        <p className={styles.bracketHint}>Click any match to view details{isOrganizer ? ' or edit score' : ''}.</p>
        {pendingBanner && (
          <p className={styles.pendingBanner}><LuTriangleAlert /> Pending BE deploy - score changes aren&apos;t saved server-side yet.</p>
        )}
      </div>

      <div className={styles.bracketScroll}>
        <div className={styles.bracketChart}>
          {rounds.map((round, rIdx) => (
            <div key={round.id || rIdx} className={styles.roundCol} style={{ '--round-idx': rIdx }}>
              <div className={styles.roundHeader}>
                <span className={styles.roundName}>{round.name || `Round ${round.round_number || rIdx + 1}`}</span>
                <span className={`${styles.roundBadge} ${round.matches.every((m) => m.status === 'completed') ? styles.roundBadgeDone : round.matches.some((m) => m.status === 'in_progress') ? styles.roundBadgeLive : styles.roundBadgeUpcoming}`}>
                  {round.matches.length} {round.matches.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <div className={styles.matchList}>
                {round.matches.map((m) => (
                  <button
                    key={m.id}
                    className={`${styles.matchCard} ${styles[`match_${m.status}`] || ''}`}
                    onClick={() => openModal(m, round)}
                  >
                    <div className={styles.matchTop}>
                      <span className={styles.matchLabel}>Match {m.match_number}</span>
                      <span className={`${styles.matchDot} ${styles[`dot_${m.status}`] || ''}`}>
                        {m.status === 'completed' ? 'Done' : m.status === 'in_progress' ? 'Live' : 'Sched'}
                      </span>
                    </div>
                    <div className={styles.matchTeams}>
                      {m.participants?.map((p, idx) => (
                        <div key={p.id || idx} className={`${styles.teamRow} ${p.is_winner ? styles.teamWinner : ''}`}>
                          <span className={styles.teamAvatar}>{(p.name || p.username || '?').charAt(0)}</span>
                          <span className={styles.teamName}>{p.name || p.username || 'TBD'}</span>
                          <span className={`${styles.teamScore} ${p.score == null ? styles.scoreNa : ''}`}>
                            {p.score == null ? '-' : p.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match modal */}
      {openMatch && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{openMatch.round?.name} · Match {openMatch.match?.match_number}</h3>
              <button className={styles.modalClose} onClick={closeModal}><LuX /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalScoreRow}>
                <div className={styles.modalTeam}>
                  <div className={styles.modalAvatar}>{(openMatch.match.participants?.[0]?.name || '?').charAt(0)}</div>
                  <p className={styles.modalTeamName}>{openMatch.match.participants?.[0]?.name || 'TBD'}</p>
                  {isOrganizer ? (
                    <input
                      type="number" min="0" className={styles.scoreInput}
                      value={scoreA} onChange={(e) => setScoreA(parseInt(e.target.value, 10) || 0)}
                    />
                  ) : (
                    <p className={styles.modalScore}>{openMatch.match.participants?.[0]?.score ?? '-'}</p>
                  )}
                </div>
                <span className={styles.vsLabel}>VS</span>
                <div className={styles.modalTeam}>
                  <div className={styles.modalAvatar}>{(openMatch.match.participants?.[1]?.name || '?').charAt(0)}</div>
                  <p className={styles.modalTeamName}>{openMatch.match.participants?.[1]?.name || 'TBD'}</p>
                  {isOrganizer ? (
                    <input
                      type="number" min="0" className={styles.scoreInput}
                      value={scoreB} onChange={(e) => setScoreB(parseInt(e.target.value, 10) || 0)}
                    />
                  ) : (
                    <p className={styles.modalScore}>{openMatch.match.participants?.[1]?.score ?? '-'}</p>
                  )}
                </div>
              </div>
              <div className={styles.modalMetaList}>
                <div className={styles.modalMetaRow}>
                  <span>Status</span>
                  <span className={styles.modalMetaVal}>{openMatch.match.status}</span>
                </div>
                <div className={styles.modalMetaRow}>
                  <span>Scheduled</span>
                  <span className={styles.modalMetaVal}>{formatDate(openMatch.match.scheduled_at)}</span>
                </div>
                <div className={styles.modalMetaRow}>
                  <span>Format</span>
                  <span className={styles.modalMetaVal}>Best of 3</span>
                </div>
              </div>

              {isOrganizer && (
                <button
                  className={`${styles.primaryBtn} goldBTN`}
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={saveScore}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Score'}
                </button>
              )}

              {/* Participant score-report / confirm flow. Hidden entirely in
                  organizer_only mode, and - when the mode is unspecified -
                  hidden unless we could confidently place this session inside
                  the match (see identifyParticipant). */}
              {!isOrganizer && participantFlowEnabled && isParticipant && (() => {
                const m = openMatch.match;
                const reporterRegId = getReporterRegistrationId(m);
                const myRegId = myParticipant
                  ? String(myParticipant.registration_id ?? myParticipant.id ?? myParticipant.user_id ?? '')
                  : null;
                const iAmReporter = !!(reporterRegId && myRegId && reporterRegId === myRegId);
                const iAmOpponent = !!myRegId && !!reporterRegId && !iAmReporter;
                const reporterUnknown = !reporterRegId;

                if (m.status === 'scheduled' || m.status === 'in_progress') {
                  return (
                    <div className={styles.reportBox}>
                      <p className={styles.reportBoxTitle}>Report Match Score</p>
                      <div className={styles.reportScoreRow}>
                        <input
                          type="number" min="0" className={styles.scoreInput}
                          value={reportScoreA} onChange={(e) => setReportScoreA(parseInt(e.target.value, 10) || 0)}
                        />
                        <span className={styles.vsLabel}>-</span>
                        <input
                          type="number" min="0" className={styles.scoreInput}
                          value={reportScoreB} onChange={(e) => setReportScoreB(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                      <label className={styles.reportUrlLabel} htmlFor="bracket-report-screenshot">
                        Screenshot URL {scoreMode === 'screenshot_required' ? '(required)' : '(optional)'}
                      </label>
                      <input
                        id="bracket-report-screenshot"
                        type="url" className={styles.reportUrlInput} placeholder="https://..."
                        value={reportScreenshotUrl} onChange={(e) => setReportScreenshotUrl(e.target.value)}
                      />
                      <button
                        className={`${styles.primaryBtn} goldBTN`}
                        style={{ width: '100%', marginTop: '0.75rem' }}
                        onClick={reportScore}
                        disabled={reportSubmitting || (scoreMode === 'screenshot_required' && !reportScreenshotUrl.trim())}
                      >
                        {reportSubmitting ? 'Submitting…' : 'Report Score'}
                      </button>
                    </div>
                  );
                }

                if (m.status === 'pending_opponent_confirm') {
                  if (iAmReporter) {
                    return <p className={styles.infoBanner}><LuInfo /> Score reported - waiting for your opponent to confirm.</p>;
                  }
                  if (reporterUnknown) {
                    return <p className={styles.infoBanner}><LuInfo /> Awaiting opponent confirmation.</p>;
                  }
                  if (iAmOpponent && !confirmDisputeOpen) {
                    return (
                      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                        <button className={`${styles.primaryBtn} goldBTN`} style={{ flex: 1 }} onClick={confirmMatchScore} disabled={confirmSubmitting}>
                          {confirmSubmitting ? 'Confirming…' : 'Confirm Score'}
                        </button>
                        <button className={styles.outlineBtn} style={{ flex: 1 }} onClick={() => setConfirmDisputeOpen(true)} disabled={confirmSubmitting}>
                          Dispute
                        </button>
                      </div>
                    );
                  }
                  if (iAmOpponent && confirmDisputeOpen) {
                    return (
                      <div className={styles.disputeBox}>
                        <textarea
                          className={styles.disputeTextarea}
                          placeholder="Why do you disagree with this reported score?"
                          value={confirmDisputeText}
                          onChange={(e) => setConfirmDisputeText(e.target.value)}
                          rows={3}
                        />
                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem' }}>
                          <button className={styles.outlineBtn} style={{ flex: 1 }} onClick={() => setConfirmDisputeOpen(false)} disabled={confirmDisputeSubmitting}>
                            Cancel
                          </button>
                          <button
                            className={`${styles.primaryBtn} goldBTN`}
                            style={{ flex: 1 }}
                            onClick={submitConfirmDispute}
                            disabled={confirmDisputeSubmitting || !confirmDisputeText.trim()}
                          >
                            {confirmDisputeSubmitting ? 'Submitting…' : 'Submit Dispute'}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }

                if (m.status === 'disputed') {
                  return <p className={styles.pendingBanner}><LuTriangleAlert /> In dispute - awaiting admin review.</p>;
                }

                return null;
              })()}

              {!isOrganizer && !disputeOpen && !confirmDisputeOpen
                && !['completed', 'bye', 'disputed'].includes(openMatch.match.status) && (
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                  <button className={styles.outlineBtn} style={{ flex: 1 }} onClick={closeModal}>Close</button>
                  <button className={styles.outlineBtn} style={{ flex: 1 }} onClick={() => setDisputeOpen(true)}>Raise Dispute</button>
                </div>
              )}

              {!isOrganizer && disputeOpen && (
                <div className={styles.disputeBox}>
                  <textarea
                    className={styles.disputeTextarea}
                    placeholder="Describe the issue with this match result..."
                    value={disputeText}
                    onChange={(e) => setDisputeText(e.target.value)}
                    rows={3}
                  />
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem' }}>
                    <button className={styles.outlineBtn} style={{ flex: 1 }} onClick={() => setDisputeOpen(false)} disabled={disputeSubmitting}>Cancel</button>
                    <button
                      className={`${styles.primaryBtn} goldBTN`}
                      style={{ flex: 1 }}
                      onClick={submitDispute}
                      disabled={disputeSubmitting || !disputeText.trim()}
                    >
                      {disputeSubmitting ? 'Submitting…' : 'Submit Dispute'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

/* ──────────────── PARTICIPANTS ──────────────── */
const ParticipantsPanel = ({ tournamentId, token }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!tournamentId) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await ventFetch(API.TOURNAMENT.PARTICIPANTS(tournamentId), { token });
        if (cancelled) return;
        setRows(Array.isArray(data?.participants) ? data.participants : []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
      tag: r?.type === 'team' ? 'Team' : (entrant.username && entrant.username !== entrant.name ? `@${entrant.username}` : ''),
      region: entrant.country || '-',
      captain: entrant.captain || '-',
      played,
      record: played ? `${r?.wins ?? 0}W ${r?.losses ?? 0}L` : 'Not played yet',
      winRate: r?.win_rate === null || r?.win_rate === undefined ? null : Number(r.win_rate),
      status: r?.status || 'pending',
    };
  }), [rows]);

  const filtered = normalized.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return r.name.toLowerCase().includes(q) || r.captain.toLowerCase().includes(q) || r.region.toLowerCase().includes(q);
  });

  return (
    <div className={styles.partWrap}>
      <div className={styles.partHeader}>
        <h3 className={styles.sectionTitle}>Participants ({normalized.length})</h3>
        <div className={styles.searchBarSmall}>
          <LuSearch />
          <input type="text" placeholder="Search teams, captains, regions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && (
        <div className={styles.tableWrap} style={{ display: 'block' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.tableRow}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} style={{ width: '100%', height: '18px' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div>
          <p className={styles.errText}>{error.message || 'Could not load participants.'}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className={`${styles.primaryBtn} goldBTN`} onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
          </div>
        </div>
      )}

      {!loading && !error && normalized.length === 0 && (
        <p className={styles.errText}>No participants yet.</p>
      )}

      {!loading && !error && normalized.length > 0 && (
        <>
          {/* Desktop table */}
          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <div className={styles.colSeed}>Seed</div>
              <div className={styles.colTeam}>Team / Player</div>
              <div className={styles.colRegion}>Country</div>
              <div className={styles.colCap}>Captain</div>
              <div className={styles.colWR}>Record</div>
              <div className={styles.colStatus}>Status</div>
            </div>
            {filtered.map((r) => (
              <div key={r.key} className={styles.tableRow}>
                <div className={styles.colSeed}>#{r.seed}</div>
                <div className={styles.colTeam}>
                  <div className={styles.teamCell}>
                    <div className={styles.teamCellAvatar}>{r.name.charAt(0)}</div>
                    <div>
                      <p className={styles.teamCellName}>{r.name}</p>
                      {r.tag && <p className={styles.teamCellTag}>{r.tag}</p>}
                    </div>
                  </div>
                </div>
                <div className={styles.colRegion}>{r.region}</div>
                <div className={styles.colCap}>@{r.captain}</div>
                <div className={styles.colWR}>
                  {r.winRate === null ? (
                    <span>{r.record}</span>
                  ) : (
                    <>
                      <div className={styles.wrBar}>
                        <div className={styles.wrFill} style={{ width: `${Math.min(100, Math.max(0, r.winRate))}%` }} />
                      </div>
                      <span>{r.record}</span>
                    </>
                  )}
                </div>
                <div className={styles.colStatus}>
                  <span className={`${styles.partStatus} ${styles[`partStatus_${r.status}`] || ''}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className={styles.partCardList}>
            {filtered.map((r) => (
              <div key={r.key} className={styles.partCard}>
                <div className={styles.partCardHead}>
                  <div className={styles.teamCell}>
                    <div className={styles.teamCellAvatar}>{r.name.charAt(0)}</div>
                    <div>
                      <p className={styles.teamCellName}>{r.name}</p>
                      <p className={styles.teamCellTag}>{r.tag ? `${r.tag} · ` : ''}Seed #{r.seed}</p>
                    </div>
                  </div>
                  <span className={`${styles.partStatus} ${styles[`partStatus_${r.status}`] || ''}`}>{r.status}</span>
                </div>
                <div className={styles.partCardBody}>
                  <div><span className={styles.cardLabel}>Country</span><span>{r.region}</span></div>
                  <div><span className={styles.cardLabel}>Captain</span><span>@{r.captain}</span></div>
                  <div><span className={styles.cardLabel}>Record</span><span style={{ color: 'var(--v-ent-gold)', fontWeight: 600 }}>{r.record}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ──────────────── PRIZE ──────────────── */
const PrizePanel = ({ tournament }) => {
  // Defensive coercion - if the backend payload is partial, total can be
  // undefined and .toLocaleString() would NPE.
  const total = Number(tournament?.prize_pool ?? 0) || 0;
  const realDist = Array.isArray(tournament?.prize_distribution) && tournament.prize_distribution.length
    ? tournament.prize_distribution
    : null;

  const dist = realDist
    ? realDist.map((d, i) => {
      const amount = d.prize != null ? Number(d.prize) : null;
      // The API sends amounts, not percentages. Every row read "-" because it
      // waited for a `percent` the backend has never sent.
      const percent = d.percent != null
        ? Number(d.percent)
        : (amount != null && total > 0 ? Math.round((amount / total) * 100) : null);
      return {
        pos: ordinalPlace(d.position ?? d.pos ?? i + 1),
        percent,
        amount,
        label: d.label || '',
        count: d.count,
      };
    })
    : [
      { pos: '1st Place', percent: 50, label: 'Champion' },
      { pos: '2nd Place', percent: 25, label: 'Runner-up' },
      { pos: '3rd Place', percent: 12, label: 'Semi-Final' },
      { pos: '4th Place', percent: 8, label: 'Semi-Final' },
      { pos: '5th-8th', percent: 5, label: 'Quarter-Final', count: 4 },
    ];

  const sponsors = Array.isArray(tournament?.sponsors) ? tournament.sponsors : [];

  return (
    <div className={styles.prizeWrap}>
      <div className={styles.prizeHero}>
        <p className={styles.metaLabel}>Total Prize Pool</p>
        <h2 className={styles.prizeAmount}>{total.toLocaleString()} <span className={styles.vcUnit}>VC</span></h2>
        <p className={styles.prizeFiat}>≈ {coinsAsNgn(total)} NGN</p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Distribution</h3>
        <div className={styles.prizeTable}>
          <div className={styles.prizeTableHeader}>
            <span>Position</span>
            <span>Amount</span>
            <span>Percent</span>
          </div>
          {dist.map((d, i) => {
            const amount = d.amount != null ? d.amount : Math.round(total * (d.percent || 0) / 100);
            return (
              <div key={d.pos || i} className={styles.prizeTableRow}>
                <div>
                  <p className={styles.prizePos}>{d.pos}</p>
                  {(d.label || d.count) && (
                    <p className={styles.prizeLabel}>{d.label}{d.count ? ` · ${d.count} teams` : ''}</p>
                  )}
                </div>
                <span className={styles.prizeAmtCell}>{Number(amount || 0).toLocaleString()} VC</span>
                <span className={styles.prizePercent}>{d.percent != null ? `${d.percent}%` : '-'}</span>
              </div>
            );
          })}
        </div>
      </section>

      {sponsors.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Sponsor Breakdown</h3>
          <div className={styles.sponsorBreakdown}>
            {sponsors.map((s, i) => {
              const name = typeof s === 'string' ? s : (s?.name || s?.sponsor_name || 'Sponsor');
              const tier = typeof s === 'string' ? '' : (s?.tier || '');
              const cut = typeof s === 'object' && s?.contribution_percent != null ? Number(s.contribution_percent) : null;
              const amount = cut != null ? Math.round(total * cut / 100) : null;
              return (
                <div key={s?.id || `${name}_${i}`} className={styles.sbRow}>
                  <div className={styles.sbLogo}>{name.charAt(0)}</div>
                  <div className={styles.sbInfo}>
                    <p className={styles.sbName}>{name}</p>
                    {tier && <p className={styles.sbTier}>{tier}</p>}
                  </div>
                  {amount != null && <p className={styles.sbAmount}>{amount.toLocaleString()} VC</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

/* ──────────────── STREAM ──────────────── */
const StreamPanel = ({ tournament, session }) => {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { user: 'fury_king', body: 'GG that comeback was insane', color: '#fbc64b' },
    { user: 'crimson_ace', body: 'who is in the next match?', color: '#a78bfa' },
    { user: 'shadow_zero', body: 'TEAM CRIMSON LETSGO 🐺', color: '#60a5fa' },
    { user: 'neon_wolf', body: 'casting is fire today', color: '#34d399' },
    { user: 'reaper_x', body: 'pop off pop off', color: '#f87171' },
    { user: 'ghost_zero', body: 'production team eating', color: '#D4AF37' },
    { user: 'viper_prime', body: 'imagine missing that 1v3', color: '#fb923c' },
  ]);

  const myName = session?.user?.username || session?.user?.name || 'you';
  const tournamentName = tournament?.name || tournament?.tournament_title || 'Tournament';
  const game = tournament?.game || 'Game';

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages((m) => [...m, { user: myName, body: chatInput.trim(), color: '#ED1C24' }]);
    setChatInput('');
  };

  return (
    <div className={styles.streamWrap}>
      <div className={styles.streamMain}>
        <div className={styles.streamFrame}>
          <iframe
            title={`${tournamentName} stream`}
            src="about:blank"
            className={styles.streamIframe}
          />
          <div className={styles.streamPlaceholder}>
            <LuRadio className={styles.streamIcon} />
            <p className={styles.streamPlaceholderTitle}>Twitch embed placeholder</p>
            <p className={styles.streamPlaceholderSub}>twitch.tv/v-ent · Live in mock mode</p>
            <div className={styles.streamMeta}>
              <span className={styles.viewerCount}>● 2,148 viewers</span>
              <span>Casters: jay_o · ada_a</span>
            </div>
          </div>
        </div>
        <div className={styles.streamCaption}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: '0.4rem' }}>{tournamentName} - Live</h3>
          <p className={styles.sectionText}>Live broadcast of the {game} {formatLabel(tournament?.format)} bracket. Casters call every match in English.</p>
        </div>
      </div>

      <aside className={styles.chatSide}>
        <div className={styles.chatHeader}>
          <LuMessageCircle /> Live Chat
          <span className={styles.chatViewers}>2.1k watching</span>
        </div>
        <div className={styles.chatMessages}>
          {messages.map((m, i) => (
            <div key={i} className={styles.chatMsg}>
              <span className={styles.chatUser} style={{ color: m.color }}>{m.user}:</span>
              <span className={styles.chatBody}>{m.body}</span>
            </div>
          ))}
        </div>
        <div className={styles.chatInputRow}>
          <input
            type="text"
            placeholder="Send a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className={styles.chatInput}
          />
          <button className={`${styles.primaryBtn} goldBTN`} onClick={sendMessage}>Send</button>
        </div>
      </aside>
    </div>
  );
};

const ViewTournament = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ViewTournamentContent />
  </Suspense>
);

export default ViewTournament;
