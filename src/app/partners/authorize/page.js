'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './authorize.module.css';

// The consent screen. Somebody arrives here from a partner's site and is asked,
// in plain words, whether that site may see a named list of things. Nothing is
// granted by loading this page: the code is only minted when Allow is pressed,
// and the partner and redirect address are both checked by the server before
// anything is shown.
const AuthorizeContent = () => {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const clientId = params.get('client_id') || '';
  const redirectUri = params.get('redirect_uri') || '';
  const scope = params.get('scope') || 'identity';
  const state = params.get('state') || '';
  const codeChallenge = params.get('code_challenge') || '';
  const codeChallengeMethod = params.get('code_challenge_method') || '';

  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope });
      const res = await fetch(`${apiBase}/partners/sso/authorize-info/?${query}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || 'That sign-in request is not valid.');
        return;
      }
      setInfo(body.data);
    } catch {
      setError('That sign-in request could not be checked.');
    }
  }, [apiBase, clientId, redirectUri, scope]);

  useEffect(() => { load(); }, [load]);

  const allow = async () => {
    setWorking(true);
    try {
      const res = await fetch(`${apiBase}/partners/sso/approve/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.user?.sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        }),
      });
      const body = await res.json();
      if (res.ok && body?.data?.redirect_to) {
        window.location.href = body.data.redirect_to;
        return;
      }
      setError(body.message || 'That could not be approved.');
    } catch {
      setError('That could not be approved.');
    } finally {
      setWorking(false);
    }
  };

  const deny = () => {
    // Tell the partner plainly rather than leaving their page waiting.
    const params2 = new URLSearchParams({ error: 'access_denied' });
    if (state) params2.set('state', state);
    window.location.href = `${redirectUri}?${params2}`;
  };

  if (status === 'unauthenticated') {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>Sign in to continue</h1>
          <p className={styles.body}>
            You need to be signed in to V-ENT before you can approve this.
          </p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => router.push(`/login?next=${encodeURIComponent(window.location.href)}`)}
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        {error && (
          <>
            <h1 className={styles.title}>This request is not valid</h1>
            <p className={styles.body}>{error}</p>
          </>
        )}

        {!error && !info && <p className={styles.body}>Checking who is asking...</p>}

        {!error && info && (
          <>
            <h1 className={styles.title}>{info.partner.name} wants to use your V-ENT account</h1>
            <p className={styles.body}>Signed in as {session?.user?.username || session?.user?.name}.</p>

            <p className={styles.listLabel}>They will be able to see:</p>
            <ul className={styles.list}>
              {info.scopes.map((s) => <li key={s.key}>{s.label}</li>)}
            </ul>

            <p className={styles.fineprint}>
              They cannot see your wallet, your password, or anything you have not approved here.
              {info.partner.privacy_policy_url && (
                <>
                  {' '}
                  <a href={info.partner.privacy_policy_url} target="_blank" rel="noopener noreferrer">
                    Their privacy policy
                  </a>
                  .
                </>
              )}
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={deny} disabled={working}>
                Cancel
              </button>
              <button type="button" className={styles.primary} onClick={allow} disabled={working}>
                {working ? 'Approving...' : `Allow ${info.partner.name}`}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

const Authorize = () => (
  <Suspense fallback={<main className={styles.wrap} />}>
    <AuthorizeContent />
  </Suspense>
);

export default Authorize;
