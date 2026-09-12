'use client';

// What you are paying for, when the next charge lands, what it takes from, and
// every charge that has ever been attempted.
//
// Gate C2, and the order of those four is the order somebody asks them in. The
// last one is the half that usually gets left out: a statement that lists only
// successful charges cannot answer "why did my membership stop", which is the
// question it exists for. Failures are on this page, with the reason.
//
// Cancelling is one press and says the date access runs to, because "cancelled"
// on its own leaves somebody wondering whether they just lost three weeks.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import PlanCard, { planStyles } from '@/components/memberships/PlanCard';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, formatDateTime, formatNumber } from '@/lib/datetime';
import { useViewer, signInHref, signUpHref } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatNgn } from '@/lib/currency';
import styles from './memberships.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// Enough of a row to tell whether the server said anything new. It names the
// four things that actually change on their own: the state, the next charge,
// how far access runs, and whether it will renew.
const signature = (rows) => (rows || [])
  .map((r) => `${r.token}:${r.state}:${r.next_charge_at}:${r.access_until}:${r.renews}`)
  .join('|');

const STATE_FALLBACK = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment failed',
  cancelled: 'Cancelled',
  expired: 'Ended',
};

const MembershipsContent = () => {
  const tt = useT();
  const viewer = useViewer();

  const [rows, setRows] = useState([]);
  const [wallet, setWallet] = useState(0);
  const [card, setCard] = useState(null);
  const [detail, setDetail] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('live');
  // What the last load saw, for comparing against. State cannot be read inside
  // the refresh callback without naming it as a dependency, and naming it is
  // what re-arms the timer on every render so it never fires.
  const rowsRef = useRef([]);

  const say = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  // `quiet` is what makes this safe to run on a timer. The first load draws
  // the skeleton; a refresh that redrew it would blank the page somebody is
  // reading every thirty seconds.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!viewer.token) return false;
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const res = await fetch(`${API}/billing/subscriptions/`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        // A refusal on a background tick keeps the page it already drew. The
        // reader did not press anything, so an error banner appearing on its
        // own would be reporting a fault they cannot act on.
        if (!quiet) {
          setError(apiMessage(tt, body, 'billing.couldNotLoad',
            'Your memberships could not be loaded.'));
        }
        return false;
      }
      const next = body.data.subscriptions || [];
      // Whether anything actually moved decides how soon to ask again. A list
      // that has not changed in ten minutes is asked for less often.
      const moved = signature(next) !== signature(rowsRef.current);
      rowsRef.current = next;
      setRows(next);
      setWallet(body.data.wallet_balance_vc || 0);
      setCard(body.data.default_card || null);
      if (quiet) setError(null);
      return moved;
    } catch (err) {
      if (!quiet) {
        setError(apiMessage(tt, err, 'billing.couldNotLoad',
          'Your memberships could not be loaded.'));
      }
      return false;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [viewer.token, tt]);

  useEffect(() => {
    // Decide nothing while the session is still resolving. A page that decides
    // early flashes from a member's view to a stranger's.
    if (viewer.loading) return;
    if (!viewer.signedIn) { setLoading(false); return; }
    load();
  }, [viewer.loading, viewer.signedIn, load]);

  // A membership changes underneath the reader without them touching anything:
  // a renewal lands, a retry fails, a trial ends. This page is the place
  // somebody sits when they are worried about exactly that, so it keeps
  // itself current rather than making them reload.
  useAutoRefresh(() => load({ quiet: true }), [viewer.token],
    { enabled: viewer.signedIn });

  const openDetail = async (token) => {
    if (detail[token]) {
      setDetail((d) => ({ ...d, [token]: null }));
      return;
    }
    try {
      const res = await fetch(`${API}/billing/subscription/${token}/`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        setDetail((d) => ({ ...d, [token]: body.data }));
      } else {
        say(apiMessage(tt, body, 'billing.couldNotLoad',
          'Your memberships could not be loaded.'));
      }
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotLoad',
        'Your memberships could not be loaded.'));
    }
  };

  // Moving to another plan from the same organiser. The plan page has
  // promised since it was written that "if you move to a different plan from
  // this organiser, the change starts at the beginning of your next period",
  // and until 12 September there was no control anywhere that could do it:
  // the endpoint existed, the promise was on screen, and the button was not.
  const [changing, setChanging] = useState(null);   // token of the sub being moved
  const [choices, setChoices] = useState([]);
  const [choicesError, setChoicesError] = useState('');

  const openChooser = async (sub) => {
    if (changing === sub.token) { setChanging(null); return; }
    setChanging(sub.token);
    setChoices([]);
    setChoicesError('');
    const seller = sub.plan?.seller || {};
    const query = seller.org_slug
      ? `org=${encodeURIComponent(seller.org_slug)}`
      : `owner=${encodeURIComponent(seller.username || '')}`;
    try {
      const res = await fetch(`${API}/billing/plans/?${query}`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setChoicesError(apiMessage(tt, body, 'billing.couldNotLoad',
          'Your memberships could not be loaded.'));
        return;
      }
      setChoices((body.data?.plans || []).filter(
        p => p.status === 'public' && p.slug !== sub.plan?.slug));
    } catch (err) {
      setChoicesError(apiMessage(tt, err, 'billing.couldNotLoad',
        'Your memberships could not be loaded.'));
    }
  };

  const changePlan = async (sub, plan) => {
    setBusy(`${sub.token}:change`);
    try {
      const res = await fetch(`${API}/billing/subscription/${sub.token}/change/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${viewer.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: plan.slug }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        say(apiMessage(tt, body, 'billing.couldNotDoThat',
          'That could not be done.'));
        return;
      }
      say(tt('billing.changeQueued',
        'Moving to {plan} on {when}. Nothing extra is charged now.')
        .replace('{plan}', plan.name)
        .replace('{when}', formatDate(sub.period_end)));
      setChanging(null);
      await load();
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotDoThat', 'That could not be done.'));
    } finally {
      setBusy('');
    }
  };

  const act = async (token, action, message) => {
    setBusy(`${token}:${action}`);
    try {
      const res = await fetch(`${API}/billing/subscription/${token}/${action}/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${viewer.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        say(apiMessage(tt, body, 'billing.couldNotDoThat',
          'That could not be done.'));
        return;
      }
      say(message);
      setDetail((d) => ({ ...d, [token]: null }));
      await load();
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotDoThat',
        'That could not be done.'));
    } finally {
      setBusy('');
    }
  };

  const shell = (inner) => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              {tt('billing.myMemberships', 'My memberships')}
            </h1>
            <p className={styles.pageSubtitle}>
              {tt('billing.myMembershipsSub',
                'What you pay for, when the next payment is taken, and every '
                + 'payment so far.')}
            </p>
          </div>
          {inner}
        </div>
      </main>
      <BottomMenu />
      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}
    </div>
  );

  if (viewer.loading) return shell(<div className={styles.skeleton} />);

  if (!viewer.signedIn) {
    // The whole page means "mine", so it explains itself rather than rendering
    // a list of nothing. Told before they spend effort, not after.
    return shell(
      <div className={styles.empty}>
        <span className={styles.emptyTitle}>
          {tt('billing.signedOutTitle', 'Your memberships live here')}
        </span>
        <p>
          {tt('billing.signedOutBody',
            'Sign in to see what you pay for, when the next payment is taken, '
            + 'and every payment so far.')}
        </p>
        <div className={planStyles.actions} style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <Link href={signUpHref('/memberships')} className={planStyles.action}>
            {tt('needsAccount.create', 'Create an account')}
          </Link>
          <Link href={signInHref('/memberships')}
                className={`${planStyles.action} ${planStyles.actionQuiet}`}>
            {tt('needsAccount.signIn', 'Log in')}
          </Link>
        </div>
      </div>,
    );
  }

  if (loading) {
    return shell(
      <>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </>,
    );
  }

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

  const live = rows.filter((r) => r.has_access);
  const past = rows.filter((r) => !r.has_access);
  const shown = tab === 'live' ? live : past;

  return shell(
    <>
      <div className={styles.sourceStrip}>
        <div className={styles.sourceItem}>
          <span className={styles.sourceLabel}>
            {tt('billing.paidFrom', 'Payments come from')}
          </span>
          <span className={styles.sourceValue}>
            {tt('billing.walletBalance', '{n} VENT COINS')
              .replace('{n}', formatNumber(wallet))}
          </span>
          <span className={styles.sourceLabel}>
            {card
              ? tt('billing.thenCard', 'then your {brand} ending {last4}')
                .replace('{brand}', card.brand).replace('{last4}', card.last4)
              : tt('billing.noCard', 'No saved card')}
          </span>
        </div>
        <Link href="/wallets/topup" className={styles.sourceLink}>
          {tt('billing.topUp', 'Add VENT COINS')}
        </Link>
      </div>

      <div className={styles.tabsRow}>
        <button type="button" className={styles.tabBTN}
                aria-pressed={tab === 'live'} onClick={() => setTab('live')}>
          {tt('billing.tabLive', 'Current')} ({live.length})
        </button>
        <button type="button" className={styles.tabBTN}
                aria-pressed={tab === 'past'} onClick={() => setTab('past')}>
          {tt('billing.tabPast', 'Ended')} ({past.length})
        </button>
      </div>

      {!shown.length ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>
            {tab === 'live'
              ? tt('billing.emptyLiveTitle', 'You are not a member of anything yet')
              : tt('billing.emptyPastTitle', 'Nothing has ended')}
          </span>
          <p>
            {tab === 'live'
              ? tt('billing.emptyLiveBody',
                'Organisers sell memberships on their own pages. Open an '
                + 'organisation you follow to see what it offers.')
              : tt('billing.emptyPastBody',
                'Memberships you have left will be listed here.')}
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {shown.map((sub) => {
            const open = detail[sub.token];
            return (
              <PlanCard key={sub.token} plan={sub.plan}
                        href={`/plans/${sub.plan.slug}`}>
                <div className={styles.subFooter}>
                  {sub.state === 'past_due' ? (
                    <div className={styles.warning}>
                      {tt('billing.pastDue',
                        'The last payment did not go through. We will try '
                        + '{left} more times, next on {when}. Access stops on '
                        + '{grace} if it does not succeed.')
                        .replace('{left}', sub.dunning_attempts_left)
                        .replace('{when}', formatDateTime(sub.next_charge_at))
                        .replace('{grace}', formatDate(sub.grace_until))}
                    </div>
                  ) : null}

                  {sub.cancel_at_period_end && sub.state !== 'expired' ? (
                    <div className={styles.notice}>
                      {tt('billing.cancelledUntil',
                        'Cancelled. You keep this until {when}.')
                        .replace('{when}', formatDate(sub.access_until))}
                    </div>
                  ) : null}

                  {sub.pending_plan ? (
                    <div className={styles.notice}>
                      {tt('billing.pendingChange',
                        'You are moving to {plan} on {when}. Nothing changes '
                        + 'before then and nothing extra is charged now.')
                        .replace('{plan}', sub.pending_plan.name)
                        .replace('{when}', formatDate(sub.period_end))}
                    </div>
                  ) : null}

                  <div className={styles.facts}>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>
                        {tt('billing.status', 'Status')}
                      </span>
                      <span className={styles.factValue}>
                        {tt(`billing.state.${sub.state}`,
                          STATE_FALLBACK[sub.state] || sub.state)}
                      </span>
                    </div>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>
                        {tt('billing.nextPayment', 'Next payment')}
                      </span>
                      <span className={styles.factValue}>
                        {sub.next_charge_at
                          ? formatDate(sub.next_charge_at)
                          : tt('billing.noneScheduled', 'None scheduled')}
                      </span>
                    </div>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>
                        {tt('billing.takenFrom', 'Taken from')}
                      </span>
                      <span className={styles.factValue}>
                        {sub.card
                          ? `${sub.card.brand} ${sub.card.last4}`
                          : tt('billing.wallet', 'Your VENT COINS')}
                      </span>
                    </div>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>
                        {tt('billing.accessUntil', 'Access until')}
                      </span>
                      <span className={styles.factValue}>
                        {formatDate(sub.access_until)}
                      </span>
                    </div>
                  </div>

                  <div className={planStyles.actions}>
                    <button type="button"
                            className={`${planStyles.action} ${planStyles.actionQuiet}`}
                            onClick={() => openDetail(sub.token)}>
                      {open
                        ? tt('billing.hidePayments', 'Hide payments')
                        : tt('billing.showPayments', 'Show every payment')}
                    </button>

                    {sub.renews ? (
                      <button type="button" className={`${planStyles.action} ${planStyles.actionQuiet}`}
                              disabled={busy === `${sub.token}:cancel`}
                              onClick={() => act(sub.token, 'cancel',
                                tt('billing.cancelledToast',
                                  'Cancelled. You keep access to the end of the period.'))}>
                        {tt('billing.cancel', 'Cancel membership')}
                      </button>
                    ) : null}

                    {sub.renews && !sub.pending_plan ? (
                      <button type="button" className={`${planStyles.action} ${planStyles.actionQuiet}`}
                              aria-expanded={changing === sub.token}
                              onClick={() => openChooser(sub)}>
                        {tt('billing.changePlan', 'Move to another plan')}
                      </button>
                    ) : null}

                    {!sub.renews && sub.state === 'cancelled' && sub.has_access ? (
                      <button type="button" className={planStyles.action}
                              disabled={busy === `${sub.token}:resume`}
                              onClick={() => act(sub.token, 'resume',
                                tt('billing.resumedToast',
                                  'Your membership will renew as before.'))}>
                        {tt('billing.resume', 'Keep it after all')}
                      </button>
                    ) : null}
                  </div>

                  {changing === sub.token ? (
                    <div className={styles.chooser}>
                      <p className={styles.chooserLead}>
                        {tt('billing.changeLead',
                          'The move starts on {when}. Nothing extra is charged '
                          + 'on the day you change and nothing is refunded.')
                          .replace('{when}', formatDate(sub.period_end))}
                      </p>
                      {choicesError ? (
                        <p className={styles.chooserEmpty}>{choicesError}</p>
                      ) : choices.length === 0 ? (
                        <p className={styles.chooserEmpty}>
                          {tt('billing.noOtherPlans',
                            'This organiser has no other plan open to join.')}
                        </p>
                      ) : (
                        <div className={styles.choiceRow}>
                          {choices.map(plan => (
                            <button key={plan.slug} type="button"
                                    className={styles.choice}
                                    disabled={busy === `${sub.token}:change`}
                                    onClick={() => changePlan(sub, plan)}>
                              <span className={styles.choiceName}>{plan.name}</span>
                              <span className={styles.choicePrice}>
                                {plan.is_free
                                  ? tt('billing.free', 'Free')
                                  : `${formatNumber(plan.price_vc)} VC / ${plan.interval === 'yearly'
                                    ? tt('billing.year', 'year')
                                    : tt('billing.month', 'month')}`}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {open ? (
                    <div className={styles.invoiceWrap}>
                      <table className={styles.invoiceTable}>
                        <thead>
                          <tr>
                            <th>{tt('billing.invoiceWhen', 'When')}</th>
                            <th>{tt('billing.invoicePeriod', 'Period')}</th>
                            <th>{tt('billing.invoiceAmount', 'Amount')}</th>
                            <th>{tt('billing.invoiceState', 'Result')}</th>
                            <th>{tt('billing.invoiceRef', 'Reference')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(open.invoices || []).map((inv) => (
                            <tr key={inv.token}>
                              <td>{formatDate(inv.created_at)}</td>
                              <td>{formatDate(inv.period_start)}</td>
                              <td>
                                {formatNumber(inv.amount_vc)} VC
                                <br />
                                <span className={styles.factLabel}>
                                  {formatNgn(inv.amount_ngn)}
                                </span>
                              </td>
                              <td className={
                                inv.state === 'paid' ? styles.statePaid
                                  : inv.state === 'refunded' ? styles.stateRefunded
                                    : styles.stateFailed
                              }>
                                {tt(`billing.invoiceState.${inv.state}`, inv.state)}
                                {inv.failure_code ? (
                                  <>
                                    <br />
                                    <span className={styles.factLabel}>
                                      {tt(`api.${inv.failure_code}`,
                                        'The payment did not go through.')}
                                    </span>
                                  </>
                                ) : null}
                              </td>
                              <td>{inv.reference || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </PlanCard>
            );
          })}
        </div>
      )}
    </>,
  );
};

const MembershipsPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <MembershipsContent />
  </Suspense>
);

export default MembershipsPage;
