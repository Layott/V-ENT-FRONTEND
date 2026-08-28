'use client';

import { appLocale } from '@/lib/appLocale';
import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuTrophy, LuUsers, LuCalendar, LuShuffle, LuPencil, LuEye, LuTriangleAlert, LuX } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import RulesEditor from '@/components/rules-editor/RulesEditor';
import EntryRequirements from '@/components/entry-requirements/EntryRequirements';
import { ventFetch, API, tokenFrom, toTournament, tournamentStatus, ApiError } from '@/components/tournament-lib/tournamentApi';
import styles from './manage.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const formatDate = d => d ? new Date(d).toLocaleDateString(appLocale(), {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}) : '-';
const formatDateTime = d => d ? new Date(d).toLocaleString(appLocale(), {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
}) : '-';

// Status values are tolerant of both the mock shape and the real M1 contract.
const STATUS_LABELS = {
  upcoming: 'Upcoming',
  registration_open: 'Registration Open',
  published: 'Upcoming',
  ongoing: 'Live',
  live: 'Live',
  in_progress: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft'
};
const STATUS_BADGE_CLASS = {
  upcoming: 'status_upcoming',
  registration_open: 'status_upcoming',
  published: 'status_upcoming',
  ongoing: 'status_in_progress',
  live: 'status_in_progress',
  in_progress: 'status_in_progress',
  completed: 'status_completed',
  cancelled: 'status_completed',
  draft: 'status_upcoming'
};

