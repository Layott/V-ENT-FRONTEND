'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { FaFire, FaCheck } from 'react-icons/fa';
import { MdInfoOutline, MdOutlineClose } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';
import { LuArrowLeft, LuChevronRight, LuChevronLeft } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './match.module.css';

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
          No live betting is processed.
        </p>
        <ul className={styles.modalList}>
          <li>You must be 18 years or older to use this feature.</li>
          <li>All stakes are simulated in VENT COINS.</li>
          <li>Bet responsibly. Set personal limits before staking.</li>
        </ul>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.outlineBtn} onClick={onDismiss}>Cancel</button>
        <button className={`${styles.primaryBtn} goldBTN`} onClick={onAccept}>I Understand — Continue</button>
      </div>
    </div>
  </div>
);

const MatchContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = searchParams.get('id');

  const [allMarkets, setAllMarkets] = useState([]);
  const [allPools, setAllPools] = useState([]);
  const [matches, setMatches] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());

  const [slip, setSlip] = useState([]); // [{marketId, marketName, selectionId, selectionLabel, odds, matchLabel}]
  const [stake, setStake] = useState('');
  const [placeStep, setPlaceStep] = useState('idle'); // idle | submitting | success
  const [placeError, setPlaceError] = useState('');
  const [slipCollapsed, setSlipCollapsed] = useState(false);
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Disclaimer
  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('vent_wager_disclaimer_v1');
    if (!seen) setShowDisclaimer(true);
  }, []);

  const acceptDisclaimer = () => {
    if (typeof window !== 'undefined') localStorage.setItem('vent_wager_disclaimer_v1', '1');
    setShowDisclaimer(false);
  };

  // Fetch all markets, pools, matches
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, pRes, mRes, balRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bet/list/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/pools/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/match/list/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`),
      ]);
      const [bD, pD, mD, balD] = await Promise.all([bRes.json(), pRes.json(), mRes.json(), balRes.json()]);
      if (bD.status === 'success') setAllMarkets(bD.data.markets || []);
      if (pD.status === 'success') setAllPools(pD.data.pools || []);
      if (mD.status === 'success') setMatches(mD.data.matches || []);
      if (balD.status === 'success') setBalance(balD.data.balance);
    } catch (err) {
      console.error('Match page fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // The match: try the matches list first (most accurate scheduled_at)
  // then fall back to the pool's match data.
  const matchInfo = useMemo(() => {
    const direct = matches.find((m) => m.id === matchId);
    if (direct) {
      return {
        id: direct.id,
        team_a: direct.team_a,
        team_b: direct.team_b,
        game: direct.game,
        tournament_name: direct.tournament_name,
        scheduled_at: direct.scheduled_at,
        status: direct.status,
      };
    }
    const fromPool = allPools.find((p) => p.match.id === matchId);
    if (fromPool) {
      return {
        id: fromPool.match.id,
        team_a: fromPool.match.team_a,
        team_b: fromPool.match.team_b,
        game: fromPool.match.game,
        tournament_name: 'V-ENT Tournament',
        scheduled_at: fromPool.match.time,
        status: fromPool.status,
      };
    }
    return null;
  }, [matches, allPools, matchId]);

  // Markets for this match
  const matchMarkets = useMemo(() => {
    if (!matchId) return [];
    return allMarkets.filter((m) => m.match.id === matchId);
  }, [allMarkets, matchId]);

  // Bet slip helpers
  const addToSlip = (market, selection) => {
    setSlip((prev) => {
      // Replace any leg from same market
      const filtered = prev.filter((s) => s.marketId !== market.id);
      return [...filtered, {
        marketId: market.id,
        marketName: market.market_label,
        matchLabel: `${market.match.team_a.name} vs ${market.match.team_b.name}`,
        selectionId: selection.id,
        selectionLabel: selection.label,
        odds: selection.odds,
      }];
    });
    setPlaceError('');
    if (placeStep === 'success') setPlaceStep('idle');
  };

  const removeFromSlip = (selectionId) => {
    setSlip((prev) => prev.filter((s) => s.selectionId !== selectionId));
  };

  const clearSlip = () => {
    setSlip([]);
    setStake('');
    setPlaceError('');
    setPlaceStep('idle');
  };

  const isSelected = (marketId, selectionId) =>
    slip.some((s) => s.marketId === marketId && s.selectionId === selectionId);

  const combinedOdds = useMemo(
    () => slip.reduce((acc, s) => acc * Number(s.odds || 1), 1),
    [slip]
  );

  const stakeNum = Number(stake) || 0;

  const potentialPayout = useMemo(
    () => Math.round(stakeNum * combinedOdds),
    [stakeNum, combinedOdds]
  );

  const placeBet = async () => {
    setPlaceError('');
    if (!slip.length) { setPlaceError('Add at least one selection.'); return; }
    if (!stakeNum || stakeNum < 50) { setPlaceError('Minimum stake is 50 VC.'); return; }
    if (balance !== null && stakeNum > balance) { setPlaceError('Insufficient balance.'); return; }

    setPlaceStep('submitting');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/place-bet/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections: slip, stake: stakeNum }),
      });
      const data = await res.json();
      // Simulated 1.2s pending → active
      await new Promise((r) => setTimeout(r, 1200));
      if (data.status === 'success') {
        if (data.data.new_balance !== undefined) setBalance(data.data.new_balance);
        else if (balance !== null) setBalance(Math.max(balance - stakeNum, 0));
        setPlaceStep('success');
      } else {
        setPlaceError(data.message || 'Failed to place bet.');
        setPlaceStep('idle');
      }
    } catch {
      setPlaceError('Network error. Please try again.');
      setPlaceStep('idle');
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}><Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Loading match…</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  if (!matchInfo) {
    return (
      <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}><Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Match not found.</p>
            <Link href="/wager" className={styles.outlineBtn} style={{ marginTop: '1rem', display: 'inline-flex' }}>
              Back to Wager
            </Link>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const a = matchInfo.team_a;
  const b = matchInfo.team_b;
  const earliestClose = matchMarkets.length
    ? matchMarkets.reduce((min, m) => {
        const t = new Date(m.closes_at).getTime();
        return t < min ? t : min;
      }, Infinity)
    : null;

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <DisclaimerBanner />

          <Link href="/wager?tab=markets" className={styles.backLink}>
            <LuArrowLeft /> All Markets
          </Link>

          {/* Match hero */}
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <span className={styles.gameTag}>{matchInfo.game}</span>
              <span className={styles.tourLabel}>{matchInfo.tournament_name}</span>
            </div>
            <div className={styles.heroMatch}>
              <div className={styles.teamSide}>
                <div className={styles.teamLogoWrap}>{(a.tag || a.name || '?').charAt(0)}</div>
                <p className={styles.teamLabel}>{a.tag}</p>
                <p className={styles.teamName}>{a.name}</p>
              </div>
              <div className={styles.heroCenter}>
                <span className={styles.vsLabel}>VS</span>
                {earliestClose && earliestClose !== Infinity && (
                  <p className={styles.heroCountdown}>
                    <IoTimeOutline /> Closes in {fmtCountdown(earliestClose, nowMs)}
                  </p>
                )}
              </div>
              <div className={styles.teamSide}>
                <div className={styles.teamLogoWrap}>{(b.tag || b.name || '?').charAt(0)}</div>
                <p className={styles.teamLabel}>{b.tag}</p>
                <p className={styles.teamName}>{b.name}</p>
              </div>
            </div>
          </div>

          {/* Two col: markets + slip */}
          <div className={`${styles.twoCol} ${slipCollapsed ? styles.slipHidden : ''}`}>
            <section className={styles.marketsSection}>
              <h3 className={styles.sectionTitle}>All Markets ({matchMarkets.length})</h3>

              {matchMarkets.length === 0 ? (
                <p className={styles.stateText}>No bet markets are open for this match yet.</p>
              ) : (
                <div className={styles.marketList}>
                  {matchMarkets.map((m) => (
                    <div key={m.id} className={styles.marketCard}>
                      <div className={styles.marketHeader}>
                        <div className={styles.marketHeaderLeft}>
                          <p className={styles.marketLabel}>{m.market_label}</p>
                          <p className={styles.marketSub}>
                            Vol {fmtNumber(m.total_volume)} VC · Type: {m.market_type}
                          </p>
                        </div>
                        <span className={styles.marketCountdown}>
                          <IoTimeOutline /> {fmtCountdown(m.closes_at, nowMs)}
                        </span>
                      </div>
                      <div className={styles.marketOdds}>
                        {m.selections.map((sel) => (
                          <button
                            key={sel.id}
                            className={`${styles.oddsBtn} ${isSelected(m.id, sel.id) ? styles.oddsBtnActive : ''}`}
                            onClick={() => addToSlip(m, sel)}
                          >
                            <span className={styles.oddsLabel}>{sel.label}</span>
                            <span className={styles.oddsValue}>{Number(sel.odds).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {!slipCollapsed && (
              <aside className={styles.slipRail}>
                <div className={styles.slipCard}>
                  <div className={styles.slipHeader}>
                    <h4 className={styles.slipTitle}>
                      <FaFire className={styles.slipTitleIcon} /> Bet Slip
                      {slip.length > 0 && <span className={styles.slipCount}>{slip.length}</span>}
                    </h4>
                    <div className={styles.slipHeaderActions}>
                      {slip.length > 0 && placeStep !== 'submitting' && (
                        <button className={styles.slipClearBtn} onClick={clearSlip}>Clear</button>
                      )}
                      <button
                        className={styles.slipCollapseBtn}
                        onClick={() => setSlipCollapsed(true)}
                        aria-label="Collapse slip"
                      >
                        <LuChevronRight />
                      </button>
                    </div>
                  </div>

                  {placeStep === 'success' ? (
                    <div className={styles.successPane}>
                      <div className={styles.successIcon}><FaCheck /></div>
                      <p className={styles.successTitle}>Bet Placed</p>
                      <p className={styles.successSub}>
                        Stake of <strong>{fmtNumber(stakeNum)} VC</strong> moved from Pending to Active.
                        Potential return <strong className={styles.cellGreen}>{fmtNumber(potentialPayout)} VC</strong>.
                      </p>
                      <Link href="/wager?tab=mybets" className={`${styles.primaryBtn} goldBTN ${styles.fullBtn}`}>
                        View My Bets
                      </Link>
                      <button
                        className={`${styles.outlineBtn} ${styles.fullBtn}`}
                        onClick={clearSlip}
                      >
                        Add More
                      </button>
                    </div>
                  ) : slip.length === 0 ? (
                    <p className={styles.slipEmpty}>Tap an odds button to add selections.</p>
                  ) : (
                    <>
                      <div className={styles.slipList}>
                        {slip.map((s) => (
                          <div key={s.selectionId} className={styles.slipItem}>
                            <div className={styles.slipItemBody}>
                              <p className={styles.slipMatch}>{s.matchLabel}</p>
                              <p className={styles.slipSel}>{s.selectionLabel}</p>
                              <p className={styles.slipMarket}>{s.marketName}</p>
                            </div>
                            <div className={styles.slipRight}>
                              <span className={styles.slipOdds}>{Number(s.odds).toFixed(2)}</span>
                              <button
                                className={styles.slipRemove}
                                onClick={() => removeFromSlip(s.selectionId)}
                                aria-label="Remove"
                                disabled={placeStep === 'submitting'}
                              >
                                <MdOutlineClose />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={styles.slipStakeRow}>
                        <label className={styles.slipLabel}>Stake (VC)</label>
                        <input
                          type="number"
                          className={styles.slipInput}
                          placeholder="0"
                          value={stake}
                          min="50"
                          disabled={placeStep === 'submitting'}
                          onChange={(e) => setStake(e.target.value)}
                        />
                      </div>

                      <div className={styles.slipQuick}>
                        {[100, 500, 1000, 5000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className={styles.quickAmtBtn}
                            disabled={placeStep === 'submitting'}
                            onClick={() => setStake(String(amt))}
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>

                      <div className={styles.slipSummary}>
                        <div className={styles.slipSumRow}>
                          <span>Selections</span>
                          <span className={styles.slipSumVal}>{slip.length}</span>
                        </div>
                        <div className={styles.slipSumRow}>
                          <span>Combined odds (parlay)</span>
                          <span className={styles.slipSumVal}>{combinedOdds.toFixed(2)}</span>
                        </div>
                        <div className={styles.slipSumRow}>
                          <span>Potential return</span>
                          <span className={`${styles.slipSumVal} ${styles.cellGreen}`}>
                            {fmtNumber(potentialPayout)} VC
                          </span>
                        </div>
                      </div>

                      {placeError && <p className={styles.errorText}>{placeError}</p>}

                      {placeStep === 'submitting' ? (
                        <div className={styles.pendingBox}>
                          <div className={styles.spinner} />
                          <p>Pending — securing your stake…</p>
                        </div>
                      ) : (
                        <button
                          className={`${styles.primaryBtn} goldBTN ${styles.fullBtn}`}
                          onClick={placeBet}
                        >
                          Place Bet
                        </button>
                      )}

                      <p className={styles.balanceLine}>
                        Balance: <strong>{balance !== null ? fmtNumber(balance) : '—'} VC</strong>
                      </p>
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>

          {slipCollapsed && (
            <button
              className={styles.slipExpandBtn}
              onClick={() => setSlipCollapsed(false)}
              aria-label="Expand slip"
            >
              <LuChevronLeft /> Slip ({slip.length})
            </button>
          )}

          {/* Mobile slip toggle */}
          {slip.length > 0 && (
            <button
              className={styles.mobileSlipToggle}
              onClick={() => setMobileSlipOpen(true)}
            >
              <FaFire /> {slip.length} selection{slip.length !== 1 ? 's' : ''} · Open slip
            </button>
          )}

          {mobileSlipOpen && (
            <div
              className={styles.mobileSlipOverlay}
              onClick={(e) => { if (e.target === e.currentTarget) setMobileSlipOpen(false); }}
            >
              <div className={styles.mobileSlipSheet}>
                <div className={styles.slipHeader}>
                  <h4 className={styles.slipTitle}>
                    <FaFire className={styles.slipTitleIcon} /> Bet Slip
                  </h4>
                  <button className={styles.slipRemove} onClick={() => setMobileSlipOpen(false)}>
                    <MdOutlineClose />
                  </button>
                </div>
                {placeStep === 'success' ? (
                  <div className={styles.successPane}>
                    <div className={styles.successIcon}><FaCheck /></div>
                    <p className={styles.successTitle}>Bet Placed</p>
                    <p className={styles.successSub}>
                      Stake of <strong>{fmtNumber(stakeNum)} VC</strong> moved from Pending to Active.
                    </p>
                    <Link href="/wager?tab=mybets" className={`${styles.primaryBtn} goldBTN ${styles.fullBtn}`}>
                      View My Bets
                    </Link>
                  </div>
                ) : slip.length === 0 ? (
                  <p className={styles.slipEmpty}>No selections.</p>
                ) : (
                  <>
                    <div className={styles.slipList}>
                      {slip.map((s) => (
                        <div key={s.selectionId} className={styles.slipItem}>
                          <div className={styles.slipItemBody}>
                            <p className={styles.slipMatch}>{s.matchLabel}</p>
                            <p className={styles.slipSel}>{s.selectionLabel}</p>
                            <p className={styles.slipMarket}>{s.marketName}</p>
                          </div>
                          <div className={styles.slipRight}>
                            <span className={styles.slipOdds}>{Number(s.odds).toFixed(2)}</span>
                            <button className={styles.slipRemove} onClick={() => removeFromSlip(s.selectionId)}>
                              <MdOutlineClose />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={styles.slipStakeRow}>
                      <label className={styles.slipLabel}>Stake (VC)</label>
                      <input
                        type="number"
                        className={styles.slipInput}
                        placeholder="0"
                        value={stake}
                        min="50"
                        onChange={(e) => setStake(e.target.value)}
                      />
                    </div>

                    <div className={styles.slipSummary}>
                      <div className={styles.slipSumRow}>
                        <span>Combined odds</span>
                        <span className={styles.slipSumVal}>{combinedOdds.toFixed(2)}</span>
                      </div>
                      <div className={styles.slipSumRow}>
                        <span>Potential return</span>
                        <span className={`${styles.slipSumVal} ${styles.cellGreen}`}>
                          {fmtNumber(potentialPayout)} VC
                        </span>
                      </div>
                    </div>

                    {placeError && <p className={styles.errorText}>{placeError}</p>}

                    {placeStep === 'submitting' ? (
                      <div className={styles.pendingBox}>
                        <div className={styles.spinner} />
                        <p>Pending — securing your stake…</p>
                      </div>
                    ) : (
                      <button
                        className={`${styles.primaryBtn} goldBTN ${styles.fullBtn}`}
                        onClick={placeBet}
                      >
                        Place Bet
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomMenu />

      {showDisclaimer && (
        <DisclaimerModal
          onAccept={acceptDisclaimer}
          onDismiss={() => router.push('/wager')}
        />
      )}
    </div>
  );
};

const MatchPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <MatchContent />
  </Suspense>
);

export default MatchPage;
