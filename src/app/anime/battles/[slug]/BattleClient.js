'use client';

// One battle: who is in it, how they score, and who wins.
//
// The numbers on this page are the whole point, so it shows the arithmetic
// rather than a verdict: every attribute is the mean of the votes cast on it,
// how many people voted is beside it, and the total is the sum of the five.
// A reader can check it, which is the difference between a result and a claim.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { call, fill, tokenFrom, useAnimeCatalogue, useAnimeOpen } from '@/lib/anime';
import { formatDateTime } from '@/lib/datetime';
import { useViewer, signInHref } from '@/lib/gating';
import styles from '../../studio/studio.module.css';

const BattleClient = ({ slug }) => {
  const tt = useT();
  const open = useAnimeOpen();
  const router = useRouter();
  const { data: session } = useSession();
  const viewer = useViewer();
  const token = tokenFrom(session);
  const { catalogue } = useAnimeCatalogue(open === true);

  const [battle, setBattle] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [saying, setSaying] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [one, said] = await Promise.all([
        call(`/battles/${encodeURIComponent(slug)}/`, { token }),
        call(`/battles/${encodeURIComponent(slug)}/comments/`, { token }),
      ]);
      setBattle(one);
      setComments(said.comments || []);
    } catch (err) {
      if (err.code === 'SLUG_CHANGED' && err.data?.url) {
        router.replace(err.data.url);
        return;
      }
      setError(err.code === 'NOT_FOUND'
        ? tt('anime.noSuchBattle', 'There is no battle here.')
        : (err.message || tt('anime.loadFailed', 'We could not load it.')));
    } finally {
      setLoading(false);
    }
  }, [slug, token, router, tt]);

  useEffect(() => {
    if (open !== true) return undefined;
    load();
    return undefined;
  }, [open, load]);

  const post = async (path, body, said) => {
    setBusy(true);
    setToast(null);
    try {
      await call(`/battles/${encodeURIComponent(slug)}/${path}`, {
        method: 'POST', token, body });
      setToast(said);
      await load();
    } catch (err) {
      setToast(err.message || tt('anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const vote = (character, attribute, score) =>
    post('vote/', { character, scores: { [attribute]: score } },
      tt('anime.voted', 'Voted.'));

  if (open === null) return null;
  if (open === false) {
    return <ComingSoon phase="Phase 5"
      title={tt('anime.comingTitle', 'Anime hub')}
      blurb={tt('anime.comingBlurb',
        'Manga reading, co-reading rooms and character battles are built and '
        + 'not open yet. Nothing here is live.')}
      alternatives={[{ href: '/tournaments', label: tt('nav.tournaments', 'Tournaments') }]} />;
  }

  const shell = inner => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <Link href="/anime/battles" className={styles.backLink}>
            {tt('anime.allBattles', 'Every battle')}
          </Link>
          {inner}
        </div>
      </main>
      <BottomMenu />
      {toast ? <p className={styles.toast} role="status">{toast}</p> : null}
    </div>
  );

  if (loading) return shell(<div className={styles.skeleton} />);
  if (error) {
    return shell(
      <div className={styles.empty}>
        <p>{error}</p>
        <button type="button" className={styles.quietBtn} onClick={load}>
          {tt('common.tryAgain', 'Try again')}
        </button>
      </div>);
  }
  if (!battle) return shell(null);

  const attributes = Object.entries(catalogue?.attributes || {});

  return shell(
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{battle.title}</h1>
        <p className={styles.pageSub}>
          {battle.state_label}
          {battle.description ? ` ${battle.description}` : ''}
        </p>
      </div>

      {/* The result, and the rule that produced it. */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{tt('anime.result', 'Where it stands')}</h2>
        {battle.winner ? (
          <p className={styles.rowTitle}>
            {fill(tt('anime.winnerIs', '{name} leads on {total}'),
              { name: battle.winner.name, total: battle.winner.total })}
          </p>
        ) : battle.tied?.length ? (
          <p className={styles.rowTitle}>
            {fill(tt('anime.tiedBetween', 'Level between {names}'),
              { names: battle.tied.join(', ') })}
          </p>
        ) : (
          <p className={styles.rowMeta}>
            {tt('anime.noVotesYet', 'Nobody has voted yet.')}
          </p>
        )}
        <p className={styles.rowMeta}>
          {tt('anime.theRule',
            'Each attribute is the average of the votes on it. A character '
            + 'total is the sum of the five averages.')}
        </p>
      </section>

      {(battle.characters || []).map(character => (
        <section key={character.id} className={styles.card}>
          <h2 className={styles.cardTitle}>{character.name}</h2>
          <p className={styles.rowMeta}>
            {character.source}
            {' '}
            {/* One vote is not "1 voters". Two keys rather than a plural
                engine: a battle starts at one vote and that is the number
                somebody reads first. */}
            {fill(character.voters === 1
              ? tt('anime.totalIsOne', 'Total {t}, from one person')
              : tt('anime.totalIs', 'Total {t}, from {v} people'),
            { t: character.total, v: character.voters })}
          </p>
          {character.attributes.map(a => (
            <div key={a.key} className={styles.form}>
              <span className={styles.label}>
                {a.name}
                {' '}
                {a.votes === 1
                  ? fill(tt('anime.scoreAndOneVote', '{s} from one vote'),
                    { s: a.score })
                  : a.votes
                    ? fill(tt('anime.scoreAndVotes', '{s} from {v} votes'),
                      { s: a.score, v: a.votes })
                    : tt('anime.noVotesOnThis', 'nobody has voted on this')}
              </span>
              {battle.state === 'voting' && viewer.signedIn && (
                <div className={styles.actions}>
                  {[2, 4, 6, 8, 10].map(score => (
                    <button key={score} type="button" className={styles.quietBtn}
                            disabled={busy}
                            aria-pressed={
                              battle.my_votes?.[String(character.id)]?.[a.key] === score}
                            onClick={() => vote(character.name, a.key, score)}>
                      {score}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}

      {battle.state === 'nominating' && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {tt('anime.nominate', 'Nominate somebody')}
          </h2>
          {!viewer.signedIn ? (
            <div className={styles.empty}>
              <p>{tt('anime.nominateSignedOut',
                'Sign in to nominate a character.')}</p>
              <Link href={signInHref(`/anime/battles/${slug}`)}
                    className={styles.primaryBtn}>
                {tt('needsAccount.signIn', 'Log in')}
              </Link>
            </div>
          ) : (
            <form className={styles.form} onSubmit={e => {
              e.preventDefault();
              post('nominate/', { name, source },
                tt('anime.nominated',
                  'Nominated. A V-ENT admin decides what enters.'));
              setName(''); setSource('');
            }}>
              <label className={styles.label} htmlFor="nom-name">
                {tt('anime.characterName', 'Who')}
              </label>
              <input id="nom-name" className={styles.input} value={name}
                     onChange={e => setName(e.target.value)} required />
              <label className={styles.label} htmlFor="nom-source">
                {tt('anime.fromWhat', 'From what')}
              </label>
              <input id="nom-source" className={styles.input} value={source}
                     onChange={e => setSource(e.target.value)} />
              <button type="submit" className={styles.primaryBtn}
                      disabled={busy || !name.trim()}>
                {tt('anime.nominateBtn', 'Nominate')}
              </button>
            </form>
          )}
          {battle.my_nominations?.length > 0 && (
            <ul className={styles.list}>
              {battle.my_nominations.map(n => (
                <li key={n.name} className={styles.rowMeta}>
                  {n.name}
                  {' '}
                  {n.approved
                    ? tt('anime.inTheBattle', 'in the battle')
                    : tt('anime.waitingOnAdmin', 'waiting on a decision')}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{tt('anime.discussion', 'Argue about it')}</h2>
        {comments.length === 0 ? (
          <p className={styles.rowMeta}>
            {tt('anime.nothingSaid', 'Nobody has said anything yet.')}
          </p>
        ) : (
          <ul className={styles.list}>
            {comments.map(c => (
              <li key={c.id} className={styles.row}>
                <span className={styles.rowTitle}>
                  <UserChip user={c.author} />
                </span>
                <span className={styles.rowMeta}>{c.body}</span>
                <span className={styles.rowMeta}>
                  {formatDateTime(c.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {viewer.signedIn ? (
          <form className={styles.form} onSubmit={e => {
            e.preventDefault();
            post('comments/', { body: saying }, tt('anime.said', 'Said.'));
            setSaying('');
          }}>
            <textarea className={styles.textarea} rows={2} value={saying}
                      onChange={e => setSaying(e.target.value)}
                      placeholder={tt('anime.saySomething', 'Say something')} />
            <button type="submit" className={styles.primaryBtn}
                    disabled={busy || !saying.trim()}>
              {tt('anime.say', 'Send')}
            </button>
          </form>
        ) : (
          <Link href={signInHref(`/anime/battles/${slug}`)}
                className={styles.primaryBtn}>
            {tt('needsAccount.signIn', 'Log in')}
          </Link>
        )}
      </section>
    </>
  );
};

export default BattleClient;
