'use client';

import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useViewer } from '@/lib/gating';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import { useAutoRefresh } from '@/lib/useLiveData';
import { mediaUrl } from '@/lib/mediaUrl';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { track } from '@/lib/track';
import { useSession } from 'next-auth/react';
import { FaStore, FaCheckCircle, FaShoppingCart, FaStar, FaMapPin } from 'react-icons/fa';
import { IoArrowBack, IoLocationOutline, IoChatbubblesOutline } from 'react-icons/io5';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './vendor.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const CART_STORAGE_KEY = eventId => `vendor_cart_${eventId || 'unknown'}`;
const VendorStallContent = () => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event') || '';
  const viewer = useViewer();
  const vendorId = searchParams.get('vendor') || searchParams.get('id') || '';
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  const [pickedVariant, setPickedVariant] = useState('');
  const [fulfilment, setFulfilment] = useState('collect');
  const [delivery, setDelivery] = useState({ name: '', phone: '', address: '', note: '' });
  const [cartOpen, setCartOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json'
  }), [session?.user?.sessionToken]);

  // Fetch vendor
  // Keeps itself current. The loader lives inside its effect and shares a
  // closure with it, so the loop bumps a counter the effect depends on rather
  // than the loader being hoisted out. `quiet` is the important half: without
  // it a refresh would put the loading state back over content somebody is
  // reading, every interval, for ever.
  const [refreshTick, setRefreshTick] = useState(0);
  useAutoRefresh(() => setRefreshTick(t => t + 1), [], { interval: 30000 });

  // Which stall people actually walked to. Recorded HERE rather than on each
  // link that reaches it: there are three of those already (the event's vendor
  // tab, the shop listing, and a product card), and instrumenting links means
  // the fourth one somebody adds is silently uncounted.
  useEffect(() => {
    if (!eventId || !vendorId) return;
    track(eventId, 'vendor_stall', { ref: vendorId, fromEffect: true });
  }, [eventId, vendorId]);

  useEffect(() => {
    if (!vendorId) {
      setError(tt("msg.vendorIdMissing", "Vendor ID missing"));
      setLoading(false);
      return;
    }
    const quiet = refreshTick > 0;
    const fetchVendor = async () => {
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventId}/vendor/${vendorId}/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.status === 'success') {
          setVendor(data.data.vendor);
        } else {
          setError(apiMessage(tt, data, "api.vendorNotFound", "Vendor not found."));
        }
      } catch (err) {
        console.error('Vendor fetch error:', err);
        setError(tt("msg.networkError", "Network error"));
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [eventId, vendorId, authHeaders, refreshTick]);

  // Hydrate cart for this event.
  const cartHydrated = useRef(false);
  useEffect(() => {
    if (!eventId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY(eventId));
      setCart(raw ? JSON.parse(raw) : []);
    } catch {
      setCart([]);
    }
    cartHydrated.current = true;
  }, [eventId]);

  // Persist cart - only after hydration, otherwise the first render's empty
  // cart overwrites the stored one and every reload loses the basket.
  useEffect(() => {
    if (!eventId || typeof window === 'undefined' || !cartHydrated.current) return;
    localStorage.setItem(CART_STORAGE_KEY(eventId), JSON.stringify(cart));
  }, [cart, eventId]);
  // A line is one product in one option: a medium hoodie and a large one are
  // two lines, and the API is told which is which. Baskets saved before
  // options existed have no `variant`, and read as the plain product.
  const lineKey = i => `${i.id}:${i.variant || ''}`;
  const addToCart = (p, variant = '') => {
    if ((p.variants || []).length && !variant) return;
    setCart(prev => {
      const key = `${p.id}:${variant}`;
      const existing = prev.find(i => lineKey(i) === key);
      if (existing) {
        return prev.map(i => lineKey(i) === key ? {
          ...i,
          qty: i.qty + 1
        } : i);
      }
      return [...prev, {
        ...p,
        variant,
        qty: 1,
        vendor_id: vendor?.id,
        vendor_name: vendor?.name,
        price_ngn: p.price_ngn ?? 0
      }];
    });
    setActiveProduct(null);
    setPickedVariant('');
  };
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotalVc = cart.reduce((s, i) => s + Number(i.price || 0) * i.qty, 0);
  // Delivery is offered only when every line can be delivered: an order is
  // fulfilled once, and the API refuses a delivery carrying a collect-only item.
  const deliverable = cart.length > 0 && cart.every(i => i.can_deliver);
  const changeQty = (key, delta) => {
    setCart(prev => prev.map(i => lineKey(i) === key ? {
      ...i,
      qty: Math.max(0, i.qty + delta)
    } : i).filter(i => i.qty > 0));
  };
  const placeOrder = async () => {
    if (!cart.length) return;
    if (cartTotalVc > 0 && pin.length < 4) {
      setOrderError(tt('stall.pinNeeded', 'Enter your 4-digit wallet PIN to authorise this payment.'));
      return;
    }
    const wantsDelivery = deliverable && fulfilment === 'deliver';
    if (wantsDelivery && !(delivery.name.trim() && delivery.phone.trim() && delivery.address.trim())) {
      setOrderError(tt('stall.deliveryNeeded', 'A delivery needs a name, a phone number and an address.'));
      return;
    }
    setPlacing(true);
    setOrderError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/vendor/${vendorId}/order/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          items: cart.map(i => ({
            product_id: i.id,
            quantity: i.qty,
            variant: i.variant || ''
          })),
          pin,
          fulfilment: wantsDelivery ? 'deliver' : 'collect',
          delivery: wantsDelivery ? delivery : undefined
        })
      });
      const data = await res.json();
      if (data.status !== 'success') {
        setOrderError(apiMessage(tt, data, "api.couldNotPlaceTheOrder", "Could not place the order."));
        return;
      }
      setPlacedOrder(data.data.order);
      setCart([]);
      setPin('');
      try {
        localStorage.removeItem(CART_STORAGE_KEY(eventId));
      } catch {}
    } catch {
      setOrderError(tt('stall.connectionError', 'Connection error. Please try again.'));
    } finally {
      setPlacing(false);
    }
  };
  // A real request. Until 12 September this set a flag and showed "Message
  // sent" with nothing leaving the browser; the network tab was empty.
  const submitContact = async () => {
    if (!contactMsg.trim() || contactBusy) return;
    setContactBusy(true);
    setContactError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/vendor/${encodeURIComponent(vendorId)}/contact/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: contactMsg.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (data.status !== 'success') {
        setContactError(apiMessage(tt, data, 'stall.contactFailed', 'That did not send. Try again.'));
        return;
      }
      setContactSent(true);
      setContactMsg('');
    } catch {
      setContactError(tt('stall.connectionError', 'Connection error. Please try again.'));
    } finally {
      setContactBusy(false);
    }
  };
  const closeContact = () => {
    setContactOpen(false);
    setContactSent(false);
    setContactMsg('');
    setContactError('');
  };
  const productInCartQty = useMemo(() => {
    const map = {};
    cart.forEach(i => {
      map[i.id] = (map[i.id] || 0) + i.qty;
    });
    return map;
  }, [cart]);
  const renderShell = content => <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>{content}</div>
      </main>
      <BottomMenu />
    </div>;
  if (loading) return renderShell(<p className={styles.stateText}>{tt("ui.loading.vendor.stall.0650", "Loading vendor stall…")}</p>);
  if (error || !vendor) return renderShell(<div className={styles.errorState}>
        <h2 className={styles.errorTitle}>{tt("ui.couldn't.load.vendor.0e61", "Couldn't load vendor")}</h2>
        <p className={styles.errorSub}>{error || tx("Vendor not found.")}</p>
        <Link href={`/events/${eventId}/vendor-shop`} className={`${styles.errorBtn} goldBTN`}>
          {tt("ui.back.vendor.shop.9b5d", "Back to vendor shop")}
        </Link>
      </div>);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.topRow}>
            <Link href={`/events/${eventId}/vendor-shop`} className={styles.backLink}>
              <IoArrowBack /> {tt("ui.back.vendors.5aba", "Back to vendors")}
            </Link>
            <Link href={`/events/${eventId}/vendor-shop`} className={styles.cartChip}>
              <FaShoppingCart /> {cartCount} {tt("ui.cart.91c0", "in cart")}
            </Link>
          </div>

          {/* Banner */}
          <div className={styles.bannerWrap}>
            {vendor.banner ? <Image src={mediaUrl(vendor.banner)} alt={`${vendor.name} banner`} fill sizes="(min-width: 1024px) 70vw, 100vw" style={{
            objectFit: 'cover'
          }} unoptimized priority /> : <div className={styles.bannerFallback}><FaStore /></div>}
            <div className={styles.bannerOverlay} />
          </div>

          {/* Header block */}
          <div className={styles.headerBlock}>
            <div className={styles.headerLeft}>
              <div className={styles.logoWrap}>
                {vendor.logo ? <Image src={mediaUrl(vendor.logo)} alt={vendor.name} width={84} height={84} className={styles.vendorLogo} unoptimized /> : <div className={styles.vendorLogoPlaceholder}><FaStore /></div>}
              </div>
              <div>
                <div className={styles.titleRow}>
                  <h1 className={styles.vendorName}>{vendor.name}</h1>
                  <span className={`${styles.statusPill} ${styles['status_' + vendor.status]}`}>
                    {vendor.status}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <IoLocationOutline /> {tt("ui.booth.8ca3", "Booth")} {vendor.booth_number || vendor.booth}
                  </span>
                  {vendor.category && <span className={styles.category}>{vendor.category}</span>}
                  {typeof vendor.rating === 'number' && <span className={styles.metaItem}>
                      <FaStar className={styles.starIcon} /> {vendor.rating.toFixed(1)}
                    </span>}
                </div>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.contactBtn} onClick={() => setContactOpen(true)} type="button">
                <IoChatbubblesOutline /> {tt("ui.contact.b374", "Contact")}
              </button>
              <Link href={`/events/${eventId}?tab=map`} className={`${styles.mapBtn} goldBTN`}>
                <FaMapPin /> {tt("ui.visit.booth.venue.68db", "Visit booth at venue")}
              </Link>
            </div>
          </div>

          {vendor.description && <p className={styles.description}>{tx(vendor.description)}</p>}

          <h2 className={styles.sectionTitle}>{tt("ui.products.fe0a", "Products")}</h2>

          {!vendor.products || vendor.products.length === 0 ? <p className={styles.stateText}>{tt("ui.no.products.available.yet.33c5", "No products available yet.")}</p> : <div className={styles.productGrid}>
              {vendor.products.map(p => <button key={p.id} className={styles.productCard} onClick={() => setActiveProduct(p)} type="button">
                  <div className={styles.productImgWrap}>
                    {p.image ? <Image src={mediaUrl(p.image)} alt={p.name} fill sizes="(min-width: 1024px) 25vw, 50vw" style={{
                objectFit: 'cover'
              }} unoptimized /> : <div className={styles.productImgFallback}><FaStore /></div>}
                    {!p.in_stock && <span className={styles.oosBadge}>{tt("ui.sold.out.02ff", "Sold out")}</span>}
                    {productInCartQty[p.id] > 0 && <span className={styles.inCartBadge}>
                        <FaCheckCircle /> {productInCartQty[p.id]} {tt("ui.cart.91c0", "in cart")}
                      </span>}
                  </div>
                  <div className={styles.productBody}>
                    <p className={styles.productName}>{p.name}</p>
                    <p className={styles.productPrice}>
                      {formatNumber(Number(p.price || 0))} VC
                    </p>
                    {(p.variants || []).length > 0 && <p className={styles.productOptions}>{p.variants.join(' · ')}</p>}
                    <span className={styles.addBtn}>
                      {p.in_stock ? tx("Add to cart") : tt('stall.unavailable', 'Unavailable')}
                    </span>
                  </div>
                </button>)}
            </div>}
        </div>
      </main>

      <BottomMenu />

      {/* Product modal */}
      {activeProduct && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) { setActiveProduct(null); setPickedVariant(''); }
    }}>
          <div className={styles.productModal}>
            <button className={styles.modalCloseAbs} onClick={() => { setActiveProduct(null); setPickedVariant(''); }} type="button" aria-label={tt("ui.close.bbfa", "Close")}>
              <MdOutlineClose />
            </button>
            <div className={styles.productModalImgWrap}>
              {activeProduct.image ? <Image src={mediaUrl(activeProduct.image)} alt={activeProduct.name} fill sizes="500px" style={{
            objectFit: 'cover'
          }} unoptimized /> : <div className={styles.productImgFallback}><FaStore /></div>}
            </div>
            <div className={styles.productModalBody}>
              <p className={styles.productModalVendor}>{vendor.name}</p>
              <h2 className={styles.productModalName}>{activeProduct.name}</h2>
              <p className={styles.productModalPrice}>
                {formatNumber(Number(activeProduct.price || 0))} VC
              </p>
              {activeProduct.description && <p className={styles.productModalDesc}>{activeProduct.description}</p>}
              <p className={styles.stockHint}>
                {activeProduct.in_stock
                  ? tt('stall.availableAtBooth', '{n} available at booth {booth}')
                      .replace('{n}', formatNumber(Number(activeProduct.stock || 0)))
                      .replace('{booth}', vendor.booth_number || vendor.booth || '-')
                  : tx("Currently sold out - check back later.")}
                {activeProduct.in_stock && activeProduct.can_deliver && ` · ${tt('stall.canDeliver', 'Can be delivered')}`}
              </p>
              {(activeProduct.variants || []).length > 0 && <div className={styles.optionBlock}>
                  <p className={styles.optionLabel}>{tt('stall.pickOption', 'Pick one')}</p>
                  <div className={styles.optionRow} role="group" aria-label={tt('stall.pickOption', 'Pick one')}>
                    {activeProduct.variants.map(v => <button key={v} type="button" className={styles.optionChip} aria-pressed={pickedVariant === v} onClick={() => setPickedVariant(v)}>{v}</button>)}
                  </div>
                </div>}
              <button className={`${styles.addToCartBtn} ${activeProduct.in_stock ? 'goldBTN' : ''}`} onClick={() => addToCart(activeProduct, pickedVariant)} disabled={!activeProduct.in_stock || ((activeProduct.variants || []).length > 0 && !pickedVariant)} type="button">
                {!activeProduct.in_stock ? tx("Sold out") : ((activeProduct.variants || []).length > 0 && !pickedVariant) ? tt('stall.pickOptionFirst', 'Pick an option first') : tx("Add to cart")}
              </button>
            </div>
          </div>
        </div>}

      {/* Contact modal */}
      {contactOpen && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) closeContact();
    }}>
          <div className={styles.contactModal}>
            <div className={styles.contactHeader}>
              <h2 className={styles.contactTitle}>{tt("ui.contact.b374", "Contact")} {vendor.name}</h2>
              <button className={styles.modalCloseAbs} style={{
            position: 'static'
          }} onClick={closeContact} type="button" aria-label={tt("ui.close.bbfa", "Close")}>
                <MdOutlineClose />
              </button>
            </div>
            <div className={styles.contactBody}>
              {!contactSent ? <NeedsAccount action={tt('stall.contactAction', 'message a stallholder')}>
                  <p className={styles.contactSub}>
                    {tt('stall.contactHow', 'Ask a quick question. The stallholder gets it as a notification with your username, and can find you at the booth or on your profile.')}
                  </p>
                  <textarea className={styles.contactInput} rows={4} maxLength={400} placeholder={tt("ui.e.g.do.have.c6e0", "e.g. Do you have the Limited Tee in size XL?")} value={contactMsg} onChange={e => setContactMsg(e.target.value)} />
                  {contactError && <p className={styles.orderError} role="alert">{contactError}</p>}
                  <button className={`${styles.contactSendBtn} redBTN`} onClick={submitContact} disabled={!contactMsg.trim() || contactBusy} type="button">
                    {contactBusy ? tt('stall.sending', 'Sending...') : tt("ui.send.message.c70a", "Send message")}
                  </button>
                </NeedsAccount> : <div className={styles.contactSuccess}>
                  <FaCheckCircle className={styles.successIcon} />
                  <p className={styles.successTitle}>{tt("ui.message.sent.9cf1", "Message sent")}</p>
                  <p className={styles.successSub}>
                    {tt('stall.contactSentHow', '{name} has it as a notification with your username.').replace('{name}', vendor.name)}
                  </p>
                  <button className={`${styles.contactSendBtn} goldBTN`} onClick={closeContact} type="button">
                    {tt("ui.done.e9b4", "Done")}
                  </button>
                </div>}
            </div>
          </div>
        </div>}

      {/* Sticky checkout bar: the cart chip only links back to the shop index,
          so ordering needs its own control. */}
      {cart.length > 0 && !cartOpen && <div className={styles.checkoutBar}>
          <div className={styles.checkoutBarInfo}>
            <span className={styles.checkoutBarCount}>{cartCount} {tt("ui.item.3a7d", "item")}{cartCount === 1 ? '' : 's'}</span>
            <span className={styles.checkoutBarTotal}>{formatNumber(cartTotalVc)} VC</span>
          </div>
          <button type="button" className={`${styles.checkoutBarBtn} goldBTN`} onClick={() => {
        setCartOpen(true);
        setPlacedOrder(null);
        setOrderError('');
      }}>
            {tt("ui.review.order.cd4d", "Review order")}
          </button>
        </div>}

      {/* ── Cart / checkout ── */}
      {cartOpen && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) setCartOpen(false);
    }}>
          <div className={styles.cartPanel}>
            <div className={styles.cartHeader}>
              <h2 className={styles.cartTitle}>
                {placedOrder ? tx("Order placed") : `Your order · ${vendor?.name || ''}`}
              </h2>
              <button className={styles.cartClose} onClick={() => setCartOpen(false)} aria-label={tt("ui.close.bbfa", "Close")}>
                <MdOutlineClose />
              </button>
            </div>

            {placedOrder ? <div className={styles.cartBody}>
                <p className={styles.orderCode}>{placedOrder.code}</p>
                <p className={styles.orderHint}>
                  {placedOrder.fulfilment === 'deliver'
                    ? tt('stall.deliveryOnItsWay', 'It will be delivered to {name}. The stallholder marks it sent with a tracking number, and you see that in your orders.').replace('{name}', placedOrder.delivery_name || delivery.name)
                    : `${tt("ui.show.this.code.at.f5ec", "Show this code at booth")} ${vendor?.booth || vendor?.booth_number || '-'} ${tt("ui.collect.af4d", "to collect.")}`}
                </p>
                <ul className={styles.orderLines}>
                  {placedOrder.items.map(i => <li key={`${i.product_id}:${i.variant || ''}`} className={styles.orderLine}>
                      <span>{i.quantity} × {i.name}{i.variant ? ` (${i.variant})` : ''}</span>
                      <span>{formatNumber(i.line_vc)} VC</span>
                    </li>)}
                </ul>
                <div className={styles.cartTotalRow}>
                  <span>{tt("ui.paid.dc9d", "Paid")}</span>
                  <span className={styles.cartTotalVal}>{formatNumber(placedOrder.total_vc)} VC</span>
                </div>
              </div> : cart.length === 0 ? <div className={styles.cartBody}>
                <p className={styles.stateText}>{tt("ui.order.empty.add.something.1970", "Your order is empty. Add something from the stall.")}</p>
              </div> : <div className={styles.cartBody}>
                <ul className={styles.orderLines}>
                  {cart.map(i => <li key={lineKey(i)} className={styles.orderLine}>
                      <span className={styles.cartItemName}>{i.name}{i.variant ? ` (${i.variant})` : ''}</span>
                      <span className={styles.qtyControls}>
                        <button type="button" onClick={() => changeQty(lineKey(i), -1)} aria-label={tt("ui.remove.one.afbc", "Remove one")}>-</button>
                        <span>{i.qty}</span>
                        <button type="button" onClick={() => changeQty(lineKey(i), 1)} aria-label={tt("ui.add.one.bb49", "Add one")}>+</button>
                      </span>
                      <span>{formatNumber(Number(i.price || 0) * i.qty)} VC</span>
                    </li>)}
                </ul>

                <div className={styles.cartTotalRow}>
                  <span>{tt("ui.total.b259", "Total")}</span>
                  <span className={styles.cartTotalVal}>{formatNumber(cartTotalVc)} VC</span>
                </div>

                {/* Paying needs a wallet, so a stranger is told that here rather
                    than after typing a PIN. */}
                <NeedsAccount action={tt('stall.payAction', 'pay for an order from your wallet')}>
                  {deliverable && <div className={styles.optionBlock}>
                      <p className={styles.optionLabel}>{tt('stall.howToGetIt', 'How do you want it?')}</p>
                      <div className={styles.optionRow} role="group" aria-label={tt('stall.howToGetIt', 'How do you want it?')}>
                        <button type="button" className={styles.optionChip} aria-pressed={fulfilment === 'collect'} onClick={() => setFulfilment('collect')}>{tt('stall.collectAtBooth', 'Collect at the booth')}</button>
                        <button type="button" className={styles.optionChip} aria-pressed={fulfilment === 'deliver'} onClick={() => setFulfilment('deliver')}>{tt('stall.deliverToMe', 'Deliver to me')}</button>
                      </div>
                    </div>}
                  {deliverable && fulfilment === 'deliver' && <div className={styles.deliveryBlock}>
                      <input className={styles.pinInputPlain} placeholder={tt('stall.deliveryName', 'Name on the parcel')} value={delivery.name} onChange={e => setDelivery({ ...delivery, name: e.target.value })} autoComplete="name" aria-label={tt('stall.deliveryName', 'Name on the parcel')} />
                      <input className={styles.pinInputPlain} placeholder={tt('stall.deliveryPhone', 'Phone number')} value={delivery.phone} onChange={e => setDelivery({ ...delivery, phone: e.target.value })} inputMode="tel" autoComplete="tel" aria-label={tt('stall.deliveryPhone', 'Phone number')} />
                      <textarea className={styles.pinInputPlain} rows={2} placeholder={tt('stall.deliveryAddress', 'Delivery address')} value={delivery.address} onChange={e => setDelivery({ ...delivery, address: e.target.value })} autoComplete="street-address" aria-label={tt('stall.deliveryAddress', 'Delivery address')} />
                      <input className={styles.pinInputPlain} placeholder={tt('stall.deliveryNote', 'Anything the rider should know (optional)')} value={delivery.note} onChange={e => setDelivery({ ...delivery, note: e.target.value })} maxLength={200} aria-label={tt('stall.deliveryNote', 'Anything the rider should know (optional)')} />
                    </div>}
                  {!deliverable && cart.some(i => i.can_deliver) && <p className={styles.stateText}>{tt('stall.collectOnlyMixed', 'Something in this order can only be collected, so the whole order is collected at the booth.')}</p>}

                  {cartTotalVc > 0 && <div className={styles.pinBlock}>
                      <label className={styles.pinLabel} htmlFor="vendor-pin"><span className="fieldLabelRow">{tt("ui.wallet.pin.2cdf", "Wallet PIN")} <InfoTip id="walletPin" /></span></label>
                      <input id="vendor-pin" type="password" inputMode="numeric" maxLength={6} className={styles.pinInput} placeholder="••••" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="off" />
                    </div>}

                  {orderError && <p className={styles.orderError} role="alert">{orderError}</p>}

                  <button className={`${styles.checkoutBtn} goldBTN`} onClick={placeOrder} disabled={placing} type="button">
                    {placing ? tx("Placing order…") : `${tt('stall.pay', 'Pay')} ${formatNumber(cartTotalVc)} VC`}
                  </button>
                </NeedsAccount>
              </div>}
          </div>
        </div>}
    </div>;
};
const VendorStall = () => {
  const tt = useT();
  return <Suspense fallback={<div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>{tt("ui.loading.33ce", "Loading…")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>}>
    <VendorStallContent />
  </Suspense>;
};
export default VendorStall;