'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BsChevronLeft,
  BsCheck2,
  BsCheckCircleFill,
  BsCreditCard2Front,
} from 'react-icons/bs';
import { RiShoppingCart2Line } from 'react-icons/ri';
import { IoWalletOutline } from 'react-icons/io5';
import { FiTruck, FiPackage } from 'react-icons/fi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './cart.module.css';

const CART_STORAGE_KEY = 'shop_cart';

const STEPS = [
  { key: 1, label: 'Cart' },
  { key: 2, label: 'Address' },
  { key: 3, label: 'Payment' },
  { key: 4, label: 'Review' },
];

const SHIPPING_BY_STATE = {
  Lagos: 5,
  Abuja: 8,
  Rivers: 10,
  Kano: 12,
  Oyo: 9,
  default: 14,
};

const variantLabel = (v) => {
  if (!v) return '';
  const parts = [];
  if (v.size) parts.push(`Size: ${v.size}`);
  if (v.color) parts.push(`Color: ${v.color}`);
  return parts.join(' · ');
};

const readCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const writeCart = (items) => {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
  } catch (err) {
    // ignore
  }
};

const fmtAddress = (a) =>
  [a.line1, a.line2, a.city, a.state, a.country, a.postal_code]
    .filter(Boolean)
    .join(', ');

