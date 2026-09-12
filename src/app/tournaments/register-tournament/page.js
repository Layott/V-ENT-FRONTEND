'use client';

import { apiMessage } from '@/lib/apiMessage';
import ErrorState from '@/components/error-state/ErrorState';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import TournamentRegistrationModal from '@/components/view-tournament/tournament-register/TournamentRegister';
import { API, tokenFrom, toTournament, ventFetch } from '@/components/tournament-lib/tournamentApi';
import styles from './register-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Thin wrapper: loads the real tournament (real entry_fee_price + prize_pool)
// and mounts the shared TournamentRegister modal flow (Mode → Team → Roster →
// Review → Payment → Success). All registration + payment logic lives in
// that modal tree - this page only owns the shell + data fetch.
const RegisterTournamentContent = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = slugFromPath || searchParams.get('id');
  // Present when the browser returns here after a Paystack wallet top-up
  // redirect (see payment/Payment.js `handleTopUp`). Passed straight through
  // to the modal so it can verify + auto-resume the paid registration.
  const reference = searchParams.get('reference');
  const {
    data: session,
    status: sessionStatus
  } = useSession();
  const token = tokenFrom(session);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  // `notFound` is a tournament that does not exist; `loadError` is a request
  // that did not come back. One used to stand in for the other.
  const [notFound, setNotFound] = useState('');
  const [loadError, setLoadError] = useState('');
  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setNotFound(tt("registerTournament.noneNamed", "No tournament was named in this address."));
      return;
    }
    // Wait for the session to resolve so the view request carries a token
    // when one is available (some tournaments may require auth to view).
    if (sessionStatus === 'loading') return;
    setLoading(true);
    setLoadError('');
    setNotFound('');
    try {
      const data = await ventFetch(API.TOURNAMENT.VIEW(id), {
        token
      });
      const t = toTournament(data);
      if (t) setTournament(t);
      else setNotFound(tt("registerTournament.notFound", "That tournament does not exist."));
    } catch (err) {
      if (err?.status === 404) setNotFound(tt("registerTournament.notFound", "That tournament does not exist."));
      else setLoadError(apiMessage(tt, err, "api.failedToLoadTournament", "Failed to load tournament."));
    } finally {
      setLoading(false);
    }
  }, [id, token, sessionStatus, tt]);
  useEffect(() => { load(); }, [load]);
  const goToTournament = () => {
    router.push(id ? `/tournaments/${id}` : '/tournaments');
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <h1 className={styles.srOnlyTitle}>
            {tournament?.tournament_title
              ? tt("registerTournament.titleNamed", "Register for {name}")
                  .replace("{name}", tournament.tournament_title)
              : tt("registerTournament.title", "Tournament registration")}
          </h1>
          {loading ? <p className={styles.errText}>{tt("ui.loading.tournament.7024", "Loading tournament…")}</p> : loadError && !tournament ? <ErrorState message={loadError} onRetry={load} /> : !tournament ? <p className={styles.errText}>{notFound || tx("Tournament not found.")}</p> : <TournamentRegistrationModal isOpen onClose={goToTournament} onNext={goToTournament} tournament={tournament} resumeReference={reference} />}
        </div>
      </main>

      <BottomMenu />
    </div>;
};
const RegisterTournament = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <RegisterTournamentContent />
  </Suspense>;
export default RegisterTournament;

// Exported so the slug route can render it.
export { RegisterTournamentContent };