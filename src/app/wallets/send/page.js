'use client';

import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { formatNumber, ngnFromVc } from '@/components/wallet/walletHelpers';
import PinPrompt from '@/components/wallet/PinPrompt';
import styles from '../wallets.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
const STEPS = [{
  n: 1,
  lbl: 'Recipient'
}, {
  n: 2,
  lbl: 'Amount'
}, {
  n: 3,
  lbl: 'Review'
}, {
  n: 4,
  lbl: 'Done'
}];
const Stepper = ({
  step
}) => {
  // Bound here rather than in the page: this is its own component, defined at
  // module scope, so the page's translator is not in scope for it. That is
  // what threw "tx is not defined" at prerender.
  const tx = useTx();
  return <div className={styles.steps}>
    {STEPS.map((s, i) => {
    const status = step > s.n ? 'stepDone' : step === s.n ? 'stepActive' : 'stepWait';
    return <div key={`wrap-${s.n}`} style={{
      display: 'contents'
    }}>
          <div className={`${styles.step} ${styles[status]}`}>
            <div className={styles.stepCircle}>{step > s.n ? '✓' : s.n}</div>
            <div className={styles.stepLbl}>{tx(s.lbl)}</div>
          </div>
          {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${step > s.n ? styles.stepLineDone : ''}`} />}
        </div>;
  })}
  </div>;
};

const SendPage = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [step, setStep] = useState(1);
  const [balance, setBalance] = useState(null);
  const [requires2fa, setRequires2fa] = useState(false);
  // Who the money is going to is NAMED, never guessed from the text typed.
  // The same word could be a username, a team or an organisation, and guessing
  // wrong sends somebody's money to a stranger with the same name. The API
  // refuses to guess for exactly that reason, so the screen has to say.
  const [toKind, setToKind] = useState('user');
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [recipientError, setRecipientError] = useState('');
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [newBalance, setNewBalance] = useState(null);
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  });

  // Load balance + own username (used for self-send guard)
  useEffect(() => {
    let cancelled = false;
    // Wait for the NextAuth token - firing tokenless returns 400 and paints a
    // zero balance on first load.
    if (!session?.user?.sessionToken) return;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setBalance(Number(data.data?.balance ?? 0));
          setRequires2fa(Boolean(data.data?.requires_2fa));
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.sessionToken]);

  // Debounced lookup against the real account. This used to synthesize a
  // plausible-looking recipient in the browser, so the confirmation card could
  // show a person who does not exist.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setRecipient(null);
      setRecipientError('');
      return undefined;
    }
    const token = session?.user?.sessionToken;
    if (!token) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRecipientLoading(true);
      try {
        // Three kinds, three lookups, one normalised answer. Every branch
        // resolves against a REAL record before the confirmation card is
        // drawn: this page once synthesised a plausible-looking recipient in
        // the browser, so the card could show somebody who does not exist.
        const base = process.env.NEXT_PUBLIC_API_URL;
        const headers = { Authorization: `Bearer ${token}` };
        let found = null;

        if (toKind === 'user') {
          const res = await fetch(`${base}/auth/user/lookup/?q=${encodeURIComponent(q)}`, { headers, signal: controller.signal });
          const data = await res.json();
          if (data.status === 'success' && data.data?.user) {
            const u = data.data.user;
            found = { kind: 'user', ref: u.username, name: u.full_name || u.username, label: `@${u.username}`, handle: `@${u.username}`, avatar: u.avatar, user: u };
          }
        } else if (toKind === 'team') {
          const res = await fetch(`${base}/team/list-teams/?search=${encodeURIComponent(q)}`, { headers, signal: controller.signal });
          const data = await res.json();
          const team = (data?.data?.teams || [])[0];
          if (team) {
            found = { kind: 'team', ref: team.slug || team.name, name: team.name, label: team.name, handle: team.game || '', avatar: team.logo || team.logo_url };
          }
        } else {
          const res = await fetch(`${base}/organization/list/?search=${encodeURIComponent(q)}`, { headers, signal: controller.signal });
          const data = await res.json();
          const org = (data?.data?.organizations || [])[0];
          if (org) {
            found = { kind: 'org', ref: org.slug || org.name, name: org.name, label: org.name, handle: org.tag || '', avatar: org.logo };
          }
        }

        if (found) {
          setRecipientError('');
          setRecipient(found);
        } else {
          setRecipient(null);
          setRecipientError(
            toKind === 'user' ? tt('wallet.noSuchUser', 'No account found with that username or email.')
              : toKind === 'team' ? tt('wallet.noSuchTeam', 'No team found with that name.')
                : tt('wallet.noSuchOrg', 'No organisation found with that name.'));
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setRecipient(null);
          setRecipientError(tt('wallet.lookupFailed', 'Could not check that name. Try again.'));
        }
      } finally {
        setRecipientLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, toKind, session?.user?.sessionToken]);
  const numericAmount = Number(amount) || 0;
  const balanceAfter = (balance ?? 0) - numericAmount;
  const canContinueAmount = numericAmount > 0 && balance != null && numericAmount <= balance;
  const goReview = () => {
    if (!recipient) {
      setError(tt("msg.pickAValidRecipientFirst", "Pick a valid recipient first."));
      return;
    }
    if (!numericAmount || numericAmount < 1) {
      setError(tt("msg.enterHowMuchYouWant", "Enter how much you want to send."));
      return;
    }
    if (balance != null && numericAmount > balance) {
      setError(tt("msg.insufficientBalance", "Insufficient balance."));
      return;
    }
    setError('');
    setStep(3);
  };
  // The endpoint has always required a PIN and this page never asked for one,
  // so every send returned "recipient_username, amount, and pin are required"
  // and the screen showed that sentence as though the recipient were at fault.
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');

  const handleSend = async (pin, code) => {
    setSubmitting(true);
    setError('');
    setPinError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/send/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          to_kind: recipient.kind,
          to: recipient.ref,
          amount: numericAmount,
          pin,
          ...(code ? { code } : {}),
          note: memo
        })
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        const message = apiMessage(tt, data, "api.transferFailed", "Transfer failed.");
        // A refused PIN is answered where it was typed. Closing the prompt and
        // showing it on the page behind would read as the send having failed
        // for some other reason.
        const failedCode = String(data?.code || '');
        if (/PIN/i.test(failedCode) || /pin/i.test(message)
            || failedCode === 'TWO_FACTOR_REQUIRED' || failedCode === 'INVALID_CODE') {
          setPinError(message);
        } else {
          setPinOpen(false);
          setError(message);
        }
        setSubmitting(false);
        return;
      }
      setPinOpen(false);
      setNewBalance(Number(data.data?.new_balance ?? balance - numericAmount));
      setReference(data.data?.transaction_id || data.data?.reference || `TXN-${Date.now().toString().slice(-8)}`);
      setStep(4);
    } catch (err) {
      console.error(err);
      setPinError(tt("msg.networkErrorPleaseTryAgain", "Network error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };
  const initials = (recipient?.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';
  const KINDS = [
    { id: 'user', label: tt('wallet.kindUser', 'A person') },
    { id: 'team', label: tt('wallet.kindTeam', 'A team') },
    { id: 'org', label: tt('wallet.kindOrg', 'An organisation') },
  ];
  const pickKind = (id) => {
    setToKind(id);
    setQuery('');
    setRecipient(null);
    setRecipientError('');
  };
  const lookupLabel = toKind === 'user'
    ? tt('wallet.toUserHint', 'Their username or email')
    : toKind === 'team'
      ? tt('wallet.toTeamHint', 'The team name')
      : tt('wallet.toOrgHint', 'The organisation name');
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>{tt("ui.send.vent.coins.6a21", "Send VENT COINS")}</h1>
              <p className={styles.pageSubtitle}>{tt('wallet.sendSubtitle', 'Send coins to a person, a team, or an organisation.')}</p>
            </div>
          </div>

          <div className={styles.formCard}>
            <Stepper step={step} />

            {step === 1 && <>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{tt("ui.balance.ec62", "Your balance")}</span>
                  <span className={styles.infoRowVal}>{formatNumber(balance ?? 0)} VC</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className="fieldLabelRow">{tt('wallet.sendingTo', 'Sending to')} <InfoTip id="sendRecipient" /></span>
                  </label>
                  {/* Said, never guessed. "vermillion" could be a username, a
                      team or an organisation, and the API refuses to guess
                      because guessing wrong sends the money to a stranger. */}
                  <div className={styles.chipGroup} role="group" aria-label={tt('wallet.sendingTo', 'Sending to')}>
                    {KINDS.map(k => (
                      <button key={k.id} type="button"
                              className={`${styles.chip} ${toKind === k.id ? styles.chipActive : ''}`}
                              aria-pressed={toKind === k.id}
                              onClick={() => pickKind(k.id)}>
                        {k.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="send-lookup">
                    <span className="fieldLabelRow">{lookupLabel}</span>
                  </label>
                  <input id="send-lookup" name="send-lookup" type="text" className={styles.formInput}
                         placeholder={toKind === 'user'
                           ? tt("ui.username.user.email.com.26ca", "@username or user@email.com")
                           : tt('wallet.startTyping', 'Start typing the name')}
                         value={query} onChange={e => setQuery(e.target.value)} autoFocus />
                </div>

                {recipient && <div className={styles.recipientCard}>
                    <div className={styles.recipientAvatar}>
                      {recipient.avatar ? <Image src={mediaUrl(recipient.avatar)} width={40} height={40} alt={recipient.name} unoptimized /> : initials}
                    </div>
                    <div className={styles.recipientInfo}>
                      {/* Who the money is going to. For a person that is their
                          chip, with the badge and a way to check the profile
                          before sending; a team or an organisation has neither
                          a profile chip nor a handle, so it says its own name. */}
                      {recipient.kind === 'user'
                        ? <UserChip user={recipient.user} size={40} secondary
                                    nameClassName={styles.recipientName}
                                    handleClassName={styles.recipientHandle} />
                        : <>
                            <p className={styles.recipientName}>{recipient.name}</p>
                            {recipient.handle ? <p className={styles.recipientHandle}>{recipient.handle}</p> : null}
                          </>}
                    </div>
                    <span className={`${styles.recipientStatus} ${styles.recipientFound}`}>
                      {tt("ui.found.d7a7", "✓ Found")}
                    </span>
                  </div>}

                {recipientLoading && !recipient && <p className={styles.pageSubtitle}>{tt('wallet.checkingName', 'Checking that name...')}</p>}

                {recipientError && !recipientLoading && <div className={`${styles.notice} ${styles.noticeError}`}>{recipientError}</div>}

                <div className={styles.btnRow}>
                  <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>{tt("ui.cancel.77df", "Cancel")}</Link>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={() => recipient && setStep(2)} disabled={!recipient}>
                    {tt("ui.continue.2e02", "Continue")}
                  </button>
                </div>
              </>}

            {step === 2 && recipient && <>
                <div className={styles.recipientCard}>
                  <div className={styles.recipientAvatar}>
                    {recipient.avatar ? <Image src={mediaUrl(recipient.avatar)} width={40} height={40} alt={recipient.name} unoptimized /> : initials}
                  </div>
                  <div className={styles.recipientInfo}>
                    <p className={styles.recipientName}>{recipient.name}</p>
                    {recipient.handle ? <p className={styles.recipientHandle}>{recipient.handle}</p> : null}
                  </div>
                  <button type="button" className={styles.btnGhost} style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }} onClick={() => setStep(1)}>
                    {tt("ui.change.64fb", "Change")}
                  </button>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.amount.vent.coins.a1db", "Amount (VENT COINS)")} <InfoTip id="ventCoins" /></span></label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.prefixTag}>VC</span>
                    <input type="number" placeholder="e.g. 50" min="1" max={balance ?? undefined} value={amount} onChange={e => {
                  setAmount(e.target.value);
                  setError('');
                }} autoFocus />
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{tt("ui.balance.after.50e7", "Balance after")}</span>
                  <span className={`${styles.infoRowVal} ${balanceAfter < 0 ? styles.infoRed : styles.infoNeutral}`}>
                    {numericAmount > 0 ? `${formatNumber(balanceAfter)} VC` : `${formatNumber(balance ?? 0)} VC`}
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.memo.optional.40c6", "Memo (optional)")} <InfoTip id="sendMemo" /></span></label>
                  <input type="text" className={styles.formInput} placeholder={tt("ui.e.g.team.contribution.6070", "e.g. team contribution")} value={memo} onChange={e => setMemo(e.target.value)} maxLength={120} />
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)}>
                    {tt("ui.back.b52b", "Back")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={goReview} disabled={!canContinueAmount}>
                    {tt("ui.review.e29a", "Review")}
                  </button>
                </div>
              </>}

            {step === 3 && recipient && <>
                <h2 style={{
              fontSize: '1rem',
              margin: '0 0 0.4rem'
            }}>{tt("ui.review.transfer.77cc", "Review your transfer")}</h2>
                <p style={{
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '1rem',
              fontFamily: 'Inter, sans-serif'
            }}>
                  {tt("ui.double.check.recipient.amount.e347", "Double-check the recipient and amount. This action cannot be undone.")}
                </p>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.text.ae79", "To")}</span>
                    <span className={styles.summaryVal}>{recipient.name}{recipient.handle ? ` (${recipient.handle})` : ''}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.amount.43dc", "Amount")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-{formatNumber(numericAmount)} VC</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.ngn.value.bb32", "≈ NGN value")}</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngnFromVc(numericAmount))}</span>
                  </div>
                  {memo && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.memo.1fd7", "Memo")}</span>
                      <span className={styles.summaryVal}>{memo}</span>
                    </div>}
                  <div className={styles.summaryHr} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.balance.after.50e7", "Balance after")}</span>
                    <span className={styles.summaryVal}>{formatNumber((balance ?? 0) - numericAmount)} VC</span>
                  </div>
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(2)} disabled={submitting}>
                    {tt("ui.back.b52b", "Back")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={() => { setPinError(''); setPinOpen(true); }} disabled={submitting}>
                    {/* Built with t(), not interpolated into an English
                        sentence. This read "Send 5 VC" on a French page,
                        which is the failure a template literal always
                        produces: the number is translated and the words
                        around it are not. */}
                    {submitting ? tx("Sending…")
                      : tt('wallet.sendAmount', 'Send {amount} VC')
                          .replace('{amount}', formatNumber(numericAmount))}
                  </button>
                </div>
              </>}

            {step === 4 && recipient && <div className={styles.successCenter}>
                <div className={styles.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--v-ent-gold)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>{tt("ui.transfer.successful.9bd2", "Transfer Successful")}</h2>
                <p className={styles.successSub}>
                  <strong style={{
                color: 'var(--v-ent-gold)'
              }}>{formatNumber(numericAmount)} VC</strong> {tt("ui.sent.0a7e", "sent to")} <strong style={{
                color: 'var(--primary-bg)'
              }}>{recipient.label || recipient.name}</strong>.
                </p>

                <div className={styles.summaryList} style={{
              textAlign: 'left'
            }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.reference.db1c", "Reference")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRef}`}>{reference}</span>
                  </div>
                  {newBalance != null && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.new.balance.193e", "New balance")}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>{formatNumber(newBalance)} VC</span>
                    </div>}
                </div>

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => {
                setStep(1);
                setQuery('');
                setRecipient(null);
                setAmount('');
                setMemo('');
                setReference('');
              }}>
                    {tt("ui.send.another.00e1", "Send another")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={() => router.push('/wallets')}>
                    {tt("ui.done.e9b4", "Done")}
                  </button>
                </div>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />

      <PinPrompt
        open={pinOpen}
        busy={submitting}
        error={pinError}
        onCancel={() => { setPinOpen(false); setPinError(''); }}
        onConfirm={handleSend}
        requires2fa={requires2fa}
        title={tt('wallet.send.pinTitle', 'Confirm this transfer')}
        detail={recipient
          ? tt('wallet.sendSummaryTo', '{amount} VC to {who}')
              .replace('{amount}', formatNumber(numericAmount))
              .replace('{who}', recipient.label || recipient.name)
          : ''}
      />
    </div>;
};
export default SendPage;