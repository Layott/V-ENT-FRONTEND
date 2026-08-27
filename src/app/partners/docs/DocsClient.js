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
      {/* ------------------------------------------- envelope and paging */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.envelope', 'Every response has the same shape')}</h2>
        <p className={styles.body}>
          {t('docs.envelopeBody',
            'Success or failure, there are the same keys at the top level and '
            + 'nothing else. Branch on code, never on message: the message is '
            + 'written for a person and may be reworded, the code is the contract.')}
        </p>
        <Code label={t('docs.success', 'Success')}>
{`{ "status": "success", "data": { }, "message": "Tournaments" }`}
        </Code>
        <Code label={t('docs.failure', 'Failure')}>
{`{ "status": "error", "code": "SCOPE_REQUIRED", "message": "…", "data": null }`}
        </Code>

        <h3 className={styles.h3}>{t('docs.paging', 'Paging')}</h3>
        <p className={styles.body}>
          {t('docs.pagingBody',
            'Every list pages the same way. page starts at 1, page_size defaults '
            + 'to 25 and stops at 100. Page with has_more rather than by counting: '
            + 'it comes from the same query as the rows, so it cannot disagree '
            + 'with them.')}
        </p>
        <Code>
{`GET /api/v1/tournaments/?page=2&page_size=50

{ "results": [ … ], "page": 2, "page_size": 50, "total": 137, "has_more": true }`}
        </Code>

        <h3 className={styles.h3}>{t('docs.brand', 'Showing that the data came from V-ENT')}</h3>
        <p className={styles.body}>
          {t('docs.brandBody',
            'GET /api/v1/ carries a brand block with the marks and the one line '
            + 'of guidance, so you do not have to go and take a logo off the '
            + 'website at whatever size you find it. No key is needed to read it, '
            + 'because somebody deciding whether to integrate has not got one yet.')}
        </p>
        <Code>
{`"brand": {
  "name": "V-ENT",
  "logo": "https://v-ent.co/images/logo_mark_red.png",
  "logo_svg": "https://v-ent.co/images/logo_mark_red.svg",
  "colour": "#ED1C24",
  "attribution": "Data from V-ENT"
}`}
        </Code>
        <p className={styles.body}>
          {t('docs.brandUse',
            'Use the mark to say where the data came from, at its own proportions '
            + 'and no smaller than 24px tall. Do not recolour it, stretch it, or '
            + 'use it in a way that suggests V-ENT endorses your product. Prefer '
            + 'the SVG; it stays sharp at every size, which the PNG will not.')}
        </p>

        <h3 className={styles.h3}>{t('docs.limits', 'Rate limit')}</h3>
        <p className={styles.body}>
          {t('docs.limitsBody',
            '60 requests a minute per key. Ask if you need more, and say what for. '
            + 'Rankings and finished brackets change rarely, so a minute of caching '
            + 'costs you nothing and keeps you well inside it.')}
        </p>
      </section>

      {/* ------------------------------------------------- reading the data */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.reading', 'Four things worth knowing before you build')}</h2>
        <dl className={styles.defs}>
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('docs.readSlugK', 'Address records by slug')}</dt>
            <dd className={styles.defVal}>
              {t('docs.readSlugV',
                'Every V-ENT address a person sees uses the slug, and a renamed '
                + 'record keeps its old addresses working. It is what you want in '
                + 'a link back to us.')}
            </dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('docs.readMoneyK', 'Money is a decimal string')}</dt>
            <dd className={styles.defVal}>
              {t('docs.readMoneyV',
                '"220000.00", not a number. Parse it as a decimal. A prize pool '
                + 'that has been through a float is one you will eventually show wrong.')}
            </dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('docs.readTimeK', 'Times are UTC, ISO 8601')}</dt>
            <dd className={styles.defVal}>
              {t('docs.readTimeV',
                'With the Z on the end. Convert for your own readers; do not assume Lagos.')}
            </dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('docs.readPrivateK', 'Only public records')}</dt>
            <dd className={styles.defVal}>
              {t('docs.readPrivateV',
                'Drafts, private tournaments and anything belonging to a suspended '
                + 'account are never returned, and no scope opens them.')}
            </dd>
          </div>
        </dl>
      </section>

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


        <h3 className={styles.h3}>{t('docs.pkce', 'Make a PKCE pair first')}</h3>
        <p className={styles.body}>
          {t('docs.pkceBody',
            'Keep the verifier in the visitor session on your server; it never '
            + 'leaves it. Send only the challenge. If you send a challenge, that '
            + 'is what is checked and your client secret is not consulted, which '
            + 'is why a browser app never needs one.')}
        </p>
        <Code>
{`const verifier  = base64url(randomBytes(32));   // keep this
const challenge = base64url(sha256(verifier));  // send this`}
        </Code>

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

        <h3 className={styles.h3}>{t('docs.subK', 'Key the account on sub')}</h3>
        <p className={styles.body}>
          {t('docs.subV',
            'Not on the username. A person can change their username; sub is '
            + 'stable for the life of the account and is the only field here that '
            + 'is safe as a primary key on your side.')}
        </p>
        <p className={styles.body}>
          {t('docs.revoke',
            'Anybody who has signed in with V-ENT can remove the connection from '
            + 'their account, and existing tokens stop working. Handle BAD_TOKEN '
            + 'by sending them through the flow again, not by holding a dead session.')}
        </p>
        <p className={styles.body}>
          {t('docs.noWallet',
            'There is no scope that reads a wallet, a balance, a transaction, a '
            + 'payout or an identity document, and there will not be one. It is '
            + 'written into the code rather than into a policy.')}
        </p>

      </section>


      {/* ------------------------------------------------------------ errors */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('docs.errors', 'When something is wrong')}</h2>
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
            <dd className={styles.defVal}>{t('docs.errMissing', 'No Authorization header, or not a bearer token. 401.')}</dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>MALFORMED_KEY</code></dt>
            <dd className={styles.defVal}>{t('docs.errMalformed', 'Not a V-ENT key. Check the vent_pk_ prefix and the dot before the secret. 401.')}</dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>INVALID_KEY</code></dt>
            <dd className={styles.defVal}>{t('docs.errInvalid', 'Unknown key id, wrong secret, or revoked. The same answer for all three, so this cannot be used to discover which key ids exist. 401.')}</dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>PARTNER_INACTIVE</code></dt>
            <dd className={styles.defVal}>{t('docs.errInactive', 'The partner account is suspended or not yet approved. Keys stop working the moment that happens, not at the next issue. 401.')}</dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>SCOPE_REQUIRED</code></dt>
            <dd className={styles.defVal}>{t('docs.errScope', 'The key is good but this scope was not granted. 403.')}</dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>RATE_LIMITED</code></dt>
            <dd className={styles.defVal}>{t('docs.errRate', 'Over 60 requests this minute. The count is per key. 429.')}</dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}><code>EVENT_NOT_FOUND</code></dt>
            <dd className={styles.defVal}>{t('docs.errNotFound', 'No such record, or it is not public. A private record answers 404 rather than 403, because saying it exists is itself a disclosure. Also TOURNAMENT_NOT_FOUND, TEAM_NOT_FOUND, PLAYER_NOT_FOUND. 404.')}</dd>
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
