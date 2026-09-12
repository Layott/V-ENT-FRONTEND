'use client';

// One order, and what either side can do about it.
//
// The address carries an opaque token rather than a number, because a
// sequential id here would let anybody count their way through everybody
// else's orders.
//
// Who may do what is not symmetrical, and the screen says so rather than
// showing both sides every button:
//
//   the BUYER confirms it arrived, or calls it off before the seller starts
//   the SELLER refunds
//   either side disputes, and then nothing moves until an admin decides

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { call, fill, useMarketplaceOpen } from '@/lib/marketplace';
import styles from '../purchase.module.css';

const STATUS_CLASS = {
  held: 'statusEscrow',
  released: 'statusCompleted',
  refunded: 'statusRefunded',
  cancelled: 'statusRefunded',
  disputed: 'statusDisputed',
};

const STATUS_HEAD = {
  held: ['mk.o.held', 'Your coins are held by V-ENT'],
  released: ['mk.o.released', 'Paid to the seller'],
  refunded: ['mk.o.refunded', 'Refunded to the buyer'],
  cancelled: ['mk.o.cancelled', 'Called off'],
  disputed: ['mk.o.disputed', 'An admin is looking at this'],
};

const STATUS_BODY = {
  held: ['mk.o.heldBody', 'They stay here until you say it arrived. If it does not, they come back to you.'],
  released: ['mk.o.releasedBody', 'The seller has the coins, less the platform fee.'],
  refunded: ['mk.o.refundedBody', 'Everything went back to the buyer, including the fee.'],
  cancelled: ['mk.o.cancelledBody', 'Nothing changed hands.'],
  disputed: ['mk.o.disputedBody', 'Nothing moves while it is here. Both sides will be asked.'],
};

