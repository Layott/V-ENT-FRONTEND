'use client';

// One membership, readable by anybody, joinable by somebody with an account.
//
// The Subscribe button is never rendered live to a stranger to be refused on
// press. `NeedsAccount` replaces it with one sentence and two links, because
// somebody should learn what they need BEFORE they type or press, not after.
// The community feed shipped the other way round once: a compose box that
// answered 401 after people had written a post.
//
// The other half of the same idea is money. Somebody whose wallet cannot cover
// the price is told so, with the number and a link to top up, instead of
// pressing a button that fails.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import PlanCard, { planStyles, priceLabel } from '@/components/memberships/PlanCard';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, formatNumber } from '@/lib/datetime';
import { useViewer } from '@/lib/gating';
import styles from './plan.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const PlanPageClient = ({ slug }) => {
  const tt = useT();
  const router = useRouter();
  const viewer = useViewer();

  const [plan, setPlan] = useState(null);
  const [walletVc, setWalletVc] = useState(null);
  const [hasCard, setHasCard] = useState(false);
  const [memberContent, setMemberContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState('');

  const say = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = viewer.token
        ? { Authorization: `Bearer ${viewer.token}` } : undefined;
      const res = await fetch(`${API}/billing/plan/${encodeURIComponent(slug)}/`,
        { headers });
      const body = await res.json().catch(() => ({}));

      if (body?.message === 'moved' && body?.data?.url) {
        router.replace(body.data.url);
        return;
      }
      if (body?.status !== 'success') {
        setPlan(null);
        if (res.status !== 404) {
          setError(apiMessage(tt, body, 'billing.couldNotLoadPlan',
            'This membership could not be opened.'));
        }
        return;
      }
      setPlan(body.data);
    } catch (err) {
      setError(apiMessage(tt, err, 'billing.couldNotLoadPlan',
        'This membership could not be opened.'));
    } finally {
      setLoading(false);
    }
  }, [slug, viewer.token, tt, router]);

  useEffect(() => {
    // Never fetch while the session is still resolving: the signed-in answer
    // carries `my_subscription` and the signed-out one does not, and asking
    // twice would show the stranger's view first.
    if (viewer.loading) return;
    load();
  }, [viewer.loading, load]);

  // What the next charge would come out of. Read only when signed in, because
  // a stranger has no wallet to report.
  useEffect(() => {
    if (!viewer.signedIn || !viewer.token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/billing/subscriptions/`, {
          headers: { Authorization: `Bearer ${viewer.token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled || body?.status !== 'success') return;
        setWalletVc(body.data.wallet_balance_vc ?? 0);
        setHasCard(Boolean(body.data.default_card));
      } catch {
        // The page still works; it simply cannot say what would be charged.
      }
    })();
    return () => { cancelled = true; };
  }, [viewer.signedIn, viewer.token]);

  const mine = plan?.my_subscription;

  // The members area, fetched only once somebody actually holds it. The API is
  // what enforces this; asking here is how the page finds out.
  useEffect(() => {
    if (!plan?.has_member_content || !viewer.token) return undefined;
    if (!mine?.has_access && !plan.can_manage) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/billing/plan/${encodeURIComponent(plan.slug)}/members-area/`,
          { headers: { Authorization: `Bearer ${viewer.token}` } });
        const body = await res.json().catch(() => ({}));
        if (!cancelled && body?.status === 'success') {
          setMemberContent(body.data.member_content || '');
        }
      } catch {
        // Nothing to show rather than a broken panel.
      }
    })();
    return () => { cancelled = true; };
  }, [plan, mine, viewer.token]);

  const subscribe = async () => {
    setJoining(true);
    try {
      const res = await fetch(
        `${API}/billing/plan/${encodeURIComponent(plan.slug)}/subscribe/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${viewer.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        say(apiMessage(tt, body, 'billing.couldNotJoin',
          'You could not be signed up for this.'));
        return;
      }
      say(tt('billing.joinedToast', 'You are a member.'));
      await load();
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotJoin',
        'You could not be signed up for this.'));
    } finally {
      setJoining(false);
    }
  };

  const shell = (inner) => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>{inner}</div>
      </main>
      <BottomMenu />
      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}
    </div>
  );

  if (loading) return shell(<div className={styles.skeleton} />);

  if (error) {
    return shell(
      <div className={styles.error}>
        <span>{error}</span>
        <button type="button" className={styles.retry} onClick={load}>
          {tt('common.tryAgain', 'Try again')}
        </button>
      </div>,
    );
  }

  if (!plan) {
    return shell(
      <div className={styles.empty}>
        <span className={styles.emptyTitle}>
          {tt('billing.planGoneTitle', 'This membership is not here')}
        </span>
        <p>
          {tt('billing.planGoneBody',
            'It may have been closed, or the address may be wrong.')}
        </p>
      </div>,
    );
  }

  const shortOfCoins = walletVc !== null
    && !plan.is_free && !hasCard && walletVc < plan.price_vc;

  return shell(
    <div className={styles.column}>
      {plan.seller?.org_slug ? (
        <Link href={`/organizations/${plan.seller.org_slug}`} className={styles.crumb}>
          {tt('billing.backToOrg', 'Back to {name}')
            .replace('{name}', plan.seller.name)}
        </Link>
      ) : null}

      <PlanCard plan={plan} as="h1">
        {mine?.has_access ? (
          <div className={planStyles.actions}>
            <span className={`${planStyles.chip} ${planStyles.chipMine}`}>
              {mine.renews
                ? tt('billing.youAreAMember', 'You are a member')
                : tt('billing.cancelledUntil', 'Cancelled. You keep this until {when}.')
                  .replace('{when}', formatDate(mine.access_until))}
            </span>
            <Link href="/memberships"
                  className={`${planStyles.action} ${planStyles.actionQuiet}`}>
              {tt('billing.manageMembership', 'Manage this membership')}
            </Link>
          </div>
        ) : (
          <>
            {shortOfCoins ? (
              <div className={styles.blocker}>
                <span>
                  {tt('billing.needMoreCoins',
                    'This costs {price}. You have {have} VENT COINS, so you '
                    + 'need {short} more before you can join.')
                    .replace('{price}', priceLabel(tt, plan))
                    .replace('{have}', formatNumber(walletVc))
                    .replace('{short}', formatNumber(plan.price_vc - walletVc))}
                </span>
                <Link href="/wallets/topup" className={planStyles.action}>
                  {tt('billing.topUp', 'Add VENT COINS')}
                </Link>
              </div>
            ) : null}

            <NeedsAccount
              action={tt('billing.joinAction', 'join a membership')}
              returnTo={`/plans/${plan.slug}`}
            >
              <div className={planStyles.actions}>
                <button type="button" className={planStyles.action}
                        disabled={joining || shortOfCoins
                          || plan.status !== 'public'}
                        onClick={subscribe}>
                  {joining
                    ? tt('billing.joining', 'Joining...')
                    : plan.trial_days
                      ? tt('billing.startTrial', 'Start the free trial')
                      : tt('billing.join', 'Join for {price}')
                        .replace('{price}', priceLabel(tt, plan))}
                </button>
              </div>
            </NeedsAccount>
          </>
        )}
      </PlanCard>

      {plan.description ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            {tt('billing.whatYouGet', 'What this membership is')}
          </h2>
          <p className={styles.body}>{plan.description}</p>
        </section>
      ) : null}

      {memberContent ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            {tt('billing.membersArea', 'Members area')}
          </h2>
          <div className={styles.memberBox}>{memberContent}</div>
        </section>
      ) : null}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          {tt('billing.howItWorks', 'How the payments work')}
        </h2>
        <p className={styles.terms}>
          {plan.is_free
            ? tt('billing.termsFree',
              'This membership is free. Nothing is taken from your wallet and '
              + 'you can leave at any time.')
            : tt('billing.terms',
              'The first payment is taken when you join. After that it is '
              + 'taken every {period} from your VENT COINS, or from your saved '
              + 'card if your balance is short. You can cancel in one press at '
              + 'any time and you keep your membership until the end of the '
              + 'period you have paid for.')
              .replace('{period}', plan.interval === 'yearly'
                ? tt('billing.year', 'year') : tt('billing.month', 'month'))}
        </p>
        <p className={styles.terms}>
          {tt('billing.termsNoProration',
            'If you move to a different plan from this organiser, the change '
            + 'starts at the beginning of your next period. Nothing extra is '
            + 'charged on the day you change and nothing is refunded, so you '
            + 'keep what you already paid for.')}
        </p>
        {plan.trial_days ? (
          <p className={styles.terms}>
            {tt('billing.termsTrial',
              'The first {n} days are free. The first payment is taken when '
              + 'the trial ends, and cancelling before then costs nothing.')
              .replace('{n}', plan.trial_days)}
          </p>
        ) : null}
      </section>
    </div>,
  );
};

export default PlanPageClient;
