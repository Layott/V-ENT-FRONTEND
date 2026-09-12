'use client';

// One listing: what it is, who is selling it, and the two things a buyer can
// actually do about it.
//
// The buy flow is deliberately two presses. The first asks the server for the
// quote - the total, the commission and what the seller receives - and shows
// all three. The second commits. A fee somebody discovers on the receipt is a
// fee they did not agree to, and the server refuses without `confirm` for the
// same reason.
//
// Nothing here is rendered live to somebody who cannot use it. Signed out, the
// buy and offer controls are replaced by one sentence and a link, which is the
// project's rule: tell somebody what they need BEFORE they spend effort.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaStar } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { formatDateTime } from '@/lib/datetime';
import { call, fill, useMarketplaceOpen } from '@/lib/marketplace';
import styles from '../listing.module.css';

export default function ListingClient({ slug }) {
  const tt = useT();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;
  const me = session?.user?.username;

  const open = useMarketplaceOpen();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [toast, setToast] = useState('');
  const [shot, setShot] = useState(0);

  // The two flows that ask before they act.
  const [quote, setQuote] = useState(null);
  const [offer, setOffer] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!open) { setLoading(false); return; }
    setLoading(true);
    setProblem('');
    try {
      const data = await call(`/listings/${encodeURIComponent(slug)}/`);
      setListing(data.listing);
    } catch (err) {
      if (err.code === 'SLUG_CHANGED' && err.data?.url) {
        router.replace(err.data.url);
        return;
      }
      setProblem(err.code === 'LISTING_NOT_FOUND'
        ? tt('mk.gone', 'That listing is not here any more.')
        : tt('mk.loadFailed', 'The listings could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [open, slug, router, tt]);

  useEffect(() => { load(); }, [load]);

  const say = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const askQuote = async () => {
    setBusy(true);
    try {
      setQuote(await call(`/listings/${encodeURIComponent(slug)}/buy/`, { token }));
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmBuy = async () => {
    setBusy(true);
    try {
      const data = await call(`/listings/${encodeURIComponent(slug)}/buy/`, {
        method: 'POST', token, body: { confirm: true },
      });
      setQuote(null);
      router.push(`/marketplace/purchase/${data.purchase.token}`);
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendOffer = async () => {
    const amount = Number(offer);
    if (!amount) return;
    setBusy(true);
    try {
      await call(`/listings/${encodeURIComponent(slug)}/bids/`, {
        method: 'POST', token, body: { amount },
      });
      setOffer('');
      say(tt('mk.offerSent', 'Your offer is with the seller.'));
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  const report = async () => {
    setBusy(true);
    try {
      await call(`/listings/${encodeURIComponent(slug)}/report/`, {
        method: 'POST', token, body: { reason: 'scam' },
      });
      say(tt('mk.reported', 'Reported. Somebody will look at it.'));
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ask = async () => {
    setBusy(true);
    try {
      const data = await call(`/listings/${encodeURIComponent(slug)}/inquire/`, {
        method: 'POST', token, body: { message: '' },
      });
      router.push(`/community/dm/${data.conversation}`);
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

  const media = listing?.media || [];
  const cover = media[shot]?.url || listing?.cover;
  // Decided on STATUS, never on data alone: `data` cannot tell "signed out"
  // from "still asking", and deciding while asking is how a page offers the
  // owner their own Buy button for half a second.
  const signedIn = status === 'authenticated';
  const mine = signedIn && me && listing?.seller?.username === me;

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

          {problem && <p className={styles.errorBanner} role="alert">{problem}</p>}
          {loading && <p className={styles.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>}

          {listing && (
            <div className={styles.layout}>
              <div>
                <div className={styles.gallery}>
                  <div className={styles.mainImageWrap}>
                    {cover
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={cover} alt={listing.title} className={styles.mainImage} />
                      : <p className={styles.stateText}>
                          {tt('mk.noPictures', 'No pictures on this listing.')}
                        </p>}
                  </div>
                  {media.length > 1 && (
                    <div className={styles.thumbStrip}>
                      {media.map((m, i) => (
                        <button key={m.id} type="button"
                                className={`${styles.thumb} ${i === shot ? styles.thumbActive : ''}`}
                                aria-label={fill(tt('mk.picture', 'Picture {n}'), { n: i + 1 })}
                                onClick={() => setShot(i)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.url} alt={m.caption || listing.title}
                               className={styles.thumbImg} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <h1 className={styles.listingTitle}>{listing.title}</h1>
                <div className={styles.listingMeta}>
                  <span className={styles.metaPill}>
                    {tt(`mk.kind.${listing.kind}`, listing.kind)}
                  </span>
                  <span className={styles.metaPill}>
                    {tt(`mk.cat.${listing.category}`, listing.category)}
                  </span>
                  {listing.kind === 'sale' && (
                    <span className={styles.metaPillStock}>
                      {fill(tt('mk.left', '{n} left'), { n: listing.quantity })}
                    </span>
                  )}
                  {listing.expires_at && (
                    <span className={styles.metaPill}>
                      {fill(tt('mk.until', 'Until {when}'),
                            { when: formatDateTime(listing.expires_at) })}
                    </span>
                  )}
                </div>

                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>{tt('mk.about', 'About this')}</h2>
                  <p className={styles.descText}>
                    {listing.description || tt('mk.noDescription', 'The seller has not written anything yet.')}
                  </p>
                </section>

                {(listing.offered || listing.wanted || listing.experience) && (
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{tt('mk.details', 'The details')}</h2>
                    <div className={styles.specsTable}>
                      {listing.offered && (
                        <div className={styles.specItem}>
                          <span className={styles.specLabel}>{tt('mk.offered', 'On offer')}</span>
                          <span className={styles.specValue}>{listing.offered}</span>
                        </div>
                      )}
                      {listing.wanted && (
                        <div className={styles.specItem}>
                          <span className={styles.specLabel}>{tt('mk.wanted', 'Wanted in return')}</span>
                          <span className={styles.specValue}>{listing.wanted}</span>
                        </div>
                      )}
                      {listing.experience && (
                        <div className={styles.specItem}>
                          <span className={styles.specLabel}>{tt('mk.experience', 'Experience')}</span>
                          <span className={styles.specValue}>{listing.experience}</span>
                        </div>
                      )}
                      {listing.location && (
                        <div className={styles.specItem}>
                          <span className={styles.specLabel}>{tt('mk.where', 'Where')}</span>
                          <span className={styles.specValue}>{listing.location}</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {(listing.reviews || []).length > 0 && (
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                      {tt('mk.reviews', 'What buyers said')}
                    </h2>
                    {listing.reviews.map((r, i) => (
                      <div key={i} className={styles.review}>
                        <div className={styles.reviewHead}>
                          <UserChip user={r.by} size={24} nameClassName={styles.reviewAuthor} />
                          <span className={styles.reviewStars}>
                            <FaStar aria-hidden="true" /> {r.rating}
                          </span>
                        </div>
                        {r.body && <p className={styles.reviewBody}>{r.body}</p>}
                      </div>
                    ))}
                  </section>
                )}
              </div>

              <aside className={styles.rail}>
                <div className={styles.pricePanel}>
                  <span className={styles.priceLabel}>{tt('mk.priceLabel', 'Price')}</span>
                  <span className={styles.priceVal}>{(listing.price || 0).toLocaleString()}</span>
                  <span className={styles.priceUnit}>VC</span>
                  {listing.price_kind && (
                    <span className={styles.priceSub}>
                      {tt(`mk.priceKind.${listing.price_kind}`, listing.price_kind)}
                    </span>
                  )}

                  {!signedIn ? (
                    <p className={styles.stateText}>
                      {tt('mk.signInToBuy', 'Sign in to buy this or make an offer.')}{' '}
                      <Link href="/login" className={styles.ghostBtn}>
                        {tt('ui.log.in.2f3d', 'Log in')}
                      </Link>
                    </p>
                  ) : mine ? (
                    <p className={styles.stateText}>
                      {tt('mk.yours', 'This is your listing.')}{' '}
                      <Link href="/marketplace/dashboard" className={styles.ghostBtn}>
                        {tt('mk.dashboard', 'What I am selling')}
                      </Link>
                    </p>
                  ) : (
                    <div className={styles.actionRow}>
                      <button type="button" className={styles.primaryBtn} disabled={busy}
                              onClick={askQuote}>
                        {tt('mk.buy', 'Buy this')}
                      </button>
                      <button type="button" className={styles.ghostBtn} disabled={busy}
                              onClick={ask}>
                        {tt('mk.ask', 'Ask a question')}
                      </button>
                      {listing.bidding && (
                        <div className={styles.actionInline}>
                          <input className={styles.modalInput} type="number" value={offer}
                                 aria-label={tt('mk.yourOffer', 'Your offer in VC')}
                                 placeholder={tt('mk.yourOffer', 'Your offer in VC')}
                                 onChange={e => setOffer(e.target.value.replace(/[^0-9]/g, ''))} />
                          <button type="button" className={styles.ghostBtn}
                                  disabled={busy || !offer} onClick={sendOffer}>
                            {tt('mk.makeOffer', 'Make an offer')}
                          </button>
                        </div>
                      )}
                      <button type="button" className={styles.ghostBtn} disabled={busy}
                              onClick={report}>
                        {tt('mk.report', 'Report this listing')}
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.sellerCard}>
                  <UserChip user={listing.seller} size={44} nameClassName={styles.sellerName} />
                  <div className={styles.sellerInfo}>
                    <span className={styles.sellerSub}>
                      {fill(tt('mk.sales', '{n} sales'),
                            { n: listing.seller_record?.sales ?? 0 })}
                    </span>
                    {listing.seller_record?.rating && (
                      <span className={styles.sellerRating}>
                        <FaStar aria-hidden="true" /> {listing.seller_record.rating}
                      </span>
                    )}
                  </div>
                  <Link href={`/marketplace/seller/${listing.seller?.username}`}
                        className={styles.sellerVisitBtn}>
                    {tt('mk.seeSeller', 'Everything they sell')}
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      <BottomMenu />

      {/* The quote, before anything moves. Both numbers, and the total. */}
      {quote && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{tt('mk.confirmTitle', 'Before you pay')}</h2>
              <button type="button" className={styles.modalClose}
                      aria-label={tt('ui.close.bbfa', 'Close')}
                      onClick={() => setQuote(null)}>x</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalConfirmRow}>
                <span className={styles.modalLabel}>{tt('mk.youPay', 'You pay')}</span>
                <span className={styles.modalValue}>{quote.total.toLocaleString()} VC</span>
              </div>
              <div className={styles.modalConfirmRow}>
                <span className={styles.modalLabel}>{tt('mk.platformFee', 'V-ENT keeps')}</span>
                <span className={styles.modalValue}>{quote.commission.toLocaleString()} VC</span>
              </div>
              <div className={styles.modalConfirmRow}>
                <span className={styles.modalLabel}>{tt('mk.sellerGets', 'The seller receives')}</span>
                <span className={styles.modalValueGreen}>
                  {quote.seller_receives.toLocaleString()} VC
                </span>
              </div>
              <p className={styles.modalNote}>
                {tt('mk.escrowNote', 'Your coins are held by V-ENT until you say it arrived. If it does not, they come back to you.')}
              </p>
            </div>
            <div className={styles.modalActionRow}>
              <button type="button" className={styles.modalPrimary} disabled={busy}
                      onClick={confirmBuy}>
                {busy ? tt('mk.paying', 'Holding your coins…') : tt('mk.confirmBuy', 'Hold my coins and buy')}
              </button>
              <button type="button" className={styles.modalSecondary}
                      onClick={() => setQuote(null)}>
                {tt('ui.cancel.0f8e', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
}
