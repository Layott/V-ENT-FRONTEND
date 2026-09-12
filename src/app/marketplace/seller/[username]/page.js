'use client';

// Somebody's record as a seller: what they have sold, what people said, and
// everything they have listed.
//
// Public, because it is the page a buyer reads before deciding to trust a
// stranger with coins, and a trust page nobody can reach from a search is a
// trust page that does not do its job.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaStar } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { call, fill, useMarketplaceOpen } from '@/lib/marketplace';
import styles from '../seller.module.css';

const SellerPage = ({ params }) => {
  const tt = useT();
  const username = decodeURIComponent(params.username);
  const open = useMarketplaceOpen();

  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    if (!open) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await call(`/sellers/${encodeURIComponent(username)}/`);
      setSeller(data.seller);
      setListings(data.listings || []);
    } catch (err) {
      setProblem(err.code === 'SELLER_NOT_FOUND'
        ? tt('mk.noSeller', 'Nobody by that name sells here.')
        : err.message);
    } finally {
      setLoading(false);
    }
  }, [open, username, tt]);

  useEffect(() => { load(); }, [load]);

  if (open === null) return null;
  if (!open) {
    return <ComingSoon
      phase="Phase 4"
      title={tt('mk.title', 'Vermillion City')}
      blurb={tt('mk.comingSoon', 'Player to player listings, offers and escrow are built and not open yet.')}
      alternatives={[{ href: '/tournaments', label: tt('ui.tournaments.fee2', 'Tournaments') }]} />;
  }

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

          {loading && <p className={styles.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>}
          {problem && <p className={styles.stateText} role="alert">{problem}</p>}

          {seller && (
            <>
              <section className={styles.hero}>
                <span className={styles.heroBg} />
                <div className={styles.heroTop}>
                  <UserChip user={seller} size={72} nameClassName={styles.heroName} />
                  <div className={styles.heroBody}>
                    <p className={styles.heroSub}>
                      <Link href={`/u/${seller.username}`}>
                        {tt('mk.seeProfile', 'Their V-ENT profile')}
                      </Link>
                    </p>
                    <div className={styles.heroStats}>
                      <span className={styles.heroStat}>
                        <span className={styles.heroStatValue}>{seller.sales ?? 0}</span>
                        <span className={styles.heroStatLabel}>{tt('mk.statSales', 'Sales')}</span>
                      </span>
                      <span className={styles.heroStat}>
                        <span className={styles.heroStarValue}>
                          {seller.rating ? <><FaStar aria-hidden="true" /> {seller.rating}</> : '-'}
                        </span>
                        <span className={styles.heroStatLabel}>{tt('mk.statRating', 'Rating')}</span>
                      </span>
                      <span className={styles.heroStat}>
                        <span className={styles.heroStatValue}>{seller.reviews ?? 0}</span>
                        <span className={styles.heroStatLabel}>{tt('mk.statReviews', 'Reviews')}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <h2 className={styles.tabBtn}>{tt('mk.theirListings', 'What they are selling')}</h2>

              {listings.length === 0 ? (
                <p className={styles.stateText}>
                  {tt('mk.nothingLive', 'Nothing live right now.')}
                </p>
              ) : (
                <div className={styles.listingsGrid}>
                  {listings.map(l => (
                    <Link key={l.listing_id}
                          href={`/marketplace/listing/${l.slug || l.listing_id}`}
                          className={styles.lcard}>
                      {l.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.cover} alt={l.title} className={styles.lcardImg} />
                      )}
                      <div className={styles.lcardBody}>
                        <span className={styles.lcardTitle}>{l.title}</span>
                        <span className={styles.lcardPrice}>
                          {(l.price || 0).toLocaleString()} VC
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default SellerPage;
