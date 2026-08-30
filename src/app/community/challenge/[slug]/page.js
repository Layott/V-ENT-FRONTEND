'use client';

/**
 * One challenge, from the outside and from the inside.
 *
 * CEO, 30 August 2026: "when another user logs in and they see a challenge, how
 * does it look and if they choose to join or accept, does it work and what is
 * the flow, when it does work, they should then be able to talk with themselves
 * to send details and then record results also".
 *
 * Before this a challenge was a row in a table with an Accept button and no
 * address of its own. There was nowhere to read the terms, nowhere to arrange
 * anything, and no way to say what happened afterwards.
 *
 * What the page shows depends on which side you are on, and the server says
 * which that is (`my_side`), because a team member is on their team's side
 * whether or not they personally pressed anything.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiArrowLeft } from 'react-icons/fi';

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import UserChip from '@/components/user-chip/UserChip';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { apiMessage } from '@/lib/apiMessage';
import { appLocale } from '@/lib/appLocale';
import { useT, useTx } from '@/i18n/LanguageProvider';
import styles from './challenge.module.css';

// The same shape the community list uses. `appLocale()` rather than undefined:
// passing undefined means the browser's language, which is not the language the
// page is being read in.
const formatDateTime = iso => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(appLocale(), {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

const ChallengePage = () => {
  const tt = useT();
  const tx = useTx();
  const router = useRouter();
  const { slug } = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const token = session?.user?.sessionToken;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState({ open: false, msg: '', kind: 'success' });

  // The score being typed, and which half of the two-sided report is showing.
  const [scores, setScores] = useState({ a: '', b: '' });
  const [disputing, setDisputing] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [pickingTeam, setPickingTeam] = useState(false);

  const say = (msg, kind = 'success') => setToast({ open: true, msg, kind });

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/scrim/${slug}/detail/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json();
      if (!res.ok || !body?.data?.scrim) {
        setError(apiMessage(tt, body, 'api.challengeNotFound', 'That challenge could not be found.'));
        return;
      }
      setChallenge(body.data.scrim);
      setError('');
    } catch {
      setError(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [apiUrl, slug, token, tt]);

  useEffect(() => {
    // Wait for the session to resolve before the first read: the answer
    // includes `my_side`, and asking anonymously would render the page as a
    // stranger and then flip it under the reader.
    if (sessionStatus === 'loading') return;
    load();
  }, [load, sessionStatus]);

  // Accepting with a team needs to know which teams there are, and there is no
  // point asking before we know the challenge is a team one.
  useEffect(() => {
    if (!token || !challenge || challenge.is_solo) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/team/my-teams/`, { headers: authHeaders() });
        const body = await res.json();
        if (alive && body?.data?.teams) setMyTeams(body.data.teams);
      } catch { /* accepting will say so if it cannot */ }
    })();
    return () => { alive = false; };
  }, [apiUrl, token, challenge, authHeaders]);

  const post = async (path, payload, okMessage) => {
    setBusy(path);
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload || {}),
      });
      const body = await res.json();
      if (!res.ok) {
        say(apiMessage(tt, body, 'api.thatDidNotWork', 'That did not work. Try again.'), 'error');
        return null;
      }
      if (okMessage) say(okMessage);
      await load();
      return body;
    } catch {
      say(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'), 'error');
      return null;
    } finally {
      setBusy('');
    }
  };

  const accept = async teamId => {
    setPickingTeam(false);
    await post(`/scrim/${challenge.id}/accept/`, teamId ? { team_id: teamId } : {},
      tt('msg.challengeAccepted', 'Accepted. Talk to them to arrange the details.'));
  };

  const onAccept = () => {
    if (challenge.is_solo) return accept(null);
    const eligible = myTeams.filter(t => (t.id || t.team_id) !== challenge.team_a?.id);
    if (eligible.length === 0) {
      say(myTeams.length === 0
        ? tt('msg.needATeamFirst', 'You need a team before you can accept a team challenge.')
        : tt('msg.bringADifferentTeam', 'That is your own team. Bring a different one.'), 'error');
      return;
    }
    if (eligible.length === 1) return accept(eligible[0].id || eligible[0].team_id);
    setPickingTeam(true);
  };

  const talk = async () => {
    const body = await post(`/scrim/${challenge.slug}/talk/`);
    if (body?.data?.url) router.push(body.data.url);
  };

  const reportResult = async ev => {
    ev.preventDefault();
    await post(`/scrim/${challenge.slug}/result/`,
      { score_a: Number(scores.a), score_b: Number(scores.b) },
      tt('msg.resultReported', 'Sent. It counts once the other side agrees.'));
  };

  const confirmResult = () => post(`/scrim/${challenge.slug}/result/confirm/`, { agree: true },
    tt('msg.resultConfirmed', 'Agreed. This is now on both records.'));

  const disputeResult = async ev => {
    ev.preventDefault();
    const body = await post(`/scrim/${challenge.slug}/result/confirm/`,
      { agree: false, score_a: Number(scores.a), score_b: Number(scores.b) },
      tt('msg.resultDisputed', 'Your score has been recorded beside theirs.'));
    if (body) setDisputing(false);
  };

  const cancel = async () => {
    setBusy('cancel');
    try {
      const res = await fetch(`${apiUrl}/scrim/${challenge.slug}/detail/`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) {
        say(apiMessage(tt, body, 'api.thatDidNotWork', 'That did not work. Try again.'), 'error');
        return;
      }
      say(tt('msg.challengeCancelled', 'Called off.'));
      await load();
    } catch {
      say(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'), 'error');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <Shell><p className={styles.stateText}>{tt('ui.loading.challenge.4b21', 'Loading the challenge...')}</p></Shell>;
  }
  if (error || !challenge) {
    return <Shell>
      <p className={styles.stateText}>{error}</p>
      <Link href="/community?tab=challenges" className={styles.backLink}>
        <FiArrowLeft /> {tt('ui.back.challenges.3f01', 'Back to challenges')}
      </Link>
    </Shell>;
  }

  const c = challenge;
  const result = c.result;
  const mine = c.my_side;                       // 'a', 'b' or null
  const open = c.status === 'open';
  const owner = c.is_mine;
  const sideAName = c.team_a?.name || tx('Side A');
  const sideBName = c.team_b?.name || tt('ui.open.slot.2189', 'Open slot');

  // Who may do what. The server decides all of this too; these only draw the
  // controls, so nobody is invited to fill in something that cannot submit.
  const canAccept = open && !owner && !!token;
  const canTalk = !!mine && c.status !== 'open' && c.status !== 'cancelled';
  const canReport = !!mine && (c.status === 'accepted' || c.status === 'in_progress') && !result;
  const waitingOnMe = !!mine && result?.status === 'reported' && result.reported_side !== mine;
  const waitingOnThem = !!mine && result?.status === 'reported' && result.reported_side === mine;

  return (
    <Shell>
      <Link href="/community?tab=challenges" className={styles.backLink}>
        <FiArrowLeft /> {tt('ui.back.challenges.3f01', 'Back to challenges')}
      </Link>

      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <span className={`${styles.status} ${styles['status_' + c.status]}`}>
            {statusWord(tt, c.status)}
          </span>
          <span className={styles.gameLine}>
            {c.game} · {c.mode_label || c.mode} · {c.format}
          </span>
        </div>

        <div className={styles.versus}>
          <div className={styles.side}>
            <span className={styles.sideName}>{sideAName}</span>
            {c.is_solo && c.created_by && <UserChip user={c.created_by} size={24} />}
          </div>
          <span className={styles.vs}>{tt('ui.vs.9c31', 'vs')}</span>
          <div className={styles.side}>
            <span className={`${styles.sideName} ${!c.team_b ? styles.sideOpen : ''}`}>{sideBName}</span>
          </div>
        </div>

        {result && <div className={styles.scoreLine}>
          <span className={styles.score}>{result.score_a}</span>
          <span className={styles.scoreDash}>{tx('to')}</span>
          <span className={styles.score}>{result.score_b}</span>
          <span className={styles.scoreNote}>{resultWord(tt, result)}</span>
        </div>}
      </div>

      <div className={styles.factsCard}>
        <Fact label={tt('ui.when.769b', 'When')} value={c.scheduled_at ? formatDateTime(c.scheduled_at) : tt('ui.flexible.7b02', 'Flexible')} />
        <Fact label={tt('ui.who.can.answer.4b73', 'Who can answer')} value={openToWords(tt, c)} />
        <Fact label={tt('ui.how.many.a.side.9d51', 'How many a side')} value={`${c.team_size}v${c.team_size}`} />
        {c.map_code && <Fact label={tt('scrim.mapCode', 'Map code')} value={c.map_code} />}
        <Fact label={tt('ui.posted.by.1d84', 'Posted by')} value={<UserChip user={c.created_by} size={24} />} />
      </div>

      {c.notes && <div className={styles.notesCard}>
        <h2 className={styles.cardTitle}>{tt('ui.notes.4f19', 'Notes')}</h2>
        <p className={styles.notes}>{c.notes}</p>
      </div>}

      {/* ---------------------------------------------------- what you can do */}
      <div className={styles.actionsCard}>
        {!token && <p className={styles.stateText}>
          {tt('msg.signInToAnswer', 'Sign in to answer this challenge.')}{' '}
          <Link href="/login" className={styles.inlineLink}>{tt('ui.login.7b3c', 'Log in')}</Link>
        </p>}

        {canAccept && !pickingTeam && <button className={`${styles.primaryBtn} goldBTN`} onClick={onAccept} disabled={!!busy}>
          {tt('ui.accept.challenge.6d20', 'Accept this challenge')}
        </button>}

        {pickingTeam && <div className={styles.teamPicker}>
          <span className={styles.pickerLabel}>{tt('ui.which.team.3a71', 'Which team are you bringing?')}</span>
          {myTeams.filter(t => (t.id || t.team_id) !== c.team_a?.id).map(t =>
            <button key={t.id || t.team_id} className={styles.teamPickBtn} onClick={() => accept(t.id || t.team_id)}>
              {t.name || t.team_name}
            </button>)}
        </div>}

        {owner && open && <div className={styles.ownerRow}>
          <Link href={`/community/scrim/create?edit=${c.slug}`} className={styles.secondaryBtn}>
            {tt('ui.edit.challenge.btn.7e33', 'Edit')}
          </Link>
          <button className={styles.dangerBtn} onClick={cancel} disabled={!!busy}>
            {tt('ui.call.it.off.2b18', 'Call it off')}
          </button>
        </div>}

        {canTalk && <button className={styles.secondaryBtn} onClick={talk} disabled={!!busy}>
          {tt('ui.talk.to.them.5c94', 'Talk to them')}
        </button>}

        {/* --------------------------------------------------------- results */}
        {canReport && <form className={styles.resultForm} onSubmit={reportResult}>
          <h2 className={styles.cardTitle}>{tt('ui.record.result.8f21', 'Record the result')}</h2>
          <p className={styles.cardSub}>
            {tt('msg.resultNeedsBoth', 'Whatever you put here counts once the other side agrees with it.')}
          </p>
          <ScoreInputs a={sideAName} b={sideBName} scores={scores} setScores={setScores} tt={tt} />
          <button type="submit" className={`${styles.primaryBtn} goldBTN`} disabled={!!busy || scores.a === '' || scores.b === ''}>
            {tt('ui.send.result.1a49', 'Send the result')}
          </button>
        </form>}

        {waitingOnThem && <p className={styles.stateText}>
          {tt('msg.waitingOnThem', 'Sent. Waiting for the other side to agree.')}
        </p>}

        {waitingOnMe && !disputing && <div className={styles.confirmBlock}>
          <h2 className={styles.cardTitle}>{tt('ui.do.you.agree.3d72', 'Do you agree?')}</h2>
          <p className={styles.cardSub}>
            {tt('msg.theyReported', 'They recorded {a} to {b}.')
              .replace('{a}', String(result.score_a)).replace('{b}', String(result.score_b))}
          </p>
          <div className={styles.confirmRow}>
            <button className={`${styles.primaryBtn} goldBTN`} onClick={confirmResult} disabled={!!busy}>
              {tt('ui.that.is.right.9e05', 'That is right')}
            </button>
            <button className={styles.secondaryBtn} onClick={() => setDisputing(true)} disabled={!!busy}>
              {tt('ui.that.is.wrong.4c88', 'That is not what happened')}
            </button>
          </div>
        </div>}

        {waitingOnMe && disputing && <form className={styles.resultForm} onSubmit={disputeResult}>
          <h2 className={styles.cardTitle}>{tt('ui.what.happened.2f60', 'What was the score?')}</h2>
          <p className={styles.cardSub}>
            {tt('msg.bothKept', 'Both accounts are kept, and an organiser can look at them.')}
          </p>
          <ScoreInputs a={sideAName} b={sideBName} scores={scores} setScores={setScores} tt={tt} />
          <div className={styles.confirmRow}>
            <button type="submit" className={`${styles.primaryBtn} goldBTN`} disabled={!!busy || scores.a === '' || scores.b === ''}>
              {tt('ui.send.my.score.7b41', 'Send my score')}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => setDisputing(false)}>
              {tt('ui.cancel.77df', 'Cancel')}
            </button>
          </div>
        </form>}

        {result?.status === 'disputed' && <div className={styles.disputeBlock}>
          <h2 className={styles.cardTitle}>{tt('ui.two.accounts.5a17', 'Two accounts of this match')}</h2>
          <p className={styles.cardSub}>
            {tt('msg.disputeLine', 'One side says {a1} to {b1}. The other says {a2} to {b2}. It counts for neither record until it is settled.')
              .replace('{a1}', String(result.score_a)).replace('{b1}', String(result.score_b))
              .replace('{a2}', String(result.disputed?.score_a ?? '?')).replace('{b2}', String(result.disputed?.score_b ?? '?'))}
          </p>
        </div>}
      </div>

      <MessageSnackbar open={toast.open} handleClose={() => setToast(t => ({ ...t, open: false }))}
        message={toast.msg} type={toast.kind} />
    </Shell>
  );
};

