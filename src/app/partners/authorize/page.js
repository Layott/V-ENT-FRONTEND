'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './authorize.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// The consent screen. Somebody arrives here from a partner's site and is asked,
// in plain words, whether that site may see a named list of things. Nothing is
// granted by loading this page: the code is only minted when Allow is pressed,
// and the partner and redirect address are both checked by the server before
// anything is shown.
const AuthorizeContent = () => {
  const tx = useTx();
  const tt = useT();
  const params = useSearchParams();
  const router = useRouter();
  const {
    data: session,
    status
  } = useSession();
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
      const query = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope
      });
      const res = await fetch(`${apiBase}/partners/sso/authorize-info/?${query}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || tt("api.thatSignInRequestIs", "That sign-in request is not valid."));
        return;
      }
      setInfo(body.data);
    } catch {
      setError(tt("msg.thatSignInRequestCould", "That sign-in request could not be checked."));
    }
  }, [apiBase, clientId, redirectUri, scope]);
  useEffect(() => {
    load();
  }, [load]);
  const allow = async () => {
    setWorking(true);
    try {
      const res = await fetch(`${apiBase}/partners/sso/approve/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.user?.sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod
        })
      });
      const body = await res.json();
      if (res.ok && body?.data?.redirect_to) {
        window.location.href = body.data.redirect_to;
        return;
      }
      setError(body.message || tt("api.thatCouldNotBeApproved", "That could not be approved."));
    } catch {
      setError(tt("msg.thatCouldNotBeApproved", "That could not be approved."));
    } finally {
      setWorking(false);
    }
  };
  const deny = () => {
    // Tell the partner plainly rather than leaving their page waiting.
    const params2 = new URLSearchParams({
      error: 'access_denied'
    });
    if (state) params2.set('state', state);
    window.location.href = `${redirectUri}?${params2}`;
  };
  if (status === 'unauthenticated') {
    return <main className={styles.wrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>{tt("ui.sign.continue.9a78", "Sign in to continue")}</h1>
          <p className={styles.body}>
            {tt("ui.need.signed.v.ent.02aa", "You need to be signed in to V-ENT before you can approve this.")}
          </p>
          <button type="button" className={styles.primary} onClick={() => router.push(`/login?next=${encodeURIComponent(window.location.href)}`)}>
            {tt("ui.sign.ada2", "Sign in")}
          </button>
        </div>
      </main>;
  }
  return <main className={styles.wrap}>
      <div className={styles.card}>
        {error && <>
            <h1 className={styles.title}>{tt("ui.request.not.valid.cdfd", "This request is not valid")}</h1>
            <p className={styles.body}>{error}</p>
          </>}

        {!error && !info && <p className={styles.body}>{tt("ui.checking.who.asking.c3bb", "Checking who is asking...")}</p>}

        {!error && info && <>
            <h1 className={styles.title}>{info.partner.name} {tt("ui.wants.use.v.ent.a560", "wants to use your V-ENT account")}</h1>
            <p className={styles.body}>{tt("ui.signed.as.a021", "Signed in as")} {session?.user?.username || session?.user?.name}.</p>

            <p className={styles.listLabel}>{tt("ui.they.will.able.see.5f02", "They will be able to see:")}</p>
            <ul className={styles.list}>
              {info.scopes.map(s => <li key={s.key}>{tx(s.label)}</li>)}
            </ul>

            <p className={styles.fineprint}>
              {tt("ui.they.cannot.see.wallet.eba1", "They cannot see your wallet, your password, or anything you have not approved here.")}
              {info.partner.privacy_policy_url && <>
                  {' '}
                  <a href={info.partner.privacy_policy_url} target="_blank" rel="noopener noreferrer">
                    {tt("ui.their.privacy.policy.e736", "Their privacy policy")}
                  </a>
                  .
                </>}
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={deny} disabled={working}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="button" className={styles.primary} onClick={allow} disabled={working}>
                {working ? tx("Approving...") : `Allow ${info.partner.name}`}
              </button>
            </div>
          </>}
      </div>
    </main>;
};
const Authorize = () => <Suspense fallback={<main className={styles.wrap} />}>
    <AuthorizeContent />
  </Suspense>;
export default Authorize;