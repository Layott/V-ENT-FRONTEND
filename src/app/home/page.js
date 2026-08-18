'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getJson } from '@/lib/apiCache';
import {
  LuGamepad2,
  LuPlus,
  LuCalendar,
  LuMapPin,
  LuTrophy,
  LuUsers,
  LuBell,
  LuEye,
} from 'react-icons/lu';
import { MdOutlineEvent } from 'react-icons/md';
import { IoWalletOutline } from 'react-icons/io5';
import {
  FiArrowUpRight,
  FiArrowDownLeft,
  FiZap,
} from 'react-icons/fi';
import {
  FaTrophy,
  FaUsers,
  FaTicketAlt,
  FaMedal,
  FaCircle,
} from 'react-icons/fa';
import { BsBroadcast } from 'react-icons/bs';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './home.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/* ─────────────────────────── helpers ─────────────────────────── */

const ngnFormatter = new Intl.NumberFormat('en-NG');

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatLongDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatRelative = (d) => {
  if (!d) return '';
  const diffMs = Date.now() - new Date(d).getTime();
  if (diffMs < 0) return 'just now';
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return formatDate(d);
};

const formatTimeUntil = (d) => {
  if (!d) return '';
  const diffMs = new Date(d).getTime() - Date.now();
  if (diffMs <= 0) return 'Live';
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `in ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `in ${h}h`;
  const days = Math.floor(h / 24);
  return `in ${days}d`;
};

/* ─────────────────── response normalizers (real API contract) ─────────────────── */
// The real tournament/event list endpoints return { featured, new/upcoming,
// by_game } rather than a flat array (see /tournaments + /events pages). The
// mock layer returns a flat { tournaments } / { events }. These helpers flatten
// whatever shape comes back so the dashboard cards render identically in both.

const dedupeById = (arr) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    if (!x || x.id == null || seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
};

const flattenByGame = (byGame) =>
  byGame && typeof byGame === 'object'
    ? Object.values(byGame).flat().filter(Boolean)
    : [];

const extractTournaments = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.tournaments)) return data.tournaments;
  return dedupeById([
    ...(Array.isArray(data.featured) ? data.featured : []),
    ...(Array.isArray(data.new) ? data.new : []),
    ...flattenByGame(data.by_game),
  ]);
};

const extractEvents = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.upcoming) && data.upcoming.length) {
    return dedupeById([...data.upcoming, ...flattenByGame(data.by_game)]);
  }
  if (Array.isArray(data.events)) return data.events;
  return dedupeById([
    ...(Array.isArray(data.featured) ? data.featured : []),
    ...flattenByGame(data.by_game),
  ]);
};

const extractTeams = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.teams)) return data.teams;
  return [];
};

const extractTransactions = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.transactions)) return data.transactions;
  return [];
};

const mapTournamentCard = (t) => ({
  id: t.id,
  game:
    typeof t.game === 'string'
      ? t.game
      : t.game_name || t.tournament_game_name || t.tournament_game || 'Esports',
  name: t.name || t.title || t.tournament_title || 'Tournament',
  start_date: t.start_date || t.start_date_and_time || t.start || null,
  prize_pool: Number(t.prize_pool ?? t.prize ?? t.prize_pool_vc ?? 0) || 0,
});

const mapEventCard = (e) => ({
  id: e.id,
  name: e.name || e.title || e.event_title || 'Event',
  event_type: e.event_type || e.type || '',
  location: e.location || e.venue || 'TBA',
  start_date: e.start_date || e.start_date_and_time || e.start || null,
});

const mapTeamCard = (t) => ({
  id: t.id,
  name: t.name || t.team_name || 'Team',
  tag:
    t.tag ||
    t.team_tag ||
    (t.name || t.team_name || 'T').slice(0, 3).toUpperCase(),
  member_count:
    Number(t.member_count ?? (Array.isArray(t.members) ? t.members.length : 0)) || 0,
});

// Sort a card list by soonest future start date; falls back to the raw list
// (sliced) when nothing is future-dated so the section is not needlessly blank.
const upcomingSlice = (list, count) => {
  const nowMs = Date.now();
  const future = list
    .filter((x) => x.start_date && new Date(x.start_date).getTime() > nowMs)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const base = future.length ? future : list;
  return { future, slice: base.slice(0, count) };
};

// Wallet rows: credits are positive amounts, debits negative.
const CREDIT_TYPES = new Set(['top_up', 'prize', 'receive', 'refund']);
const isCreditTx = (tx) =>
  Number(tx?.amount) > 0 || CREDIT_TYPES.has(tx?.type);

const TX_TYPE_LABELS = {
  top_up: 'Top up',
  deduction: 'Entry fee',
  prize: 'Prize',
  send: 'Sent',
  receive: 'Received',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
};
const txTypeLabel = (type) => TX_TYPE_LABELS[type] || (type ? type.replace(/_/g, ' ') : 'Transaction');

const activityIconFor = (kind, type) => {
  const key = kind || type;
  if (key === 'match_live') return <BsBroadcast />;
  if (key === 'tournament' || key === 'tournament_registered') return <FaTrophy />;
  if (key === 'event' || key === 'ticket') return <FaTicketAlt />;
  if (key === 'team' || key === 'team_joined') return <FaUsers />;
  if (key === 'wallet' || key === 'transaction') return <IoWalletOutline />;
  if (key === 'achievement') return <FaMedal />;
  return <LuBell />;
};

// Greeting line under the welcome header, one per weekday.
const motivationByDay = [
  'Sunday reset. Line up the week and pick your next tournament.',
  'Mondays are for setting the pace. Pick a goal, chase it.',
  'Tuesday grind. Small reps beat big talk.',
  'Midweek. Check your bracket and your balance.',
  'Thursday. Lock in the squad before the weekend runs.',
  'Friday. Prime time for scrims and finals.',
  'Saturday. Play the matches you have been waiting for.',
];

/* ─────────────────────────── count-up hook ─────────────────────────── */

const useCountUp = (target, duration = 400, start = false, decimals = 0) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!start || target == null) return undefined;
    const from = 0;
    const to = Number(target) || 0;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (to - from) * eased;
      setValue(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, start]);

  if (decimals > 0) return Number(value).toFixed(decimals);
  return Math.round(value);
};

/* ─────────────────────────── stat card ─────────────────────────── */

const StatCard = ({ label, icon, value, suffix, sub, animated, decimals, accent }) => {
  const display = useCountUp(value, 700, animated, decimals);
  return (
    <div className={`${styles.statCard} ${accent === 'green' ? styles.statCardGreen : ''} ${accent === 'red' ? styles.statCardRed : ''}`}>
      <div className={styles.statHeader}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <p className={styles.statValue}>
        {decimals > 0 ? display : Number(display).toLocaleString()}
        {suffix && <span className={styles.statUnit}>{suffix}</span>}
      </p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
};

/* ─────────────────────────── HomePage ─────────────────────────── */

const HomePage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate the dashboard from the real M1 contract endpoints. Each widget maps
  // to a live endpoint (wallet balance, tournament list, event list, team list,
  // transactions).
  useEffect(() => {
    // Wait for NextAuth to resolve so protected endpoints get the Bearer token.
    if (status === 'loading') return undefined;

    let cancelled = false;
    const token = session?.user?.sessionToken;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const getData = async (path) => {
      try {
        // Shared GET: the dashboard asks for six endpoints at once and the app
        // shell wants the profile too. One request each, not one per caller.
        const json = await getJson(`${API_BASE}${path}`, { token, ttl: 3000 });
        if (json?.status === 'success') return json.data;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[home] fetch failed:', path, err);
      }
      return null;
    };

    const load = async () => {
      const [walletData, txData, tournamentData, eventData, teamData, userData] =
        await Promise.all([
          getData('/auth/wallet/balance/'),
          getData('/auth/wallet/transactions/'),
          getData('/tournament/get-all-tournaments/'),
          getData('/event/get-all-events/'),
          getData('/team/get-all-teams/?tab=owned'),
          getData('/auth/get-user-informations/'),
        ]);
      if (cancelled) return;

      const balanceVc = Number(walletData?.balance ?? 0) || 0;
      const wallet = {
        balance_vc: balanceVc,
        balance_ngn: balanceVc * 1000,
        kyc_verified: walletData?.kyc_verified,
      };

      const allTournaments = extractTournaments(tournamentData).map(mapTournamentCard);
      const allEvents = extractEvents(eventData).map(mapEventCard);
      const teams = extractTeams(teamData).map(mapTeamCard);
      const transactions = extractTransactions(txData).slice(0, 3);

      const tUpcoming = upcomingSlice(allTournaments, 3);
      const eUpcoming = upcomingSlice(allEvents, 3);

      // Recommendations: the next couple of future tournaments after the strip
      // shown above (falls back to the soonest two when the list is short).
      const recPool = tUpcoming.future.length ? tUpcoming.future : allTournaments;
      const recommendations = (recPool.slice(3, 5).length
        ? recPool.slice(3, 5)
        : recPool.slice(0, 2));

      setSnapshot({
        wallet,
        user: { name: userData?.full_name || userData?.username || '' },
        transactions,
        tournaments_upcoming: tUpcoming.slice,
        events_upcoming: eUpcoming.slice,
        teams: teams.slice(0, 5),
        recommendations,
        counts: {
          openTournaments: tUpcoming.future.length,
          upcomingEvents: eUpcoming.future.length,
          myTeams: teams.length,
        },
        // No per-user match or activity endpoint exists yet, so these stay
        // empty and the sections render their written empty states.
        matches_strip: [],
        activity_feed: [],
      });

      // Hold the skeleton briefly so the count-up animation reads intentionally.
      setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 300);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.sessionToken]);

  // Greeting name from the real session; neutral fallback for a fresh user.
  const sessionName = snapshot?.user?.name || session?.user?.name || session?.user?.username;
  const firstName =
    (typeof sessionName === 'string' && sessionName.trim()
      ? sessionName.split(' ')[0]
      : '') || 'Gamer';

  const today = new Date();
  const motivation = motivationByDay[today.getDay()];

  const wallet = snapshot?.wallet || { balance_vc: 0, balance_ngn: 0 };
  const counts =
    snapshot?.counts || { openTournaments: 0, upcomingEvents: 0, myTeams: 0 };
  const matchesStrip = snapshot?.matches_strip || [];
  const tournamentsUpcoming = snapshot?.tournaments_upcoming || [];
  const eventsUpcoming = snapshot?.events_upcoming || [];
  const teams = snapshot?.teams || [];
  const transactions = snapshot?.transactions || [];
  const activityFeed = snapshot?.activity_feed || [];
  const recommendations = snapshot?.recommendations || [];

  const animateStats = !loading && !!snapshot;

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* ═════════════ 1. GREETING HERO ═════════════ */}
          <section className={styles.heroSection}>
            <div className={styles.heroContent}>
              <div className={styles.heroText}>
                <p className={styles.heroDate}>{formatLongDate(today)}</p>
                <h1 className={styles.heroTitle}>
                  Welcome back,{' '}
                  <span className={styles.heroName}>{firstName}</span>
                </h1>
                <p className={styles.heroTagline}>{motivation}</p>
              </div>

              <div className={styles.heroActions}>
                <Link
                  href="/wallets"
                  className={`btn goldBTN ${styles.heroBtn}`}
                >
                  <LuPlus className={styles.heroBtnIcon} /> Top up wallet
                </Link>
                <Link
                  href="/tournaments"
                  className={`btn redBTN ${styles.heroBtn}`}
                >
                  <LuGamepad2 className={styles.heroBtnIcon} /> Find tournament
                </Link>
                <Link
                  href="/teams"
                  className={`${styles.heroBtn} ${styles.heroBtnGhost}`}
                >
                  <FaUsers className={styles.heroBtnIcon} /> Create team
                </Link>
              </div>
            </div>
          </section>

          {/* ═════════════ 2. QUICK STATS ═════════════ */}
          <section className={styles.statGrid} aria-label="Quick stats">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`${styles.statCard} ${styles.skeletonCard}`}
                  aria-hidden
                />
              ))
            ) : (
              <>
                <StatCard
                  label="Wallet Balance"
                  icon={<IoWalletOutline />}
                  value={wallet.balance_vc}
                  suffix=" VC"
                  sub={`₦${ngnFormatter.format(wallet.balance_ngn)} equivalent`}
                  animated={animateStats}
                  accent="green"
                />
                <StatCard
                  label="Open Tournaments"
                  icon={<LuGamepad2 />}
                  value={counts.openTournaments}
                  sub="Open to join now"
                  animated={animateStats}
                />
                <StatCard
                  label="Upcoming Events"
                  icon={<MdOutlineEvent />}
                  value={counts.upcomingEvents}
                  sub="Happening soon"
                  animated={animateStats}
                />
                <StatCard
                  label="My Teams"
                  icon={<FaUsers />}
                  value={counts.myTeams}
                  sub="Squads you own"
                  animated={animateStats}
                  accent="red"
                />
              </>
            )}
          </section>

          {/* ═════════════ 3. LIVE & UPCOMING MATCHES ═════════════ */}
          {/* TODO(M2): real per-user matches endpoint - demo data in mock mode only. */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Live & Upcoming Matches</h2>
              <Link href="/tournaments" className={styles.sectionLink}>
                View all <FiArrowUpRight />
              </Link>
            </div>

            {loading ? (
              <div className={styles.cardStrip}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.matchCard} ${styles.skeletonCard}`}
                    aria-hidden
                  />
                ))}
              </div>
            ) : matchesStrip.length === 0 ? (
              <p className={styles.emptyState}>
                No matches scheduled yet - register for a tournament to get started.
              </p>
            ) : (
              <div className={styles.cardStrip}>
                {matchesStrip.map((m) => {
                  const isLive = m.status === 'live';
                  return (
                    <article
                      key={m.id}
                      className={`${styles.matchCard} ${isLive ? styles.matchCardLive : ''}`}
                      onClick={() =>
                        router.push(`/tournaments/view-tournament?id=${m.tournament_id}`)
                      }
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          router.push(`/tournaments/view-tournament?id=${m.tournament_id}`);
                        }
                      }}
                    >
                      <div className={styles.matchHeader}>
                        <span className={styles.matchGameChip}>{m.game}</span>
                        {isLive ? (
                          <span className={styles.liveBadge}>
                            <FaCircle className={styles.liveDot} /> LIVE
                          </span>
                        ) : (
                          <span className={styles.matchTimeUntil}>
                            {formatTimeUntil(m.scheduled_at)}
                          </span>
                        )}
                      </div>
                      <p className={styles.matchTournament}>{m.tournament_name}</p>
                      <div className={styles.matchTeams}>
                        <div className={styles.matchTeamRow}>
                          <span className={styles.matchTeamTag}>{m.team_a.tag}</span>
                          <span className={styles.matchTeamName}>{m.team_a.name}</span>
                          {isLive && (
                            <span className={styles.matchScore}>{m.score_a}</span>
                          )}
                        </div>
                        <span className={styles.matchVs}>vs</span>
                        <div className={styles.matchTeamRow}>
                          <span className={styles.matchTeamTag}>{m.team_b.tag}</span>
                          <span className={styles.matchTeamName}>{m.team_b.name}</span>
                          {isLive && (
                            <span className={styles.matchScore}>{m.score_b}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={
                          isLive
                            ? `btn redBTN ${styles.matchCta}`
                            : `${styles.matchCta} ${styles.matchCtaOutline}`
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tournaments/view-tournament?id=${m.tournament_id}`);
                        }}
                      >
                        {isLive ? (
                          <>
                            <BsBroadcast /> Watch live
                          </>
                        ) : (
                          <>
                            <LuEye /> Match details
                          </>
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ═════════════ 4. UPCOMING TOURNAMENTS ═════════════ */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Upcoming Tournaments</h2>
              <Link href="/tournaments" className={styles.sectionLink}>
                View all <FiArrowUpRight />
              </Link>
            </div>

            {loading ? (
              <div className={styles.cardGrid}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.gridCard} ${styles.skeletonCard}`}
                    aria-hidden
                  />
                ))}
              </div>
            ) : tournamentsUpcoming.length === 0 ? (
              <p className={styles.emptyState}>No upcoming tournaments. Check back soon.</p>
            ) : (
              <div className={styles.cardGrid}>
                {tournamentsUpcoming.map((t, i) => (
                  <article key={t.id} className={styles.gridCard}>
                    <div
                      className={styles.gridBanner}
                      style={t.banner ? { backgroundImage: `url(${t.banner})` } : undefined}
                    >
                      <span className={styles.gameChip}>{t.game}</span>
                    </div>
                    <div className={styles.gridBody}>
                      <h3 className={styles.gridTitle}>{t.name}</h3>
                      <p className={styles.gridMeta}>
                        <LuCalendar className={styles.metaIcon} />
                        {formatDate(t.start_date)}
                      </p>
                      <p className={styles.gridPrize}>
                        <LuTrophy className={styles.metaIcon} />
                        {t.prize_pool.toLocaleString()} VC prize
                      </p>
                      <button
                        type="button"
                        className={`btn goldBTN ${styles.gridCta}`}
                        onClick={() =>
                          router.push(`/tournaments/view-tournament?id=${t.id}`)
                        }
                      >
                        View tournament
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ═════════════ 5. UPCOMING EVENTS ═════════════ */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Upcoming Events</h2>
              <Link href="/events" className={styles.sectionLink}>
                View all <FiArrowUpRight />
              </Link>
            </div>

            {loading ? (
              <div className={styles.cardGrid}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.gridCard} ${styles.skeletonCard}`}
                    aria-hidden
                  />
                ))}
              </div>
            ) : eventsUpcoming.length === 0 ? (
              <p className={styles.emptyState}>No upcoming events yet.</p>
            ) : (
              <div className={styles.cardGrid}>
                {eventsUpcoming.map((e, i) => (
                  <article key={e.id} className={styles.gridCard}>
                    <div
                      className={styles.gridBanner}
                      style={e.banner ? { backgroundImage: `url(${e.banner})` } : undefined}
                    >
                      <span className={styles.gameChip}>
                        {e.event_type
                          ? e.event_type.charAt(0).toUpperCase() + e.event_type.slice(1)
                          : 'Event'}
                      </span>
                    </div>
                    <div className={styles.gridBody}>
                      <h3 className={styles.gridTitle}>{e.name}</h3>
                      <p className={styles.gridMeta}>
                        <LuMapPin className={styles.metaIcon} />
                        {e.location}
                      </p>
                      <p className={styles.gridPrize}>
                        <LuCalendar className={styles.metaIcon} />
                        {formatDate(e.start_date)}
                      </p>
                      <button
                        type="button"
                        className={`btn redBTN ${styles.gridCta}`}
                        onClick={() => router.push(`/events/view-event?id=${e.id}`)}
                      >
                        View event
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ═════════════ 6. MY TEAMS ═════════════ */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>My Teams</h2>
              <Link href="/teams" className={styles.sectionLink}>
                View all <FiArrowUpRight />
              </Link>
            </div>

            {loading ? (
              <div className={styles.teamsRow}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.teamAvatarCard} ${styles.skeletonCard}`}
                    aria-hidden
                  />
                ))}
              </div>
            ) : (
              <div className={styles.teamsRow}>
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/team-profile?id=${team.id}`}
                    className={styles.teamAvatarCard}
                  >
                    <div className={styles.teamAvatar}>
                      <span className={styles.teamInitial}>
                        {team.tag?.charAt(0) || team.name.charAt(0)}
                      </span>
                    </div>
                    <p className={styles.teamCardName}>{team.name}</p>
                    <p className={styles.teamCardMeta}>
                      <LuUsers className={styles.metaIcon} /> {team.member_count}
                    </p>
                  </Link>
                ))}
                <Link href="/teams" className={`${styles.teamAvatarCard} ${styles.teamAvatarEmpty}`}>
                  <div className={styles.teamEmptyIcon}>
                    <LuPlus />
                  </div>
                  <p className={styles.teamCardName}>Add team</p>
                </Link>
              </div>
            )}
          </section>

          {/* ═════════════ 7 + 8. WALLET SNAPSHOT + ACTIVITY FEED ═════════════ */}
          <section className={styles.dualColumn}>
            {/* ── 7. Wallet Snapshot ── */}
            <div className={`${styles.dualCard} ${styles.walletSnapshot}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Wallet</h2>
                <Link href="/wallets" className={styles.sectionLink}>
                  Open wallet <FiArrowUpRight />
                </Link>
              </div>

              {loading ? (
                <div className={`${styles.skeletonBlock} ${styles.skeletonCard}`} />
              ) : (
                <>
                  <p className={styles.walletLabel}>Available Balance</p>
                  <p className={styles.walletBalance}>
                    {wallet.balance_vc.toLocaleString()}
                    <span className={styles.walletUnit}> VC</span>
                  </p>
                  <p className={styles.walletRate}>
                    ≈ ₦{ngnFormatter.format(wallet.balance_ngn)} · ₦1,000 = 1 VC
                  </p>

                  <div className={styles.walletActions}>
                    <Link
                      href="/wallets"
                      className={`btn goldBTN ${styles.walletPrimaryBtn}`}
                    >
                      <LuPlus className={styles.heroBtnIcon} /> Top Up
                    </Link>
                    <Link href="/wallets" className={styles.walletSecondaryBtn}>
                      <FiArrowDownLeft className={styles.heroBtnIcon} /> Withdraw
                    </Link>
                  </div>

                  <div className={styles.txList}>
                    <p className={styles.txListHeading}>Recent transactions</p>
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className={styles.txRow}
                        onClick={() => router.push('/wallets')}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push('/wallets');
                        }}
                      >
                        <div className={styles.txLeft}>
                          <span
                            className={`${styles.txTypeBadge} ${
                              isCreditTx(tx) ? styles.txTypeCredit : styles.txTypeDebit
                            }`}
                          >
                            {txTypeLabel(tx.type)}
                          </span>
                          <div className={styles.txDescBlock}>
                            <p className={styles.txDesc}>{tx.description}</p>
                            <p className={styles.txDate}>{formatDate(tx.created_at)}</p>
                          </div>
                        </div>
                        <p
                          className={
                            isCreditTx(tx) ? styles.txAmountCredit : styles.txAmountDebit
                          }
                        >
                          {isCreditTx(tx) ? '+' : '-'}
                          {Math.abs(tx.amount).toLocaleString()} VC
                        </p>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className={styles.emptyState}>No transactions yet.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── 8. Activity Feed ── */}
            {/* TODO(M2): real activity endpoint - demo data in mock mode only. */}
            <div className={`${styles.dualCard} ${styles.activityCard}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent Activity</h2>
                <span className={styles.activityCount}>
                  {activityFeed.length} updates
                </span>
              </div>

              {loading ? (
                <div className={`${styles.skeletonBlock} ${styles.skeletonCard}`} />
              ) : activityFeed.length === 0 ? (
                <p className={styles.emptyState}>
                  No activity yet. Join a tournament to get started.
                </p>
              ) : (
                <ul className={styles.activityList}>
                  {activityFeed.map((a) => (
                    <li
                      key={a.id}
                      className={styles.activityItem}
                      onClick={() => {
                        const dest = a.target_url || '/user-profile';
                        router.push(dest);
                      }}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          router.push(a.target_url || '/user-profile');
                        }
                      }}
                    >
                      <div
                        className={`${styles.activityIcon} ${
                          a.kind === 'match_live' ? styles.activityIconLive : ''
                        }`}
                      >
                        {activityIconFor(a.kind, a.type)}
                      </div>
                      <div className={styles.activityBody}>
                        <p className={styles.activityTitle}>{a.title}</p>
                        {a.message && (
                          <p className={styles.activityMessage}>{a.message}</p>
                        )}
                        <p className={styles.activityMeta}>{formatRelative(a.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ═════════════ 9. RECOMMENDATIONS ═════════════ */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <FiZap className={styles.titleIcon} /> Tournaments for you
              </h2>
              <Link href="/tournaments" className={styles.sectionLink}>
                Browse more <FiArrowUpRight />
              </Link>
            </div>

            {loading ? (
              <div className={styles.recoGrid}>
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.recoCard} ${styles.skeletonCard}`}
                    aria-hidden
                  />
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <p className={styles.emptyState}>
                No recommendations yet - check back once more tournaments open.
              </p>
            ) : (
              <div className={styles.recoGrid}>
                {recommendations.map((t, i) => (
                  <article key={t.id} className={styles.recoCard}>
                    <div
                      className={styles.recoBanner}
                      style={t.banner ? { backgroundImage: `url(${t.banner})` } : undefined}
                    >
                      <span className={styles.recoMatchPill}>
                        <FiZap /> Starting soon
                      </span>
                    </div>
                    <div className={styles.recoBody}>
                      <div className={styles.recoBodyTop}>
                        <h3 className={styles.recoTitle}>{t.name}</h3>
                        <span className={styles.gameChip}>{t.game}</span>
                      </div>
                      <div className={styles.recoMetaRow}>
                        <p className={styles.gridMeta}>
                          <LuCalendar className={styles.metaIcon} />
                          {formatDate(t.start_date)}
                        </p>
                        <p className={styles.gridPrize}>
                          <LuTrophy className={styles.metaIcon} />
                          {t.prize_pool.toLocaleString()} VC
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`btn goldBTN ${styles.recoCta}`}
                        onClick={() =>
                          router.push(`/tournaments/view-tournament?id=${t.id}`)
                        }
                      >
                        Register now
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default HomePage;
