'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import TournamentRegistrationModal from '@/components/view-tournament/tournament-register/TournamentRegister';
import { API, tokenFrom, toTournament, ventFetch } from '@/components/tournament-lib/tournamentApi';
import styles from './register-tournament.module.css';

// Thin wrapper: loads the real tournament (real entry_fee_price + prize_pool)
// and mounts the shared TournamentRegister modal flow (Mode → Team → Roster →
// Review → Payment → Success). All registration + payment logic lives in
// that modal tree - this page only owns the shell + data fetch.
const RegisterTournamentContent = ({ slug: slugFromPath }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = slugFromPath || searchParams.get('id');
  // Present when the browser returns here after a Paystack wallet top-up
  // redirect (see payment/Payment.js `handleTopUp`). Passed straight through
  // to the modal so it can verify + auto-resume the paid registration.
  const reference = searchParams.get('reference');

  const { data: session, status: sessionStatus } = useSession();
  const token = tokenFrom(session);

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('No tournament specified.');
      return undefined;
    }
    // Wait for the session to resolve so the view request carries a token
    // when one is available (some tournaments may require auth to view).
    if (sessionStatus === 'loading') return undefined;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await ventFetch(API.TOURNAMENT.VIEW(id), { token });
        if (cancelled) return;
        const t = toTournament(data);
        if (t) setTournament(t);
        else setLoadError('Tournament not found.');
      } catch (err) {
        if (cancelled) return;
        setLoadError(err?.message || 'Failed to load tournament.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, token, sessionStatus]);

  const goToTournament = () => {
    router.push(id ? `/tournaments/${id}` : '/tournaments');
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {loading ? (
            <p className={styles.errText}>Loading tournament…</p>
          ) : !tournament ? (
            <p className={styles.errText}>{loadError || 'Tournament not found.'}</p>
          ) : (
            <TournamentRegistrationModal
              isOpen
              onClose={goToTournament}
              onNext={goToTournament}
              tournament={tournament}
              resumeReference={reference}
            />
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const RegisterTournament = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <RegisterTournamentContent />
  </Suspense>
);

export default RegisterTournament;

// Exported so the slug route can render it.
export { RegisterTournamentContent };
