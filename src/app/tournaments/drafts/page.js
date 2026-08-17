'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuTrophy, LuPencil, LuTrash2, LuRocket, LuPlus, LuTriangleAlert } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { ventFetch, API, tokenFrom, ApiError } from '@/components/tournament-lib/tournamentApi';
import styles from './drafts.module.css';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

// A draft's shape varies between the mock layer (`name`) and the real M1
// contract (`title` / `tournament_title`). Guard every read so a partial or
// unexpected payload never crashes the page.
const draftTitle = (d) => d?.title || d?.name || d?.tournament_title || 'Untitled draft';
const draftGame = (d) => d?.game || d?.game_name || '-';
const draftProgress = (d) => {
  const n = Number(d?.progress ?? d?.completion_percent ?? 0);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};
const draftUpdated = (d) => d?.updated_at || d?.last_edited || d?.modified_at || d?.created_at || null;

const Drafts = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = tokenFrom(session);

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    let cancelled = false;
    // Drafts are per-user - without the token this 400s on first paint.
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ventFetch(API.TOURNAMENT.DRAFTS, { token });
        if (cancelled) return;
        // Real contract may return `{ drafts: [...] }` or `{ tournaments: [...] }`;
        // the mock layer returns a bare array. Handle both.
        const list = Array.isArray(data) ? data : (data?.drafts || data?.tournaments || []);
        setDrafts(Array.isArray(list) ? list : []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err : new ApiError(err?.message || 'Failed to load drafts.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [token, retryKey]);

  const handleRetry = () => setRetryKey((k) => k + 1);

  const handleEdit = (draft) => {
    router.push(`/tournaments/create-tournament?draft_id=${draft.id}`);
  };

  const handlePublish = async (draft) => {
    if (busyId) return;
    setBusyId(draft.id);
    try {
      await ventFetch(API.TOURNAMENT.EDIT(draft.id), {
        method: 'PUT',
        token,
        body: { is_draft: false, status: 'published' },
      });
      setDrafts((d) => d.filter((x) => x.id !== draft.id));
      showToast(`"${draftTitle(draft)}" published`);
    } catch (err) {
      showToast(err?.message || 'Could not publish this draft.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (draft) => {
    if (busyId) return;
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setBusyId(draft.id);
    try {
      await ventFetch(API.TOURNAMENT.DELETE_DRAFT(draft.id), { method: 'DELETE', token });
      setDrafts((d) => d.filter((x) => x.id !== draft.id));
      showToast('Draft deleted');
    } catch (err) {
      showToast(err?.message || 'Could not delete this draft.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <Link href="/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
              <h1 className={styles.pageTitle}>Saved Drafts</h1>
              <p className={styles.pageSub}>Pick up where you left off, or start fresh.</p>
            </div>
            <Link href="/tournaments/create-tournament">
              <button className={`${styles.btn} goldBTN`}><LuPlus /> Create New</button>
            </Link>
          </div>

          {loading ? (
            <div className={styles.draftGrid} aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonLine} style={{ width: '35%', height: '16px' }} />
                  <div className={styles.skeletonLine} style={{ width: '75%', height: '20px' }} />
                  <div className={styles.skeletonLine} style={{ width: '50%', height: '12px' }} />
                  <div className={styles.skeletonLine} style={{ height: '6px', marginTop: '0.5rem' }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={styles.inlineErrorCard}>
              <LuTriangleAlert className={styles.inlineErrorIcon} />
              <p className={styles.inlineErrorTitle}>Couldn&apos;t load drafts</p>
              <p className={styles.inlineErrorSub}>{error.message || 'Something went wrong. Please try again.'}</p>
              <button className={`${styles.btn} goldBTN`} onClick={handleRetry}>Retry</button>
            </div>
          ) : drafts.length === 0 ? (
            <div className={styles.emptyState}>
              <LuTrophy className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No drafts yet</p>
              <p className={styles.emptySub}>Start a tournament and save before you finish.</p>
              <Link href="/tournaments/create-tournament">
                <button className={`${styles.btn} goldBTN`}><LuPlus /> Start a Tournament</button>
              </Link>
            </div>
          ) : (
            <div className={styles.draftGrid}>
              {drafts.map((draft) => {
                const progress = draftProgress(draft);
                const busy = busyId === draft.id;
                const anyBusy = busyId != null;
                return (
                  <div key={draft.id} className={styles.draftCard}>
                    <div className={styles.draftHeader}>
                      <span className={styles.gameTag}>{draftGame(draft)}</span>
                      <span className={styles.draftBadge}>DRAFT</span>
                    </div>
                    <h3 className={styles.draftTitle}>{draftTitle(draft)}</h3>
                    <p className={styles.draftMeta}>Last edited {formatDate(draftUpdated(draft))}</p>

                    <div className={styles.progressWrap}>
                      <div className={styles.progressLabel}>
                        <span>Setup progress</span>
                        <span className={styles.progressPercent}>{progress}%</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className={styles.draftActions}>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => handleEdit(draft)}
                        disabled={anyBusy}
                      >
                        <LuPencil /> Edit
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.publishBtn}`}
                        onClick={() => handlePublish(draft)}
                        disabled={anyBusy || progress < 80}
                        title={progress < 80 ? 'Complete setup to publish' : ''}
                      >
                        <LuRocket /> {busy ? 'Publishing…' : 'Publish'}
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDelete(draft)}
                        disabled={anyBusy}
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

export default Drafts;
