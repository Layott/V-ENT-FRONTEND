'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ImStatsDots } from "react-icons/im";
import profileStyles from "@/styles/profile/profile-page.module.css";
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';

/**
 * Player stats card.
 *
 * These four numbers used to be hardcoded (#0 / 0 / 0 / 0) and never moved.
 * They now come from the rankings endpoint, which derives rank, matches played,
 * wins and losses from completed bracket matches.
 */
const UserProfileStats = ({
  username
}) => {
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  // A failed load used to render "Unranked" and three zeros, which are
  // numbers, and wrong ones. Now every cell reads "-" and the panel says why.
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        const headers = session?.user?.sessionToken ? {
          Authorization: `Bearer ${session.user.sessionToken}`
        } : {};
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ranking/`, {
          headers,
          signal: controller.signal
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.status !== 'success') {
          throw Object.assign(new Error('load failed'), { code: body?.code, status: res.status });
        }
        const players = body?.data?.players || [];
        const target = username ? players.find(p => p.username === username || p.name === username) : players.find(p => p.is_session_user);
        if (!cancelled) setStats(target || null);
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') {
          setStats(null);
          setLoadError(apiMessage(tt, err, 'stats.loadFailed', 'The stats could not be loaded.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // `tt` is read for the error sentence only; naming it would refetch on
    // most renders. `attempt` is the Try again press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.sessionToken, username, attempt]);
  const played = stats ? (stats.wins || 0) + (stats.losses || 0) : 0;
  const show = v => (loading || loadError ? '-' : v);
  return <div className={`${profileStyles.statsContainer} ${profileStyles.middleLayerColor}`}>

      <h4 className={profileStyles.profileH4Header}>
        <ImStatsDots className={profileStyles.profileH4Icons} />{tt("ui.stats.be76", "Stats")}
      </h4>

      {loadError && (
        <p className={profileStyles.statsProblem} role="alert">
          {loadError}
          {' '}
          <button type="button" className={profileStyles.statsRetry}
                  onClick={() => setAttempt(n => n + 1)}>
            {tt('common.tryAgain', 'Try again')}
          </button>
        </p>
      )}

      <div className={profileStyles.statsDetailsContainer}>

        <div className={`${profileStyles.globalRanking} ${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
          <div className={profileStyles.rankingViewTable}>
            <h5 className={profileStyles.profileH5Header}>{tt("ui.ranking.3937", "Ranking")}</h5>
            <Link href="/rankings" className={profileStyles.viewTable}>{tt("ui.view.table.fed8", "View Table")}</Link>
          </div>
          <p className={profileStyles.profileDetailValue}>
            {loading || loadError ? '-' : stats?.rank ? `#${stats.rank}` : tt('stats.unranked', 'Unranked')}
          </p>
        </div>

        <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
          <h5 className={profileStyles.profileH5Header}>{tt("ui.matches.played.6e75", "Matches played")}</h5>
          <p className={profileStyles.profileDetailValue}>{show(played)}</p>
        </div>

        <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
          <h5 className={profileStyles.profileH5Header}>{tt("ui.wins.b6c0", "Wins")}</h5>
          <p className={profileStyles.profileDetailValue}>{show(stats?.wins ?? 0)}</p>
        </div>

        <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
          <h5 className={profileStyles.profileH5Header}>{tt("ui.losses.0f9a", "Losses")}</h5>
          <p className={profileStyles.profileDetailValue}>{show(stats?.losses ?? 0)}</p>
        </div>

      </div>

    </div>;
};
export default UserProfileStats;