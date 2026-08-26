'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MdOutlineClose } from 'react-icons/md';
import { FaTicketAlt, FaCheckCircle, FaQrcode } from 'react-icons/fa';
import { IoChevronBack } from 'react-icons/io5';
import styles from './event-ticket-modal.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const EventTicketModal = ({
  open,
  onClose,
  event
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [step, setStep] = useState(1);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [qty, setQty] = useState(1);
  const [attendees, setAttendees] = useState([{
    name: '',
    email: '',
    phone: ''
  }]);
  const [balance, setBalance] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [pin, setPin] = useState('');
  const [ticketResult, setTicketResult] = useState(null);
  const eventId = event?.id || event?.event_id;
  const eventName = event?.name || 'Event';
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json'
  }), [session?.user?.sessionToken]);

  // ── Reset on open ──
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedTierId(null);
      setQty(1);
      setAttendees([{
        name: '',
        email: '',
        phone: ''
      }]);
      setTicketResult(null);
      setPayError('');
      setPin('');
    }
  }, [open]);

  // ── Fetch ticket types + balance ──
  useEffect(() => {
    if (!open || !eventId) return;
    setLoadingTypes(true);
    const fetchData = async () => {
      try {
        const [typesRes, balRes] = await Promise.all([fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventId}/ticket-types/`, {
          headers: authHeaders()
        }), fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders()
        })]);
        const typesData = await typesRes.json();
        const balData = await balRes.json();
        if (typesData.status === 'success') {
          setTicketTypes(typesData.data.ticket_types || []);
          const first = (typesData.data.ticket_types || [])[0];
          if (first) setSelectedTierId(first.id);
        }
        if (balData.status === 'success') {
          setBalance(balData.data.balance);
        }
      } catch (err) {
        console.error('Ticket modal fetch error:', err);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchData();
  }, [open, eventId, authHeaders]);

  // Keep attendees array synced with qty
  useEffect(() => {
    setAttendees(prev => {
      const next = [...prev];
      while (next.length < qty) next.push({
        name: '',
        email: '',
        phone: ''
      });
      return next.slice(0, qty);
    });
  }, [qty]);
  const selectedTier = ticketTypes.find(t => t.id === selectedTierId);
  const subtotal = (selectedTier?.price || 0) * qty;
  const shortfall = balance !== null ? Math.max(0, subtotal - balance) : 0;
  const handleNextFromStep1 = () => {
    if (!selectedTierId) {
      setPayError('Select a ticket tier.');
      return;
    }
    setPayError('');
    setStep(2);
  };
  const handleNextFromStep2 = () => {
    for (let i = 0; i < attendees.length; i += 1) {
      const a = attendees[i];
      if (!a.name?.trim() || !a.email?.trim()) {
        setPayError(`Fill in name and email for ticket ${i + 1}.`);
        return;
      }
    }
    setPayError('');
    setStep(3);
  };
  const handlePay = async () => {
    if (shortfall > 0) {
      setPayError(`You need ${shortfall.toLocaleString()} more VC to pay.`);
      return;
    }
    if (subtotal > 0 && pin.length < 4) {
      setPayError('Enter your 4-digit wallet PIN to authorise this payment.');
      return;
    }
    setPayLoading(true);
    setPayError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventId}/buy-ticket/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tier_id: selectedTier?.id,
          quantity: qty,
          pin,
          attendees
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTicketResult(data.data);
        if (data.data.new_balance !== undefined) setBalance(data.data.new_balance);
        setStep(4);
      } else {
        setPayError(data.message || tt("api.paymentFailed", "Payment failed."));
      }
    } catch {
      setPayError('Network error. Please try again.');
    } finally {
      setPayLoading(false);
    }
  };
  const updateAttendee = (i, field, value) => {
    setAttendees(prev => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        [field]: value
      };
      return next;
    });
  };
  if (!open) return null;
  return <div className={styles.overlay} onClick={e => {
    if (e.target === e.currentTarget) onClose();
  }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            {step > 1 && step < 4 && <button className={styles.backBtn} onClick={() => setStep(step - 1)} aria-label={tt("ui.back.b52b", "Back")}>
                <IoChevronBack />
              </button>}
            <h3 className={styles.modalTitle}>
              {step === 4 ? tx("Ticket Confirmed") : tx("Book Tickets")}
            </h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label={tt("ui.close.bbfa", "Close")}>
            <MdOutlineClose />
          </button>
        </div>

        {/* Step indicator */}
        {step < 4 && <div className={styles.stepper}>
            {[1, 2, 3].map(n => <div key={n} className={styles.stepDotWrap}>
                <div className={`${styles.stepDot} ${step >= n ? styles.stepDotActive : ''}`}>{n}</div>
                {n < 3 && <div className={`${styles.stepLine} ${step > n ? styles.stepLineActive : ''}`} />}
              </div>)}
          </div>}

        <div className={styles.body}>
          <p className={styles.eventNameSmall}>{eventName}</p>

          {/* ── STEP 1 ── Tier & Qty */}
          {step === 1 && <>
              <p className={styles.sectionTitle}>{tt("ui.choose.ticket.4477", "Choose your ticket")}</p>
              {loadingTypes ? <p className={styles.stateText}>{tt("ui.loading.tickets.0c96", "Loading tickets…")}</p> : ticketTypes.length === 0 ? <p className={styles.stateText}>{tt("ui.no.ticket.types.available.1ef6", "No ticket types available.")}</p> : <div className={styles.tierList}>
                  {ticketTypes.map(t => <button key={t.id} className={`${styles.tierCard} ${selectedTierId === t.id ? styles.tierActive : ''}`} onClick={() => setSelectedTierId(t.id)}>
                      <div className={styles.tierHeader}>
                        <span className={styles.tierName}>{t.name}</span>
                        <span className={styles.tierPrice}>{Number(t.price).toLocaleString()} VC</span>
                      </div>
                      {t.description && <p className={styles.tierDesc}>{tx(t.description)}</p>}
                      <p className={styles.tierAvail}>{t.available} {tt("ui.available.7b23", "available")}</p>
                    </button>)}
                </div>}

              <p className={styles.sectionTitle}>{tt("ui.quantity.44f6", "Quantity")}</p>
              <div className={styles.qtyRow}>
                <button className={styles.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
                <span className={styles.qtyVal}>{qty}</span>
                <button className={styles.qtyBtn} onClick={() => setQty(q => Math.min(10, q + 1))} disabled={qty >= 10}>+</button>
              </div>

              <div className={styles.subtotalRow}>
                <span>{tt("ui.subtotal.97f7", "Subtotal")}</span>
                <span className={styles.subtotalVal}>{subtotal.toLocaleString()} VC</span>
              </div>

              {payError && <p className={styles.errorText}>{payError}</p>}

              <button className={`${styles.primaryBtn} goldBTN`} onClick={handleNextFromStep1} disabled={!selectedTierId}>
                {tt("ui.continue.2e02", "Continue")}
              </button>
            </>}

          {/* ── STEP 2 ── Attendee info */}
          {step === 2 && <>
              <p className={styles.sectionTitle}>{tt("ui.attendee.information.afc8", "Attendee information")}</p>
              {attendees.map((a, i) => <div key={i} className={styles.attendeeBlock}>
                  <p className={styles.attendeeHeader}>{tt("ui.ticket.a767", "Ticket")} {i + 1} · {selectedTier?.name}</p>
                  <input type="text" placeholder={tt("ui.full.name.eeb6", "Full name")} className={styles.input} value={a.name} onChange={e => updateAttendee(i, 'name', e.target.value)} />
                  <input type="email" placeholder={tt("ui.email.84ad", "Email")} className={styles.input} value={a.email} onChange={e => updateAttendee(i, 'email', e.target.value)} />
                  <input type="tel" placeholder={tt("ui.phone.optional.df21", "Phone (optional)")} className={styles.input} value={a.phone} onChange={e => updateAttendee(i, 'phone', e.target.value)} />
                </div>)}

              {payError && <p className={styles.errorText}>{payError}</p>}

              <button className={`${styles.primaryBtn} goldBTN`} onClick={handleNextFromStep2}>
                {tt("ui.continue.payment.cfc5", "Continue to Payment")}
              </button>
            </>}

          {/* ── STEP 3 ── Payment */}
          {step === 3 && <>
              <p className={styles.sectionTitle}>{tt("ui.order.summary.db14", "Order summary")}</p>
              <div className={styles.sumRow}>
                <span>{tt("ui.tier.5bd4", "Tier")}</span>
                <span className={styles.sumVal}>{selectedTier?.name}</span>
              </div>
              <div className={styles.sumRow}>
                <span>{tt("ui.quantity.44f6", "Quantity")}</span>
                <span className={styles.sumVal}>× {qty}</span>
              </div>
              <div className={styles.sumRow}>
                <span>{tt("ui.unit.price.3c6c", "Unit price")}</span>
                <span className={styles.sumVal}>{Number(selectedTier?.price || 0).toLocaleString()} VC</span>
              </div>
              <div className={`${styles.sumRow} ${styles.sumTotal}`}>
                <span>{tt("ui.total.b259", "Total")}</span>
                <span className={styles.sumVal}>{subtotal.toLocaleString()} VC</span>
              </div>

              <p className={styles.sectionTitle}>{tt("ui.pay.vent.coins.3682", "Pay with VENT COINS")}</p>
              <div className={styles.balanceRow}>
                <span>{tt("ui.balance.ec62", "Your balance")}</span>
                <span className={styles.balanceVal}>
                  {balance !== null ? Number(balance).toLocaleString() : '-'} VC
                </span>
              </div>
              {shortfall > 0 && <div className={styles.shortfallBanner}>
                  {tt("ui.insufficient.funds.need.c564", "Insufficient funds. You need")} <strong>{shortfall.toLocaleString()} VC</strong> {tt("ui.more.visit.wallet.top.0401", "more. Visit the Wallet to top up.")}
                </div>}

              {subtotal > 0 && <div className={styles.pinBlock}>
                  <label className={styles.pinLabel} htmlFor="ticket-pin">{tt("ui.wallet.pin.2cdf", "Wallet PIN")}</label>
                  <input id="ticket-pin" type="password" inputMode="numeric" maxLength={6} className={styles.pinInput} placeholder="••••" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="off" />
                  <p className={styles.pinHint}>
                    {tt("ui.same.pin.use.send.4db4", "Same PIN you use to send VENT COINS.")} <a href="/wallets/pin">{tt("ui.set.change.ee89", "Set or change it")}</a>.
                  </p>
                </div>}

              {payError && <p className={styles.errorText}>{payError}</p>}

              <button className={`${styles.primaryBtn} goldBTN`} onClick={handlePay} disabled={payLoading || shortfall > 0}>
                {payLoading ? tx("Processing…") : `Pay ${subtotal.toLocaleString()} VC`}
              </button>
            </>}

          {/* ── STEP 4 ── Success ── */}
          {step === 4 && ticketResult && <div className={styles.successBlock}>
              <div className={styles.successIcon}>
                <FaCheckCircle />
              </div>
              <p className={styles.successTitle}>{tt("ui.you're.4a74", "You're in!")}</p>
              <p className={styles.successSub}>
                {qty} × {selectedTier?.name} for {eventName}
              </p>

              <div className={styles.qrCard}>
                <div className={styles.qrVisual} aria-hidden>
                  <FaQrcode />
                </div>
                <div className={styles.qrMeta}>
                  <p className={styles.qrCode}>{ticketResult.qr_code}</p>
                  <p className={styles.qrHint}>{tt("ui.show.door.9ec5", "Show this at the door.")}</p>
                </div>
              </div>

              <div className={styles.sumRow}>
                <span>{tt("ui.ticket.id.ef4b", "Ticket ID")}</span>
                <span className={styles.sumVal}>{ticketResult.ticket_id}</span>
              </div>
              {ticketResult.new_balance !== undefined && <div className={styles.sumRow}>
                  <span>{tt("ui.new.balance.193e", "New balance")}</span>
                  <span className={styles.sumVal}>{Number(ticketResult.new_balance).toLocaleString()} VC</span>
                </div>}

              <a href="/events/my-tickets" className={`${styles.primaryBtn} goldBTN ${styles.primaryBtnLink}`}>
                <FaTicketAlt /> {tt("ui.add.my.tickets.59d5", "Add to my tickets")}
              </a>
              <button className={styles.secondaryBtn} onClick={onClose}>{tt("ui.close.bbfa", "Close")}</button>
            </div>}
        </div>
      </div>
    </div>;
};
export default EventTicketModal;