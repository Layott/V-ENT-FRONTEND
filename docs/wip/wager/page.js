'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaDice, FaFire, FaTrophy, FaUsers } from 'react-icons/fa';
import { MdOutlineClose, MdInfoOutline, MdAdd } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';
import { LuChevronRight } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './wager.module.css';

const TABS = [
  { id: 'pools', label: 'Pools' },
  { id: 'markets', label: 'Markets' },
  { id: 'mybets', label: 'My Bets' },
  { id: 'history', label: 'History' },
  { id: 'leaderboard', label: 'Leaderboard' },
];

// ── Utilities ──────────────────────────────────────────────────────────────

const fmtNumber = (n) => Number(n || 0).toLocaleString();

const fmtCountdown = (deadline, nowMs) => {
  if (!deadline) return '—';
  const ms = new Date(deadline).getTime() - nowMs;
  if (ms <= 0) return 'Closed';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const gameInitial = (g) => (g || '?').charAt(0).toUpperCase();

// ── Disclaimer modal ───────────────────────────────────────────────────────

const DisclaimerModal = ({ onAccept, onDismiss }) => (
  <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
    <div className={styles.modal}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>
          <MdInfoOutline className={styles.disclaimerIcon} /> Wager Beta — Read First
        </h3>
        <button className={styles.modalClose} onClick={onDismiss} aria-label="Close">
          <MdOutlineClose />
        </button>
      </div>
      <div className={styles.modalBody}>
        <p className={styles.modalText}>
          The V-ENT Wager system is in <strong>BETA</strong> and currently a UI preview only.
          No live betting is processed. Real wagering is pending legal review and applicable
          local regulation.
        </p>
        <ul className={styles.modalList}>
          <li>You must be 18 years or older to use this feature.</li>
          <li>All stakes are simulated in VENT COINS — no real money is at risk in beta.</li>
          <li>Bet responsibly. Set personal limits before staking.</li>
          <li>Outcomes are demonstrative and do not reflect real match results.</li>
        </ul>
        <p className={styles.modalText}>
          By continuing, you acknowledge this is a preview build and accept the simulated
          environment for evaluation purposes.
        </p>
      </div>
      <div className={styles.modalFooter}>
        <button className={`${styles.outlineBtn}`} onClick={onDismiss}>Cancel</button>
        <button className={`${styles.primaryBtn} goldBTN`} onClick={onAccept}>I Understand — Continue</button>
      </div>
    </div>
  </div>
);

// ── Disclaimer banner ──────────────────────────────────────────────────────

const DisclaimerBanner = () => (
  <div className={styles.disclaimerBanner}>
    <div className={styles.disclaimerLeft}>
      <MdInfoOutline className={styles.disclaimerIcon} />
      <div>
        <p className={styles.disclaimerTitle}>
          Wager Beta — Legal review pending. UI only. No live betting.
        </p>
        <p className={styles.disclaimerSub}>
          You must be 18+ to wager. All stakes shown are simulated VENT COINS for demonstration.
        </p>
      </div>
    </div>
  </div>
);

// ── Hub content ────────────────────────────────────────────────────────────

const WagerHubContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'pools';
  const [activeTab, setActiveTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'pools');

  const [pools, setPools] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  const [nowMs, setNowMs] = useState(Date.now());
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const [poolFilter, setPoolFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [poolsRes, marketsRes, betsRes, histRes, lbRes, balRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/pools/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bet/list/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/my-bets/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/history/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/leaderboard/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`),
      ]);
      const [pD, mD, bD, hD, lD, balD] = await Promise.all([
        poolsRes.json(), marketsRes.json(), betsRes.json(), histRes.json(), lbRes.json(), balRes.json(),
      ]);
      if (pD.status === 'success') setPools(pD.data.pools || []);
      if (mD.status === 'success') setMarkets(mD.data.markets || []);
      if (bD.status === 'success') setMyBets(bD.data.bets || []);
      if (hD.status === 'success') setHistory(hD.data.bets || []);
      if (lD.status === 'success') setLeaderboard(lD.data.leaderboard || []);
      if (balD.status === 'success') setBalance(balD.data.balance);
    } catch (err) {
      console.error('Wager fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Tick countdowns every second
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync tab to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab === 'pools') params.delete('tab');
    else params.set('tab', activeTab);
    const qs = params.toString();
    router.replace(`/wager${qs ? `?${qs}` : ''}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredPools = useMemo(() => {
    if (poolFilter === 'all') return pools;
    return pools.filter((p) => p.status === poolFilter);
  }, [pools, poolFilter]);

  const filteredMarkets = useMemo(() => {
    if (marketFilter === 'all') return markets;
    return markets.filter((m) => m.market_type === marketFilter);
  }, [markets, marketFilter]);

  // ── Handle Stake CTA: show disclaimer first time ──
  const handlePoolCTA = (poolId) => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('vent_wager_disclaimer_v1');
    if (!seen) {
      sessionStorage.setItem('vent_wager_pending_route', `/wager/pool?id=${poolId}`);
      setShowDisclaimer(true);
      return;
    }
    router.push(`/wager/pool?id=${poolId}`);
  };

  const handleMarketClick = (marketId) => {
    const market = markets.find((m) => m.id === marketId);
    if (!market) return;
    const seen = typeof window !== 'undefined' && localStorage.getItem('vent_wager_disclaimer_v1');
    const target = `/wager/match?id=${market.match.id}`;
    if (!seen) {
      sessionStorage.setItem('vent_wager_pending_route', target);
      setShowDisclaimer(true);
      return;
    }
    router.push(target);
  };

  const acceptDisclaimer = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vent_wager_disclaimer_v1', '1');
    }
    setShowDisclaimer(false);
    const pending = typeof window !== 'undefined' && sessionStorage.getItem('vent_wager_pending_route');
    if (pending) {
      sessionStorage.removeItem('vent_wager_pending_route');
      router.push(pending);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <DisclaimerBanner />

          {/* Header row */}
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.pageTitle}>
                <FaDice className={styles.titleIcon} /> Wager
                <span className={styles.betaChip}>BETA</span>
              </h2>
              <p className={styles.pageSub}>
                Stake on matches across V-ENT. Pay out in VENT COINS.
              </p>
            </div>
            <div className={styles.headerActions}>
              <div className={styles.balancePill}>
                <span className={styles.balancePillLabel}>Balance</span>
                <span className={styles.balancePillAmount}>
                  {balance !== null ? fmtNumber(balance) : '—'} VC
                </span>
              </div>
              <Link href="/wager/create" className={`${styles.createBtn} goldBTN`}>
                <MdAdd /> <span>Create Wager</span>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabRow}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {t.id === 'mybets' && myBets.length > 0 && (
                  <span className={styles.tabPill}>{myBets.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Filter row, only for pools and markets */}
          {(activeTab === 'pools' || activeTab === 'markets') && (
            <div className={styles.filterRow}>
              {activeTab === 'pools' && (
                <>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'live', label: 'Live' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'settled', label: 'Settled' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setPoolFilter(f.id)}
                      className={`${styles.chip} ${poolFilter === f.id ? styles.chipActive : ''}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </>
              )}
              {activeTab === 'markets' && (
                <>
                  {[
                    { id: 'all', label: 'All Markets' },
                    { id: 'winner', label: 'Winner' },
                    { id: 'over_under', label: 'Over/Under' },
                    { id: 'first_blood', label: 'First Blood' },
                    { id: 'handicap', label: 'Handicap' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setMarketFilter(f.id)}
                      className={`${styles.chip} ${marketFilter === f.id ? styles.chipActive : ''}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className={styles.contentArea}>
            {loading && <p className={styles.stateText}>Loading…</p>}

            {!loading && activeTab === 'pools' && (
              <PoolsGrid pools={filteredPools} nowMs={nowMs} onStake={handlePoolCTA} />
            )}

            {!loading && activeTab === 'markets' && (
              <MarketsList markets={filteredMarkets} nowMs={nowMs} onClick={handleMarketClick} />
            )}

            {!loading && activeTab === 'mybets' && (
              <MyBetsTable bets={myBets} />
            )}

            {!loading && activeTab === 'history' && (
              <HistoryTable bets={history} />
            )}

            {!loading && activeTab === 'leaderboard' && (
              <LeaderboardTable rows={leaderboard} />
            )}
          </div>
        </div>
      </main>

      <BottomMenu />

      {showDisclaimer && (
        <DisclaimerModal
          onAccept={acceptDisclaimer}
          onDismiss={() => {
            setShowDisclaimer(false);
            sessionStorage.removeItem('vent_wager_pending_route');
          }}
        />
      )}
    </div>
  );
};

// ── Pools grid ─────────────────────────────────────────────────────────────

const PoolsGrid = ({ pools, nowMs, onStake }) => {
  if (!pools.length) {
    return <p className={styles.stateText}>No wager pools match this filter.</p>;
  }
  return (
    <div className={styles.poolsGrid}>
      {pools.map((p) => {
        const a = p.match.team_a;
        const b = p.match.team_b;
        const closed = p.status === 'settled' || new Date(p.deadline).getTime() <= nowMs;
        return (
          <article key={p.id} className={styles.poolCard}>
            <div className={styles.poolCardTop}>
              <span className={styles.gameTag}>
                <span className={styles.gameThumb}>{gameInitial(p.match.game)}</span>
                {p.match.game}
              </span>
              <span className={`${styles.statusPill} ${styles[`status_${p.status}`]}`}>
                {p.status === 'live' ? 'Live' : p.status === 'settled' ? 'Settled' : 'Upcoming'}
              </span>
            </div>

            <div className={styles.poolMatch}>
              <div className={styles.teamSide}>
                <div className={styles.teamLogoWrap}>{(a.tag || a.name || '?').charAt(0)}</div>
                <p className={styles.teamLabel}>{a.tag}</p>
                <p className={styles.teamName}>{a.name}</p>
              </div>
              <span className={styles.vsLabel}>vs</span>
              <div className={styles.teamSide}>
                <div className={styles.teamLogoWrap}>{(b.tag || b.name || '?').charAt(0)}</div>
                <p className={styles.teamLabel}>{b.tag}</p>
                <p className={styles.teamName}>{b.name}</p>
              </div>
            </div>

            <div className={styles.poolStats}>
              <div className={styles.poolStat}>
                <p className={styles.poolStatLabel}>Total Staked</p>
                <p className={styles.poolStatValue}>{fmtNumber(p.total_staked)} VC</p>
              </div>
              <div className={styles.poolStat}>
                <p className={styles.poolStatLabel}>Stakers</p>
                <p className={styles.poolStatValue}>
                  <FaUsers className={styles.poolStatIcon} /> {fmtNumber(p.stakers_count)}
                </p>
              </div>
              <div className={styles.poolStat}>
                <p className={styles.poolStatLabel}>Deadline</p>
                <p className={`${styles.poolStatValue} ${styles.poolCountdown}`}>
                  <IoTimeOutline className={styles.poolStatIcon} /> {fmtCountdown(p.deadline, nowMs)}
                </p>
              </div>
            </div>

            <button
              className={`${styles.poolCta} goldBTN`}
              onClick={() => onStake(p.id)}
              disabled={closed && p.status !== 'live'}
            >
              {p.status === 'settled' ? 'View Result' : 'Stake'}
              <LuChevronRight />
            </button>
          </article>
        );
      })}
    </div>
  );
};

// ── Markets list ───────────────────────────────────────────────────────────

const MarketsList = ({ markets, nowMs, onClick }) => {
  if (!markets.length) {
    return <p className={styles.stateText}>No bet markets match this filter.</p>;
  }
  return (
    <div className={styles.marketList}>
      {markets.map((m) => (
        <div key={m.id} className={styles.marketCard}>
          <div className={styles.marketHeader}>
            <div className={styles.marketHeaderLeft}>
              <span className={styles.marketGameTag}>{m.match.game}</span>
              <p className={styles.marketMatch}>{m.match.team_a.name} vs {m.match.team_b.name}</p>
              <p className={styles.marketSub}>
                {m.market_label} · Vol {fmtNumber(m.total_volume)} VC
              </p>
            </div>
            <div className={styles.marketHeaderRight}>
              <span className={styles.marketCountdown}>
                <IoTimeOutline /> {fmtCountdown(m.closes_at, nowMs)}
              </span>
            </div>
          </div>
          <div className={styles.marketOdds}>
            {m.selections.map((s) => (
              <button
                key={s.id}
                className={styles.oddsBtn}
                onClick={() => onClick(m.id)}
              >
                <span className={styles.oddsLabel}>{s.label}</span>
                <span className={styles.oddsValue}>{Number(s.odds).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── My Bets ────────────────────────────────────────────────────────────────

const statusLabel = {
  active: 'Live',
  pending: 'Pending',
  won: 'Won',
  lost: 'Lost',
  refunded: 'Refunded',
};

const MyBetsTable = ({ bets }) => {
  if (!bets.length) return <p className={styles.stateText}>No active bets yet.</p>;
  return (
    <div className={styles.tableWrap}>
      <div className={`${styles.tableHead} ${styles.myBetsGrid}`}>
        <div>Match</div>
        <div>Selection</div>
        <div>Stake</div>
        <div>Potential</div>
        <div>Status</div>
        <div className={styles.rightCol}>Settles</div>
      </div>
      {bets.map((b) => (
        <div key={b.id} className={`${styles.tableRow} ${styles.myBetsGrid}`}>
          <div>
            <p className={styles.cellStrong}>{b.match_label}</p>
            <p className={styles.cellSub}>{b.market_name}</p>
          </div>
          <div>
            <p className={styles.cellStrong}>{b.selection_label}</p>
            <p className={styles.cellSub}>@ {Number(b.odds).toFixed(2)}</p>
          </div>
          <div className={styles.cellStrong}>{fmtNumber(b.stake)} VC</div>
          <div className={styles.cellGreen}>{fmtNumber(b.potential_payout)} VC</div>
          <div>
            <span className={`${styles.statusBadge} ${styles.statusActive}`}>
              {statusLabel[b.status] || 'Pending'}
            </span>
          </div>
          <div className={`${styles.rightCol} ${styles.cellSub}`}>
            {fmtDate(b.settles_at)}
          </div>
        </div>
      ))}
      <div className={styles.tableMobileList}>
        {bets.map((b) => (
          <div key={`m-${b.id}`} className={styles.mobileBetCard}>
            <div className={styles.mobileBetHead}>
              <p className={styles.cellStrong}>{b.match_label}</p>
              <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                {statusLabel[b.status] || 'Pending'}
              </span>
            </div>
            <p className={styles.cellSub}>{b.market_name} · {b.selection_label} @ {Number(b.odds).toFixed(2)}</p>
            <div className={styles.mobileBetFooter}>
              <span>Stake: <strong>{fmtNumber(b.stake)} VC</strong></span>
              <span className={styles.cellGreen}>To win: {fmtNumber(b.potential_payout)} VC</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── History ────────────────────────────────────────────────────────────────

const HistoryTable = ({ bets }) => {
  if (!bets.length) return <p className={styles.stateText}>No settled bets yet.</p>;
  return (
    <div className={styles.tableWrap}>
      <div className={`${styles.tableHead} ${styles.historyGrid}`}>
        <div>Match</div>
        <div>Selection</div>
        <div>Stake</div>
        <div>Result</div>
        <div>Payout</div>
        <div className={styles.rightCol}>Settled</div>
      </div>
      {bets.map((b) => {
        const won = b.status === 'won';
        const refunded = b.status === 'refunded';
        return (
          <div key={b.id} className={`${styles.tableRow} ${styles.historyGrid}`}>
            <div>
              <p className={styles.cellStrong}>{b.match_label}</p>
              <p className={styles.cellSub}>{b.market_name}</p>
            </div>
            <div>
              <p className={styles.cellStrong}>{b.selection_label}</p>
              <p className={styles.cellSub}>@ {Number(b.odds).toFixed(2)}</p>
            </div>
            <div>{fmtNumber(b.stake)} VC</div>
            <div>
              <span className={`${styles.statusBadge} ${won ? styles.statusWon : refunded ? styles.statusRefunded : styles.statusLost}`}>
                {won ? 'Won' : refunded ? 'Refunded' : 'Lost'}
              </span>
            </div>
            <div className={won ? styles.cellGreen : refunded ? styles.cellSub : styles.cellRed}>
              {won
                ? `+${fmtNumber(b.potential_payout)}`
                : refunded
                  ? `±${fmtNumber(b.stake)}`
                  : `-${fmtNumber(b.stake)}`} VC
            </div>
            <div className={`${styles.rightCol} ${styles.cellSub}`}>
              {fmtDate(b.settled_at || b.placed_at)}
            </div>
          </div>
        );
      })}
      <div className={styles.tableMobileList}>
        {bets.map((b) => {
          const won = b.status === 'won';
          const refunded = b.status === 'refunded';
          return (
            <div key={`mh-${b.id}`} className={styles.mobileBetCard}>
              <div className={styles.mobileBetHead}>
                <p className={styles.cellStrong}>{b.match_label}</p>
                <span className={`${styles.statusBadge} ${won ? styles.statusWon : refunded ? styles.statusRefunded : styles.statusLost}`}>
                  {won ? 'Won' : refunded ? 'Refunded' : 'Lost'}
                </span>
              </div>
              <p className={styles.cellSub}>{b.market_name} · {b.selection_label} @ {Number(b.odds).toFixed(2)}</p>
              <div className={styles.mobileBetFooter}>
                <span>Stake: <strong>{fmtNumber(b.stake)} VC</strong></span>
                <span className={won ? styles.cellGreen : refunded ? styles.cellSub : styles.cellRed}>
                  {won ? `+${fmtNumber(b.potential_payout)}` : refunded ? '±0' : `-${fmtNumber(b.stake)}`} VC
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Leaderboard ────────────────────────────────────────────────────────────

const LeaderboardTable = ({ rows }) => {
  if (!rows.length) return <p className={styles.stateText}>No leaderboard data yet.</p>;
  return (
    <div className={styles.tableWrap}>
      <div className={`${styles.tableHead} ${styles.leaderGrid}`}>
        <div>Rank</div>
        <div>Player</div>
        <div>Bets</div>
        <div>Win Rate</div>
        <div className={styles.rightCol}>Winnings</div>
      </div>
      {rows.map((u) => (
        <div key={u.rank} className={`${styles.tableRow} ${styles.leaderGrid}`}>
          <div>
            <span className={`${styles.rankBadge} ${u.rank <= 3 ? styles.rankTop : ''}`}>
              {u.rank <= 3 ? <FaTrophy /> : u.rank}
            </span>
          </div>
          <div className={styles.cellStrong}>@{u.username}</div>
          <div>{u.bets_won}/{u.bets_placed}</div>
          <div>{u.win_rate}%</div>
          <div className={`${styles.rightCol} ${styles.cellGreen}`}>
            {fmtNumber(u.winnings_vc)} VC
          </div>
        </div>
      ))}
    </div>
  );
};

const WagerHub = () => (
  <Suspense fallback={
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#131316' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>Loading…</p>
    </div>
  }>
    <WagerHubContent />
  </Suspense>
);

export default WagerHub;