const PurchasePage = ({ params }) => {
  const tt = useT();
  const token_ = decodeURIComponent(params.token);
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;
  const me = session?.user?.username;

  const open = useMarketplaceOpen();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);

  const load = useCallback(async () => {
    if (!open || !token) { setLoading(false); return; }
    setLoading(true);
    try {
      // There is one list, and it holds both sides. Asking for the pair and
      // finding the row is one request rather than a second endpoint that
      // would answer the same question differently.
      const data = await call('/purchases/', { token });
      const found = [...(data.bought || []), ...(data.sold || [])]
        .find(p => p.token === token_);
      if (!found) setProblem(tt('mk.orderGone', 'That order is not one of yours.'));
      setPurchase(found || null);
    } catch (err) {
      setProblem(apiMessage(tt, err, 'mk.orderFailed', 'That order could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [open, token, token_, tt]);

  useEffect(() => { load(); }, [load]);

  const say = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const act = async (action, extra = {}) => {
    setBusy(true);
    try {
      await call(`/purchases/${token_}/`, {
        method: 'POST', token, body: { action, ...extra },
      });
      setDisputing(false);
      setNote('');
      await load();
      say(tt('mk.done', 'Done.'));
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  const leaveReview = async () => {
    if (!rating) return;
    setBusy(true);
    try {
      await call(`/purchases/${token_}/review/`, {
        method: 'POST', token, body: { rating, body: note },
      });
      setNote('');
      await load();
      say(tt('mk.thanks', 'Thank you.'));
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (open === null) return null;
  if (!open) {
    return <ComingSoon
      phase="Phase 4"
      title={tt('mk.title', 'Vermillion City')}
      blurb={tt('mk.comingSoon', 'Player to player listings, offers and escrow are built and not open yet.')}
      alternatives={[{ href: '/tournaments', label: tt('ui.tournaments.fee2', 'Tournaments') }]} />;
  }

  const signedIn = status === 'authenticated';
  const isBuyer = signedIn && purchase && me === purchase.buyer?.username;
  const isSeller = signedIn && purchase && me === purchase.seller?.username;

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/marketplace/dashboard" className={styles.backLink}>
            {tt('mk.backToOrders', 'Back to your orders')}
          </Link>

          {loading && <p className={styles.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>}
          {problem && <p className={styles.stateText} role="alert">{problem}</p>}

          {purchase && (
            <>
              <h1 className={styles.title}>{purchase.listing?.title}</h1>
              <p className={styles.sub}>
                {fill(tt('mk.orderedOn', 'Ordered {when}'),
                      { when: formatDateTime(purchase.created_at) })}
              </p>

              <div className={styles.layout}>
                <div className={styles.statusPanel}>
                  <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[purchase.status] || 'statusEscrow']}`}>
                    {tt(...(STATUS_HEAD[purchase.status] || ['mk.o.unknown', purchase.status]))}
                  </span>
                  <p className={styles.statusHeadline}>
                    {tt(...(STATUS_HEAD[purchase.status] || ['mk.o.unknown', purchase.status]))}
                  </p>
                  <p className={styles.statusBody}>
                    {tt(...(STATUS_BODY[purchase.status] || ['mk.o.unknownBody', '']))}
                  </p>
                  {purchase.note && <p className={styles.disputeNote}>{purchase.note}</p>}

                  <div className={styles.stepper}>
                    {['held', 'released'].map((state, i) => (
                      <span key={state}
                            className={`${styles.step} ${purchase.status === state ? styles.stepActive : ''} ${i === 0 && purchase.status !== 'held' ? styles.stepDone : ''}`}>
                        {tt(...(STATUS_HEAD[state]))}
                      </span>
                    ))}
                  </div>

                  {purchase.status === 'held' && (
                    <div className={styles.actions}>
                      {isBuyer && (
                        <>
                          <button type="button" className={styles.btnPrimary} disabled={busy}
                                  onClick={() => act('release')}>
                            {tt('mk.itArrived', 'It arrived, pay the seller')}
                          </button>
                          <button type="button" className={styles.btnGhost} disabled={busy}
                                  onClick={() => act('cancel')}>
                            {tt('mk.callOff', 'Call it off')}
                          </button>
                        </>
                      )}
                      {isSeller && (
                        <button type="button" className={styles.btnGhost} disabled={busy}
                                onClick={() => act('refund')}>
                          {tt('mk.refundIt', 'Refund the buyer')}
                        </button>
                      )}
                      <button type="button" className={styles.btnDanger} disabled={busy}
                              onClick={() => setDisputing(true)}>
                        {tt('mk.dispute', 'Something is wrong')}
                      </button>
                    </div>
                  )}

                  {/* A review, once it is settled and only from the buyer. */}
                  {purchase.status === 'released' && isBuyer && !purchase.has_review && (
                    <div className={styles.actions}>
                      <p className={styles.statusBody}>
                        {tt('mk.howWasIt', 'How was it?')}
                      </p>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button"
                                className={n <= rating ? styles.btnPrimary : styles.btnGhost}
                                aria-pressed={n <= rating}
                                aria-label={fill(tt('mk.stars', '{n} stars'), { n })}
                                onClick={() => setRating(n)}>
                          {n}
                        </button>
                      ))}
                      <button type="button" className={styles.btnPrimary}
                              disabled={busy || !rating} onClick={leaveReview}>
                        {tt('mk.leaveReview', 'Leave the review')}
                      </button>
                    </div>
                  )}
                </div>

                <aside className={styles.summary}>
                  <p className={styles.summaryTitle}>{tt('mk.summary', 'The order')}</p>
                  <div className={styles.summaryHead}>
                    {purchase.listing?.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={purchase.listing.cover} alt={purchase.listing.title}
                           className={styles.summaryThumb} />
                    )}
                    <Link href={`/marketplace/listing/${purchase.listing?.slug}`}>
                      {purchase.listing?.title}
                    </Link>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>{tt('mk.colAmount', 'Amount')}</span>
                    <span>{(purchase.amount || 0).toLocaleString()} VC</span>
                  </div>
                  {purchase.commission !== undefined && (
                    <>
                      <div className={styles.summaryRow}>
                        <span>{tt('mk.platformFee', 'V-ENT keeps')}</span>
                        <span>{purchase.commission.toLocaleString()} VC</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>{tt('mk.sellerGets', 'The seller receives')}</span>
                        <span className={styles.summaryGreen}>
                          {purchase.seller_amount.toLocaleString()} VC
                        </span>
                      </div>
                    </>
                  )}
                  <div className={styles.summaryRow}>
                    <span>{tt('mk.colWho', 'Who')}</span>
                    <UserChip user={isBuyer ? purchase.seller : purchase.buyer} size={24} />
                  </div>
                  <p className={styles.summarySub}>
                    {tt('mk.escrowNote', 'Your coins are held by V-ENT until you say it arrived. If it does not, they come back to you.')}
                  </p>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <BottomMenu />

      {disputing && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{tt('mk.dispute', 'Something is wrong')}</h2>
            <label className={styles.modalLabel} htmlFor="mkDispute">
              {tt('mk.whatHappened', 'What happened?')}
            </label>
            <textarea id="mkDispute" className={styles.modalTextarea} rows={4} value={note}
                      onChange={e => setNote(e.target.value)} />
            <div className={styles.actions}>
              <button type="button" className={styles.btnDanger}
                      disabled={busy || !note.trim()}
                      onClick={() => act('dispute', { note })}>
                {tt('mk.sendDispute', 'Send it to an admin')}
              </button>
              <button type="button" className={styles.btnGhost}
                      onClick={() => setDisputing(false)}>
                {tt('ui.cancel.0f8e', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
};

export default PurchasePage;
