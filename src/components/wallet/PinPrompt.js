'use client';

// The four digits that authorise anything moving money.
//
// CEO, 29 August 2026: "check the top up, withdraw and the rest of the flows
// properly and make sure it works." Send and Withdraw did not work at all. Both
// endpoints require a `pin` and neither page collected one, so every send
// returned "recipient_username, amount, and pin are required" and every
// withdrawal returned the same about its own fields. The pages showed the
// server's message, so it looked like a validation quibble rather than a screen
// that could never succeed.
//
// It is one component because it is one decision, asked in the last place
// before money moves. Asking earlier, on the amount screen, would mean holding
// a PIN in state across three steps for no reason.
//
// The authenticator code lives here too, for the same reason: it is asked at
// the same moment, and putting it anywhere else would mean two prompts for one
// decision. It appears ONLY when the wallet endpoint has said this account has
// a confirmed second factor (`requires_2fa` on the balance payload). Somebody
// who has not enrolled is never shown a field they have nothing to type into.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LuX } from 'react-icons/lu';
import { useT } from '@/i18n/LanguageProvider';
import styles from './pin-prompt.module.css';

export default function PinPrompt({
  open,
  onCancel,
  onConfirm,
  busy = false,
  error = '',
  title,
  detail,
  requires2fa = false,
}) {
  const tt = useT();
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const field = useRef(null);

  useEffect(() => { if (!open) { setPin(''); setCode(''); } }, [open]);

  useEffect(() => {
    if (open && field.current) field.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const ready = pin.length === 4 && (!requires2fa || code.length === 6);

  const submit = (e) => {
    e.preventDefault();
    if (ready && !busy) onConfirm(pin, code);
  };

  return (
    <div
      className={styles.scrim}
      role="dialog"
      aria-modal="true"
      aria-label={title || tt('wallet.pinPrompt.title', 'Enter your wallet PIN')}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <form className={styles.panel} onSubmit={submit}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>{tt('wallet.pinPrompt.kicker', 'Confirm')}</span>
            <h2 className={styles.title}>
              {title || tt('wallet.pinPrompt.title', 'Enter your wallet PIN')}
            </h2>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label={tt('wallet.pinPrompt.cancel', 'Cancel')}
            onClick={onCancel}
            disabled={busy}
          >
            <LuX aria-hidden="true" />
          </button>
        </div>

        {detail && <p className={styles.detail}>{detail}</p>}

        <label className={styles.label} htmlFor="wallet-pin">
          {tt('wallet.pinPrompt.field', 'Four digits')}
        </label>
        <input
          id="wallet-pin"
          ref={field}
          className={styles.input}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          disabled={busy}
        />

        {requires2fa && (
          <>
            <label className={styles.label} htmlFor="wallet-2fa">
              {tt('wallet.pinPrompt.codeField', 'Six digits from your authenticator app')}
            </label>
            <input
              id="wallet-2fa"
              className={styles.input}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={busy}
            />
          </>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button type="submit" className={styles.confirm} disabled={!ready || busy}>
          {busy
            ? tt('wallet.pinPrompt.working', 'Confirming')
            : tt('wallet.pinPrompt.confirm', 'Confirm')}
        </button>

        <Link href="/wallets/pin" className={styles.forgot}>
          {tt('wallet.pinPrompt.setOrChange', 'Set or change your PIN')}
        </Link>
      </form>
    </div>
  );
}
