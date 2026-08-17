'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaDice, FaUsers, FaCheck } from 'react-icons/fa';
import { MdInfoOutline, MdOutlineClose } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';
import { LuArrowLeft } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './pool-detail.module.css';

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
          <li>All stakes are simulated in VENT COINS — no real money is at risk in beta.</li>
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

const PoolDetailContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [pool, setPool] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());

  const [selectedOption, setSelectedOption] = useState(null);
  const [stake, setStake] = useState('');
  const [step, setStep] = useState('form'); // form | review | submitting | success
  const [error, setError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Initial check for disclaimer + fetch
  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('vent_wager_disclaimer_v1');
    if (!seen) setShowDisclaimer(true);
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [poolRes, balRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/pools/${id}/`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`),
        ]);
        const [pD, balD] = await Promise.all([poolRes.json(), balRes.json()]);
        if (pD.status === 'success') setPool(pD.data.pool);
        if (balD.status === 'success') setBalance(balD.data.balance);
      } catch (err) {
        console.error('Pool fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const acceptDisclaimer = () => {
    if (typeof window !== 'undefined') localStorage.setItem('vent_wager_disclaimer_v1', '1');
    setShowDisclaimer(false);
  };

  const isClosed = pool && (pool.status === 'settled' || new Date(pool.deadline).getTime() <= nowMs);

  const selectedOpt = useMemo(
    () => pool?.outcome_options.find((o) => o.id === selectedOption) || null,
    [pool, selectedOption]
  );

  const stakeNum = Number(stake) || 0;
  const potential = useMemo(() => {
    if (!selectedOpt) return 0;
    return Math.round(stakeNum * Number(selectedOpt.current_odds));
  }, [stakeNum, selectedOpt]);

  const handleReview = () => {
    setError('');
    if (!selectedOption) { setError('Pick an outcome first.'); return; }
    if (!stakeNum || stakeNum < 50) { setError('Minimum stake is 50 VC.'); return; }
    if (balance !== null && stakeNum > balance) { setError('Insufficient balance.'); return; }
    setStep('review');
  };

  const handleStake = async () => {
    setStep('submitting');
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wager/${id}/stake/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: selectedOption, amount: stakeNum }),
      });
      const data = await res.json();
      // Simulate "Pending" → "Active" 1.2s
      await new Promise((r) => setTimeout(r, 1200));
      if (data.status === 'success') {
        if (data.data.pool) setPool(data.data.pool);
        if (balance !== null) setBalance(Math.max(balance - stakeNum, 0));
        setStep('success');
      } else {
        setError(data.message || 'Failed to stake.');
        setStep('review');
      }
    } catch {
      setError('Network error. Please try again.');
      setStep('review');
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}><Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Loading pool…</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}><Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Pool not found.</p>
            <Link href="/wager" className={styles.outlineBtn} style={{ marginTop: '1rem' }}>Back to Wager</Link>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const a = pool.match.team_a;
  const b = pool.match.team_b;
  const totalStaked = pool.total_staked || 1;

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <DisclaimerBanner />

          <Link href="/wager" className={styles.backLink}>
            <LuArrowLeft /> Back to Wager
          </Link>

          {/* Match hero */}
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <span className={styles.gameTag}>{pool.match.game}</span>
              <span className={`${styles.statusPill} ${styles[`status_${pool.status}`]}`}>
                {pool.status === 'live' ? 'Live' : pool.status === 'settled' ? 'Settled' : 'Upcoming'}
              </span>
            </div>
            <div className={styles.heroMatch}>
              <div className={styles.teamSide}>
                <div className={styles.teamLogoWrap}>{(a.tag || a.name || '?').charAt(0)}</div>
                <p className={styles.teamLabel}>{a.tag}</p>
                <p className={styles.teamName}>{a.name}</p>
              </div>
              <div className={styles.heroCenter}>
                <span className={styles.vsLabel}>VS</span>
                <p className={styles.heroCountdown}>
                  <IoTimeOutline /> {fmtCountdown(pool.deadline, nowMs)}
                </p>
              </div>
              <div className={styles.teamSide}>
                <div className={styles.teamLogoWrap}>{(b.tag || b.name || '?').charAt(0)}</div>
                <p className={styles.teamLabel}>{b.tag}</p>
                <p className={styles.teamName}>{b.name}</p>
              </div>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <p className={styles.heroStatLabel}>Pool</p>
                <p className={styles.heroStatValue}>{fmtNumber(pool.total_staked)} VC</p>
              </div>
              <div className={styles.heroStat}>
                <p className={styles.heroStatLabel}>Stakers</p>
                <p className={styles.heroStatValue}><FaUsers /> {fmtNumber(pool.stakers_count)}</p>
              </div>
              <div className={styles.heroStat}>
                <p className={styles.heroStatLabel}>Fee</p>
                <p className={styles.heroStatValue}>{pool.platform_fee_pct}%</p>
              </div>
            </div>
          </div>

          {/* Two column: outcomes + stake form */}
          <div className={styles.twoCol}>
            {/* Outcomes */}
            <section className={styles.outcomesSection}>
              <h3 className={styles.sectionTitle}>Outcome Options</h3>
              <p className={styles.sectionSub}>Pick an outcome to stake on. Bars show the current pool distribution.</p>

              <div className={styles.outcomeList}>
                {pool.outcome_options.map((opt) => {
                  const pct = Math.round(((opt.stake_amount || 0) / totalStaked) * 100);
                  const isSettled = pool.settled_outcome === opt.id;
                  const selected = selectedOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className={`${styles.outcomeCard} ${selected ? styles.outcomeCardActive : ''}`}
                      onClick={() => !isClosed && setSelectedOption(opt.id)}
                      disabled={isClosed}
                    >
                      <div className={styles.outcomeRow}>
                        <div className={styles.outcomeMain}>
                          <p className={styles.outcomeLabel}>
                            {opt.label}
                            {isSettled && <span className={styles.winChip}>Won</span>}
                          </p>
                          <p className={styles.outcomeMeta}>
                            {fmtNumber(opt.stake_amount)} VC staked · {pct}%
                          </p>
                        </div>
                        <div className={styles.outcomeOdds}>{Number(opt.current_odds).toFixed(2)}</div>
                      </div>
                      <div className={styles.distBar}>
                        <div className={styles.distFill} style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Stake form / review / success */}
            <aside className={styles.stakePanel}>
              {step === 'success' ? (
                <div className={styles.successPane}>
                  <div className={styles.successIcon}><FaCheck /></div>
                  <h3 className={styles.successTitle}>Stake Confirmed</h3>
                  <p className={styles.successSub}>
                    Your simulated stake of <strong>{fmtNumber(stakeNum)} VC</strong> on
                    {' '}<strong>{selectedOpt?.label}</strong> has moved from Pending to Active.
                  </p>
                  <div className={styles.summaryGrid}>
                    <div><span>Stake</span><strong>{fmtNumber(stakeNum)} VC</strong></div>
                    <div><span>Odds</span><strong>{Number(selectedOpt?.current_odds || 0).toFixed(2)}</strong></div>
                    <div><span>Potential return</span><strong className={styles.cellGreen}>{fmtNumber(potential)} VC</strong></div>
                  </div>
                  <div className={styles.successActions}>
                    <Link href="/wager?tab=mybets" className={`${styles.primaryBtn} goldBTN`}>View My Bets</Link>
                    <button
                      className={styles.outlineBtn}
                      onClick={() => {
                        setStep('form');
                        setStake('');
                        setSelectedOption(null);
                      }}
                    >
                      Place Another
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className={styles.sectionTitle}>
                    <FaDice className={styles.titleIcon} /> Stake Form
                  </h3>

                  <div className={styles.balanceLine}>
                    <span>Balance</span>
                    <strong>{balance !== null ? fmtNumber(balance) : '—'} VC</strong>
                  </div>

                  <label className={styles.stakeFieldLabel}>Outcome</label>
                  <div className={styles.outcomeSelect}>
                    {pool.outcome_options.map((opt) => (
                      <button
                        key={`sel-${opt.id}`}
                        type="button"
                        className={`${styles.miniOutcome} ${selectedOption === opt.id ? styles.miniOutcomeActive : ''}`}
                        onClick={() => !isClosed && setSelectedOption(opt.id)}
                        disabled={isClosed}
                      >
                        <span className={styles.miniOutcomeLabel}>{opt.label}</span>
                        <span className={styles.miniOutcomeOdds}>{Number(opt.current_odds).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>

                  <label className={styles.stakeFieldLabel}>Amount (VC)</label>
                  <input
                    type="number"
                    className={styles.stakeInput}
                    placeholder="50"
                    min="50"
                    value={stake}
                    disabled={step === 'submitting' || isClosed}
                    onChange={(e) => setStake(e.target.value)}
                  />

                  <div className={styles.quickAmounts}>
                    {[100, 500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={styles.quickAmtBtn}
                        onClick={() => setStake(String(amt))}
                        disabled={step === 'submitting' || isClosed}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>

                  <div className={styles.summaryGrid}>
                    <div><span>Odds</span><strong>{selectedOpt ? Number(selectedOpt.current_odds).toFixed(2) : '—'}</strong></div>
                    <div><span>Potential return</span><strong className={styles.cellGreen}>{fmtNumber(potential)} VC</strong></div>
                  </div>

                  {error && <p className={styles.errorText}>{error}</p>}

                  {step === 'form' && (
                    <button
                      className={`${styles.primaryBtn} goldBTN ${styles.fullBtn}`}
                      onClick={handleReview}
                      disabled={isClosed}
                    >
                      Review Stake
                    </button>
                  )}

                  {step === 'review' && (
                    <div className={styles.reviewBox}>
                      <p className={styles.reviewLine}>
                        Stake <strong>{fmtNumber(stakeNum)} VC</strong> on
                        {' '}<strong>{selectedOpt?.label}</strong> at odds <strong>{Number(selectedOpt?.current_odds || 0).toFixed(2)}</strong>.
                      </p>
                      <p className={styles.reviewLine}>
                        Potential return: <strong className={styles.cellGreen}>{fmtNumber(potential)} VC</strong>
                      </p>
                      <div className={styles.reviewActions}>
                        <button
                          className={styles.outlineBtn}
                          onClick={() => setStep('form')}
                        >
                          Edit
                        </button>
                        <button
                          className={`${styles.primaryBtn} goldBTN`}
                          onClick={handleStake}
                        >
                          Stake VC
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 'submitting' && (
                    <div className={styles.pendingBox}>
                      <div className={styles.spinner} />
                      <p>Pending — securing your stake…</p>
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
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

const PoolDetail = () => (
  <Suspense fallback={
    <div style={{ minHeight: '100vh', background: '#131316' }} />
  }>
    <PoolDetailContent />
  </Suspense>
);

export default PoolDetail;
