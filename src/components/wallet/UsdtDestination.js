'use client';

// Where a USDT payout goes: the addresses on this account, and how one is added.
//
// CEO spec, 7 September 2026: "Request payouts in USDT to my crypto wallet."
//
// ## Why an address is added once and chosen afterwards
//
// A destination typed into the payout form is the way platforms lose money:
// somebody gets into an account, changes where it goes, and it leaves for
// ever, because a chain payment does not reverse. So an address is filed,
// proved with a code sent to the account's mailbox, and afterwards picked
// from a list. The API refuses one that was never proved, and this screen
// does not offer one either.
//
// ## The styles come from the page
//
// `styles` is the wallet page's own module, passed in, so this reads as the
// same screen rather than as a panel somebody bolted on. Nothing here defines
// a surface, a radius or a colour of its own.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function UsdtDestination({ styles, token, selected, onSelect,
                                          onEnabledChange }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [enabled, setEnabled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [adding, setAdding] = useState(false);
  const [network, setNetwork] = useState('trc20');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [codeFor, setCodeFor] = useState('');
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/auth/wallet/payout-addresses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok && body.status === 'success') {
        setRows(body.data.addresses || []);
        setNetworks(body.data.networks || []);
        setEnabled(Boolean(body.data.usdt_enabled));
        if (onEnabledChange) onEnabledChange(Boolean(body.data.usdt_enabled));
      } else {
        setError(apiMessage(tt, body, 'api.couldNotLoadAddresses',
          'Could not load your payout addresses.'));
      }
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [token, tt, onEnabledChange]);

  useEffect(() => { load(); }, [load]);

  const post = async (payload, then) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${API}/auth/wallet/payout-addresses/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.thatDidNotWork', 'That did not go through.'));
        return false;
      }
      setRows(body.data.addresses || []);
      setNotice(body.message || '');
      if (then) then(body);
      return true;
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className={styles.txEmpty}>{tt('ui.loading', 'Loading...')}</p>;
  }

  // Not open yet, and said plainly rather than hidden. The request pipeline is
  // built; what it waits on is a decision and a funded float, and offering the
  // option before then would hold somebody's balance for a payout nobody can
  // send.
  if (enabled === false) {
    return <div className={`${styles.notice} ${styles.noticeWarn}`}>
      {tt('wallet.usdtNotOpen', 'Payouts in USDT are not open yet. A bank transfer is the way out today, and we will write to everybody when crypto payouts start.')}
    </div>;
  }

  const confirmed = rows.filter((r) => r.confirmed);
  const waiting = rows.filter((r) => !r.confirmed);

  return <div>
    {notice ? <div className={`${styles.notice} ${styles.noticeWarn}`}>{notice}</div> : null}
    {error ? <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div> : null}

    {confirmed.map((row) => <div key={row.ref}
      className={`${styles.bankRow} ${selected?.ref === row.ref ? styles.bankRowActive : ''}`}
      onClick={() => onSelect(row)}>
      <div>
        <div className={styles.bankName}>{row.network_label}</div>
        <div className={styles.bankHolder}>{row.label ? `${row.label} - ` : ''}{row.short}</div>
      </div>
      {selected?.ref === row.ref
        ? <span className={styles.bankDefault}>{tt('ui.selected.b0ec', '✓ Selected')}</span>
        : null}
    </div>)}

    {/* An address waiting on its code. Shown, because somebody who closed the
        tab needs to find it again, and it carries the field it needs rather
        than sending them somewhere else. */}
    {waiting.map((row) => <div key={row.ref} className={styles.bankRow}>
      <div style={{ width: '100%' }}>
        <div className={styles.bankName}>{row.network_label}</div>
        <div className={styles.bankHolder}>
          {row.short} - {tt('wallet.awaitingCode', 'waiting for the code we emailed you')}
        </div>
        {codeFor === row.ref ? <div className={styles.formGroup} style={{ marginTop: '0.6rem' }}>
          <input className={styles.formInput} inputMode="numeric" maxLength={6}
                 autoComplete="one-time-code"
                 placeholder={tt('wallet.sixDigitCode', '6 digit code')}
                 value={code}
                 onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`}
                    disabled={busy}
                    onClick={() => { setCodeFor(''); setCode(''); }}>
              {tt('ui.cancel.77df', 'Cancel')}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnGrn}`}
                    disabled={busy || code.length < 6}
                    onClick={async () => {
                      const ok = await post({ action: 'confirm', ref: row.ref, code },
                        (body) => {
                          const fresh = (body.data.addresses || [])
                            .find((r) => r.ref === row.ref);
                          if (fresh) onSelect(fresh);
                        });
                      if (ok) { setCodeFor(''); setCode(''); }
                    }}>
              {tt('wallet.confirmAddress', 'Confirm this address')}
            </button>
          </div>
        </div> : <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`}
                  disabled={busy}
                  onClick={() => post({ action: 'add', network: row.network,
                                        address: row.address, label: row.label })}>
            {tt('wallet.resendCode', 'Send the code again')}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGrn}`}
                  onClick={() => { setCodeFor(row.ref); setCode(''); }}>
            {tt('wallet.enterCode', 'Enter the code')}
          </button>
        </div>}
      </div>
    </div>)}

    {rows.length === 0 && !adding ? <p className={styles.txEmpty} style={{ padding: '0.85rem 0' }}>
      {tt('wallet.noAddressesYet', 'No crypto address on your account yet. Add one and we will email you a code to confirm it belongs to you.')}
    </p> : null}

    {adding ? <div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{tt('wallet.network', 'Network')}</label>
        <select className={styles.formInput} value={network}
                onChange={(e) => setNetwork(e.target.value)} style={{ cursor: 'pointer' }}>
          {networks.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
        </select>
      </div>
      {/* Said before they paste, not after the money has gone. Sending on the
          wrong network destroys it with a successful receipt and no warning
          from anybody. */}
      <div className={`${styles.notice} ${styles.noticeWarn}`}>
        {tt('wallet.networkWarning', 'Check the network. USDT sent on TRON to an Ethereum address is lost, and nobody can reverse it.')}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{tt('wallet.address', 'Wallet address')}</label>
        <input className={styles.formInput} value={address} autoComplete="off"
               placeholder={network === 'trc20' ? 'T...' : '0x...'}
               onChange={(e) => setAddress(e.target.value.trim())} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{tt('wallet.addressLabel', 'What to call it (optional)')}</label>
        <input className={styles.formInput} value={label} maxLength={60}
               placeholder={tt('wallet.addressLabelHint', 'Binance, Trust Wallet, ...')}
               onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className={styles.btnRow}>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`}
                disabled={busy} onClick={() => { setAdding(false); setError(''); }}>
          {tt('ui.cancel.77df', 'Cancel')}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGrn}`}
                disabled={busy || address.length < 20}
                onClick={async () => {
                  const ok = await post({ action: 'add', network, address, label });
                  if (ok) { setAdding(false); setAddress(''); setLabel(''); }
                }}>
          {busy ? tt('wallet.sending', 'Sending...') : tt('wallet.addAddress', 'Add and email me the code')}
        </button>
      </div>
    </div> : <div className={styles.btnRow}>
      <button type="button" className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => { setAdding(true); setNotice(''); setError(''); }}>
        {tt('wallet.addAnotherAddress', 'Add a crypto address')}
      </button>
    </div>}
  </div>;
}
