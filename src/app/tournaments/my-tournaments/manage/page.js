'use client'

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './manage.module.css';

const STATUS_LABEL = { upcoming: 'Upcoming', in_progress: 'Live', completed: 'Done' };

const ScoreForm = ({ match, tournamentId, sessionToken, onUpdated }) => {
  const p1 = match.participants?.[0];
  const p2 = match.participants?.[1];
  const [score1, setScore1] = useState(p1?.score ?? '');
  const [score2, setScore2] = useState(p2?.score ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/update-bracket/${tournamentId}/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            match_id: match.id,
            participant1_score: Number(score1),
            participant2_score: Number(score2),
          }),
        }
      );
      const data = await res.json();

      if (data.status === 'success') {
        setSuccess(true);
        if (onUpdated) onUpdated();
      } else {
        setError(data.message || 'Failed to update scores.');
      }
    } catch (err) {
      console.error('Score update error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (match.status === 'upcoming' && (!p1 || !p2)) {
    return <p className={styles.tbdNote}>Participants TBD</p>;
  }

  return (
    <form className={styles.scoreForm} onSubmit={handleSubmit}>
      <div className={styles.scoreRow}>
        <span className={styles.participantLabel}>{p1?.name || p1?.username || 'TBD'}</span>
        <input
          type="number"
          min="0"
          className={styles.scoreInput}
          value={score1}
          onChange={(e) => setScore1(e.target.value)}
          placeholder="0"
          disabled={saving}
        />
      </div>
      <div className={styles.scoreRow}>
        <span className={styles.participantLabel}>{p2?.name || p2?.username || 'TBD'}</span>
        <input
          type="number"
          min="0"
          className={styles.scoreInput}
          value={score2}
          onChange={(e) => setScore2(e.target.value)}
          placeholder="0"
          disabled={saving}
        />
      </div>
      {error && <p className={styles.formError}>{error}</p>}
      {success && <p className={styles.formSuccess}>Scores saved.</p>}
      <button type="submit" className={styles.saveBtn} disabled={saving}>
        {saving ? 'Saving...' : 'Save Scores'}
      </button>
    </form>
  );
};

const ManageContent = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [tournament, setTournament] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!id || !session?.user?.sessionToken) return;
    setLoading(true);
    setError(null);

    try {
      const [tRes, bRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/view-tournament/${id}`, {
          headers: { Authorization: `Bearer ${session.user.sessionToken}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/get-tournament-brackets/${id}/`, {
          headers: { Authorization: `Bearer ${session.user.sessionToken}` },
        }),
      ]);

      const tData = await tRes.json();
      const bData = await bRes.json();

      if (tData.status === 'success') setTournament(tData.data);
      if (bData.status === 'success') {
        const payload = bData.data;
        setRounds(Array.isArray(payload) ? payload : payload.rounds || []);
      }
    } catch (err) {
      console.error('Manage fetch error:', err);
      setError('Failed to load tournament data.');
    } finally {
      setLoading(false);
    }
  }, [id, session?.user?.sessionToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderLayout = (content) => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>{content}</div>
      </main>
      <BottomMenu />
    </div>
  );

  if (loading) return renderLayout(<p className={styles.stateText}>Loading...</p>);
  if (error) return renderLayout(<p className={styles.errorText}>{error}</p>);
  if (!id) return renderLayout(<p className={styles.errorText}>No tournament ID specified.</p>);

  return renderLayout(
    <>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/tournaments/my-tournaments" className={styles.backLink}>
            ← My Tournaments
          </Link>
          <h3 className={styles.pageTitle}>{tournament?.tournament_title || 'Manage Tournament'}</h3>
        </div>
      </div>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Score Management</h4>

        {rounds.length === 0 ? (
          <p className={styles.stateText}>
            Bracket has not been generated yet. Publish the tournament to generate matches.
          </p>
        ) : (
          rounds.map((round, rIdx) => (
            <div key={round.id || rIdx} className={styles.roundBlock}>
              <p className={styles.roundLabel}>
                {round.name || `Round ${round.round_number || rIdx + 1}`}
              </p>

              <div className={styles.matchGrid}>
                {(round.matches || []).map((match, mIdx) => (
                  <div key={match.id || mIdx} className={styles.matchBlock}>
                    <div className={styles.matchHeader}>
                      <span className={styles.matchNumber}>Match {mIdx + 1}</span>
                      <span className={`${styles.statusBadge} ${styles[`status_${match.status}`]}`}>
                        {STATUS_LABEL[match.status] || match.status}
                      </span>
                    </div>
                    <ScoreForm
                      match={match}
                      tournamentId={id}
                      sessionToken={session?.user?.sessionToken}
                      onUpdated={fetchData}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
};

const ManageTournament = () => (
  <Suspense fallback={
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <p className={styles.stateText}>Loading...</p>
        </div>
      </main>
      <BottomMenu />
    </div>
  }>
    <ManageContent />
  </Suspense>
);

export default ManageTournament;
