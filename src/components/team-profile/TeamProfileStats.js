'use client';

import { HiOutlineTrophy } from 'react-icons/hi2';
import { LuTarget, LuTrendingUp, LuCoins, LuMedal } from 'react-icons/lu';
import styles from './team-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TeamProfileStats = ({
  team
}) => {
  const tt = useT();
  const s = team.stats || {};
  const series = s.win_rate_by_month || [];
  const games = s.most_played_games || [];
  const maxRate = Math.max(0.6, ...series.map(p => p.win_rate || 0));
  const maxGames = Math.max(1, ...games.map(g => g.count || 0));

  // Build SVG sparkline path
  const w = 320;
  const h = 90;
  const padX = 8;
  const padY = 12;
  const points = series.map((pt, i) => {
    const x = padX + i * (w - padX * 2) / Math.max(1, series.length - 1);
    const y = padY + (1 - (pt.win_rate || 0) / maxRate) * (h - padY * 2);
    return [x, y];
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const fillD = points.length ? `${pathD} L ${points[points.length - 1][0]} ${h - padY} L ${points[0][0]} ${h - padY} Z` : '';
  return <div className={styles.statsContainer}>
      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiAccentGreen}`}>
          <div className={styles.kpiIcon}><LuTarget /></div>
          <div>
            <p className={styles.kpiValue}>{Math.round((s.win_rate || 0) * 100)}%</p>
            <p className={styles.kpiLabel}>{tt("ui.win.rate.79bc", "Win rate")}</p>
          </div>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiAccentRed}`}>
          <div className={styles.kpiIcon}><HiOutlineTrophy /></div>
          <div>
            <p className={styles.kpiValue}>{s.tournaments_won || 0}</p>
            <p className={styles.kpiLabel}>{tt("ui.tournament.wins.18af", "Tournament wins")}</p>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}><LuTrendingUp /></div>
          <div>
            <p className={styles.kpiValue}>{s.wins || 0} / {s.losses || 0}</p>
            <p className={styles.kpiLabel}>{tt("ui.w.l.record.6fd9", "W / L record")}</p>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}><LuCoins /></div>
          <div>
            <p className={styles.kpiValue}>{Number(s.total_prize_pool || 0).toLocaleString()} VC</p>
            <p className={styles.kpiLabel}>{tt("ui.total.prize.3804", "Total prize")}</p>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}><LuMedal /></div>
          <div>
            <p className={styles.kpiValue}>#{s.rank || '-'}</p>
            <p className={styles.kpiLabel}>{tt("ui.global.rank.f1ae", "Global rank")}</p>
          </div>
        </div>
      </div>

      <div className={styles.statsCharts}>
        {/* Win-rate sparkline */}
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt("ui.win.rate.over.time.c6e6", "Win-rate over time")}</h3>
          {series.length === 0 ? <p className={styles.stateText}>{tt("ui.no.history.yet.933f", "No history yet.")}</p> : <div className={styles.sparkline}>
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={styles.sparkSvg}>
                <defs>
                  <linearGradient id="winFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(212, 175, 55,0.45)" />
                    <stop offset="100%" stopColor="rgba(212, 175, 55,0)" />
                  </linearGradient>
                </defs>
                {fillD && <path d={fillD} fill="url(#winFill)" />}
                <path d={pathD} fill="none" stroke="var(--v-ent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="var(--v-ent-gold)" stroke="#131316" strokeWidth="1" />)}
              </svg>
              <div className={styles.sparkLabels}>
                {series.map((pt, i) => <span key={i} className={styles.sparkLabel}>{pt.month}</span>)}
              </div>
            </div>}
        </section>

        {/* Most-played games breakdown */}
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt("ui.most.played.games.9ef9", "Most-played games")}</h3>
          {games.length === 0 ? <p className={styles.stateText}>{tt("ui.no.data.yet.3b0b", "No data yet.")}</p> : <ul className={styles.gameBreakdown}>
              {games.map(g => <li key={g.game} className={styles.gameRow}>
                  <span className={styles.gameName}>{g.game}</span>
                  <div className={styles.gameBar}>
                    <div className={styles.gameBarFill} style={{
                width: `${g.count / maxGames * 100}%`
              }} />
                  </div>
                  <span className={styles.gameCount}>{g.count}</span>
                </li>)}
            </ul>}
        </section>
      </div>
    </div>;
};
export default TeamProfileStats;