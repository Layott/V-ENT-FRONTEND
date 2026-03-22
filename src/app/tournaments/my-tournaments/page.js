'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './my-tournaments.module.css';

const STATUS_LABEL = {
  draft: 'Draft',
  published: 'Published',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const MyTournaments = () => {
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session?.user?.sessionToken) return;
    fetchTournaments();
  }, [session?.user?.sessionToken]);

  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/get-organizer-tournaments/`,
        { headers: { Authorization: `Bearer ${session.user.sessionToken}` } }
      );
      const data = await res.json();
      if (data.status === 'success') {
        setTournaments(Array.isArray(data.data) ? data.data : data.data?.tournaments || []);
      } else {
        setError(data.message || 'Failed to load tournaments.');
      }
    } catch (err) {
      console.error('My tournaments fetch error:', err);
      setError('Failed to load tournaments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <h3 className={styles.pageTitle}>My Tournaments</h3>
            <Link href="/tournaments/create-tournament">
              <button className="btn grnBTN">+ Create Tournament</button>
            </Link>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          {loading ? (
            <p className={styles.stateText}>Loading your tournaments...</p>
          ) : tournaments.length === 0 ? (
            <p className={styles.stateText}>You haven&apos;t created any tournaments yet.</p>
          ) : (
            <div className={styles.tournamentList}>
              {tournaments.map((t) => (
                <div key={t.id} className={styles.tournamentRow}>
                  <div className={styles.tournamentInfo}>
                    <p className={styles.tournamentName}>{t.tournament_title || 'Untitled'}</p>
                    <p className={styles.tournamentMeta}>
                      {t.game && <span>{t.game}</span>}
                      {t.start_date_and_time && <span>{formatDate(t.start_date_and_time)}</span>}
                    </p>
                  </div>

                  <div className={styles.tournamentRight}>
                    <span className={`${styles.statusBadge} ${styles[`status_${t.status}`]}`}>
                      {STATUS_LABEL[t.status] || t.status || 'Unknown'}
                    </span>

                    <div className={styles.rowActions}>
                      <Link href={`/tournaments/view-tournament?id=${t.id}`}>
                        <button className={styles.actionBtn}>View</button>
                      </Link>
                      {(t.status === 'published' || t.status === 'ongoing') && (
                        <Link href={`/tournaments/my-tournaments/manage?id=${t.id}`}>
                          <button className={`${styles.actionBtn} ${styles.manageBtn}`}>Manage</button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default MyTournaments;
