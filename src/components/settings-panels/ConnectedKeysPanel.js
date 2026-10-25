'use client';

import { useCallback, useEffect, useState } from 'react';
import { useViewer } from '@/lib/gating';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import shared from './settingsShared.module.css';
import styles from './ConnectedKeysPanel.module.css';

// A key the organiser connects so that V-ENT can read battle royale results
// from screenshots. The key is sent once, on connect, and never sent back: the
// server answers with the last four characters and nothing else.
//
// Any AI they use (inbox 555, CEO 25 October 2026: "it shouldnt be only google
// ai studio for gemeini, but any api key from any ai"). The server sends the
// list of services, where each one hands out keys and the model it reads with
// by default, so a service added there appears here without a release.
const KEYS_URL = '/auth/connected-keys/';
const FIRST_CHOICE = 'gemini';

const ConnectedKeysPanel = ({
  showToast
}) => {
  const tt = useT();
  const viewer = useViewer();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const token = viewer.token;

  const [keys, setKeys] = useState([]);
  const [providers, setProviders] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [listing, setListing] = useState(true);
  const [listError, setListError] = useState('');
  const [provider, setProvider] = useState(FIRST_CHOICE);
  const [draft, setDraft] = useState('');
  const [model, setModel] = useState('');
  const [org, setOrg] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async () => {
    if (!token) return;
    setListing(true);
    try {
      const [keyRes, orgRes] = await Promise.all([
        fetch(`${apiBase}${KEYS_URL}`, { headers: auth }),
        // The organizations this person runs. A list that will not load just
        // leaves the picker out; the personal key still connects.
        fetch(`${apiBase}/organization/mine/`, { headers: auth }).catch(() => null),
      ]);
      const keyBody = await keyRes.json().catch(() => ({}));
      if (keyRes.ok && keyBody.status === 'success') {
        setKeys(keyBody.data?.keys || []);
        setProviders(keyBody.data?.providers || []);
        setListError('');
      } else {
        setListError(tt('keys.loadFailed', 'Could not load your keys.'));
      }
      if (orgRes && orgRes.ok) {
        const orgBody = await orgRes.json().catch(() => ({}));
        setOrgs(orgBody?.data?.organizations || []);
      }
    } catch {
      setListError(tt('keys.loadFailed', 'Could not load your keys.'));
    } finally {
      setListing(false);
    }
  }, [apiBase, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // Nothing is decided while the session is still resolving.
  if (viewer.loading) {
    return (
      <div className={styles.card}>
        <p className={styles.sub}>{tt('keys.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (!viewer.signedIn) {
    return (
      <div className={styles.card}>
        <p className={styles.sub}>{tt('keys.signIn', 'Sign in to connect a key.')}</p>
      </div>
    );
  }

  const chosen = providers.find(p => p.key === provider) || providers[0] || null;

  const choose = key => {
    setProvider(key);
    setModel('');
    setFormError('');
  };

  const connect = async e => {
    e.preventDefault();
    const key = draft.trim();
    if (!key || busy || !chosen) return;
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch(`${apiBase}${KEYS_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          provider: chosen.key,
          key,
          ...(model.trim() ? { model: model.trim() } : {}),
          ...(org ? { organization: org } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDraft('');
        setModel('');
        showToast?.(tt('keys.connected', 'Key connected.'));
        await load();
      } else if (body.code === 'KEY_WRONG_PROVIDER' && body.data?.guessed_key) {
        // Say which service the key belongs to, and switch to it, so the
        // second press is the one that works.
        setFormError(tt('api.KEY_WRONG_PROVIDER', 'That key is for {guessed}, not {provider}. Choose {guessed} instead.')
          .replace(/\{guessed\}/g, body.data.guessed || '')
          .replace('{provider}', body.data.provider || ''));
        setProvider(body.data.guessed_key);
      } else {
        setFormError(apiMessage(tt, body, 'keys.connectFailed', 'That key could not be connected.'));
      }
    } catch {
      setFormError(tt('keys.connectFailed', 'That key could not be connected.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async item => {
    if (busy) return;
    setBusy(true);
    const slug = item.organization?.slug;
    const query = slug ? `?organization=${encodeURIComponent(slug)}` : '';
    try {
      const res = await fetch(`${apiBase}${KEYS_URL}${item.provider}/${query}`, {
        method: 'DELETE',
        headers: auth,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast?.(tt('keys.removed', 'Key removed.'));
        await load();
      } else {
        showToast?.(apiMessage(tt, body, 'keys.removeFailed', 'That key could not be removed.'), 'error');
      }
    } catch {
      showToast?.(tt('keys.removeFailed', 'That key could not be removed.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const labelFor = item => {
    const base = item.provider_label || item.provider;
    const withModel = item.model
      ? tt('keys.withModel', '{label} ({model})').replace('{label}', base).replace('{model}', item.model)
      : base;
    if (item.organization?.name) {
      return tt('keys.entryOrg', '{label}, ending {last4}, for {org}')
        .replace('{label}', withModel)
        .replace('{last4}', item.last4)
        .replace('{org}', item.organization.name);
    }
    return tt('keys.entry', '{label}, ending {last4}')
      .replace('{label}', withModel)
      .replace('{last4}', item.last4);
  };

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h2 className={shared.cardTitle}>{tt('settings.connectedKeys', 'Connected keys')}</h2>
        <p className={styles.sub}>
          {tt('keys.blurbAny', 'Reading battle royale results from screenshots uses your own AI key, from whichever service you use. You pay that service for what you use; V-ENT never sees more than the last four characters.')}
        </p>

        {listing && providers.length === 0 && !listError && (
          <p className={styles.sub}>{tt('keys.loading', 'Loading...')}</p>
        )}

        {providers.length > 0 && <>
          <p className={styles.label} id="connected-key-service">{tt('keys.service', 'Service')}</p>
          <div className={styles.chips} role="group" aria-labelledby="connected-key-service">
            {providers.map(p => (
              <button
                key={p.key}
                type="button"
                className={`${styles.chip} ${chosen?.key === p.key ? styles.chipOn : ''}`}
                aria-pressed={chosen?.key === p.key}
                disabled={busy}
                onClick={() => choose(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>}

        {chosen && (
          <form className={styles.form} onSubmit={connect} autoComplete="off">
            <a className={styles.link} href={chosen.docs_url} target="_blank" rel="noopener noreferrer">
              {tt('keys.getKeyFrom', 'Get a key from {label}').replace('{label}', chosen.label)}
            </a>

            <label className={styles.label} htmlFor="connected-key-input">
              {tt('keys.inputLabelAny', '{label} API key').replace('{label}', chosen.label)}
            </label>
            <input
              id="connected-key-input"
              className={styles.input}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              disabled={busy}
              onChange={e => setDraft(e.target.value)}
            />
            <p className={styles.hint}>{chosen.key_hint}</p>

            <label className={styles.label} htmlFor="connected-key-model">
              {tt('keys.modelLabel', 'Model (optional)')}
            </label>
            <input
              id="connected-key-model"
              className={styles.input}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={model}
              placeholder={chosen.default_model}
              disabled={busy}
              onChange={e => setModel(e.target.value)}
            />
            <p className={styles.hint}>
              {tt('keys.modelHint', 'Leave it empty to use {model}.').replace('{model}', chosen.default_model)}
            </p>

            {orgs.length > 0 && <>
              <label className={styles.label} htmlFor="connected-key-owner">
                {tt('keys.whoFor', 'Who the key is for')}
              </label>
              <select
                id="connected-key-owner"
                className={styles.select}
                value={org}
                disabled={busy}
                onChange={e => setOrg(e.target.value)}
              >
                <option value="">{tt('keys.forMe', 'For me')}</option>
                {orgs.map(o => (
                  <option key={o.slug || o.id} value={o.slug}>{o.name}</option>
                ))}
              </select>
            </>}

            <button type="submit" className={styles.connect} disabled={busy || !draft.trim()}>
              {busy ? tt('keys.connecting', 'Checking the key...') : tt('keys.connect', 'Connect')}
            </button>
            {formError && <p className={styles.error} role="alert">{formError}</p>}
          </form>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={shared.cardTitle}>{tt('keys.listTitle', 'Your keys')}</h3>
        {listing && keys.length === 0 && !listError && (
          <p className={styles.sub}>{tt('keys.loading', 'Loading...')}</p>
        )}
        {listError && <p className={styles.error} role="alert">{listError}</p>}
        {!listing && !listError && keys.length === 0 && (
          <p className={styles.sub}>{tt('keys.none', 'No keys are connected yet.')}</p>
        )}
        {keys.length > 0 && (
          <ul className={styles.list}>
            {keys.map(item => (
              <li key={`${item.provider}-${item.organization?.slug || 'me'}`} className={styles.item}>
                <span className={styles.itemText}>{labelFor(item)}</span>
                <button type="button" className={styles.remove} disabled={busy} onClick={() => remove(item)}>
                  {tt('keys.remove', 'Remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {keys.length > 1 && (
          <p className={styles.hint}>
            {tt('keys.whichReads', 'With more than one key, the one connected last reads the screenshots.')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConnectedKeysPanel;
