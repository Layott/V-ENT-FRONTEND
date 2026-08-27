'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import styles from './docs.module.css';

// The reference an outside developer reads before writing a line against V-ENT.
//
// Two rules held throughout:
//
// 1. **The tables come from the API.** Scopes and endpoints are passed in from
//    the live catalogue rather than typed here, so they cannot drift. Docs that
//    disagree with the thing they describe are worse than no docs.
// 2. **Every example is runnable.** Curl that can be pasted, with the real host
//    and the real header shape, because the first thing anybody does is copy the
//    first command and see whether it answers.

const Code = ({ children, label }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard refused (insecure context, or the person said no). The text is
      // on screen and selectable, so there is nothing to recover from.
    }
  };
  return (
    <div className={styles.codeWrap}>
      {label && <span className={styles.codeLabel}>{label}</span>}
      <pre className={styles.code}><code>{children}</code></pre>
      <button type="button" className={styles.copyBtn} onClick={copy}>
        {copied ? t('docs.copied', 'Copied') : t('docs.copy', 'Copy')}
      </button>
    </div>
  );
};

export default function DocsClient({ index, sso }) {
  const t = useT();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.v-ent.co';
  const scopes = index?.scopes || {};
  const endpoints = index?.endpoints || {};
  const identityScopes = sso?.scopes_supported || [];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>{t('docs.kicker', 'V-ENT for developers')}</p>
        <h1 className={styles.title}>{t('docs.title', 'Build on V-ENT')}</h1>
        <p className={styles.lede}>
          {t('docs.lede',
            'Two things live here. A read API over tournaments, events, teams, '
            + 'players and rankings, authenticated with a key. And Sign in with '
            + 'V-ENT, so people can use their V-ENT account on your site.')}
        </p>
        <Link href="/partners" className={styles.cta}>
          {t('docs.applyCta', 'Apply for access')}
        </Link>
      </header>

      {/* ------------------------------------------------------- getting in */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.gettingAccess', 'Getting access')}</h2>
        <ol className={styles.steps}>
          <li>
            {t('docs.step1', 'Apply on the partners page, saying what you are building '
              + 'and which scopes you need.')}
          </li>
          <li>
            {t('docs.step2', 'A V-ENT admin reviews it and approves the scopes you may '
              + 'have. They can approve fewer than you asked for.')}
          </li>
          <li>
            {t('docs.step3', 'Issue a key from your partner page. The secret is shown '
              + 'once and never again, so store it before you close the tab.')}
          </li>
        </ol>
        <p className={styles.note}>
          {t('docs.accessNote',
            'A key can never carry a scope your organisation was not approved for, '
            + 'whatever the request asks for. Suspending a partner stops every key '
            + 'it owns immediately, without waiting for them to expire.')}
        </p>
      </section>

      {/* ------------------------------------------------------------- auth */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.auth', 'Authentication')}</h2>
        <p className={styles.body}>
          {t('docs.authBody', 'Send the key as a bearer token on every request.')}
        </p>
        <Code label="curl">
{`curl ${apiBase}/api/v1/whoami/ \\
  -H "Authorization: Bearer vent_pk_<key id>.<secret>"`}
        </Code>
        <p className={styles.body}>
          {t('docs.whoamiBody',
            'whoami is the endpoint to call first: it answers with the partner the '
            + 'key belongs to and the exact scopes it carries, which is the quickest '
            + 'way to tell a misconfigured key from a missing permission.')}
        </p>
      </section>

      {/* ----------------------------------------------------------- scopes */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.scopes', 'Scopes')}</h2>
        <p className={styles.body}>
          {t('docs.scopesBody',
            'Every endpoint needs one scope. Ask only for what you use: an '
            + 'application requesting everything takes longer to approve.')}
        </p>
        {Object.keys(scopes).length === 0
          ? <p className={styles.body}>
              {t('docs.catalogueDown',
                'The scope catalogue is not answering right now. It is public, so '
                + 'you can read it directly at /api/v1/.')}
            </p>
          : <dl className={styles.defs}>
              {Object.entries(scopes).map(([key, description]) => (
                <div className={styles.defRow} key={key}>
                  <dt className={styles.defKey}><code>{key}</code></dt>
                  <dd className={styles.defVal}>{description}</dd>
                </div>
              ))}
            </dl>}
      </section>

      {/* -------------------------------------------------------- endpoints */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.endpoints', 'Endpoints')}</h2>
        <p className={styles.body}>
          {t('docs.endpointsBody',
            'All read-only, all under /api/v1/. Lists are paginated and answer with '
            + 'results, count and the page you asked for.')}
        </p>
        {Object.keys(endpoints).length === 0
          ? <p className={styles.body}>
              {t('docs.endpointsDown', 'The endpoint index is not answering right now.')}
            </p>
          : <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('docs.thName', 'What')}</th>
                    <th>{t('docs.thPath', 'Path')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(endpoints).map(([name, path]) => (
                    <tr key={name}>
                      <td className={styles.tdName}>{name}</td>
                      <td><code className={styles.inlineCode}>{path}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}

        <Code label={t('docs.exampleReq', 'Example')}>
{`curl "${apiBase}/api/v1/tournaments/?page=1" \\
  -H "Authorization: Bearer vent_pk_<key id>.<secret>"`}
        </Code>
      </section>

      {/* -------------------------------------------------------------- SSO */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.sso', 'Sign in with V-ENT')}</h2>
        <p className={styles.body}>
          {t('docs.ssoBody',
            'Standard authorization-code flow with PKCE. If you have integrated '
            + '"Sign in with Google" you already know this shape. Ask a V-ENT admin '
            + 'to approve SSO for your partner account and you get a client id and '
            + 'a secret, shown once.')}
        </p>

        <h3 className={styles.h3}>{t('docs.ssoScopes', 'Identity scopes')}</h3>
        <ul className={styles.bullets}>
          {(identityScopes.length ? identityScopes : ['identity']).map((s) => (
            <li key={s}><code className={styles.inlineCode}>{s}</code></li>
          ))}
        </ul>

        <h3 className={styles.h3}>{t('docs.ssoStep1', '1. Send them to V-ENT')}</h3>
        <Code>
{`https://v-ent.co/partners/authorize
  ?client_id=vent_sso_<yours>
  &redirect_uri=https://your-site.example/callback
  &scope=identity identity:email
  &state=<random, checked when they come back>
  &code_challenge=<base64url(sha256(verifier))>
  &code_challenge_method=S256`}
        </Code>

        <h3 className={styles.h3}>{t('docs.ssoStep2', '2. Swap the code, on your server')}</h3>
        <Code label="curl">
{`curl -X POST ${apiBase}/partners/sso/token/ \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "<the code on your callback>",
    "client_id": "vent_sso_<yours>",
    "client_secret": "<yours>",
    "redirect_uri": "https://your-site.example/callback",
    "code_verifier": "<the verifier you hashed>"
  }'`}
        </Code>

        <h3 className={styles.h3}>{t('docs.ssoStep3', '3. Read who they are')}</h3>
        <Code label="curl">
{`curl ${apiBase}/partners/sso/userinfo/ \\
  -H "Authorization: Bearer <access_token>"`}
        </Code>
        <p className={styles.note}>
          {t('docs.ssoSecurity',
            'The code is single use and short lived, and the wrong PKCE verifier is '
            + 'refused. Swap it from your server, never from the browser: the client '
            + 'secret must not reach a page anybody can read.')}
        </p>
      </section>

      {/* ------------------------------------------------------------ errors */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Something Untranslated Here{t('docs.errors', 'When something is wrong')}</h2>
        <p className={styles.body}>
          {t('docs.errorsBody',
            'Every failure answers with a machine-readable code as well as a '
            + 'sentence. Branch on the code; the sentence may be reworded.')}
        </p>
        <Code>
{`{ "status": "error", "code": "INVALID_KEY", "message": "That key is not valid.", "data": null }`}
        </Code>
        <dl className={styles.defs}>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>MISSING_KEY</code></dt>
            <dd className={styles.defVal}>
              {t('docs.errMissing', 'No Authorization header, or not a bearer token.')}
            </dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>INVALID_KEY</code></dt>
            <dd className={styles.defVal}>
              {t('docs.errInvalid', 'Unknown key id, wrong secret, or the key was revoked.')}
            </dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>MISSING_SCOPE</code></dt>
            <dd className={styles.defVal}>
              {t('docs.errScope', 'The key is good but was not approved for this endpoint.')}
            </dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>RATE_LIMITED</code></dt>
            <dd className={styles.defVal}>
              {t('docs.errRate', 'Too many requests this minute. Back off and retry.')}
            </dd>
          </div>
        </dl>
      </section>

      <footer className={styles.footer}>
        <p className={styles.body}>
          {t('docs.help', 'Something here wrong or missing? Say so on your partner page '
            + 'and it gets fixed.')}
        </p>
        <Link href="/partners" className={styles.cta}>
          {t('docs.applyCta', 'Apply for access')}
        </Link>
      </footer>
    </main>
  );
}
