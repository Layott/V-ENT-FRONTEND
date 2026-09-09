'use client';

// What I am selling, what I have bought, and what people said.
//
// The numbers at the top are the premium analytics the spec names. On a free
// account they are not blurred or teased: the panel says plainly that they come
// with premium, because a number shown behind frosted glass is a number
// somebody screenshots and asks support about.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FaStar } from 'react-icons/fa';
import { HiPlus } from 'react-icons/hi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { formatDate } from '@/lib/datetime';
import { call, fill, useMarketplaceOpen } from '@/lib/marketplace';
import styles from './dashboard.module.css';

const STATUS_CLASS = {
  active: 'statusActive',
  sold: 'statusSold',
  paused: 'statusPending',
  draft: 'statusPending',
  expired: 'statusPending',
  removed: 'statusRefunded',
  held: 'statusEscrow',
  released: 'statusCompleted',
  refunded: 'statusRefunded',
  cancelled: 'statusRefunded',
  disputed: 'statusDisputed',
};

const STATUS_WORDS = {
  active: ['mk.st.active', 'Live'],
  sold: ['mk.st.sold', 'Sold'],
  paused: ['mk.st.paused', 'Paused'],
  draft: ['mk.st.draft', 'Not published'],
  expired: ['mk.st.expired', 'Ended'],
  removed: ['mk.st.removed', 'Taken down'],
  held: ['mk.st.held', 'Held by V-ENT'],
  released: ['mk.st.released', 'Paid'],
  refunded: ['mk.st.refunded', 'Refunded'],
  cancelled: ['mk.st.cancelled', 'Called off'],
  disputed: ['mk.st.disputed', 'With an admin'],
};

