'use client';

// How a stage whose format is chosen later is decided, and what it became (P4c,
// design section 14a). Shown to everybody on the public bracket page.
//
// The vote is a live control, so it is offered only to a signed-in entrant. A
// signed-out reader is told what signing in would let them do, and a signed-in
// person who did not enter is told that the vote is for the entrants. Nothing
// is decided while the session is still loading.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { decidedSentence, decideSentence, statusSentence } from '@/lib/formatDecision';
import { formatLabel } from '@/lib/formatLabel';
import { useViewer } from '@/lib/gating';
import { plural } from '@/lib/plural';
import { useAutoRefresh } from '@/lib/useLiveData';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import styles from './format-decision.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function FormatDecision({ tournamentRef, stageId, entrant = false }) {
  const tt = useT();
  const viewer = useViewer();
  const token = viewer.token;
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  // With the token when there is one: the counts are for entrants and the
  // organiser only, and the server answers the same question for everybody else.
  const load = useCallback(async ({ quiet = false } = {}) => {
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/${stageId}/format/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setData(body.data);
      else if (!quiet) setProblem(apiMessage(tt, body, 'stages.formatLoadFailed', 'Could not read how this stage is decided.'));
    } catch {
      // The bracket still shows; there is only the decision missing.
    }
  }, [tournamentRef, stageId, token, tt]);

  useEffect(() => { if (!viewer.loading) load(); }, [viewer.loading, load]);
  useAutoRefresh(() => (viewer.loading ? false : load({ quiet: true })));

  const vote = async key => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/${stageId}/format/vote/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format: key }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setData(body.data);
        return;
      }
      setProblem(apiMessage(tt, body, 'stages.voteFailed', 'Your vote was not counted.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return null;

  // Settled: the result, for everybody. A stage that was always one format has
  // no decision and shows nothing.
  if (data.undecided === false) {
    if (!data.by) return null;
    return (
      <section className={styles.box} aria-label={tt('stages.decidedLabel', 'How the format was chosen')}>
        <p className={styles.line}>{decidedSentence(tt, data)}</p>
      </section>
    );
  }

  const isVote = data.decide_by === 'vote';
  const status = statusSentence(tt, data);

  return (
    <section className={styles.box} aria-label={tt('stages.decideLabel', 'How the format is decided')}>
      <p className={styles.line}>{decideSentence(tt, data)}</p>
      {status && <p className={styles.line}>{status}</p>}

      {isVote && data.voting_open && (
        <NeedsAccount action={tt('stages.voteAction', 'vote for the format')}>
          {viewer.signedIn && entrant && (
            <div className={styles.field}>
              <div className={styles.chips} role="group" aria-label={tt('stages.voteLabel', 'Vote for the format')}>
                {(data.options || []).map(option => {
                  const count = (data.votes || {})[option.key] ?? 0;
                  const on = data.my_vote === option.key;
                  return (
                    <button key={option.key} type="button" disabled={busy}
                            className={`${styles.chip} ${on ? styles.chipOn : ''}`} aria-pressed={on}
                            onClick={() => vote(option.key)}>
                      <span>{formatLabel(tt, option.key, option.label)}</span>
                      <span className={styles.count}>
                        {plural(tt, count, 'stages.votesOne', '{n} vote', 'stages.votesMany', '{n} votes')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {viewer.signedIn && !entrant && (
            <p className={styles.line}>{tt('stages.voteNotEntrant', 'Only the people entered can vote on this.')}</p>
          )}
        </NeedsAccount>
      )}

      {problem && <p className={styles.problem} role="alert">{problem}</p>}
    </section>
  );
}
