'use client';
/**
 * Approved sites, in both consoles (P8, design 14c, level 2).
 *
 * CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
 * or put tournament registrations and brackets system under their own website
 * from v-ent."
 *
 * Three parts, one per question an organiser has:
 *
 *   where can this be shown   anywhere, or only on the sites it is locked to;
 *                             a chip per proven site turns it on or off
 *   my websites               add a domain, publish the DNS record or the
 *                             meta tag shown, press Check; a site is proven
 *                             once, for every tournament and event
 *   views by site             the last 30 days, per host
 *
 * The same component on the tournament console ("On your website") and the
 * event console ("Website and embeds"), because both embeds are one feature.
 * The API decides who may change anything; this only draws what it answers.
 */
import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber, formatRelative } from '@/lib/datetime';
import CopyRow from './CopyRow';
import CustomAddress from './CustomAddress';
import styles from '@/components/event-site/event-site-panel.module.css';
import own from './approved-sites.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

async function call(path, token, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data?.status === 'success', data };
}

function SiteRow({ site, busy, onCheck, onRemove, tt }) {
  const [confirming, setConfirming] = useState(false);
  const proof = site.method === 'dns'
    ? tt('embedSites.provenDns', 'Proven by the DNS record. Covers {host} and every address under it.')
    : tt('embedSites.provenMeta', 'Proven by the meta tag. Covers {host} only.');
  return (
    <li className={own.site}>
      <div className={own.siteHead}>
        <p className={own.host}>{site.host}</p>
        <span className={site.verified ? `${own.badge} ${own.badgeOn}` : own.badge}>
          {site.verified ? tt('embedSites.proven', 'Proven') : tt('embedSites.notProven', 'Not proven yet')}
        </span>
      </div>
      {site.verified ? (
        <p className={styles.hint}>{proof.replace('{host}', site.host)}</p>
      ) : (
        <>
          <p className={styles.hint}>
            {tt('embedSites.proveHow', 'Publish one of these, then press Check. A DNS record can take a while to appear.')}
          </p>
          <CopyRow label={tt('embedSites.dnsLabel', 'DNS TXT record')}
                   hint={tt('embedSites.dnsHint', 'Name: {name}').replace('{name}', site.dns.name)}
                   code={site.dns.value} />
          <CopyRow label={tt('embedSites.metaLabel', 'Or a meta tag on your home page')}
                   hint={tt('embedSites.metaHint', 'Inside <head> on https://{host}/').replace('{host}', site.host)}
                   code={site.meta} />
          {site.last_code && (
            <p className={styles.error} role="status">
              {apiMessage(tt, { code: site.last_code }, 'embedSites.checkFailed', 'Not proven yet.')}
              {site.checked_at ? ` ${tt('embedSites.checkedAt', 'Checked {when}.').replace('{when}', formatRelative(site.checked_at))}` : ''}
            </p>
          )}
        </>
      )}
      <div className={styles.saveRow}>
        {!site.verified && (
          <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => onCheck(site.host)}>
            {busy ? tt('embedSites.checking', 'Checking...') : tt('embedSites.check', 'Check')}
          </button>
        )}
        {confirming ? (
          <>
            <button type="button" className={styles.chip} disabled={busy} onClick={() => onRemove(site.host)}>
              {site.locks
                ? tt('embedSites.removeLocked', 'Remove it, and unlock everything it locks')
                : tt('embedSites.removeSure', 'Remove for good')}
            </button>
            <button type="button" className={styles.chip} onClick={() => setConfirming(false)}>
              {tt('embedSites.keep', 'Keep it')}
            </button>
          </>
        ) : (
          <button type="button" className={styles.chip} disabled={busy} onClick={() => setConfirming(true)}>
            {tt('embedSites.remove', 'Remove')}
          </button>
        )}
      </div>
    </li>
  );
}

