'use client';

// The Convert button, doing what its label says.
//
// CEO, 29 August 2026: "the convert button on the wallet page doesn't work, it
// does nothing." It was rendered `disabled` with an aria-label reading "Convert
// (coming soon)", so a screen reader was told it was unfinished and everybody
// else got a button that ignored them. A control that is not ready should not
// be drawn as a control.
//
// What it does now is the thing people were reaching for: work out what an
// amount is worth in the other unit, in both directions. It does not move any
// money, and it says so, because "convert" next to Top Up, Send and Withdraw
// otherwise reads like a fourth thing that touches the balance.
//
// The rate is the platform rate, 1,000 naira to 1 VENT COIN, from the same
// helper the rest of the wallet uses. The nightly currency feed is deliberately
// not consulted here: it is display-only and is never what anybody is charged,
// and a converter showing a number nobody will be charged is worse than none.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LuX } from 'react-icons/lu';
import { NGN_PER_VC, formatNumber } from './walletHelpers';
import { useT } from '@/i18n/LanguageProvider';
import styles from './convert-panel.module.css';

const clean = (raw) => String(raw ?? '').replace(/[^\d.]/g, '');

export default function ConvertPanel({ open, onClose, balance = 0 }) {
  const tt = useT();
  const [vc, setVc] = useState('');
  const [ngn, setNgn] = useState('');
  const firstField = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && firstField.current) firstField.current.focus();
  }, [open]);

  if (!open) return null;

  // Each field drives the other. Typing in one is the only source of truth for
  // that keystroke, so a rounded value never gets fed back and rounded again.
  const onVc = (raw) => {
    const value = clean(raw);
    setVc(value);
    setNgn(value === '' ? '' : String(Math.round(Number(value) * NGN_PER_VC)));
  };
  const onNgn = (raw) => {
    const value = clean(raw);
    setNgn(value);
    if (value === '') { setVc(''); return; }
    const coins = Number(value) / NGN_PER_VC;
    // Two decimals: 500 naira is half a coin, and saying "0" would be a lie.
    setVc(String(Math.round(coins * 100) / 100));
  };

  const useBalance = () => onVc(String(balance || 0));

  return (
    <div
      className={styles.scrim}
      role="dialog"
      aria-modal="true"
      aria-label={tt('wallet.convert.title', 'What is it worth?')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>{tt('wallet.convert.kicker', 'Converter')}</span>
            <h2 className={styles.title}>{tt('wallet.convert.title', 'What is it worth?')}</h2>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label={tt('wallet.convert.close', 'Close')}
            onClick={onClose}
          >
            <LuX aria-hidden="true" />
          </button>
        </div>

        <label className={styles.field} htmlFor="convert-vc">
          <span className={styles.fieldLabel}>{tt('wallet.convert.coins', 'VENT COINS')}</span>
          <div className={styles.inputWrap}>
            <input
              id="convert-vc"
              ref={firstField}
              className={styles.input}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={vc}
              onChange={(e) => onVc(e.target.value)}
            />
            <span className={styles.unit}>VC</span>
          </div>
        </label>

        <label className={styles.field} htmlFor="convert-ngn">
          <span className={styles.fieldLabel}>{tt('wallet.convert.naira', 'Naira')}</span>
          <div className={styles.inputWrap}>
            <input
              id="convert-ngn"
              className={styles.input}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={ngn}
              onChange={(e) => onNgn(e.target.value)}
            />
            <span className={styles.unit}>NGN</span>
          </div>
        </label>

        <button type="button" className={styles.useBalance} onClick={useBalance}>
          {tt('wallet.convert.useBalance', 'Use my balance')}
          <span className={styles.useBalanceAmount}>{formatNumber(balance || 0)} VC</span>
        </button>

        <p className={styles.rate}>
          {tt('wallet.convert.rate', 'The rate is fixed: 1,000 naira is 1 VENT COIN.')}
        </p>
        <p className={styles.note}>
          {tt(
            'wallet.convert.noMoneyMoves',
            'This works out a value. It does not move anything. Top up to turn naira into coins, or withdraw to turn coins back into naira.',
          )}
        </p>

        <div className={styles.actions}>
          <Link href="/wallets/topup" className={styles.go} onClick={onClose}>
            {tt('wallet.convert.goTopup', 'Top up')}
          </Link>
          <Link href="/wallets/withdraw" className={styles.go} onClick={onClose}>
            {tt('wallet.convert.goWithdraw', 'Withdraw')}
          </Link>
        </div>
      </div>
    </div>
  );
}
