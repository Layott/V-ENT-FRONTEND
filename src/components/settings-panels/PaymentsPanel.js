'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import shared from './settingsShared.module.css';
import styles from './PaymentsPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const METHODS = [{
  v: 'wallet',
  label: 'V-ENT Wallet (VC)'
}, {
  v: 'card',
  label: 'Saved card'
}, {
  v: 'bank',
  label: 'Bank transfer'
}, {
  v: 'paystack',
  label: 'Paystack at checkout'
}];
const BRAND_COLORS = {
  Visa: '#1a1f71',
  Mastercard: '#eb001b',
  Verve: '#00b14f',
  Amex: '#006fcf'
};
const PaymentsPanel = ({
  payments = {},
  user = {},
  onSave,
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const router = useRouter();
  const [defaultMethod, setDefaultMethod] = useState(payments.default_method || 'wallet');
  const [savedCards, setSavedCards] = useState(payments.saved_cards || []);
  const [savedBanks, setSavedBanks] = useState(payments.saved_banks || []);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasPin, setHasPin] = useState(!!payments.wallet_pin_set);
  useEffect(() => {
    setDefaultMethod(payments.default_method || 'wallet');
    setSavedCards(payments.saved_cards || []);
    setSavedBanks(payments.saved_banks || []);
    setHasPin(!!payments.wallet_pin_set);
  }, [payments]);
  const persist = async next => {
    await onSave?.(next);
  };
  const setMethod = async v => {
    setDefaultMethod(v);
    await persist({
      ...payments,
      default_method: v,
      saved_cards: savedCards,
      saved_banks: savedBanks
    });
  };
  const setDefaultCard = async id => {
    const next = savedCards.map(c => ({
      ...c,
      is_default: c.id === id
    }));
    setSavedCards(next);
    await persist({
      ...payments,
      saved_cards: next
    });
    showToast?.('Default card updated');
  };
  const removeCard = async id => {
    const {
      res,
      body
    } = await cardAction(`/auth/wallet/cards/${id}/remove/`);
    showToast?.(body.message || (res.ok ? 'Card removed' : 'Could not remove it'));
    if (res.ok) await loadCards();
  };

  // Cards are read from the server, not from a settings blob, because a saved
  // card is an authorization Paystack holds rather than a preference.
  const loadCards = useCallback(async () => {
    const token = session?.user?.sessionToken;
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/cards/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) return;
      const body = await res.json();
      setSavedCards(body?.data?.cards || []);
    } catch {
      /* the panel still renders what it was handed */
    }
  }, [session]);
  useEffect(() => {
    loadCards();
  }, [loadCards]);
  const cardAction = async (path, body) => {
    const token = session?.user?.sessionToken;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body || {})
    });
    return {
      res,
      body: await res.json()
    };
  };

  // Saving a card happens by using it: a top-up carries "save this card", and
  // Paystack hands back an authorization plus the brand and last four. There is
  // no form here that could ask for a card number, which is the point.
  const startCardTopUp = () => {
    router.push('/wallets/topup?save_card=1');
  };
  const submitPin = async e => {
    e.preventDefault();
    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      return showToast?.('PIN must be exactly 4 digits', 'error');
    }
    if (pinValue !== confirmPin) {
      return showToast?.('PINs do not match', 'error');
    }
    await persist({
      ...payments,
      wallet_pin_set: true
    });
    setHasPin(true);
    setShowPinModal(false);
    setPinValue('');
    setConfirmPin('');
    showToast?.('Wallet PIN saved');
  };
  return <div className={shared.formStack}>
      {/* Default payment method */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.default.payment.method.37f8", "Default payment method")}<InfoTip id="defaultPayment" /></h3>
        <p className={shared.cardSub}>{tt("ui.used.tournament.fees.ticket.d847", "Used for tournament fees, ticket purchases, and marketplace orders.")}</p>

        <div className={shared.formGroup}>
          <select className={shared.formSelect} value={defaultMethod} onChange={e => setMethod(e.target.value)}>
            {METHODS.map(m => <option key={m.v} value={m.v}>{tx(m.label)}</option>)}
          </select>
        </div>
      </div>

      {/* Saved cards */}
      <div className={shared.card}>
        <div className={styles.cardHeaderRow}>
          <div>
            <h3 className={shared.cardTitle}>{tt("ui.saved.cards.2a2f", "Saved cards")}<InfoTip id="savedCards" /></h3>
            <p className={shared.cardSub}>{tt("ui.manage.cards.used.top.4456", "Manage cards used to top up your V-ENT wallet.")}</p>
          </div>
          <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={() => setShowAddCard(true)}>
            {tt("ui.add.card.8ebb", "+ Add card")}
          </button>
        </div>

        {savedCards.length === 0 ? <div className={styles.emptyCard}>
            {tt("ui.no.saved.cards.yet.091f", "No saved cards yet. Add one to enable one-tap top-ups.")}
          </div> : <div className={styles.cardList}>
            {savedCards.map(c => <div key={c.id} className={styles.cardItem}>
                <div className={styles.cardChip} style={{
            background: BRAND_COLORS[c.brand] || '#303136'
          }}>
                  {c.brand}
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.cardNum}>•••• •••• •••• {c.last4}</span>
                  <span className={styles.cardExp}>
                    {tt("ui.exp.5871", "Exp")} {String(c.exp_month).padStart(2, '0')}/{String(c.exp_year).slice(-2)}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  {c.is_default ? <span className={`${shared.verifyBadge} ${shared.verifyBadgeOk}`}>{tt("ui.default.808d", "Default")}</span> : <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN}`} onClick={() => setDefaultCard(c.id)}>
                      {tt("ui.set.default.cddb", "Set default")}
                    </button>}
                  <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN} ${styles.removeBtn}`} onClick={() => removeCard(c.id)} aria-label={tt("ui.remove.card.872f", "Remove card")}>
                    {tt("ui.remove.e963", "Remove")}
                  </button>
                </div>
              </div>)}
          </div>}
      </div>

      {/* Saved banks */}
      <div className={shared.card}>
        <div className={styles.cardHeaderRow}>
          <div>
            <h3 className={shared.cardTitle}>{tt("ui.saved.bank.accounts.e863", "Saved bank accounts")}<InfoTip id="savedBanks" /></h3>
            <p className={shared.cardSub}>{tt("ui.used.withdrawals.local.banks.418e", "Used for withdrawals to local banks. Requires KYC verification.")}</p>
          </div>
        </div>

        {!user?.kyc_verified ? <div className={styles.kycGate}>
            <div className={styles.kycGateIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className={styles.kycGateTitle}>{tt("ui.kyc.verification.required.a664", "KYC verification required")}</p>
              <p className={styles.kycGateSub}>
                {tt("ui.complete.identity.verification.add.62de", "Complete identity verification to add bank accounts and withdraw to local banks.")}
              </p>
            </div>
            <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={() => showToast?.('KYC flow coming soon')}>
              {tt("ui.verify.identity.c88b", "Verify identity")}
            </button>
          </div> : savedBanks.length === 0 ? <div className={styles.emptyCard}>{tt("ui.no.bank.accounts.linked.1f77", "No bank accounts linked yet.")}</div> : <div className={styles.bankList}>
            {savedBanks.map(b => <div key={b.id} className={styles.bankItem}>
                <div className={styles.bankMeta}>
                  <span className={styles.bankName}>{b.bank_name}</span>
                  <span className={styles.bankNum}>•••• {String(b.account_number).slice(-4)}</span>
                  <span className={styles.bankHolder}>{b.account_name}</span>
                </div>
                {b.is_default && <span className={`${shared.verifyBadge} ${shared.verifyBadgeOk}`}>{tt("ui.default.808d", "Default")}</span>}
              </div>)}
          </div>}
      </div>

      {/* Wallet PIN */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.wallet.pin.2cdf", "Wallet PIN")}<InfoTip id="walletPin" /></h3>
        <p className={shared.cardSub}>
          {tt("ui.required.outgoing.transfers.withdrawals.3b52", "Required for outgoing transfers and withdrawals. Choose a 4-digit PIN you can remember.")}
        </p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>
              {hasPin ? tx("PIN is set") : tx("No PIN set yet")}{' '}
              <span className={`${shared.verifyBadge} ${hasPin ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
                {hasPin ? 'Active' : 'Required'}
              </span>
            </span>
            <span className={shared.toggleRowSub}>
              {hasPin ? tx("You can change your PIN at any time.") : tx("You will not be able to send or withdraw VC until you set a PIN.")}
            </span>
          </div>
          <button type="button" className={`${shared.btn} ${shared.btnSm} ${hasPin ? shared.ghostBTN : shared.goldBTN}`} onClick={() => setShowPinModal(true)}>
            {hasPin ? tx("Change PIN") : tx("Set PIN")}
          </button>
        </div>
      </div>

      {/* Add card modal */}
      {showAddCard && <div className={shared.modalBackdrop} onClick={() => setShowAddCard(false)}>
          <div className={shared.modal} onClick={e => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{tt("ui.add.card.5e8c", "Add a card")}</h3>
            <p className={shared.modalSub}>
              {tt("ui.v.ent.never.sees.d494", "V-ENT never sees your card number. You add a card by using it once: make a top-up,\n              tick \"save this card\", and Paystack hands back a token we can charge again.\n              The brand, the last four digits and the expiry come from them, so they are right.")}
            </p>
            <div className={shared.modalActions}>
              <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setShowAddCard(false)}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="button" className={`${shared.btn} ${shared.goldBTN}`} onClick={startCardTopUp}>
                {tt("ui.top.up.save.card.f475", "Top up and save the card")}
              </button>
            </div>
          </div>
        </div>}

      {showPinModal && <div className={shared.modalBackdrop} onClick={() => setShowPinModal(false)}>
          <div className={shared.modal} onClick={e => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{hasPin ? tx("Change wallet PIN") : tx("Set wallet PIN")}</h3>
            <p className={shared.modalSub}>
              {tt("ui.choose.digit.pin.avoid.d227", "Choose a 4-digit PIN. Avoid easy combinations like 1234 or your birth year.")}
            </p>

            <form onSubmit={submitPin}>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="pin">{tt("ui.new.pin.bd54", "New PIN")}<InfoTip id="walletPin" /></label>
                <input id="pin" type="password" inputMode="numeric" maxLength={4} className={shared.formInput} value={pinValue} onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
              </div>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="cpin">{tt("ui.confirm.pin.96b3", "Confirm PIN")}<InfoTip id="confirmPin" /></label>
                <input id="cpin" type="password" inputMode="numeric" maxLength={4} className={shared.formInput} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
              </div>

              <div className={shared.modalActions}>
                <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setShowPinModal(false)}>
                  {tt("ui.cancel.77df", "Cancel")}
                </button>
                <button type="submit" className={`${shared.btn} ${shared.goldBTN}`}>
                  {hasPin ? tx("Update PIN") : tx("Set PIN")}
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
export default PaymentsPanel;