// Registrations arrive in different shapes depending on participant type
// (team vs individual) and backend maturity - guard every field.
const participantName = p => p?.team?.name || p?.team_name || p?.username || p?.player_name || p?.name || p?.full_name || 'Unknown entrant';
const participantSeed = (p, i) => p?.seed ?? i + 1;
const participantStatus = p => p?.status ? String(p.status).toLowerCase() : null;
const participantWhen = p => p?.registered_at || p?.created_at || p?.joined_at || null;
const ManageContent = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const id = slugFromPath || searchParams.get('id');
  const {
    data: session
  } = useSession();
  const token = tokenFrom(session);
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [pendingBackend, setPendingBackend] = useState(() => new Set());
  const [busyAction, setBusyAction] = useState(null); // 'bracket' | 'cancel' | null
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // Primary fetch - the tournament itself. Drives loading/error state.
  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError(new ApiError(tt("msg.noTournamentSelected", "No tournament selected."), {
        code: 'MISSING_ID'
      }));
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ventFetch(API.TOURNAMENT.VIEW(id), {
          token
        });
        if (!cancelled) setTournament(toTournament(data));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError(apiMessage(tt, err, "api.failedToLoadThisTournament", "Failed to load this tournament.")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, token, retryKey]);

  // Secondary fetch - registrations. Best-effort; never blocks the page or
  // surfaces the top-level error state on its own.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ventFetch(API.TOURNAMENT.PARTICIPANTS(id), {
          token
        });
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.participants || data?.registrations || [];
        setParticipants(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setParticipants([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, retryKey]);
  const handleRetry = () => setRetryKey(k => k + 1);
  const handleGenerateBracket = async () => {
    if (!id || busyAction) return;
    setBusyAction('bracket');
    try {
      await ventFetch(API.TOURNAMENT.GENERATE_BRACKET(id), {
        method: 'POST',
        token,
        body: {
          seed_strategy: 'random'
        }
      });
      setPendingBackend(s => {
        const n = new Set(s);
        n.delete('bracket');
        return n;
      });
      showToast(tt("msg.bracketGeneratedRegistrationClosed", "Bracket generated - registration closed."));
      setRetryKey(k => k + 1);
    } catch (err) {
      if (err?.isPendingBackend) {
        setPendingBackend(s => new Set(s).add('bracket'));
        showToast(tt("msg.bracketGenerationIsQueuedFor", "Bracket generation is queued for the next backend deploy."));
      } else {
        showToast(apiMessage(tt, err, "api.couldNotGenerateTheBracket", "Could not generate the bracket."));
      }
    } finally {
      setBusyAction(null);
    }
  };
  const openCancelModal = () => {
    setCancelReason('');
    setCancelOpen(true);
  };
  const handleCancel = async () => {
    if (!id || !cancelReason.trim() || busyAction) return;
    setBusyAction('cancel');
    try {
      await ventFetch(API.TOURNAMENT.CANCEL(id), {
        method: 'POST',
        token,
        body: {
          reason: cancelReason.trim()
        }
      });
      setPendingBackend(s => {
        const n = new Set(s);
        n.delete('cancel');
        return n;
      });
      showToast(tt("msg.tournamentCancelledRefundsInitiated", "Tournament cancelled - refunds initiated."));
      setCancelOpen(false);
      setRetryKey(k => k + 1);
    } catch (err) {
      if (err?.isPendingBackend) {
        setPendingBackend(s => new Set(s).add('cancel'));
        setCancelOpen(false);
        showToast(tt("msg.cancellationIsQueuedForThe", "Cancellation is queued for the next backend deploy."));
      } else {
        showToast(apiMessage(tt, err, "api.couldNotCancelThisTournament", "Could not cancel this tournament."));
      }
    } finally {
      setBusyAction(null);
    }
  };
  const handleDistributePrizes = async () => {
    if (!id || busyAction) return;
    setBusyAction('prizes');
    try {
      await ventFetch(API.TOURNAMENT.DISTRIBUTE_PRIZES(id), {
        method: 'POST',
        token
      });
      setPendingBackend(s => {
        const n = new Set(s);
        n.delete('prizes');
        return n;
      });
      showToast(tt("msg.prizesDistributedToWinners", "Prizes distributed to winners."));
      setRetryKey(k => k + 1);
    } catch (err) {
      if (err?.isPendingBackend) {
        setPendingBackend(s => new Set(s).add('prizes'));
        showToast(tt("msg.prizeDistributionIsQueuedFor", "Prize distribution is queued for the next backend deploy."));
      } else if (err?.code === 'ALREADY_DISTRIBUTED') {
        showToast(tt("msg.prizesHaveAlreadyBeenDistributed", "Prizes have already been distributed for this tournament."));
      } else if (err?.code === 'STATE_CONFLICT') {
        showToast(apiMessage(tt, err, "api.prizesCanOnlyBeDistributed", "Prizes can only be distributed once the tournament is completed."));
      } else {
        showToast(apiMessage(tt, err, "api.couldNotDistributePrizes", "Could not distribute prizes."));
      }
    } finally {
      setBusyAction(null);
    }
  };
  const status = tournamentStatus(tournament);
  const statusLabel = STATUS_LABELS[status] || 'Upcoming';
  const badgeClass = styles[STATUS_BADGE_CLASS[status]] || styles.status_upcoming;
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <Link href="/tournaments/my-tournaments" className={styles.backLink}>{tt("ui.my.tournaments.053d", "← My Tournaments")}</Link>
              <h1 className={styles.pageTitle}>
                {loading ? tx("Loading…") : tournament?.name || tournament?.title || tx("Manage Tournament")}
              </h1>
              {tournament?.id && <div className={styles.headerActions}>
                  <Link href={`/tournaments/${tournament.slug || tournament.id}`}>
                    <button className={styles.outlineBtn}><LuEye /> {tt("ui.view.public.page.13b1", "View Public Page")}</button>
                  </Link>
                  <Link href={`/tournaments/create-tournament?draft_id=${tournament.id}`}>
                    <button className={`${styles.btn} goldBTN`}><LuPencil /> {tt("ui.edit.5301", "Edit")}</button>
                  </Link>
                </div>}
            </div>
          </div>

          {loading ? <div aria-hidden="true">
              <div className={styles.skeletonBlock} style={{
            height: '120px',
            marginBottom: '1.75rem'
          }} />
              <div className={styles.skeletonBlock} style={{
            height: '48px',
            width: '60%',
            marginBottom: '1rem'
          }} />
              <div className={styles.skeletonBlock} style={{
            height: '220px'
          }} />
            </div> : error ? <div className={styles.inlineErrorCard}>
              <LuTriangleAlert className={styles.inlineErrorIcon} />
              <p className={styles.inlineErrorTitle}>{tt("ui.couldn't.load.this.tournament.207c", "Couldn't load this tournament")}</p>
              <p className={styles.inlineErrorSub}>{error.message || tx("Something went wrong. Please try again.")}</p>
              <button className={`${styles.btn} goldBTN`} onClick={handleRetry}>{tt("ui.retry.9f5c", "Retry")}</button>
            </div> : <>
              {pendingBackend.has('bracket') && <div className={styles.pendingBanner}>
                  <LuTriangleAlert /> {tt("ui.pending.be.deploy.this.cfde", "Pending BE deploy - this action activates once the backend endpoint ships. (Close Registration & Generate Bracket)")}
                </div>}
              {pendingBackend.has('cancel') && <div className={styles.pendingBanner}>
                  <LuTriangleAlert /> {tt("ui.pending.be.deploy.this.505b", "Pending BE deploy - this action activates once the backend endpoint ships. (Cancel & Refund)")}
                </div>}
              {pendingBackend.has('prizes') && <div className={styles.pendingBanner}>
                  <LuTriangleAlert /> {tt("ui.pending.deploy.action.activates.9f38", "Pending BE deploy - this action activates once the backend endpoint ships. (Distribute Prizes)")}
                </div>}

              {/* Summary card */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryTop}>
                  <span className={styles.gameTag}>{tournament?.game || '-'}</span>
                  <span className={`${styles.statusBadge} ${badgeClass}`}>{statusLabel}</span>
                </div>
                <div className={styles.summaryMeta}>
                  <span><LuCalendar /> {formatDate(tournament?.start_date)} - {formatDate(tournament?.end_date)}</span>
                  <span><LuUsers /> {tournament?.current_participants ?? participants.length}/{tournament?.max_participants ?? '-'}</span>
                  <span><LuTrophy /> {Number(tournament?.prize_pool || 0).toLocaleString()} VC</span>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{tt("ui.actions.c3cd", "Actions")}</h2>
                <div className={styles.actionsRow}>
                  <button className={`${styles.btn} goldBTN`} onClick={handleGenerateBracket} disabled={!!busyAction}>
                    <LuShuffle /> {busyAction === 'bracket' ? tx("Generating…") : tx("Close Registration & Generate Bracket")}
                  </button>
                  {status === 'completed' && <button className={`${styles.btn} goldBTN`} onClick={handleDistributePrizes} disabled={!!busyAction}>
                      <LuTrophy /> {busyAction === 'prizes' ? tx("Distributing…") : tx("Distribute Prizes")}
                    </button>}
                  <button className={`${styles.btn} ${styles.dangerBtn}`} onClick={openCancelModal} disabled={!!busyAction}>
                    <LuX /> {tt("ui.cancel.refund.336c", "Cancel & Refund")}
                  </button>
                </div>
              </div>

              {/* Registrations */}
              {/* Points, the placement table and the order of the tie-breakers,
                  all editable, because an organiser's league is theirs. */}
              <div className={styles.section}>
                <RulesEditor
                  tournamentId={tournament?.id}
                  token={token}
                  canEdit={Boolean(token)}
                />
              </div>

              {/* Who may enter at all. Composed as a list rather than a set of
                  toggles, because "follow these three accounts and give me your
                  Riot ID" is not something four booleans can say. */}
              {tournament?.id && <div className={styles.section}>
                <EntryRequirements
                  tournamentId={tournament.id}
                  token={token}
                  canEdit={Boolean(token)}
                />
              </div>}

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{tt("ui.registrations.5fbc", "Registrations (")}{participants.length})</h2>
                {participants.length === 0 ? <div className={styles.emptyState}>
                    <LuUsers className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>{tt("ui.no.registrations.yet.f671", "No registrations yet")}</p>
                    <p className={styles.emptySub}>{tt("ui.players.teams.will.show.0060", "Players and teams will show up here as they register.")}</p>
                  </div> : <div className={styles.partTable}>
                    <div className={styles.partTableHeader}>
                      <span>{tt("ui.seed.32fe", "Seed")}</span>
                      <span>{tt("ui.entrant.82fd", "Entrant")}</span>
                      <span>{tt("ui.status.bae7", "Status")}</span>
                      <span>{tt("ui.registered.a844", "Registered")}</span>
                    </div>
                    {participants.map((p, i) => <div key={p?.id ?? i} className={styles.partTableRow}>
                        <span className={styles.seedCell}>#{participantSeed(p, i)}</span>
                        <span className={styles.partTeamName}>{participantName(p)}</span>
                        <span>
                          {participantStatus(p) ? <span className={styles.partStatusBadge}>{participantStatus(p)}</span> : '-'}
                        </span>
                        <span>{formatDateTime(participantWhen(p))}</span>
                      </div>)}
                  </div>}
              </div>
            </>}
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}

      {cancelOpen && <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setCancelOpen(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{tt("ui.cancel.tournament.34b3", "Cancel Tournament")}</h2>
              <button className={styles.modalClose} onClick={() => setCancelOpen(false)}><LuX /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalSub}>{tt("ui.all.paid.entries.will.435e", "All paid entries will be refunded to participants' wallets. This cannot be undone.")}</p>
              <textarea className={styles.modalInput} rows="4" placeholder={tt("ui.reason.cancellation.495b", "Reason for cancellation…")} value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
              <div className={styles.modalActions}>
                <button className={styles.outlineBtn} onClick={() => setCancelOpen(false)}>{tt("ui.back.b52b", "Back")}</button>
                <button className={`${styles.btn} ${styles.dangerBtn}`} onClick={handleCancel} disabled={!cancelReason.trim() || !!busyAction}>
                  {busyAction === 'cancel' ? tx("Cancelling…") : tx("Confirm Cancel & Refund")}
                </button>
              </div>
            </div>
          </div>
        </div>}
    </div>;
};
const Manage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <ManageContent />
  </Suspense>;
export default Manage;

// Exported so the slug route can render it.
export { ManageContent };