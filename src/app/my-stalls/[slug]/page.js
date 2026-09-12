'use client';

// Running one stall: what you sell, and what people have ordered.
//
// CEO, 7 September 2026: "run the vendor UI properly. build all screens."
// And row 146: "full control of all of these things they need to make sale,
// stock, shop, images, good, quantity, variants, etc then when people have
// bought, if they re doing delivery there has to be a way for these thingd to
// works."
//
// Two tabs, because a stallholder is doing one of two jobs at any moment:
// setting the table up, or getting orders out. Mixing them puts the thing they
// need during a rush behind the thing they only touch once.
//
// The delivery half is deliberately plain. A stallholder marking a parcel sent
// is standing up, holding a phone in one hand and a box in the other, so the
// control is one big button and a tracking box that can be left empty.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Avatar from '@/components/avatar/Avatar';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatDateTime, formatNumber } from '@/lib/datetime';
import { mediaUrl } from '@/lib/mediaUrl';
import { useT } from '@/i18n/LanguageProvider';
import styles from './stall.module.css';

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', stock: '', variants: '', can_deliver: false,
};

const StallPage = ({ params }) => {
  const tt = useT();
  const slug = decodeURIComponent(params.slug);
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;

  const [tab, setTab] = useState('shop');
  const [stall, setStall] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ open: 0, to_deliver: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(EMPTY_PRODUCT);
  const [editing, setEditing] = useState(null);
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  // The order being marked as sent, and the tracking number typed for it.
  // In place rather than window.prompt: the browser draws that one in its
  // own words, and it cannot be translated or styled.
  const [sending, setSending] = useState(null);
  const [tracking, setTracking] = useState('');

  const say = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const api = useCallback(async (path, options = {}) => {
    const isForm = options.body instanceof FormData;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/event/my-stalls/${encodeURIComponent(slug)}${path}`,
      {
        headers: {
          ...(isForm ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
      });
    return res.json().catch(() => ({ status: 'error' }));
  }, [slug, token]);

  const loadStall = useCallback(async () => {
    const out = await api('/');
    if (out?.status === 'success') {
      setStall(out.data.stall);
      setProducts(out.data.products || []);
      setError(null);
    } else {
      setError(apiMessage(tt, out, 'api.somethingWentWrong', 'Something went wrong.'));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const loadOrders = useCallback(async () => {
    const out = await api('/orders/');
    if (out?.status === 'success') {
      setOrders(out.data.orders || []);
      setSummary({ open: out.data.open || 0, to_deliver: out.data.to_deliver || 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!token) { setLoading(false); return; }
    loadStall();
    loadOrders();
  }, [status, token, loadStall, loadOrders]);

  // Orders arrive while the stallholder is standing at the table, so this
  // keeps itself current. Only the ORDERS: re-reading the product list under
  // somebody who is halfway through editing a price would take their typing
  // with it.
  useAutoRefresh(() => { if (token) loadOrders(); });

  const saveProduct = async () => {
    if (busy) return;
    setBusy(true);
    let out;
    if (editing) {
      // An image needs multipart; everything else is cleaner as JSON.
      if (image) {
        const form = new FormData();
        form.append('image', image);
        await api(`/products/${editing}/`, { method: 'PATCH', body: form });
      }
      out = await api(`/products/${editing}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name, description: draft.description,
          price: Number(draft.price || 0), stock: Number(draft.stock || 0),
          variants: draft.variants, can_deliver: draft.can_deliver,
        }),
      });
    } else {
      const form = new FormData();
      form.append('name', draft.name);
      form.append('description', draft.description);
      form.append('price', String(Number(draft.price || 0)));
      form.append('stock', String(Number(draft.stock || 0)));
      if (image) form.append('image', image);
      out = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event/vendor/${encodeURIComponent(slug)}/products/`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
      ).then((r) => r.json()).catch(() => ({ status: 'error' }));
      // Variants and deliverability are not on the create endpoint, so a new
      // product that has them is created and then completed. One extra call,
      // and it keeps the create endpoint as it was for everything already
      // calling it.
      if (out?.status === 'success' && (draft.variants.trim() || draft.can_deliver)) {
        await api(`/products/${out.data.product.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ variants: draft.variants, can_deliver: draft.can_deliver }),
        });
      }
    }
    setBusy(false);
    if (out?.status !== 'success') {
      return say(apiMessage(tt, out, 'api.saveFailed', 'Save failed'));
    }
    say(editing ? tt('stall.productSaved', 'Saved.') : tt('stall.productAdded', 'On the stall.'));
    setDraft(EMPTY_PRODUCT);
    setEditing(null);
    setImage(null);
    loadStall();
  };

  const removeProduct = async (p) => {
    if (busy) return;
    setBusy(true);
    const out = await api(`/products/${p.id}/`, { method: 'DELETE' });
    setBusy(false);
    if (out?.status !== 'success') {
      return say(apiMessage(tt, out, 'api.saveFailed', 'Could not remove it'));
    }
    say(out.message);
    loadStall();
  };

  const moveOrder = async (order, next, tracking) => {
    if (busy) return;
    setBusy(true);
    const out = await api(`/orders/${order.code}/status/`, {
      method: 'POST',
      body: JSON.stringify({ status: next, ...(tracking ? { tracking } : {}) }),
    });
    setBusy(false);
    if (out?.status !== 'success') {
      return say(apiMessage(tt, out, 'api.saveFailed', 'Could not update it'));
    }
    say(out.message);
    loadOrders();
  };

  const setOpen = async (next) => {
    const out = await api('/', { method: 'PATCH', body: JSON.stringify({ status: next }) });
    if (out?.status !== 'success') {
      return say(apiMessage(tt, out, 'api.saveFailed', 'Could not change it'));
    }
    say(next === 'live' ? tt('stall.nowOpen', 'Your stall is open.')
      : tt('stall.nowClosed', 'Your stall is closed.'));
    loadStall();
  };

  const beginEdit = (p) => {
    setEditing(p.id);
    setImage(null);
    setDraft({
      name: p.name, description: p.description || '',
      price: String(p.price_ngn ?? ''), stock: String(p.stock ?? ''),
      variants: (p.variants || []).join(', '), can_deliver: !!p.can_deliver,
    });
  };

  const set = (key) => (e) => setDraft((d) => ({
    ...d, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  const deliveries = useMemo(
    () => orders.filter((o) => o.fulfilment === 'deliver'), [orders]);

  if (status !== 'loading' && !token) {
    return (
      <div className={styles.page}>
        <Header /><MobileHeader />
        <main className={styles.main}>
          <Sidebar />
          <div className={styles.content}>
            <p className={styles.muted}>{tt('stall.signIn', 'Sign in to see the stalls you run.')}</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <div className={styles.content}>
          <Link href="/my-stalls" className={styles.back}>
            {tt('stall.backToStalls', 'All my stalls')}
          </Link>

          {loading && <p className={styles.muted}>{tt('stall.loading', 'Loading your stalls...')}</p>}
          {error && <p className={styles.error}>{error}</p>}
          {notice && <p className={styles.notice}>{notice}</p>}

          {stall && (
            <>
              <div className={styles.head}>
                <Avatar src={mediaUrl(stall.logo)} name={stall.name} size={56} rounded={false} />
                <div className={styles.headText}>
                  <h1 className={styles.title}>{stall.name}</h1>
                  <p className={styles.muted}>{stall.description || tt('stall.noDescription', 'No description yet.')}</p>
                </div>
                {stall.status === 'pending'
                  ? <span className={styles.pillOff}>
                      {tt('stall.statusPending', 'Waiting for the organiser')}
                    </span>
                  : <button type="button" className={styles.ghost}
                            onClick={() => setOpen(stall.status === 'closed' ? 'live' : 'closed')}>
                      {stall.status === 'closed'
                        ? tt('stall.reopen', 'Open the stall')
                        : tt('stall.close', 'Close the stall')}
                    </button>}
              </div>

              <div className={styles.tabs} role="tablist">
                <button type="button" aria-pressed={tab === 'shop'}
                        className={tab === 'shop' ? styles.tabOn : styles.tab}
                        onClick={() => setTab('shop')}>
                  {tt('stall.tabShop', 'What I sell')}
                </button>
                <button type="button" aria-pressed={tab === 'orders'}
                        className={tab === 'orders' ? styles.tabOn : styles.tab}
                        onClick={() => setTab('orders')}>
                  {tt('stall.tabOrders', 'Orders')}
                  {summary.open > 0 && <span className={styles.count}>{formatNumber(summary.open)}</span>}
                </button>
              </div>

              {tab === 'shop' && (
                <>
                  {products.length === 0
                    ? <p className={styles.muted}>
                        {tt('stall.noProducts', 'Nothing on the stall yet. Add the first thing below.')}
                      </p>
                    : <ul className={styles.list}>
                        {products.map((p) => (
                          <li key={p.id} className={styles.row}>
                            <Avatar src={mediaUrl(p.image)} name={p.name} size={44} rounded={false} />
                            <div className={styles.rowBody}>
                              <span className={styles.rowName}>
                                {p.name}
                                {!p.is_active && <span className={styles.pillOff}>
                                  {tt('stall.hidden', 'Hidden')}
                                </span>}
                              </span>
                              <span className={styles.muted}>
                                {formatNumber(p.price_vc)} VC
                                {' · '}
                                {p.stock > 0
                                  ? tt('stall.inStock', '{n} left').replace('{n}', formatNumber(p.stock))
                                  : tt('stall.outOfStock', 'Out of stock')}
                                {p.sold > 0 && ` · ${tt('stall.sold', '{n} sold').replace('{n}', formatNumber(p.sold))}`}
                              </span>
                              {p.variants?.length > 0 && (
                                <span className={styles.muted}>{p.variants.join(' · ')}</span>
                              )}
                            </div>
                            <div className={styles.rowActions}>
                              <button type="button" className={styles.ghost}
                                      onClick={() => beginEdit(p)}>
                                {tt('ui.edit', 'Edit')}
                              </button>
                              <button type="button" className={styles.danger} disabled={busy}
                                      onClick={() => removeProduct(p)}>
                                {p.sold > 0 ? tt('stall.hide', 'Hide') : tt('ui.remove', 'Remove')}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>}

                  <h2 className={styles.sub}>
                    {editing ? tt('stall.editProduct', 'Edit this') : tt('stall.addProduct', 'Add something to sell')}
                  </h2>
                  <div className={styles.form}>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('stall.pName', 'What it is')}</span>
                      <input className={styles.input} value={draft.name} onChange={set('name')}
                             autoComplete="off" name="product-name"
                             placeholder={tt('stall.pNamePlaceholder', 'Jollof rice')} />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('stall.pPrice', 'Price in naira')}</span>
                      <input className={styles.input} inputMode="numeric" value={draft.price}
                             onChange={set('price')} placeholder="2500" />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('stall.pStock', 'How many you have')}</span>
                      <input className={styles.input} inputMode="numeric" value={draft.stock}
                             onChange={set('stock')} placeholder="40" />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>{tt('stall.pVariants', 'Choices, separated by commas')}</span>
                      <input className={styles.input} value={draft.variants} onChange={set('variants')}
                             autoComplete="off" name="product-variants"
                             placeholder={tt('stall.pVariantsPlaceholder', 'Small, Medium, Large')} />
                      <span className={styles.help}>
                        {tt('stall.pVariantsHelp', 'Leave this empty when there is nothing to choose.')}
                      </span>
                    </label>
                    <label className={styles.fieldWide}>
                      <span className={styles.label}>{tt('stall.pDescription', 'Description')}</span>
                      <textarea className={styles.textarea} rows={2} value={draft.description}
                                onChange={set('description')} />
                    </label>
                    <label className={styles.fieldWide}>
                      <span className={styles.label}>{tt('stall.pImage', 'Picture')}</span>
                      <input className={styles.input} type="file" accept="image/*"
                             onChange={(e) => setImage(e.target.files?.[0] || null)} />
                    </label>
                    <label className={styles.check}>
                      <input type="checkbox" checked={draft.can_deliver} onChange={set('can_deliver')} />
                      <span>{tt('stall.pCanDeliver', 'This can be posted to somebody')}</span>
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    {editing && (
                      <button type="button" className={styles.ghost}
                              onClick={() => { setEditing(null); setDraft(EMPTY_PRODUCT); setImage(null); }}>
                        {tt('ui.cancel.77df', 'Cancel')}
                      </button>
                    )}
                    <button type="button" className={styles.primary}
                            disabled={busy || !draft.name.trim()} onClick={saveProduct}>
                      {busy ? tt('ui.saving', 'Saving...')
                        : editing ? tt('ui.save', 'Save') : tt('stall.put', 'Put it on the stall')}
                    </button>
                  </div>
                </>
              )}

              {tab === 'orders' && (
                <>
                  {summary.to_deliver > 0 && (
                    <p className={styles.muted}>
                      {tt('stall.toDeliver', '{n} waiting to be sent')
                        .replace('{n}', formatNumber(summary.to_deliver))}
                    </p>
                  )}
                  {orders.length === 0
                    ? <p className={styles.muted}>{tt('stall.noOrders', 'Nobody has ordered yet.')}</p>
                    : <ul className={styles.list}>
                        {orders.map((o) => (
                          <li key={o.id} className={styles.row}>
                            <div className={styles.rowBody}>
                              <span className={styles.rowName}>
                                {o.code}
                                <span className={o.status === 'collected' || o.status === 'delivered'
                                  ? styles.pillOff : styles.pillOn}>
                                  {o.status}
                                </span>
                              </span>
                              <span className={styles.muted}>
                                {o.buyer_name} · {formatNumber(o.total_vc)} VC · {formatDateTime(o.created_at)}
                              </span>
                              <span className={styles.muted}>
                                {o.items.map((i) => `${i.quantity} x ${i.product}${i.variant ? ` (${i.variant})` : ''}`).join(', ')}
                              </span>
                              {o.delivery && (
                                <span className={styles.address}>
                                  {tt('stall.deliverTo', 'Deliver to')}: {o.delivery.name},
                                  {' '}{o.delivery.phone}, {o.delivery.address}
                                  {o.delivery.note ? ` (${o.delivery.note})` : ''}
                                </span>
                              )}
                            </div>
                            <div className={styles.rowActions}>
                              {o.status === 'paid' && (
                                <button type="button" className={styles.ghost} disabled={busy}
                                        onClick={() => moveOrder(o, 'ready')}>
                                  {tt('stall.markReady', 'Ready')}
                                </button>
                              )}
                              {o.fulfilment === 'collect' && ['paid', 'ready'].includes(o.status) && (
                                <button type="button" className={styles.primary} disabled={busy}
                                        onClick={() => moveOrder(o, 'collected')}>
                                  {tt('stall.markCollected', 'Collected')}
                                </button>
                              )}
                              {o.fulfilment === 'deliver' && ['paid', 'ready'].includes(o.status) && (
                                sending === o.id ? (
                                  <>
                                    <input className={styles.input} value={tracking}
                                           onChange={e => setTracking(e.target.value)}
                                           placeholder={tt('stall.trackingPrompt',
                                             'Tracking number, if you have one. Leave empty if not.')}
                                           aria-label={tt('stall.trackingPrompt',
                                             'Tracking number, if you have one. Leave empty if not.')} />
                                    <button type="button" className={styles.primary} disabled={busy}
                                            onClick={() => {
                                              moveOrder(o, 'sent', tracking.trim());
                                              setSending(null);
                                              setTracking('');
                                            }}>
                                      {tt('stall.markSent', 'Sent')}
                                    </button>
                                    <button type="button" className={styles.ghost} disabled={busy}
                                            onClick={() => { setSending(null); setTracking(''); }}>
                                      {tt('ui.cancel.77df', 'Cancel')}
                                    </button>
                                  </>
                                ) : (
                                  <button type="button" className={styles.primary} disabled={busy}
                                          onClick={() => { setSending(o.id); setTracking(''); }}>
                                    {tt('stall.markSent', 'Sent')}
                                  </button>
                                )
                              )}
                              {o.status === 'sent' && (
                                <button type="button" className={styles.primary} disabled={busy}
                                        onClick={() => moveOrder(o, 'delivered')}>
                                  {tt('stall.markDelivered', 'Arrived')}
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default StallPage;