export default function ApprovedSites({ kind, slug, token, showToast }) {
  const tt = useT();
  const [record, setRecord] = useState(null);
  const [sites, setSites] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !slug) return undefined;
    let cancelled = false;
    setStatus('loading');
    Promise.all([
      call(`/sites/${kind}/${encodeURIComponent(slug)}/`, token),
      call('/sites/mine/', token),
    ]).then(([here, mine]) => {
      if (cancelled) return;
      if (!here.ok || !mine.ok) {
        setError(apiMessage(tt, here.ok ? mine.data : here.data, 'embedSites.loadFailed', 'The sites could not be loaded.'));
        setStatus('failed');
        return;
      }
      setRecord(here.data.data);
      setSites(mine.data.data.sites || []);
      setStatus('ready');
    }).catch(() => {
      if (!cancelled) {
        setError(tt('embedSites.loadFailed', 'The sites could not be loaded.'));
        setStatus('failed');
      }
    });
    return () => { cancelled = true; };
    // tt is read for the words only; asking again when it changes would refetch for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, slug, token, attempt]);

  const replaceSite = useCallback((row) => {
    setSites((list) => {
      const others = list.filter((s) => s.host !== row.host);
      return [...others, row].sort((a, b) => a.host.localeCompare(b.host));
    });
  }, []);

  const add = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy('add');
    setError('');
    try {
      const { ok, data } = await call('/sites/mine/', token, { method: 'POST', body: { host: draft.trim() } });
      if (!ok) {
        setError(apiMessage(tt, data, 'embedSites.addFailed', 'That site could not be added.'));
        return;
      }
      replaceSite(data.data);
      setDraft('');
      showToast?.(tt('embedSites.added', 'Added. Publish the record or the tag, then press Check.'));
    } catch {
      setError(tt('embedSites.addFailed', 'That site could not be added.'));
    } finally {
      setBusy('');
    }
  };

  const check = async (host) => {
    setBusy(host);
    setError('');
    try {
      const { ok, data } = await call(`/sites/mine/${encodeURIComponent(host)}/check/`, token, { method: 'POST', body: {} });
      if (data?.data?.host) replaceSite(data.data);
      if (ok) showToast?.(tt('embedSites.provenToast', '{host} is proven. You can lock this to it now.').replace('{host}', host));
      else if (!data?.data?.host) setError(apiMessage(tt, data, 'embedSites.checkFailed', 'Not proven yet.'));
    } catch {
      setError(tt('embedSites.checkFailed', 'Not proven yet.'));
    } finally {
      setBusy('');
    }
  };

  const remove = async (host) => {
    setBusy(host);
    setError('');
    try {
      const { ok, data } = await call(`/sites/mine/${encodeURIComponent(host)}/`, token, { method: 'DELETE' });
      if (!ok) {
        setError(apiMessage(tt, data, 'embedSites.removeFailed', 'That site could not be removed.'));
        return;
      }
      setSites((list) => list.filter((s) => s.host !== host));
      setAttempt((n) => n + 1);
    } catch {
      setError(tt('embedSites.removeFailed', 'That site could not be removed.'));
    } finally {
      setBusy('');
    }
  };

  const saveLocks = async (hosts) => {
    setBusy('locks');
    setError('');
    try {
      const { ok, data } = await call(`/sites/${kind}/${encodeURIComponent(slug)}/locks/`, token,
        { method: 'PUT', body: { hosts } });
      if (!ok) {
        setError(apiMessage(tt, data, 'embedSites.lockFailed', 'Where this can be shown could not be saved.'));
        return;
      }
      setRecord(data.data);
      // Frames are told who may hold them from a copy kept for up to a minute,
      // so say when it takes effect (walk, 17 October 2026).
      showToast?.(data.data.anywhere
        ? tt('embedSites.nowAnywhereSoon', 'Saved. Within a minute, any website can show this again.')
        : tt('embedSites.nowLockedSoon', 'Saved. Within a minute, only the sites you allowed can show this.'));
    } catch {
      setError(tt('embedSites.lockFailed', 'Where this can be shown could not be saved.'));
    } finally {
      setBusy('');
    }
  };

  if (!token) return null;
  if (status === 'loading') {
    return <section className={styles.card} aria-busy="true"><div className={styles.skeleton} /></section>;
  }
  if (status === 'failed' || !record) {
    return (
      <section className={styles.card}>
        <p className={styles.hint}>{error || tt('embedSites.loadFailed', 'The sites could not be loaded.')}</p>
        <button type="button" className={styles.chip} onClick={() => setAttempt((n) => n + 1)}>
          {tt('embed.tryAgain', 'Try again')}
        </button>
      </section>
    );
  }

  const locked = record.locks.map((l) => l.host);
  const proven = sites.filter((s) => s.verified).map((s) => s.host);
  const choices = [...new Set([...locked, ...proven])].sort();
  const toggle = (host) => saveLocks(locked.includes(host)
    ? locked.filter((h) => h !== host)
    : [...locked, host]);
  const unknown = tt('embedSites.unknownSite', 'Sites that do not share their address');

  return (
    <>
      <section className={styles.card}>
        <h3 className={styles.heading}>{tt('embedSites.title', 'Where this can be shown')}</h3>
        <p className={styles.state}>
          {record.anywhere
            ? tt('embedSites.anywhere', 'Any website can show this. Lock it to your own sites to stop anybody else framing it.')
            : tt('embedSites.lockedTo', 'Only these sites can show this: {hosts}.').replace('{hosts}', locked.join(', '))}
        </p>
        {choices.length ? (
          <div className={styles.chips} role="group" aria-label={tt('embedSites.title', 'Where this can be shown')}>
            {choices.map((host) => {
              const on = locked.includes(host);
              return (
                <button key={host} type="button" aria-pressed={on} disabled={busy === 'locks'}
                        className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                        onClick={() => toggle(host)}>
                  {on
                    ? tt('embedSites.allowedOn', 'Shown on {host}').replace('{host}', host)
                    : tt('embedSites.allowOn', 'Allow {host}').replace('{host}', host)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className={styles.hint}>{tt('embedSites.noneProven', 'Add your website below and prove it, then it appears here to allow.')}</p>
        )}
        {record.locks.some((l) => !l.yours) && (
          <p className={styles.hint}>{tt('embedSites.othersSites', 'Some of these were added by another person who runs this. You can turn them off; only they can add them back.')}</p>
        )}
      </section>

      <section className={styles.card}>
        <h3 className={styles.heading}>{tt('embedSites.mineTitle', 'Your websites')}</h3>
        <p className={styles.hint}>
          {tt('embedSites.mineIntro', 'Prove a website once and use it for every tournament and event you run.')}
        </p>
        <form className={own.addRow} onSubmit={add}>
          <label className={own.addField}>
            <span className={styles.label}>{tt('embedSites.addLabel', 'Website address')}</span>
            <input className={styles.input} value={draft} maxLength={300} inputMode="url"
                   autoCapitalize="none" autoCorrect="off" spellCheck={false}
                   placeholder={tt('embedSites.addPlaceholder', 'yourclub.com')}
                   onChange={(ev) => setDraft(ev.target.value)} />
          </label>
          <button type="submit" className={styles.primaryBtn} disabled={busy === 'add' || !draft.trim()}>
            {busy === 'add' ? tt('embedSites.adding', 'Adding...') : tt('embedSites.add', 'Add')}
          </button>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {sites.length ? (
          <ul className={own.sites}>
            {sites.map((site) => (
              <SiteRow key={site.host} site={site} busy={busy === site.host} tt={tt}
                       onCheck={check} onRemove={remove} />
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>{tt('embedSites.mineEmpty', 'No websites added yet.')}</p>
        )}
      </section>

      <section className={styles.card}>
        <h3 className={styles.heading}>
          {tt('embedSites.viewsTitle', 'Views on other websites in the last 30 days')}
        </h3>
        {record.views.length ? (
          <ol className={own.views}>
            {record.views.map((row) => (
              <li key={row.host || 'unknown'} className={own.viewRow}>
                <span className={own.viewHost}>{row.host || unknown}</span>
                <span className={own.viewCount}>{formatNumber(row.views)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.hint}>{tt('embedSites.viewsEmpty', 'No views on other websites yet. They are counted here once a snippet is live.')}</p>
        )}
      </section>

      <CustomAddress kind={kind} slug={slug} token={token} call={call} showToast={showToast}
                     hasDnsSite={sites.some((s) => s.verified && s.method === 'dns')} />
    </>
  );
}
