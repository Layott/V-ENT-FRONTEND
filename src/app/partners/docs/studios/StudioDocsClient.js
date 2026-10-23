'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { formatNumber } from '@/lib/datetime';
import { deliveryKindLabel, studioEventLabel } from '@/components/studio-portal/studioLabels';
import styles from '../docs.module.css';

// The guide for game studios, beside the API reference and in the same
// voice: every example runnable, every table read from the live catalogue
// (GET /api/v1/studio/), every sentence in the reader's language. Code stays
// code: a header name or a JSON key is the same in every language.

const Code = ({ children, label }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // The clipboard was refused; the text is on screen and selectable.
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

const VERIFY_PYTHON = `import base64, hashlib, hmac, time

def verify(secret, method, path_and_query, host, headers, body):
    stamp = int(headers["V-Ent-Timestamp"])
    if abs(time.time() - stamp) > 300:
        raise ValueError("stale")
    content = base64.b64encode(hashlib.sha256(body).digest()).decode()
    if not hmac.compare_digest(content, headers["V-Ent-Content-SHA256"]):
        raise ValueError("body changed")
    text = f"{method}\\n{path_and_query}\\n{stamp};{host};{content}"
    expected = base64.b64encode(
        hmac.new(secret.encode(), text.encode(), hashlib.sha256).digest()).decode()
    offered = [p.strip()[3:] for p in headers["V-Ent-Signature"].split(",")]
    if not any(hmac.compare_digest(expected, o) for o in offered):
        raise ValueError("bad signature")`;

const VERIFY_NODE = `import crypto from 'node:crypto';

export function verify(secret, method, pathAndQuery, host, headers, body) {
  const stamp = Number(headers['v-ent-timestamp']);
  if (Math.abs(Date.now() / 1000 - stamp) > 300) throw new Error('stale');
  const content = crypto.createHash('sha256').update(body).digest('base64');
  if (content !== headers['v-ent-content-sha256']) throw new Error('body changed');
  const text = \`\${method}\\n\${pathAndQuery}\\n\${stamp};\${host};\${content}\`;
  const expected = crypto.createHmac('sha256', secret).update(text).digest('base64');
  const offered = headers['v-ent-signature'].split(',').map(p => p.trim().slice(3));
  const ok = offered.some(o => o.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(o), Buffer.from(expected)));
  if (!ok) throw new Error('bad signature');
}`;

function headerMeaning(t, name) {
  const meanings = {
    'V-Ent-Timestamp': t('partners.studioDocs.headerTimestamp', 'When the request was signed, in unix seconds'),
    'V-Ent-Content-SHA256': t('partners.studioDocs.headerContent', 'The base64 SHA-256 of the body'),
    'V-Ent-Signature': t('partners.studioDocs.headerSignature', 'v1= and the signature, once per secret that is live'),
    'V-Ent-Delivery': t('partners.studioDocs.headerDelivery', 'A request id used once; keep it for the window to refuse repeats'),
  };
  return meanings[name] || t('partners.studioDocs.headerOther', 'Part of the signature');
}

export default function StudioDocsClient({ catalogue }) {
  const t = useT();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.v-ent.co';
  const events = catalogue?.subscribable || [];
  const kinds = catalogue?.delivery_types || [];
  const signature = catalogue?.signature || {};
  const result = catalogue?.result || {};
  const expression = catalogue?.expression || {};
  const backoff = catalogue?.backoff_seconds || {};
  const down = !catalogue;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>{t('partners.studioDocs.kicker', 'V-ENT for game studios')}</p>
        <h1 className={styles.title}>{t('partners.studioDocs.title', 'Run V-ENT tournaments inside your game')}</h1>
        <p className={styles.lede}>
          {t('partners.studioDocs.lede', 'Connect your game once and every V-ENT format runs in it, the ones here today and the ones still to come. Your game only ever handles one game session at a time; V-ENT runs the bracket, the tables, the money and the stream around it.')}
        </p>
        <Link href="/partners/studios" className={styles.cta}>
          {t('partners.studioDocs.cta', 'Connect a game')}
        </Link>
      </header>

      {down && (
        <p className={styles.note}>
          {t('partners.studioDocs.down', 'The studio catalogue is not answering right now, so the tables below are empty. It is public: read it directly at /api/v1/studio/.')}
        </p>
      )}

      {/* ---------------------------------------------------------- the flow */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.flowTitle', 'How it fits together')}</h2>
        <ol className={styles.steps}>
          <li>{t('partners.studioDocs.flow1', 'Connect your game in the Studios section of the partner portal. It starts in the sandbox, with a signing secret shown once.')}</li>
          <li>{t('partners.studioDocs.flow2', 'Players link their game account to their V-ENT account, with a code your game shows or with Sign in with V-ENT.')}</li>
          <li>{t('partners.studioDocs.flow3', 'An organiser connects their tournament to your game from the tournament console.')}</li>
          <li>{t('partners.studioDocs.flow4', 'When a match is ready, V-ENT asks your game for a lobby. Your game answers with a session id and how to join.')}</li>
          <li>{t('partners.studioDocs.flow5', 'When the game ends, your server posts the raw result. V-ENT checks it, scores it with your expression and records it on the match.')}</li>
          <li>{t('partners.studioDocs.flow6', 'Ask to go live when it works. A V-ENT admin reviews the game first.')}</li>
        </ol>
      </section>

      {/* ----------------------------------------------------- sandbox, keys */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.sandboxTitle', 'The sandbox and test keys')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.sandboxBody', 'A sandbox game reaches only tournaments your own account runs and the testers you name, so you can build against real brackets without touching anybody else\'s. Make a test key in the portal: it starts with the prefix below and reaches sandbox games only. A live key reaches live games only.')}
        </p>
        <Code>{`Authorization: Bearer ${catalogue?.test_key_prefix || 'vent_pk_test_'}<key id>.<secret>`}</Code>
      </section>

      {/* -------------------------------------------------------- signatures */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.signTitle', 'Every request is signed, both ways')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.signBody', 'Every request V-ENT sends you, and every update you post to us, is signed with HMAC SHA-256 under your game\'s signing secret, over the method, the path and query, a timestamp, the host and a hash of the body. Refuse anything older than the window below, and keep each request id you have seen for that long so the same request cannot be played twice.')}
        </p>
        <Code label={t('partners.studioDocs.stringToSign', 'The string to sign')}>
          {signature.string_to_sign || '{METHOD}\\n{path and query}\\n{timestamp};{host};{base64 SHA-256 of the body}'}
        </Code>
        <dl className={styles.defs}>
          {(signature.headers || []).map(name => (
            <div className={styles.defRow} key={name}>
              <dt className={styles.defKey}><code>{name}</code></dt>
              <dd className={styles.defVal}>{headerMeaning(t, name)}</dd>
            </div>
          ))}
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('partners.studioDocs.window', 'Window')}</dt>
            <dd className={styles.defVal}>
              {t('partners.studioDocs.windowValue', '{seconds} seconds either side of now').replace('{seconds}', formatNumber(signature.window_seconds || 300))}
            </dd>
          </div>
        </dl>
        <p className={styles.body}>
          {t('partners.studioDocs.rotation', 'After you rotate the secret, the old one keeps working for 24 hours and each request carries one v1= signature per secret, so you can swap without dropping anything.')}
        </p>
        <Code label="Python">{VERIFY_PYTHON}</Code>
        <Code label="Node">{VERIFY_NODE}</Code>
      </section>

      {/* ------------------------------------------------- what we send you */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.sendTitle', 'What V-ENT sends you')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.sendBody', 'Every request has the same body, so one address can take them all. Game session calls go to your game session address; events go to your events address, or to the session address if you left that empty.')}
        </p>
        <Code>
{`{
  "id": "dl_8f2c...",
  "type": "event",
  "event": "result_confirmed",
  "created_at": "2026-10-17T18:04:11Z",
  "game": "<your game>",
  "environment": "live",
  "data": { }
}`}
        </Code>
        <ul className={styles.bullets}>
          {kinds.map(kind => (
            <li key={kind}><code className={styles.inlineCode}>{kind}</code> {deliveryKindLabel(t, kind)}</li>
          ))}
        </ul>
        <p className={styles.body}>
          {t('partners.studioDocs.retries', 'Answer with any 2xx and the request is delivered. Anything else, or no answer within 10 seconds, is tried again on the schedule below and then given up on. Answer 410 to stop at once. Every request and what your server answered is in the delivery log on your game\'s page, and by key at /api/v1/studio/games/<game>/deliveries/.')}
        </p>
        {backoff.event && (
          <p className={styles.note}>
            {t('partners.studioDocs.schedule', 'Waits between tries for an event, in seconds: {list}').replace('{list}', backoff.event.map(s => formatNumber(s)).join(', '))}
          </p>
        )}
      </section>

      {/* ----------------------------------------------------- game sessions */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.sessionsTitle', 'Game sessions')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.sessionsBody', 'A best of three is up to three game sessions, one per game. When a match is ready we send create_game_session with both lineups (with each player\'s game account when they linked one), the settings the organiser chose and an idempotency key. Treat a repeated key as the same lobby: we call again until you answer created or later.')}
        </p>
        <Code label={t('partners.studioDocs.answerCreate', 'Your answer to create_game_session')}>
{`{ "session_id": "your-lobby-42", "state": "created",
  "join": { "room_code": "ROOM42", "room_password": "pw" } }`}
        </Code>
        <p className={styles.body}>
          {t('partners.studioDocs.roomCode', 'A room_code in join is shown to both sides in their match room, unless they typed one of their own.')}
        </p>
        <p className={styles.body}>
          {t('partners.studioDocs.states', 'States move forward only: creating, created, starting, started, finished, or cancelled. Post every change, signed, to the callback address the create call gave you. A game that crashes is cancelled without a result, and V-ENT opens the next attempt of the same game, up to three.')}
        </p>
        <Code label="curl">
{`curl -X POST ${apiBase}/api/v1/studio/sessions/gs_<ref>/ \\
  -H "Authorization: Bearer vent_pk_<key id>.<secret>" \\
  -H "V-Ent-Timestamp: <unix seconds>" \\
  -H "V-Ent-Content-SHA256: <base64 sha256 of the body>" \\
  -H "V-Ent-Signature: v1=<signature>" \\
  -H "V-Ent-Delivery: <a new id for every request>" \\
  -d '{"state": "finished", "result": { }}'`}
        </Code>
        <p className={styles.body}>
          {t('partners.studioDocs.poll', 'If a started game goes quiet for five minutes we ask you with get_game_session; answer it with the same body you would post. When a match is settled another way we send cancel_game_session. We never cancel a finished game.')}
        </p>
      </section>

      {/* ----------------------------------------------------------- results */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.resultsTitle', 'Results and scoring')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.resultsBody', 'A result has two lineups, one for side 1 and one for side 2, an optional list of competitors (each with a side), and an optional general object. Inside that, the fields are yours, checked against the result schema you set on your game.')}
        </p>
        <Code>
{`{
  "lineups": [ { "side": 1, "score": 13, "won": true },
               { "side": 2, "score": 7,  "won": false } ],
  "competitors": [ { "account_id": "player-one", "side": 1, "kills": 9 } ],
  "general": { "map": "Bermuda" }
}`}
        </Code>
        {(result.schema_keywords || []).length > 0 && (
          <p className={styles.body}>
            {t('partners.studioDocs.keywords', 'Schema keywords V-ENT checks: {list}. A schema using any other keyword is refused when you save it, rather than half checked.').replace('{list}', result.schema_keywords.join(', '))}
          </p>
        )}
        <h3 className={styles.h3}>{t('partners.studioDocs.exprTitle', 'Scoring expressions')}</h3>
        <p className={styles.body}>
          {t('partners.studioDocs.exprBody', 'Your expression turns one side\'s raw result into its score for that game. It is worked out once per side, and the answer must be a whole number from {min} to {max}.')
            .replace('{min}', String((expression.score_range || [0])[0]))
            .replace('{max}', String((expression.score_range || [0, 999])[1]))}
        </p>
        <Code>
{`team.score
competitors.sum(it.kills)
team.roundsWon + competitors.sum(it.kills)
global.double ? team.roundsWon * 2 : team.roundsWon
settings.mode == 'KillRace' ? competitors.sum(it.kills) : (team.won ? 1 : 0)`}
        </Code>
        <dl className={styles.defs}>
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('partners.studioDocs.names', 'Names')}</dt>
            <dd className={styles.defVal}><code className={styles.inlineCode}>{(expression.names || []).join(', ')}</code></dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('partners.studioDocs.functions', 'Functions')}</dt>
            <dd className={styles.defVal}><code className={styles.inlineCode}>{(expression.functions || []).join(', ')}</code></dd>
          </div>
          <div className={styles.defRow}>
            <dt className={styles.defKey}>{t('partners.studioDocs.listMethods', 'On a list')}</dt>
            <dd className={styles.defVal}><code className={styles.inlineCode}>{(expression.list_methods || []).map(m => `.${m}(it...)`).join(', ')}</code></dd>
          </div>
        </dl>
        <p className={styles.body}>
          {t('partners.studioDocs.exprSafe', 'The expression is read by V-ENT\'s own small parser, never run as code. Try one against a sample result on your game\'s page before you save it.')}
        </p>
        <p className={styles.body}>
          {t('partners.studioDocs.finalSay', 'The result reaches the match through the same rules as a result typed by hand. Anything those rules refuse, such as a level knockout game, waits for the organiser, who keeps the final say.')}
        </p>
      </section>

      {/* ----------------------------------------------------------- linking */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.linkTitle', 'Linking player accounts')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.linkCode', 'With a code: your server asks for one for its account, your game shows it, and the player types it at v-ent.co/link-game while signed in. They see your game and their account name before confirming. Codes last ten minutes and are used once. Ask whether it was used by its code_ref, never by the code.')}
        </p>
        <Code label="curl">
{`curl -X POST ${apiBase}/api/v1/studio/games/<game>/link-codes/ \\
  -H "Authorization: Bearer vent_pk_<key id>.<secret>" \\
  -d '{"account_id": "your-account-id", "display_name": "Ada#1"}'`}
        </Code>
        <p className={styles.body}>
          {t('partners.studioDocs.linkOauth', 'With Sign in with V-ENT: sign the player in from your game, then post the access token with your account id to /api/v1/studio/games/<game>/links/. The token must be your own and carry the identity scope.')}
        </p>
      </section>

      {/* ------------------------------------------------------------ events */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.eventsTitle', 'Events')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.eventsBody', 'The same list V-ENT\'s own overlays and run of show read. Choose which to receive on your game\'s page; choose none to receive them all. A test event can be sent from the page at any time.')}
        </p>
        <dl className={styles.defs}>
          {events.map(kind => (
            <div className={styles.defRow} key={kind}>
              <dt className={styles.defKey}><code>{kind}</code></dt>
              <dd className={styles.defVal}>{studioEventLabel(t, kind)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --------------------------------------------------------- read, use */}
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('partners.studioDocs.readTitle', 'Reading for your own screens')}</h2>
        <p className={styles.body}>
          {t('partners.studioDocs.readBody', 'Show a tournament inside your game with the read API: the stages and their standings (the same ranking the site shows), and a linked player\'s next match. Every answer says how much of your rate limit is left, so you can back off before you are refused.')}
        </p>
        <Code>
{`GET /api/v1/tournaments/<slug>/structure/
GET /api/v1/tournaments/<slug>/standings/
GET /api/v1/studio/games/<game>/accounts/<account_id>/next-match/

X-Rate-Limit-Limit: 60
X-Rate-Limit-Remaining: 59
X-Rate-Limit-Reset: 42`}
        </Code>
        <p className={styles.body}>
          {t('partners.studioDocs.usage', 'From the first game session, your game\'s page counts linked players who played each month and the game sessions played. Nothing is charged for it today.')}
        </p>
      </section>

      <footer className={styles.footer}>
        <p className={styles.body}>
          {t('partners.studioDocs.more', 'The rest of the API, and Sign in with V-ENT, are in the main reference.')}
        </p>
        <Link href="/partners/docs" className={styles.cta}>
          {t('partners.studioDocs.toReference', 'API reference')}
        </Link>
      </footer>
    </main>
  );
}
