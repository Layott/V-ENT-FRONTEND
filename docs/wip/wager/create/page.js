'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaCheck, FaUserFriends, FaUsers } from 'react-icons/fa';
import { MdInfoOutline, MdOutlineClose } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';
import { LuArrowLeft, LuSearch } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './create-wager.module.css';

const fmtNumber = (n) => Number(n || 0).toLocaleString();

const STEPS = [
  { id: 'match', label: 'Match' },
  { id: 'stake', label: 'Stake' },
  { id: 'opponent', label: 'Opponent' },
  { id: 'review', label: 'Review' },
];

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
          You are about to create a peer-to-peer wager. Wagers are in <strong>BETA</strong>
          {' '}and currently for UI demonstration only. No real funds are held.
        </p>
        <ul className={styles.modalList}>
          <li>You must be 18 years or older to use this feature.</li>
          <li>All stakes are simulated in VENT COINS.</li>
          <li>Wagers settle automatically when match results are posted.</li>
        </ul>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.outlineBtn} onClick={onDismiss}>Cancel</button>
        <button className={`${styles.primaryBtn} goldBTN`} onClick={onAccept}>I Understand — Continue</button>
      </div>
    </div>
  </div>
);

const CreateWagerContent = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [matches, setMatches] = useState([]);
  const [balance, setBalance] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const [matchSearch, setMatchSearch] = useState('');
  const [pickedMatchId, setPickedMatchId] = useState('');
  const [pickedOutcome, setPickedOutcome] = useState(''); // 'team_a' | 'team_b'
  const [stakeAmt, setStakeAmt] = useState('');
  const [opponentMode, setOpponentMode] = useState('open'); // 'open' | 'specific'
  const [opponentHandle, setOpponentHandle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('vent_wager_disclaimer_v1');
    if (!seen) setShowDisclaimer(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, balRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/match/list/?status=scheduled`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`),
        ]);
        const [mD, balD] = await Promise.all([mRes.json(), balRes.json()]);
        if (mD.status === 'success') setMatches(mD.data.matches || []);
        if (balD.status === 'success') setBalance(balD.data.balance);
      } catch (err) {
        console.error('Create wager fetch error:', err);
      }
    };
    load();
  }, []);

  const acceptDisclaimer = () => {
    if (typeof window !== 'undefined') localStorage.setItem('vent_wager_disclaimer_v1', '1');
    setShowDisclaimer(false);
  };

  const filteredMatches = useMemo(() => {
    const q = matchSearch.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const label = `${m.team_a.name} ${m.team_b.name} ${m.tournament_name} ${m.game}`.toLowerCase();
      return label.includes(q);
    });
  }, [matches, matchSearch]);

  const pickedMatch = matches.find((m) => m.id === pickedMatchId);

  const stakeNum = Number(stakeAmt) || 0;

  // Simple: opponent matches your stake at 1.0× (P2P even-money)
  const potentialReturn = stakeNum * 2; // win returns your stake + opponent's stake

  const canNext = () => {
    setError('');
    if (step === 0) {
      if (!pickedMatchId) { setError('Pick a match first.'); return false; }
      if (!pickedOutcome) { setError('Pick which side you back.'); return false; }
    }
    if (step === 1) {
      if (!stakeNum || stakeNum < 50) { setError('Minimum stake is 50 VC.'); return false; }
      if (balance !== null && stakeNum > balance) { setError('Insufficient balance.'); return false; }
    }
    if (step === 2) {
      if (opponentMode === 'specific' && !opponentHandle.trim()) {
        setError('Enter the opponent username.'); return false;
      }
    }
    return true;
  };

  const goNext = () => { if (canNext()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const publish = async () => {
    setError('');
    setSubmitting(true);
    try {
      // Reuse the pool-stake endpoint to keep the mock layer consistent.
      // Real impl will hit /wager/p2p/create/.
      await new Promise((r) => setTimeout(r, 1200));
      if (balance !== null) setBalance(Math.max(balance - stakeNum, 0));
      setPublished(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (published) {
    const teamPicked = pickedOutcome === 'team_a' ? pickedMatch?.team_a : pickedMatch?.team_b;
    return (
      <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}><Sidebar />
          <div className={styles.rightPaneContainer}>
            <DisclaimerBanner />
            <div className={styles.successCard}>
              <div className={styles.successIcon}><FaCheck /></div>
              <h3 className={styles.successTitle}>Wager Published</h3>
              <p className={styles.successSub}>
                Your peer-to-peer wager on <strong>{teamPicked?.name}</strong> for
                {' '}<strong>{fmtNumber(stakeNum)} VC</strong> is now {opponentMode === 'open' ? 'open for any taker' : `pending @${opponentHandle}'s acceptance`}.
              </p>
              <div className={styles.successSummary}>
                <div><span>Match</span><strong>{pickedMatch?.team_a.name} vs {pickedMatch?.team_b.name}</strong></div>
                <div><span>Backing</span><strong>{teamPicked?.name}</strong></div>
                <div><span>Stake</span><strong>{fmtNumber(stakeNum)} VC</strong></div>
                <div><span>Opponent</span><strong>{opponentMode === 'open' ? 'Open call' : `@${opponentHandle}`}</strong></div>
                <div><span>Win returns</span><strong className={styles.cellGreen}>{fmtNumber(potentialReturn)} VC</strong></div>
              </div>
              <div className={styles.successActions}>
                <Link href="/wager?tab=mybets" className={`${styles.primaryBtn} goldBTN`}>View My Bets</Link>
                <Link href="/wager" className={styles.outlineBtn}>Back to Wager</Link>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header /><MobileHeader />
      <main className={styles.mainContainer}><Sidebar />
        <div className={styles.rightPaneContainer}>
          <DisclaimerBanner />

          <Link href="/wager" className={styles.backLink}>
            <LuArrowLeft /> Back to Wager
          </Link>

          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.pageTitle}>
                <FaUserFriends className={styles.titleIcon} /> Create Peer-to-Peer Wager
              </h2>
              <p className={styles.pageSub}>
                Stake against another player on a scheduled match. Even-money payout.
              </p>
            </div>
            <div className={styles.balancePill}>
              <span className={styles.balancePillLabel}>Balance</span>
              <span className={styles.balancePillAmount}>
                {balance !== null ? fmtNumber(balance) : '—'} VC
              </span>
            </div>
          </div>

          {/* Stepper */}
          <div className={styles.stepper}>
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`${styles.stepItem} ${idx === step ? styles.stepActive : ''} ${idx < step ? styles.stepDone : ''}`}
              >
                <span className={styles.stepCircle}>{idx < step ? <FaCheck /> : idx + 1}</span>
                <span className={styles.stepLabel}>{s.label}</span>
                {idx < STEPS.length - 1 && <span className={styles.stepBar} />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className={styles.stepCard}>
            {step === 0 && (
              <>
                <h3 className={styles.stepTitle}>Pick a match</h3>
                <p className={styles.stepSub}>Only scheduled matches are eligible for new P2P wagers.</p>

                <div className={styles.searchBar}>
                  <LuSearch />
                  <input
                    type="text"
                    placeholder="Search team, tournament or game..."
                    value={matchSearch}
                    onChange={(e) => setMatchSearch(e.target.value)}
                  />
                </div>

                <div className={styles.matchList}>
                  {filteredMatches.length === 0 ? (
                    <p className={styles.stateText}>No scheduled matches match your search.</p>
                  ) : (
                    filteredMatches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`${styles.matchRow} ${pickedMatchId === m.id ? styles.matchRowActive : ''}`}
                        onClick={() => { setPickedMatchId(m.id); setPickedOutcome(''); }}
                      >
                        <div className={styles.matchRowMain}>
                          <span className={styles.gameTag}>{m.game}</span>
                          <p className={styles.matchTeams}>{m.team_a.name} vs {m.team_b.name}</p>
                          <p className={styles.matchTournament}>{m.tournament_name}</p>
                        </div>
                        <div className={styles.matchRowMeta}>
                          <span className={styles.matchTime}>
                            <IoTimeOutline /> {new Date(m.scheduled_at).toLocaleString('en-GB', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {pickedMatch && (
                  <div className={styles.outcomePicker}>
                    <p className={styles.stepFieldLabel}>Which side do you back?</p>
                    <div className={styles.sideRow}>
                      {[
                        { key: 'team_a', team: pickedMatch.team_a },
                        { key: 'team_b', team: pickedMatch.team_b },
                      ].map(({ key, team }) => (
                        <button
                          key={key}
                          type="button"
                          className={`${styles.sideBtn} ${pickedOutcome === key ? styles.sideBtnActive : ''}`}
                          onClick={() => setPickedOutcome(key)}
                        >
                          <div className={styles.teamLogoWrap}>{(team.tag || team.name).charAt(0)}</div>
                          <span>{team.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <h3 className={styles.stepTitle}>Set your stake</h3>
                <p className={styles.stepSub}>Even-money: opponent matches your stake. Win returns 2× total.</p>

                <label className={styles.stepFieldLabel}>Stake (VC)</label>
                <input
                  type="number"
                  className={styles.amountInput}
                  placeholder="50"
                  min="50"
                  value={stakeAmt}
                  onChange={(e) => setStakeAmt(e.target.value)}
                />

                <div className={styles.quickAmounts}>
                  {[100, 500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={styles.quickAmtBtn}
                      onClick={() => setStakeAmt(String(amt))}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                <div className={styles.summaryBox}>
                  <div><span>Match</span><strong>{pickedMatch ? `${pickedMatch.team_a.name} vs ${pickedMatch.team_b.name}` : '—'}</strong></div>
                  <div><span>Backing</span><strong>{pickedOutcome === 'team_a' ? pickedMatch?.team_a.name : pickedOutcome === 'team_b' ? pickedMatch?.team_b.name : '—'}</strong></div>
                  <div><span>Your stake</span><strong>{fmtNumber(stakeNum)} VC</strong></div>
                  <div><span>Win returns</span><strong className={styles.cellGreen}>{fmtNumber(potentialReturn)} VC</strong></div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className={styles.stepTitle}>Choose opponent</h3>
                <p className={styles.stepSub}>Open the wager to anyone or send it to a specific player.</p>

                <div className={styles.opponentRow}>
                  <button
                    type="button"
                    className={`${styles.opponentCard} ${opponentMode === 'open' ? styles.opponentCardActive : ''}`}
                    onClick={() => setOpponentMode('open')}
                  >
                    <FaUsers className={styles.opponentIcon} />
                    <div className={styles.opponentText}>
                      <p className={styles.opponentTitle}>Open call</p>
                      <p className={styles.opponentSub}>Any player can match your stake.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`${styles.opponentCard} ${opponentMode === 'specific' ? styles.opponentCardActive : ''}`}
                    onClick={() => setOpponentMode('specific')}
                  >
                    <FaUserFriends className={styles.opponentIcon} />
                    <div className={styles.opponentText}>
                      <p className={styles.opponentTitle}>Challenge specific</p>
                      <p className={styles.opponentSub}>Send a private wager invite.</p>
                    </div>
                  </button>
                </div>

                {opponentMode === 'specific' && (
                  <>
                    <label className={styles.stepFieldLabel}>Opponent username</label>
                    <input
                      type="text"
                      className={styles.amountInput}
                      placeholder="e.g. fury_king"
                      value={opponentHandle}
                      onChange={(e) => setOpponentHandle(e.target.value.replace(/^@/, ''))}
                    />
                  </>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <h3 className={styles.stepTitle}>Review your wager</h3>
                <p className={styles.stepSub}>Confirm everything looks right. Stake VC will be reserved.</p>

                <div className={styles.reviewGrid}>
                  <div><span>Match</span><strong>{pickedMatch ? `${pickedMatch.team_a.name} vs ${pickedMatch.team_b.name}` : '—'}</strong></div>
                  <div><span>Tournament</span><strong>{pickedMatch?.tournament_name || '—'}</strong></div>
                  <div><span>Game</span><strong>{pickedMatch?.game || '—'}</strong></div>
                  <div><span>Backing</span><strong>{pickedOutcome === 'team_a' ? pickedMatch?.team_a.name : pickedMatch?.team_b.name}</strong></div>
                  <div><span>Stake</span><strong>{fmtNumber(stakeNum)} VC</strong></div>
                  <div><span>Opponent</span><strong>{opponentMode === 'open' ? 'Open call' : `@${opponentHandle}`}</strong></div>
                  <div><span>Win returns</span><strong className={styles.cellGreen}>{fmtNumber(potentialReturn)} VC</strong></div>
                  <div><span>Settle on</span><strong>{pickedMatch ? new Date(pickedMatch.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</strong></div>
                </div>
              </>
            )}

            {error && <p className={styles.errorText}>{error}</p>}

            <div className={styles.stepActions}>
              {step > 0 && (
                <button type="button" className={styles.outlineBtn} onClick={goBack} disabled={submitting}>
                  Back
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button type="button" className={`${styles.primaryBtn} goldBTN`} onClick={goNext}>
                  Continue
                </button>
              )}
              {step === STEPS.length - 1 && (
                <button
                  type="button"
                  className={`${styles.primaryBtn} goldBTN`}
                  onClick={publish}
                  disabled={submitting}
                >
                  {submitting ? 'Publishing…' : 'Publish Wager'}
                </button>
              )}
            </div>
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

const CreateWager = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <CreateWagerContent />
  </Suspense>
);

export default CreateWager;