const Dashboard = () => {
  const tt = useT();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;

  const open = useMarketplaceOpen();

  const [tab, setTab] = useState('listings');
  const [mine, setMine] = useState(null);
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!open || !token) return;
    try {
      const [listings, purchases] = await Promise.all([
        call('/mine/', { token }),
        call('/purchases/', { token }),
      ]);
      setMine(listings);
      setOrders(purchases);
    } catch {
      setMine({ listings: [] });
      setOrders({ bought: [], sold: [] });
    }
  }, [open, token]);

  useEffect(() => { load(); }, [load]);

  const say = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  const setStatus = async (listing, wanted) => {
    setBusy(true);
    try {
      await call(`/listings/${listing.slug || listing.listing_id}/status/`, {
        method: 'POST', token, body: { status: wanted },
      });
      await load();
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

  if (status === 'unauthenticated') {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <h1 className={styles.title}>{tt('mk.dashboard', 'What I am selling')}</h1>
            <p className={styles.stateText}>
              {tt('mk.signInToList', 'You need an account to list something.')}
            </p>
            <Link href="/login" className={styles.createBtn}>
              {tt('ui.log.in.2f3d', 'Log in')}
            </Link>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const listings = mine?.listings || [];
  const totals = listings.reduce((out, l) => ({
    views: out.views + (l.analytics?.views || 0),
    inquiries: out.inquiries + (l.analytics?.inquiries || 0),
    completed: out.completed + (l.analytics?.completed || 0),
  }), { views: 0, inquiries: 0, completed: 0 });

  const earned = (orders?.sold || [])
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + (p.seller_amount || 0), 0);

  const badge = value => {
    const words = STATUS_WORDS[value] || [`mk.st.${value}`, value];
    return (
      <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[value] || 'statusPending']}`}>
        {tt(words[0], words[1])}
      </span>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/marketplace" className={styles.backLink}>
            {tt('mk.back', 'Back to Vermillion City')}
          </Link>

          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>{tt('mk.dashboard', 'What I am selling')}</h1>
              <p className={styles.sub}>
                {mine?.has_premium
                  ? tt('mk.dashSubPremium', 'Everything you have listed, and everything people have done about it.')
                  : fill(tt('mk.dashSubFree', 'A free account keeps {n} listing live at a time.'),
                         { n: mine?.active_limit ?? 1 })}
              </p>
            </div>
            <Link href="/marketplace/create" className={styles.createBtn}>
              <HiPlus aria-hidden="true" /> {tt('mk.create', 'List something')}
            </Link>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{tt('mk.earned', 'Earned')}</span>
              <span className={styles.statValue}>{earned.toLocaleString()}</span>
              <span className={styles.statUnit}>VC</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{tt('mk.live', 'Live listings')}</span>
              <span className={styles.statValue}>
                {listings.filter(l => l.status === 'active').length}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{tt('mk.views', 'Views')}</span>
              <span className={styles.statValue}>
                {mine?.has_premium ? totals.views.toLocaleString() : '-'}
              </span>
              {!mine?.has_premium && (
                <span className={styles.statDelta}>{tt('mk.withPremium', 'With premium')}</span>
              )}
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{tt('mk.questions', 'Questions and offers')}</span>
              <span className={styles.statValue}>
                {mine?.has_premium ? totals.inquiries.toLocaleString() : '-'}
              </span>
              {!mine?.has_premium && (
                <span className={styles.statDelta}>{tt('mk.withPremium', 'With premium')}</span>
              )}
            </div>
          </div>

          <div className={styles.tabsRow}>
            {[['listings', ['mk.tabListings', 'My listings']],
              ['sold', ['mk.tabSold', 'Sold']],
              ['bought', ['mk.tabBought', 'Bought']]].map(([key, words]) => (
              <button key={key} type="button" aria-pressed={tab === key}
                      className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ''}`}
                      onClick={() => setTab(key)}>
                {tt(words[0], words[1])}
              </button>
            ))}
          </div>

          {tab === 'listings' && (
            mine === null ? <p className={styles.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>
            : listings.length === 0 ? (
              <p className={styles.stateText}>
                {tt('mk.nothingListed', 'You have not listed anything yet.')}
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <div className={`${styles.tableHeader} ${styles.listingCols}`}>
                  <span>{tt('mk.colListing', 'Listing')}</span>
                  <span>{tt('mk.colPrice', 'Price')}</span>
                  <span>{tt('mk.colStatus', 'Status')}</span>
                  <span>{tt('mk.colActions', 'Actions')}</span>
                </div>
                {listings.map(l => (
                  <div key={l.listing_id} className={`${styles.tableRow} ${styles.listingCols}`}>
                    <span className={styles.listingCell}>
                      {l.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.cover} alt={l.title} className={styles.listingThumb} />
                      )}
                      <Link href={`/marketplace/listing/${l.slug || l.listing_id}`}
                            className={styles.listingName}>
                        {l.title}
                      </Link>
                    </span>
                    <span className={styles.priceCell}>{(l.price || 0).toLocaleString()} VC</span>
                    <span>{badge(l.status)}</span>
                    <span className={styles.actionsCell}>
                      {l.status === 'active' ? (
                        <button type="button" className={styles.iconBtn} disabled={busy}
                                onClick={() => setStatus(l, 'paused')}>
                          {tt('mk.pause', 'Pause')}
                        </button>
                      ) : (
                        <button type="button" className={styles.iconBtnPrimary} disabled={busy}
                                onClick={() => setStatus(l, 'active')}>
                          {tt('mk.putLive', 'Put it live')}
                        </button>
                      )}
                      <button type="button" className={styles.iconBtnDanger} disabled={busy}
                              onClick={() => setStatus(l, 'removed')}>
                        {tt('mk.takeDown', 'Take down')}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {(tab === 'sold' || tab === 'bought') && (
            orders === null ? <p className={styles.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>
            : (orders[tab] || []).length === 0 ? (
              <p className={styles.stateText}>
                {tab === 'sold'
                  ? tt('mk.nothingSold', 'Nothing sold yet.')
                  : tt('mk.nothingBought', 'You have not bought anything yet.')}
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <div className={`${styles.tableHeader} ${styles.orderCols}`}>
                  <span>{tt('mk.colListing', 'Listing')}</span>
                  <span>{tt('mk.colWho', 'Who')}</span>
                  <span>{tt('mk.colAmount', 'Amount')}</span>
                  <span>{tt('mk.colStatus', 'Status')}</span>
                  <span>{tt('mk.colWhen', 'When')}</span>
                </div>
                {orders[tab].map(p => (
                  <div key={p.token} className={`${styles.tableRow} ${styles.orderCols}`}>
                    <span className={styles.listingCell}>
                      <Link href={`/marketplace/purchase/${p.token}`} className={styles.listingName}>
                        {p.listing?.title}
                      </Link>
                    </span>
                    <span>
                      <UserChip user={tab === 'sold' ? p.buyer : p.seller} size={24} />
                    </span>
                    <span className={styles.priceCell}>
                      {(tab === 'sold' && p.seller_amount !== undefined
                        ? p.seller_amount
                        : p.amount).toLocaleString()} VC
                    </span>
                    <span>{badge(p.status)}</span>
                    <span className={styles.dateCell}>{formatDate(p.created_at)}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
};

export default Dashboard;
