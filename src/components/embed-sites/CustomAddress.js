'use client';
/**
 * "Use your own address" (P8c, level 3): a Premium organiser serves this
 * tournament or event on a name of their own, like tournaments.yourclub.com.
 *
 * The name must sit under a website already proven by DNS (the panel above),
 * and it goes live once a CNAME record points it at sites.v-ent.co. The API
 * decides who may add one and whether it is live; this only draws its answer.
 * Someone without Premium sees one sentence and the link to Premium.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from '@/components/event-site/event-site-panel.module.css';
import own from './approved-sites.module.css';

function DomainRow({ domain, busy, onCheck, onRemove, tt }) {
  const [confirming, setConfirming] = useState(false);
  const live = domain.state === 'active';
  const stateText = live
    ? tt('customAddress.live', 'Live')
    : (domain.state === 'failed'
      ? tt('customAddress.failed', 'Not working yet')
      : tt('customAddress.pending', 'Waiting for the CNAME record'));
  return (
    <li className={own.site}>
      <div className={own.siteHead}>
        <p className={own.host}>{domain.hostname}</p>
        <span className={live ? `${own.badge} ${own.badgeOn}` : own.badge}>{stateText}</span>
      </div>
      {live ? (
        <p className={styles.hint}>
          {tt('customAddress.liveHint', 'Visitors to {host} see this page.').replace('{host}', domain.hostname)}
        </p>
      ) : domain.last_code && (
        <p className={styles.error} role="status">
          {apiMessage(tt, { code: domain.last_code }, 'customAddress.checkFailed', 'The record was not found yet.')}
        </p>
      )}
      <div className={styles.saveRow}>
        <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => onCheck(domain.hostname)}>
          {busy ? tt('customAddress.checking', 'Checking...') : tt('customAddress.check', 'Check now')}
        </button>
        {confirming ? (
          <>
            <button type="button" className={styles.chip} disabled={busy} onClick={() => onRemove(domain.hostname)}>
              {tt('customAddress.removeSure', 'Remove for good')}
            </button>
            <button type="button" className={styles.chip} onClick={() => setConfirming(false)}>
              {tt('customAddress.keep', 'Keep it')}
            </button>
          </>
        ) : (
          <button type="button" className={styles.chip} disabled={busy} onClick={() => setConfirming(true)}>
            {tt('customAddress.remove', 'Remove')}
          </button>
        )}
      </div>
    </li>
  );
}

export default function CustomAddress({ kind, slug, token, call, hasDnsSite, showToast }) {
  const tt = useT();
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !slug) return undefined;
    let cancelled = false;
    setStatus('loading');
    call(`/sites/${kind}/${encodeURIComponent(slug)}/domains/`, token).then(({ ok, data }) => {
      if (cancelled) return;
      if (!ok) {
        setError(apiMessage(tt, data, 'customAddress.loadFailed', 'Your own address could not be loaded.'));
        setStatus('failed');
        return;
      }
      setInfo(data.data);
      setStatus('ready');
    }).catch(() => {
      if (!cancelled) {
        setError(tt('customAddress.loadFailed', 'Your own address could not be loaded.'));
        setStatus('failed');
      }
    });
    return () => { cancelled = true; };
    // tt is read for the words only; asking again when it changes would refetch for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, slug, token, attempt]);

  const base = `/sites/${kind}/${encodeURIComponent(slug)}/domains/`;

  const add = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy('add');
    setError('');
    try {
      const { ok, data } = await call(base, token, { method: 'POST', body: { hostname: draft.trim() } });
      if (!ok) {
        setError(apiMessage(tt, data, 'customAddress.addFailed', 'That address could not be added.'));
        return;
      }
      setInfo(data.data);
      setDraft('');
      showToast?.(tt('customAddress.added', 'Added. Create the CNAME record, then press Check now.'));
    } catch {
      setError(tt('customAddress.addFailed', 'That address could not be added.'));
    } finally {
      setBusy('');
    }
  };

  const check = async (hostname) => {
    setBusy(hostname);
    setError('');
    try {
      const { ok, data } = await call(`${base}${encodeURIComponent(hostname)}/check/`, token, { method: 'POST', body: {} });
      // A failed check still answers with the refreshed list.
      if (data?.data?.domains) setInfo(data.data);
      if (ok) showToast?.(tt('customAddress.liveToast', '{host} is live.').replace('{host}', hostname));
      else if (!data?.data?.domains) setError(apiMessage(tt, data, 'customAddress.checkFailed', 'The record was not found yet.'));
    } catch {
      setError(tt('customAddress.checkFailed', 'The record was not found yet.'));
    } finally {
      setBusy('');
    }
  };

  const remove = async (hostname) => {
    setBusy(hostname);
    setError('');
    try {
      const { ok, data } = await call(`${base}${encodeURIComponent(hostname)}/`, token, { method: 'DELETE' });
      if (!ok) {
        setError(apiMessage(tt, data, 'customAddress.removeFailed', 'That address could not be removed.'));
        return;
      }
      setInfo(data.data);
    } catch {
      setError(tt('customAddress.removeFailed', 'That address could not be removed.'));
    } finally {
      setBusy('');
    }
  };

  if (!token) return null;
  if (status === 'loading') {
    return <section className={styles.card} aria-busy="true"><div className={styles.skeleton} /></section>;
  }
  if (status === 'failed' || !info) {
    return (
      <section className={styles.card}>
        <h3 className={styles.heading}>{tt('customAddress.title', 'Use your own address')}</h3>
        <p className={styles.hint}>{error}</p>
        <button type="button" className={styles.chip} onClick={() => setAttempt((n) => n + 1)}>
          {tt('embed.tryAgain', 'Try again')}
        </button>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.heading}>{tt('customAddress.title', 'Use your own address')}</h3>
      {!info.premium ? (
        <p className={styles.hint}>
          {tt('customAddress.premiumOnly', 'Serving this on your own address is part of Premium.')}{' '}
          <Link href="/premium">{tt('premium.seeWhatItCosts', 'See what premium costs')}</Link>
        </p>
      ) : (
        <>
          <p className={styles.hint}>
            {tt('customAddress.intro', 'Point tournaments.yoursite.com at {target} with a CNAME record, then add it here. The name must sit under a website you proved by DNS above.')
              .replace('{target}', info.target)}
          </p>
          {!hasDnsSite && (
            <p className={styles.hint}>
              {tt('customAddress.needDns', 'Prove a website by its DNS record first. A meta tag is not enough for this.')}
            </p>
          )}
          {info.domains.length < info.most && (
            <form className={own.addRow} onSubmit={add}>
              <label className={own.addField}>
                <span className={styles.label}>{tt('customAddress.addLabel', 'Your address')}</span>
                <input className={styles.input} value={draft} maxLength={300} inputMode="url"
                       autoCapitalize="none" autoCorrect="off" spellCheck={false}
                       placeholder={tt('customAddress.addPlaceholder', 'tournaments.yourclub.com')}
                       onChange={(ev) => setDraft(ev.target.value)} />
              </label>
              <button type="submit" className={styles.primaryBtn} disabled={busy === 'add' || !draft.trim()}>
                {busy === 'add' ? tt('customAddress.adding', 'Adding...') : tt('customAddress.add', 'Add')}
              </button>
            </form>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {info.domains.length ? (
            <ul className={own.sites}>
              {info.domains.map((domain) => (
                <DomainRow key={domain.hostname} domain={domain} busy={busy === domain.hostname}
                           onCheck={check} onRemove={remove} tt={tt} />
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>{tt('customAddress.empty', 'No own address yet.')}</p>
          )}
        </>
      )}
    </section>
  );
}