const CartPage = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [orderNumber, setOrderNumber] = useState('');

  const [address, setAddress] = useState({
    full_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Lagos',
    country: 'Nigeria',
    postal_code: '',
  });
  const [addressErrors, setAddressErrors] = useState({});

  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [paymentError, setPaymentError] = useState('');
  const [placing, setPlacing] = useState(false);

  // Load cart from storage; merge with backend if available
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const local = readCart();
      // Try backend balance; fall back gracefully
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`,
        );
        const data = await res.json();
        if (data?.status === 'success') {
          setBalance(Number(data.data.balance) || 0);
        }
      } catch (err) {
        // Try the shop/cart endpoint for balance fallback
        try {
          const res2 = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/shop/cart/`,
          );
          const data2 = await res2.json();
          if (data2?.status === 'success') {
            setBalance(Number(data2.data.balance_vc) || 0);
          }
        } catch (err2) {
          setBalance(12_450); // mock user fallback
        }
      }

      // Try /shop/cart/ to also load default address suggestions for the demo user
      try {
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/me/`,
        );
        const u = await userRes.json();
        if (u?.status === 'success' && u?.data) {
          setAddress((prev) => ({
            ...prev,
            full_name: u.data.full_name || u.data.fullname || prev.full_name,
          }));
        }
      } catch (err) {
        // ignore
      }

      setItems(local);
      setLoading(false);
    };
    load();
  }, []);

  // Listen to storage changes (e.g. add-to-cart from other tabs)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === CART_STORAGE_KEY) {
        setItems(readCart());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Pre-fill address with mockUser defaults once we know we're authed
  useEffect(() => {
    setAddress((prev) => ({
      full_name: prev.full_name || 'Ladi Layott',
      phone: prev.phone || '+234 800 000 0000',
      line1: prev.line1 || '12 Vermillion Avenue',
      line2: prev.line2 || '',
      city: prev.city || 'Lagos',
      state: prev.state || 'Lagos',
      country: prev.country || 'Nigeria',
      postal_code: prev.postal_code || '101212',
    }));
  }, []);

  // ── derived totals ───────────────────────────────────
  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, it) =>
          s +
          Number(
            it.product?.price_vc ||
              it.product?.sale_price ||
              it.product?.price_vent_coins ||
              0,
          ) *
            (Number(it.qty) || 0),
        0,
      ),
    [items],
  );

  const shipping = useMemo(() => {
    if (items.length === 0) return 0;
    if (paymentMethod === 'cod') {
      return (
        (SHIPPING_BY_STATE[address.state] || SHIPPING_BY_STATE.default) + 3
      );
    }
    return SHIPPING_BY_STATE[address.state] || SHIPPING_BY_STATE.default;
  }, [items, address.state, paymentMethod]);

  const total = subtotal + shipping;

  const cartCount = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  // ── handlers ─────────────────────────────────────────
  const updateQty = (id, newQty) => {
    setItems((prev) => {
      const next = prev.map((it) =>
        it.id === id ? { ...it, qty: Math.max(1, newQty) } : it,
      );
      writeCart(next);
      return next;
    });
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      writeCart(next);
      return next;
    });
  };

  const handleAddressChange = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setAddressErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateAddress = () => {
    const errors = {};
    if (!address.full_name?.trim()) errors.full_name = 'Required';
    if (!address.phone?.trim()) errors.phone = 'Required';
    if (!address.line1?.trim()) errors.line1 = 'Required';
    if (!address.city?.trim()) errors.city = 'Required';
    if (!address.state?.trim()) errors.state = 'Required';
    if (!address.country?.trim()) errors.country = 'Required';
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToStep = (next) => {
    if (next === 2 && items.length === 0) return;
    if (next === 3 && !validateAddress()) return;
    if (next > step) {
      // forward — no extra rules
    }
    setStep(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrder = async () => {
    if (paymentMethod === 'wallet' && balance < total) {
      setPaymentError(
        `Wallet balance (${balance.toLocaleString()} VC) is below total (${total.toLocaleString()} VC). Top up or pick another method.`,
      );
      setStep(3);
      return;
    }
    setPaymentError('');
    setPlacing(true);

    try {
      const payload = {
        items: items.map((it) => ({
          product_id: it.product_id,
          name: it.product?.name,
          qty: it.qty,
          variant: it.variant,
          unit_price_vc: it.product?.price_vc,
        })),
        delivery_address: {
          full_name: address.full_name,
          phone: address.phone,
          street: [address.line1, address.line2].filter(Boolean).join(', '),
          city: address.city,
          state: address.state,
          country: address.country,
          postal_code: address.postal_code,
        },
        payment_method: paymentMethod,
        subtotal_vc: subtotal,
        shipping_vc: shipping,
        total_vc: total,
      };
      let res;
      try {
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order/create/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
      } catch (err) {
        res = null;
      }
      let data = null;
      if (res) {
        try {
          data = await res.json();
        } catch (err) {
          data = null;
        }
      }
      let orderNum = data?.data?.order?.order_number;
      if (!orderNum) {
        // fallback to legacy /shop/cart/checkout/
        try {
          const res2 = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/shop/cart/checkout/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          );
          const d2 = await res2.json();
          orderNum = d2?.data?.order_number;
        } catch (err) {
          // ignore
        }
      }
      if (!orderNum) {
        orderNum = `VENT-${Date.now().toString().slice(-8)}`;
      }
      setOrderNumber(orderNum);
      writeCart([]);
      setItems([]);
      // redirect after 2.5s, but keep success view first
      setTimeout(() => {
        router.push(`/shop/orders?id=${encodeURIComponent(orderNum)}`);
      }, 2500);
    } catch (err) {
      console.error('Place order error:', err);
      setPaymentError('Could not place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Success view ─────────────────────────────────────
  if (orderNumber) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <BsCheck2 />
              </div>
              <h1 className={styles.successTitle}>Order placed!</h1>
              <p className={styles.successSub}>
                Thanks for shopping V-ENT &mdash; your order is on the way.
              </p>
              <span className={styles.orderNumber}>Order #{orderNumber}</span>
              <p className={styles.successSub}>
                Estimated delivery: 3&ndash;5 business days. Redirecting to your
                orders&hellip;
              </p>
              <div className={styles.successActions}>
                <Link
                  href={`/shop/orders?id=${encodeURIComponent(orderNumber)}`}
                  className={`${styles.checkoutBtn} goldBTN`}
                  style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
                >
                  View order
                </Link>
                <Link
                  href="/shop"
                  className={styles.outlineBtn}
                  style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <Link href="/shop" className={styles.backLink}>
              <BsChevronLeft /> Continue shopping
            </Link>
            <div className={styles.emptyCart}>
              <div className={styles.emptyIcon}>
                <RiShoppingCart2Line />
              </div>
              <h1 className={styles.emptyTitle}>Your cart is empty</h1>
              <p className={styles.emptySub}>
                Browse new drops, gear, and anime merch in the shop.
              </p>
              <Link href="/shop" className={`${styles.checkoutBtn} goldBTN`}>
                Shop now
              </Link>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/shop" className={styles.backLink}>
            <BsChevronLeft /> Continue shopping
          </Link>

          <div className={styles.headRow}>
            <div>
              <h1 className={styles.title}>Checkout</h1>
              <p className={styles.subTitle}>
                {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
          </div>

          {/* Step progress */}
          <div className={styles.stepper}>
            {STEPS.map((s) => {
              const done = step > s.key;
              const active = step === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`${styles.stepItem} ${
                    done ? styles.stepDone : ''
                  } ${active ? styles.stepActive : ''}`}
                  onClick={() => {
                    if (s.key === 1) setStep(1);
                    else if (s.key === 2 && items.length > 0) setStep(2);
                    else if (s.key === 3 && validateAddress()) setStep(3);
                    else if (s.key === 4 && validateAddress()) setStep(4);
                  }}
                  disabled={s.key > step}
                >
                  <span className={styles.stepBubble}>
                    {done ? <BsCheck2 /> : s.key}
                  </span>
                  <span className={styles.stepLabel}>{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.layout}>
            <div className={styles.itemsPanel}>
              {/* ── Step 1: cart items ── */}
              {step === 1 && (
                <>
                  <h2 className={styles.panelTitle}>Your cart</h2>
                  {loading ? (
                    <p className={styles.stateText}>Loading cart&hellip;</p>
                  ) : (
                    items.map((it) => (
                      <div key={it.id} className={styles.cartItem}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.product?.images?.[0]}
                          alt={it.product?.name}
                          className={styles.itemImage}
                        />
                        <div className={styles.itemMid}>
                          <p className={styles.itemName}>{it.product?.name}</p>
                          {variantLabel(it.variant) && (
                            <p className={styles.itemVariant}>
                              {variantLabel(it.variant)}
                            </p>
                          )}
                          <div className={styles.qtyRow}>
                            <button
                              type="button"
                              className={styles.qtyBtn}
                              onClick={() => updateQty(it.id, it.qty - 1)}
                              disabled={it.qty <= 1}
                              aria-label="Decrease"
                            >
                              -
                            </button>
                            <span className={styles.qtyValue}>{it.qty}</span>
                            <button
                              type="button"
                              className={styles.qtyBtn}
                              onClick={() => updateQty(it.id, it.qty + 1)}
                              aria-label="Increase"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => removeItem(it.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className={styles.itemRight}>
                          <span className={styles.itemPrice}>
                            {(
                              (Number(it.product?.price_vc) || 0) * it.qty
                            ).toLocaleString()}{' '}
                            VC
                          </span>
                          {it.product?.price_ngn ? (
                            <span className={styles.itemPriceSub}>
                              &#8358;
                              {(
                                (Number(it.product.price_ngn) || 0) * it.qty
                              ).toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* ── Step 2: address ── */}
              {step === 2 && (
                <>
                  <h2 className={styles.panelTitle}>Delivery address</h2>
                  <p className={styles.panelHint}>
                    We&apos;ll send shipping updates to your phone and email.
                  </p>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Full name</span>
                      <input
                        type="text"
                        className={styles.input}
                        value={address.full_name}
                        onChange={(e) =>
                          handleAddressChange('full_name', e.target.value)
                        }
                      />
                      {addressErrors.full_name && (
                        <span className={styles.fieldErr}>
                          {addressErrors.full_name}
                        </span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Phone</span>
                      <input
                        type="tel"
                        className={styles.input}
                        value={address.phone}
                        onChange={(e) =>
                          handleAddressChange('phone', e.target.value)
                        }
                      />
                      {addressErrors.phone && (
                        <span className={styles.fieldErr}>
                          {addressErrors.phone}
                        </span>
                      )}
                    </label>

                    <label className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={styles.fieldLabel}>Address line 1</span>
                      <input
                        type="text"
                        className={styles.input}
                        value={address.line1}
                        placeholder="Street, house number"
                        onChange={(e) =>
                          handleAddressChange('line1', e.target.value)
                        }
                      />
                      {addressErrors.line1 && (
                        <span className={styles.fieldErr}>
                          {addressErrors.line1}
                        </span>
                      )}
                    </label>

                    <label className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={styles.fieldLabel}>
                        Address line 2 (optional)
                      </span>
                      <input
                        type="text"
                        className={styles.input}
                        value={address.line2}
                        placeholder="Apartment, suite, etc."
                        onChange={(e) =>
                          handleAddressChange('line2', e.target.value)
                        }
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>City</span>
                      <input
                        type="text"
                        className={styles.input}
                        value={address.city}
                        onChange={(e) =>
                          handleAddressChange('city', e.target.value)
                        }
                      />
                      {addressErrors.city && (
                        <span className={styles.fieldErr}>
                          {addressErrors.city}
                        </span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>State</span>
                      <select
                        className={styles.input}
                        value={address.state}
                        onChange={(e) =>
                          handleAddressChange('state', e.target.value)
                        }
                      >
                        {[
                          'Lagos',
                          'Abuja',
                          'Rivers',
                          'Kano',
                          'Oyo',
                          'Kaduna',
                          'Enugu',
                          'Other',
                        ].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {addressErrors.state && (
                        <span className={styles.fieldErr}>
                          {addressErrors.state}
                        </span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Country</span>
                      <select
                        className={styles.input}
                        value={address.country}
                        onChange={(e) =>
                          handleAddressChange('country', e.target.value)
                        }
                      >
                        {[
                          'Nigeria',
                          'Ghana',
                          'Kenya',
                          'South Africa',
                          'Egypt',
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {addressErrors.country && (
                        <span className={styles.fieldErr}>
                          {addressErrors.country}
                        </span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Postal code</span>
                      <input
                        type="text"
                        className={styles.input}
                        value={address.postal_code}
                        onChange={(e) =>
                          handleAddressChange('postal_code', e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className={styles.shipNote}>
                    <FiTruck /> Shipping to {address.state}: {shipping} VC
                  </div>
                </>
              )}

              {/* ── Step 3: payment ── */}
              {step === 3 && (
                <>
                  <h2 className={styles.panelTitle}>Payment method</h2>
                  <p className={styles.panelHint}>
                    Pay with your VENT COINS balance, Paystack (NGN), or cash on
                    delivery.
                  </p>
                  <div className={styles.payOptions}>
                    <button
                      type="button"
                      className={`${styles.payOption} ${
                        paymentMethod === 'wallet'
                          ? styles.payOptionActive
                          : ''
                      } ${
                        balance < total ? styles.payOptionDisabled : ''
                      }`}
                      onClick={() => {
                        setPaymentMethod('wallet');
                        setPaymentError('');
                      }}
                      disabled={balance < total}
                    >
                      <span className={styles.payIcon}>
                        <IoWalletOutline />
                      </span>
                      <span className={styles.payBody}>
                        <span className={styles.payTitle}>VENT COINS</span>
                        <span className={styles.paySub}>
                          Wallet balance: {balance.toLocaleString()} VC
                        </span>
                      </span>
                      {paymentMethod === 'wallet' && (
                        <span className={styles.payCheck}>
                          <BsCheckCircleFill />
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      className={`${styles.payOption} ${
                        paymentMethod === 'paystack'
                          ? styles.payOptionActive
                          : ''
                      }`}
                      onClick={() => {
                        setPaymentMethod('paystack');
                        setPaymentError('');
                      }}
                    >
                      <span className={styles.payIcon}>
                        <BsCreditCard2Front />
                      </span>
                      <span className={styles.payBody}>
                        <span className={styles.payTitle}>
                          Paystack (Card / Transfer)
                        </span>
                        <span className={styles.paySub}>
                          Pay &#8358;{(total * 1000).toLocaleString()} in NGN
                        </span>
                      </span>
                      {paymentMethod === 'paystack' && (
                        <span className={styles.payCheck}>
                          <BsCheckCircleFill />
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      className={`${styles.payOption} ${
                        paymentMethod === 'cod' ? styles.payOptionActive : ''
                      }`}
                      onClick={() => {
                        setPaymentMethod('cod');
                        setPaymentError('');
                      }}
                    >
                      <span className={styles.payIcon}>
                        <FiPackage />
                      </span>
                      <span className={styles.payBody}>
                        <span className={styles.payTitle}>
                          Cash on delivery
                        </span>
                        <span className={styles.paySub}>
                          Available in select cities. +3 VC handling fee.
                        </span>
                      </span>
                      {paymentMethod === 'cod' && (
                        <span className={styles.payCheck}>
                          <BsCheckCircleFill />
                        </span>
                      )}
                    </button>
                  </div>

                  {balance < total && paymentMethod === 'wallet' && (
                    <div className={styles.payAlert}>
                      Wallet balance is{' '}
                      {(total - balance).toLocaleString()} VC short.{' '}
                      <Link href="/wallets" className={styles.alertLink}>
                        Top up wallet
                      </Link>
                      .
                    </div>
                  )}

                  {paymentError && (
                    <p className={styles.formErr}>{paymentError}</p>
                  )}
                </>
              )}

              {/* ── Step 4: review ── */}
              {step === 4 && (
                <>
                  <h2 className={styles.panelTitle}>Review your order</h2>

                  <div className={styles.reviewBlock}>
                    <h3 className={styles.reviewBlockTitle}>Items ({cartCount})</h3>
                    {items.map((it) => (
                      <div key={it.id} className={styles.reviewItem}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.product?.images?.[0]}
                          alt={it.product?.name}
                          className={styles.reviewItemImg}
                        />
                        <div>
                          <p className={styles.reviewItemName}>
                            {it.product?.name}
                          </p>
                          {variantLabel(it.variant) && (
                            <p className={styles.reviewItemVariant}>
                              {variantLabel(it.variant)} &middot; Qty {it.qty}
                            </p>
                          )}
                        </div>
                        <span className={styles.reviewItemPrice}>
                          {(
                            (Number(it.product?.price_vc) || 0) * it.qty
                          ).toLocaleString()}{' '}
                          VC
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.reviewBlock}>
                    <h3 className={styles.reviewBlockTitle}>Delivering to</h3>
                    <p className={styles.reviewLineLg}>
                      {address.full_name} &middot; {address.phone}
                    </p>
                    <p className={styles.reviewLine}>{fmtAddress(address)}</p>
                  </div>

                  <div className={styles.reviewBlock}>
                    <h3 className={styles.reviewBlockTitle}>Payment</h3>
                    <p className={styles.reviewLineLg}>
                      {paymentMethod === 'wallet' && 'VENT COINS Wallet'}
                      {paymentMethod === 'paystack' && 'Paystack (Card / Transfer)'}
                      {paymentMethod === 'cod' && 'Cash on delivery'}
                    </p>
                    <p className={styles.reviewLine}>
                      Total: {total.toLocaleString()} VC (&#8358;
                      {(total * 1000).toLocaleString()})
                    </p>
                  </div>

                  {paymentError && (
                    <p className={styles.formErr}>{paymentError}</p>
                  )}
                </>
              )}

              {/* Step nav */}
              <div className={styles.stepNav}>
                {step > 1 && (
                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() => goToStep(step - 1)}
                    disabled={placing}
                  >
                    Back
                  </button>
                )}
                {step < 4 && (
                  <button
                    type="button"
                    className={`${styles.checkoutBtn} goldBTN`}
                    onClick={() => goToStep(step + 1)}
                    disabled={items.length === 0}
                  >
                    Continue
                  </button>
                )}
                {step === 4 && (
                  <button
                    type="button"
                    className={`${styles.checkoutBtn} redBTN`}
                    onClick={placeOrder}
                    disabled={placing}
                  >
                    {placing ? 'Placing order…' : `Place order · ${total.toLocaleString()} VC`}
                  </button>
                )}
              </div>
            </div>

            {/* Right summary */}
            <div className={styles.summaryPanel}>
              <h2 className={styles.summaryTitle}>Order summary</h2>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                </span>
                <span className={styles.summaryValue}>
                  {subtotal.toLocaleString()} VC
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Shipping</span>
                <span className={styles.summaryValue}>
                  {shipping.toLocaleString()} VC
                </span>
              </div>
              <div className={styles.summaryTotal}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalValue}>
                  {total.toLocaleString()} VC
                </span>
              </div>
              <p className={styles.summaryNgn}>
                &#8776; &#8358;{(total * 1000).toLocaleString()} NGN
              </p>

              <div
                className={`${styles.balanceBox} ${
                  balance < total ? styles.balanceBoxError : ''
                }`}
              >
                {balance >= total
                  ? `Wallet balance: ${balance.toLocaleString()} VC. Enough to checkout.`
                  : `Wallet balance: ${balance.toLocaleString()} VC. Need ${(
                      total - balance
                    ).toLocaleString()} more for VC payment.`}
              </div>

              {balance < total && (
                <Link href="/wallets" className={styles.topUpLink}>
                  Top up your wallet
                </Link>
              )}

              <ul className={styles.summaryPerks}>
                <li>
                  <FiTruck /> 3&ndash;5 day Africa-wide shipping
                </li>
                <li>
                  <FiPackage /> 14-day no-fuss returns
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default CartPage;
