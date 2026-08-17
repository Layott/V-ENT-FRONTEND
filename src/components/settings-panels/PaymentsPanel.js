'use client';

import { useState, useEffect } from 'react';
import shared from './settingsShared.module.css';
import styles from './PaymentsPanel.module.css';

const METHODS = [
  { v: 'wallet', label: 'V-ENT Wallet (VC)' },
  { v: 'card', label: 'Saved card' },
  { v: 'bank', label: 'Bank transfer' },
  { v: 'paystack', label: 'Paystack at checkout' },
];

const BRAND_COLORS = {
  Visa: '#1a1f71',
  Mastercard: '#eb001b',
  Verve: '#00b14f',
  Amex: '#006fcf',
};

const PaymentsPanel = ({ payments = {}, user = {}, onSave, showToast }) => {
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

  const persist = async (next) => {
    await onSave?.(next);
  };

  const setMethod = async (v) => {
    setDefaultMethod(v);
    await persist({ ...payments, default_method: v, saved_cards: savedCards, saved_banks: savedBanks });
  };

  const setDefaultCard = async (id) => {
    const next = savedCards.map((c) => ({ ...c, is_default: c.id === id }));
    setSavedCards(next);
    await persist({ ...payments, saved_cards: next });
    showToast?.('Default card updated');
  };

  const removeCard = async (id) => {
    const next = savedCards.filter((c) => c.id !== id);
    setSavedCards(next);
    await persist({ ...payments, saved_cards: next });
    showToast?.('Card removed');
  };

  const addCardStub = async (e) => {
    e.preventDefault();
    const last4 = String(e.target.elements.cardNum.value || '').slice(-4) || '0000';
    const exp = String(e.target.elements.exp.value || '12/27').split('/');
    const newCard = {
      id: `card_${Date.now()}`,
      last4,
      brand: e.target.elements.brand.value || 'Visa',
      exp_month: parseInt(exp[0], 10) || 12,
      exp_year: 2000 + (parseInt(exp[1], 10) || 27),
      is_default: savedCards.length === 0,
    };
    const next = [...savedCards, newCard];
    setSavedCards(next);
    await persist({ ...payments, saved_cards: next });
    setShowAddCard(false);
    showToast?.('Card added');
  };

  const submitPin = async (e) => {
    e.preventDefault();
    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      return showToast?.('PIN must be exactly 4 digits', 'error');
    }
    if (pinValue !== confirmPin) {
      return showToast?.('PINs do not match', 'error');
    }
    await persist({ ...payments, wallet_pin_set: true });
    setHasPin(true);
    setShowPinModal(false);
    setPinValue('');
    setConfirmPin('');
    showToast?.('Wallet PIN saved');
  };

  return (
    <div className={shared.formStack}>
      {/* Default payment method */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Default payment method</h3>
        <p className={shared.cardSub}>Used for tournament fees, ticket purchases, and marketplace orders.</p>

        <div className={shared.formGroup}>
          <select
            className={shared.formSelect}
            value={defaultMethod}
            onChange={(e) => setMethod(e.target.value)}
          >
            {METHODS.map((m) => (
              <option key={m.v} value={m.v}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Saved cards */}
      <div className={shared.card}>
        <div className={styles.cardHeaderRow}>
          <div>
            <h3 className={shared.cardTitle}>Saved cards</h3>
            <p className={shared.cardSub}>Manage cards used to top up your V-ENT wallet.</p>
          </div>
          <button
            type="button"
            className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`}
            onClick={() => setShowAddCard(true)}
          >
            + Add card
          </button>
        </div>

        {savedCards.length === 0 ? (
          <div className={styles.emptyCard}>
            No saved cards yet. Add one to enable one-tap top-ups.
          </div>
        ) : (
          <div className={styles.cardList}>
            {savedCards.map((c) => (
              <div key={c.id} className={styles.cardItem}>
                <div
                  className={styles.cardChip}
                  style={{ background: BRAND_COLORS[c.brand] || '#303136' }}
                >
                  {c.brand}
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.cardNum}>•••• •••• •••• {c.last4}</span>
                  <span className={styles.cardExp}>
                    Exp {String(c.exp_month).padStart(2, '0')}/{String(c.exp_year).slice(-2)}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  {c.is_default ? (
                    <span className={`${shared.verifyBadge} ${shared.verifyBadgeOk}`}>Default</span>
                  ) : (
                    <button
                      type="button"
                      className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN}`}
                      onClick={() => setDefaultCard(c.id)}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN} ${styles.removeBtn}`}
                    onClick={() => removeCard(c.id)}
                    aria-label="Remove card"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved banks */}
      <div className={shared.card}>
        <div className={styles.cardHeaderRow}>
          <div>
            <h3 className={shared.cardTitle}>Saved bank accounts</h3>
            <p className={shared.cardSub}>Used for withdrawals to local banks. Requires KYC verification.</p>
          </div>
        </div>

        {!user?.kyc_verified ? (
          <div className={styles.kycGate}>
            <div className={styles.kycGateIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className={styles.kycGateTitle}>KYC verification required</p>
              <p className={styles.kycGateSub}>
                Complete identity verification to add bank accounts and withdraw to local banks.
              </p>
            </div>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`}
              onClick={() => showToast?.('KYC flow coming soon')}
            >
              Verify identity
            </button>
          </div>
        ) : savedBanks.length === 0 ? (
          <div className={styles.emptyCard}>No bank accounts linked yet.</div>
        ) : (
          <div className={styles.bankList}>
            {savedBanks.map((b) => (
              <div key={b.id} className={styles.bankItem}>
                <div className={styles.bankMeta}>
                  <span className={styles.bankName}>{b.bank_name}</span>
                  <span className={styles.bankNum}>•••• {String(b.account_number).slice(-4)}</span>
                  <span className={styles.bankHolder}>{b.account_name}</span>
                </div>
                {b.is_default && (
                  <span className={`${shared.verifyBadge} ${shared.verifyBadgeOk}`}>Default</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wallet PIN */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Wallet PIN</h3>
        <p className={shared.cardSub}>
          Required for outgoing transfers and withdrawals. Choose a 4-digit PIN you can remember.
        </p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>
              {hasPin ? 'PIN is set' : 'No PIN set yet'}{' '}
              <span className={`${shared.verifyBadge} ${hasPin ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
                {hasPin ? 'Active' : 'Required'}
              </span>
            </span>
            <span className={shared.toggleRowSub}>
              {hasPin
                ? 'You can change your PIN at any time.'
                : 'You will not be able to send or withdraw VC until you set a PIN.'}
            </span>
          </div>
          <button
            type="button"
            className={`${shared.btn} ${shared.btnSm} ${hasPin ? shared.ghostBTN : shared.goldBTN}`}
            onClick={() => setShowPinModal(true)}
          >
            {hasPin ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>
      </div>

      {/* Add card modal */}
      {showAddCard && (
        <div className={shared.modalBackdrop} onClick={() => setShowAddCard(false)}>
          <div className={shared.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>Add a payment card</h3>
            <p className={shared.modalSub}>
              Card details are tokenised by Paystack and never stored on V-ENT servers.
            </p>

            <form onSubmit={addCardStub}>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="cardNum">Card number</label>
                <input id="cardNum" name="cardNum" type="text" inputMode="numeric" maxLength={19} placeholder="4242 4242 4242 4242" className={shared.formInput} />
              </div>
              <div className={shared.formRow}>
                <div className={shared.formGroup}>
                  <label className={shared.formLabel} htmlFor="exp">Expiry (MM/YY)</label>
                  <input id="exp" name="exp" type="text" placeholder="12/27" className={shared.formInput} />
                </div>
                <div className={shared.formGroup}>
                  <label className={shared.formLabel} htmlFor="cvv">CVV</label>
                  <input id="cvv" name="cvv" type="text" inputMode="numeric" maxLength={4} placeholder="123" className={shared.formInput} />
                </div>
              </div>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="brand">Brand</label>
                <select id="brand" name="brand" className={shared.formSelect} defaultValue="Visa">
                  <option>Visa</option>
                  <option>Mastercard</option>
                  <option>Verve</option>
                  <option>Amex</option>
                </select>
              </div>

              <div className={shared.modalActions}>
                <button
                  type="button"
                  className={`${shared.btn} ${shared.ghostBTN}`}
                  onClick={() => setShowAddCard(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={`${shared.btn} ${shared.goldBTN}`}>
                  Add card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN modal */}
      {showPinModal && (
        <div className={shared.modalBackdrop} onClick={() => setShowPinModal(false)}>
          <div className={shared.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{hasPin ? 'Change wallet PIN' : 'Set wallet PIN'}</h3>
            <p className={shared.modalSub}>
              Choose a 4-digit PIN. Avoid easy combinations like 1234 or your birth year.
            </p>

            <form onSubmit={submitPin}>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="pin">New PIN</label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className={shared.formInput}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                />
              </div>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="cpin">Confirm PIN</label>
                <input
                  id="cpin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className={shared.formInput}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                />
              </div>

              <div className={shared.modalActions}>
                <button
                  type="button"
                  className={`${shared.btn} ${shared.ghostBTN}`}
                  onClick={() => setShowPinModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={`${shared.btn} ${shared.goldBTN}`}>
                  {hasPin ? 'Update PIN' : 'Set PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPanel;