const Fact = ({ label, value }) => (
  <div className={styles.fact}>
    <span className={styles.factLabel}>{label}</span>
    <span className={styles.factValue}>{value}</span>
  </div>
);

const ScoreInputs = ({ a, b, scores, setScores, tt }) => (
  <div className={styles.scoreInputs}>
    <label className={styles.scoreField}>
      <span className={styles.scoreLabel}>{a}</span>
      <input type="number" min="0" inputMode="numeric" className={styles.scoreInput}
        value={scores.a} onChange={e => setScores(s => ({ ...s, a: e.target.value }))}
        aria-label={tt('ui.score.for.a.1c73', 'Score for the first side')} />
    </label>
    <label className={styles.scoreField}>
      <span className={styles.scoreLabel}>{b}</span>
      <input type="number" min="0" inputMode="numeric" className={styles.scoreInput}
        value={scores.b} onChange={e => setScores(s => ({ ...s, b: e.target.value }))}
        aria-label={tt('ui.score.for.b.8d40', 'Score for the second side')} />
    </label>
  </div>
);

const Shell = ({ children }) => (
  <div className={styles.pageContainer}>
    <Header />
    <MobileHeader />
    <main className={styles.mainContainer}>
      <Sidebar />
      <div className={styles.rightPaneContainer}>{children}</div>
    </main>
    <BottomMenu />
  </div>
);

// The words for who may answer, built here rather than taken from the server.
// `open_to_label` is a sentence assembled in Python, so it arrived in English on
// a French page. Country names are proper nouns and stay as they are.
const openToWords = (tt, c) => {
  if (c.open_to === 'anywhere') return tt('scrim.anybody', 'anybody, anywhere');
  if (c.open_to === 'countries') return (c.countries || []).join(', ');
  return c.country || c.open_to_label || '';
};

const statusWord = (tt, status) => ({
  open: tt('ui.status.open.7c28', 'Open'),
  accepted: tt('ui.matched.1bf3', 'Matched'),
  in_progress: tt('ui.progress.f61e', 'In Progress'),
  played: tt('ui.played.6c19', 'Played'),
  completed: tt('ui.completed.1798', 'Completed'),
  cancelled: tt('ui.cancelled.2e77', 'Called off'),
}[status] || status);

const resultWord = (tt, result) => ({
  reported: tt('ui.result.reported.3b52', 'Reported, not yet agreed'),
  confirmed: tt('ui.result.agreed.9f14', 'Agreed by both sides'),
  disputed: tt('ui.result.disputed.6a28', 'Disputed'),
}[result.status] || '');

export default ChallengePage;
