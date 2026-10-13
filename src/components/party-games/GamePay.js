'use client';

// Paying to play a party game (inbox 449, piece G3).
//
// CEO, 12 October 2026: "add that organizers can add entry fees to games aso if
// they want to." The fee is coins from the wallet with the PIN, the number is
// said before anything is taken, and a card covers whatever the wallet is short
// (PayShortfall), as at every other door that sells something. What comes back
// and when is said here too, because it is the question somebody asks before
// paying for a place in a game at a party.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber, formatWithZone } from '@/lib/datetime';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';
import PayShortfall from '@/components/pay/PayShortfall';
import styles from './game-pay.module.css';

/**
 * @param game     the game being paid for (fee_vc, fee_total_vc, starts_at)
 * @param name     its name in the reader's language
 * @param ticket   the ticket the place is for ({code, name, tier})
 * @param path     the event's games address, ending in a slash
 * @param token    the payer's session token
 * @param onPaid   called with the join answer once the place is paid for
 * @param onClose  closes the sheet
 */
export default function GamePay({ game, name, ticket, path, token, onPaid, onClose }) {
  const tt = useT();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [walletKey, setWalletKey] = useState(0);
  const closeRef = useRef(null);
  const total = Number(game.fee_total_vc || game.fee_vc || 0);
  const serviceFee = Math.max(0, total - Number(game.fee_vc || 0));

  useEffect(() => { closeRef.current?.focus(); }, []);
  const onKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  const pay = async () => {
    if (pin.length < 4) {
      setProblem(tt('buy.pinNeeded', 'Enter your 4-digit wallet PIN to authorise this payment.'));
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const body = await ventFetch(`${path}${game.id}/join/`, {
        method: 'POST', token, body: { ticket_code: ticket.code, pin },
      });
      onPaid(body);
    } catch (err) {
      setProblem(apiMessage(tt, err, 'games.pay.failed', 'That payment did not go through. Nothing was taken.'));
      // A short wallet answers with the numbers PayShortfall prices the card
      // from; asking it to look again shows the card for exactly that.
      if (err?.code === 'INSUFFICIENT_BALANCE') setWalletKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true"
         aria-label={tt('games.pay.title', 'Play {name}').replace('{name}', name)}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.sheet}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>{tt('games.pay.kicker', 'Entry fee')}</span>
            <h2 className={styles.name}>{tt('games.pay.title', 'Play {name}').replace('{name}', name)}</h2>
          </div>
          <button ref={closeRef} type="button" className={styles.quiet} onClick={onClose}>
            {tt('games.close', 'Close')}
          </button>
        </div>

        <div className={styles.rows}>
          <div className={styles.row}>
            <span>{tt('games.pay.for', 'For')}</span>
            <span>{[ticket.name, ticket.tier].filter(Boolean).join(' · ')}</span>
          </div>
          {game.starts_at && (
            <div className={styles.row}>
              <span>{tt('games.field.when', 'When')}</span>
              <span>{formatWithZone(game.starts_at)}</span>
            </div>
          )}
          <div className={styles.row}>
            <span>{tt('games.pay.fee', 'Entry fee')}</span>
            <span>{tt('games.pay.coins', '{n} VC').replace('{n}', formatNumber(Number(game.fee_vc || 0)))}</span>
          </div>
          {serviceFee > 0 && (
            <div className={styles.row}>
              <span>{tt('buy.serviceFee', 'Service fee')}</span>
              <span>{tt('games.pay.coins', '{n} VC').replace('{n}', formatNumber(serviceFee))}</span>
            </div>
          )}
          <div className={`${styles.row} ${styles.total}`}>
            <span>{tt('ui.pay.2d77', 'You pay')}</span>
            <span>{tt('games.pay.coins', '{n} VC').replace('{n}', formatNumber(total))}</span>
          </div>
        </div>

        <p className={styles.note}>
          {tt('games.pay.refundRule', 'You get it back if you leave before the game starts, or if the organiser takes the game off. Once it has started, leaving keeps the fee.')}
        </p>

        <label className={styles.field}>
          <span>{tt('ui.wallet.pin.2cdf', 'Wallet PIN')}</span>
          <input type="password" inputMode="numeric" maxLength={6} autoComplete="off"
                 className={styles.pin} placeholder="••••" value={pin}
                 onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </label>

        {/* CEO, 13 September 2026: nobody has to go and buy coins before they
            can buy something. The card covers what the wallet is short. */}
        <PayShortfall key={walletKey} needVc={total} purpose="game" token={token}
                      resume={{ door: 'game', game: game.id }}
                      onPaid={() => setProblem('')} />

        {problem && <p className={styles.problem} role="alert">{problem}</p>}

        <button type="button" className={styles.payBtn} disabled={busy} onClick={pay}>
          {busy
            ? tt('pay.working', 'Paying...')
            : tt('games.pay.button', 'Pay {n} VC and play').replace('{n}', formatNumber(total))}
        </button>
      </div>
    </div>
  );
}
