'use client';

import { appLocale } from '@/lib/appLocale';
import { apiMessage } from '@/lib/apiMessage';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuRadio, LuCheck, LuEye, LuArrowRight, LuTrophy, LuExternalLink, LuPencil } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './manage.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const API = process.env.NEXT_PUBLIC_API_URL;
const TABS = [{
  id: 'match-control',
  label: 'Match Control'
}, {
  id: 'participants',
  label: 'Participants'
}, {
  id: 'brackets',
  label: 'Brackets'
}, {
  id: 'production',
  label: 'Production'
}, {
  id: 'reminders',
  label: 'Reminders'
}];
const formatDate = d => d ? new Date(d).toLocaleDateString(appLocale(), {
  day: 'numeric',
  month: 'short'
}) : '-';
const formatTime = d => d ? new Date(d).toLocaleTimeString(appLocale(), {
  hour: '2-digit',
  minute: '2-digit'
}) : '';

// A bracket match, flattened for the match list / scoreboard.
const flattenMatches = (rounds = []) => rounds.flatMap(r => (r.matches || []).map(m => ({
  id: m.match_id,
  round: r.round,
  round_label: `R${r.round}`,
  match_number: m.match_number,
  status: m.status || 'scheduled',
  score_p1: m.score_p1 ?? 0,
  score_p2: m.score_p2 ?? 0,
  p1: m.participant_1 || null,
  p2: m.participant_2 || null,
  winner: m.winner || null,
  scheduled_at: m.scheduled_at || null
})));
const nameOf = p => p?.name || p?.participant?.name || 'TBD';
const regIdOf = p => p?.registration_id ?? p?.id ?? null;
const ManageContent = () => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();
  const token = session?.user?.sessionToken;
  const id = searchParams.get('id');
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('match-control');
  const [toast, setToast] = useState(null);
  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };
  const load = useCallback(async () => {
    if (!id) {
      setError(tt("msg.noTournamentSelected", "No tournament selected."));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers = token ? {
        Authorization: `Bearer ${token}`
      } : {};
      const [tRes, pRes, bRes] = await Promise.all([fetch(`${API}/tournament/view-tournament/${id}/`, {
        headers
      }), fetch(`${API}/tournament/get-tournament-participants/${id}/`, {
        headers
      }), fetch(`${API}/tournament/get-tournament-brackets/${id}/`, {
        headers
      })]);
      if (!tRes.ok) throw new Error(`Tournament not found (${tRes.status})`);
      const tBody = await tRes.json();
      setTournament(tBody?.data || null);
      const pBody = pRes.ok ? await pRes.json() : null;
      setParticipants(pBody?.data?.participants || []);
      const bBody = bRes.ok ? await bRes.json() : null;
      setRounds(bBody?.data?.rounds || []);
    } catch (err) {
      setError(apiMessage(tt, err, "api.failedToLoadThisTournament", "Failed to load this tournament."));
    } finally {
      setLoading(false);
    }
  }, [id, token]);
  useEffect(() => {
    load();
  }, [load]);
  const matches = useMemo(() => flattenMatches(rounds), [rounds]);
  if (loading) {
    return <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.panelSub}>{tt("ui.loading.tournament.7024", "Loading tournament…")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  if (error || !tournament) {
    return <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <Link href="/tournaments/my-tournaments" className={styles.backLink}>{tt("ui.my.tournaments.053d", "← My Tournaments")}</Link>
            <h1 className={styles.pageTitle}>{tt("ui.can.t.open.this.8089", "Can’t open this tournament")}</h1>
            <p className={styles.panelSub}>{error || tx("Tournament not found.")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  const prizePool = Number(tournament.prize_pool || 0);
  const statusLabel = (tournament.status || '').replace(/_/g, ' ') || 'draft';
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <Link href="/tournaments/my-tournaments" className={styles.backLink}>{tt("ui.my.tournaments.053d", "← My Tournaments")}</Link>
              <h1 className={styles.pageTitle}>{tournament.name || tournament.tournament_title}</h1>
              <div className={styles.headerMeta}>
                <span className={styles.gameTag}>{tournament.game || tx("Unknown game")}</span>
                <span className={styles.statusBadge}><LuRadio /> {statusLabel}</span>
                <span className={styles.metaText}>
                  {tournament.current_participants ?? 0}/{tournament.max_participants ?? 0} {tt("ui.participants.a94a", "participants")}
                </span>
                <span className={styles.metaText}><LuTrophy /> {prizePool.toLocaleString()} VC</span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Link href={`/tournaments/${tournament.slug || tournament.tournament_id}`}>
                <button className={styles.outlineBtn}><LuEye /> {tt("ui.view.public.page.13b1", "View Public Page")}</button>
              </Link>
              <span aria-disabled="true" title={tt("ui.production.not.available.yet.c87f", "Production is not available yet")} style={{
              opacity: 0.45,
              cursor: 'default'
            }}>
                <button className={`${styles.btn} goldBTN`}><LuRadio /> {tt("ui.production.panel.ccb3", "Production Panel")}</button>
              </span>
            </div>
          </div>

          {/* Sub-tab nav */}
          <div className={styles.tabBar}>
            {TABS.map(t => <button key={t.id} className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`} onClick={() => setTab(t.id)}>{tx(t.label)}</button>)}
          </div>

          <div className={styles.panelArea}>
            {tab === 'match-control' && <MatchControlPanel tournamentId={tournament.tournament_id} matches={matches} token={token} showToast={showToast} onSaved={load} />}
            {tab === 'participants' && <ParticipantsPanel participants={participants} />}
            {tab === 'brackets' && <BracketsPanel rounds={rounds} />}
            {tab === 'production' && <ProductionLinkPanel tournament={tournament} />}
            {tab === 'reminders' && <RemindersPanel tournamentId={tournament.tournament_id} token={token} showToast={showToast} />}
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>;
};

/* ──────────────── REMINDERS ──────────────── */

// Nudging entrants before they miss something.
//
// The counts are fetched before anything is offered, so an organiser sees "0
// entrants have not checked in" rather than pressing a button that reaches
// nobody. That is the same rule as everywhere else here: say what will happen
// before somebody spends the effort, not after.
const RemindersPanel = ({ tournamentId, token, showToast }) => {
  const tt = useT();
  const [audience, setAudience] = useState(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ subject: '', body: '' });

  const load = useCallback(async () => {
    if (!token || !tournamentId) return;
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/remind/audience/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setAudience(body.data);
    } catch {
      // A panel that cannot count its audience still has to render, and the
      // buttons below explain themselves without it.
      setAudience(null);
    }
  }, [tournamentId, token]);

  useEffect(() => { load(); }, [load]);

  const send = async payload => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/remind/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast(tt('run.remindSent', 'Sent to {n} people.')
          .replace('{n}', body.data.people));
        if (payload.kind === 'custom') setDraft({ subject: '', body: '' });
        await load();
        return;
      }
      showToast(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } finally {
      setBusy(false);
    }
  };

  const checkInCount = audience?.check_in?.entrants ?? 0;
  const matchCount = audience?.match?.sides ?? 0;
  const usesCheckIn = audience?.check_in?.used !== false;

  return <div>
      <h2 className={styles.panelTitle}>{tt('run.tabReminders', 'Reminders')}</h2>
      <p className={styles.panelSub}>
        {tt('run.remindersHint', 'Nudge entrants before they miss something. Check-in skips anybody who has already checked in, and a match reminder names the opponent, the round and the time.')}
      </p>

      <div className={styles.remindGrid}>
        <div className={styles.remindCard}>
          <strong className={styles.remindTitle}>
            {tt('run.remindCheckIn', 'Remind them to check in')}
          </strong>
          <span className={styles.remindCount}>
            {!usesCheckIn
              ? tt('run.remindNoCheckIn', 'This tournament does not use check-in.')
              : tt('run.remindCheckInCount', '{n} entrants have not checked in')
                .replace('{n}', checkInCount)}
          </span>
          <button type="button" className={styles.btn} disabled={busy || !usesCheckIn || checkInCount === 0}
                  onClick={() => send({ kind: 'check_in' })}>
            {checkInCount === 0 && usesCheckIn
              ? tt('run.remindNobody', 'Nobody needs this one right now.')
              : tt('run.remindCheckIn', 'Remind them to check in')}
          </button>
        </div>

        <div className={styles.remindCard}>
          <strong className={styles.remindTitle}>
            {tt('run.remindMatch', 'Tell them who they play')}
          </strong>
          <span className={styles.remindCount}>
            {tt('run.remindMatchCount', '{n} sides still to play').replace('{n}', matchCount)}
          </span>
          <button type="button" className={styles.btn} disabled={busy || matchCount === 0}
                  onClick={() => send({ kind: 'match' })}>
            {matchCount === 0
              ? tt('run.remindNobody', 'Nobody needs this one right now.')
              : tt('run.remindMatch', 'Tell them who they play')}
          </button>
        </div>
      </div>

      <div className={styles.remindCard} style={{ marginTop: '1rem' }}>
        <strong className={styles.remindTitle}>
          {tt('run.remindCustom', 'Send your own message')}
        </strong>
        <input className={styles.modalInput} maxLength={140}
               placeholder={tt('run.remindSubject', 'Subject')}
               value={draft.subject}
               onChange={e => setDraft({ ...draft, subject: e.target.value })} />
        <textarea className={styles.remindBody} rows={4} maxLength={2000}
                  placeholder={tt('run.remindBody', 'What do they need to know?')}
                  value={draft.body}
                  onChange={e => setDraft({ ...draft, body: e.target.value })} />
        <span className={styles.remindCount}>
          {audience
            ? tt('run.remindToday', '{sent} of {limit} reminders sent today.')
              .replace('{sent}', audience.sent_today)
              .replace('{limit}', audience.daily_limit)
            : ''}
        </span>
        <button type="button" className={styles.btn}
                disabled={busy || !draft.subject.trim() || !draft.body.trim()}
                onClick={() => send({ kind: 'custom', ...draft })}>
          {tt('run.remindCustom', 'Send your own message')}
        </button>
      </div>
    </div>;
};

/* ──────────────── MATCH CONTROL ──────────────── */
const MatchControlPanel = ({
  tournamentId,
  matches,
  token,
  showToast,
  onSaved
}) => {
  const tx = useTx();
  const tt = useT();
  const [selected, setSelected] = useState(matches[0]?.id ?? null);
  const live = matches.find(m => m.id === selected) || matches[0] || null;
  const [scoreA, setScoreA] = useState(live?.score_p1 ?? 0);
  const [scoreB, setScoreB] = useState(live?.score_p2 ?? 0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setScoreA(live?.score_p1 ?? 0);
    setScoreB(live?.score_p2 ?? 0);
  }, [live?.id, live?.score_p1, live?.score_p2]);
  if (!matches.length) {
    return <div>
        <h2 className={styles.panelTitle}>{tt("ui.match.control.9540", "Match Control")}</h2>
        <p className={styles.panelSub}>
          {tt("ui.no.bracket.has.been.fd5b", "No bracket has been generated for this tournament yet. Once the bracket exists,\n          every match appears here for live scoring.")}
        </p>
      </div>;
  }
  const selectMatch = m => setSelected(m.id);
  const updateScore = (delta, side) => {
    if (side === 'a') setScoreA(s => Math.max(0, s + delta));else setScoreB(s => Math.max(0, s + delta));
  };

  // Winner is implied by the score - the backend requires it explicitly.
  const winnerRegId = () => {
    if (scoreA === scoreB) return null;
    return scoreA > scoreB ? regIdOf(live.p1) : regIdOf(live.p2);
  };
  const saveScore = async () => {
    const winner = winnerRegId();
    if (!winner) {
      showToast(tt("msg.scoresAreLevelAWinner", "Scores are level - a winner is required"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/tournament/update-bracket/${tournamentId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {
            Authorization: `Bearer ${token}`
          } : {})
        },
        body: JSON.stringify({
          match_id: live.id,
          score_p1: scoreA,
          score_p2: scoreB,
          winner_registration_id: winner
        })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.status !== 'success') {
        showToast(body?.message || `Could not save score (${res.status})`);
      } else {
        showToast(tt("msg.scoreSavedBracketAdvanced", "Score saved \u00b7 bracket advanced"));
        onSaved?.();
      }
    } catch {
      showToast(tt("msg.connectionErrorScoreNotSaved", "Connection error - score not saved"));
    } finally {
      setSaving(false);
    }
  };
  return <div className={styles.matchCtrlGrid}>
      <div className={styles.matchList}>
        <h2 className={styles.panelTitle}>{tt("ui.all.matches.dfb5", "All Matches")}</h2>
        {matches.map(m => <button key={m.id} className={`${styles.matchListItem} ${selected === m.id ? styles.matchListActive : ''}`} onClick={() => selectMatch(m)}>
            <div className={styles.matchListTop}>
              <span className={styles.matchRound}>{m.round_label} · M{m.match_number}</span>
              <span className={`${styles.matchStatusBadge} ${styles[`matchStatus_${m.status}`]}`}>{m.status}</span>
            </div>
            <p className={styles.matchListLabel}>{nameOf(m.p1)} vs {nameOf(m.p2)}</p>
            {m.scheduled_at && <p className={styles.matchListTime}>{formatDate(m.scheduled_at)} · {formatTime(m.scheduled_at)}</p>}
            {m.status !== 'scheduled' && <p className={styles.matchListScore}>{m.score_p1} - {m.score_p2}</p>}
          </button>)}
      </div>

      <div className={styles.scoreboardWrap}>
        <h2 className={styles.panelTitle}>{tt("ui.live.scoring.e82b", "Live Scoring")}</h2>
        <div className={styles.scoreboardCard}>
          <div className={styles.sbHeader}>
            <span className={styles.sbRound}>{live.round_label} {tt("ui.match.b4ba", "· Match")} {live.match_number}</span>
            <span className={`${styles.sbStatusPill} ${styles[`matchStatus_${live.status}`]}`}>{live.status}</span>
          </div>

          <div className={styles.sbScoreRow}>
            <div className={styles.sbTeam}>
              <div className={styles.sbAvatar}>{nameOf(live.p1).charAt(0)}</div>
              <p className={styles.sbTeamName}>{nameOf(live.p1)}</p>
              <div className={styles.scoreCounter}>
                <button className={styles.scoreBtn} onClick={() => updateScore(-1, 'a')}>−</button>
                <span className={styles.scoreValue}>{scoreA}</span>
                <button className={styles.scoreBtn} onClick={() => updateScore(1, 'a')}>+</button>
              </div>
            </div>

            <div className={styles.sbVS}>VS</div>

            <div className={styles.sbTeam}>
              <div className={styles.sbAvatar}>{nameOf(live.p2).charAt(0)}</div>
              <p className={styles.sbTeamName}>{nameOf(live.p2)}</p>
              <div className={styles.scoreCounter}>
                <button className={styles.scoreBtn} onClick={() => updateScore(-1, 'b')}>−</button>
                <span className={styles.scoreValue}>{scoreB}</span>
                <button className={styles.scoreBtn} onClick={() => updateScore(1, 'b')}>+</button>
              </div>
            </div>
          </div>

          <div className={styles.sbControls}>
            <button className={`${styles.btn} ${styles.outlineBtn}`} onClick={saveScore} disabled={saving || live.status === 'completed' || !live.p1 || !live.p2}>
              <LuCheck /> {saving ? tx("Saving…") : tx("Save Score")}
            </button>
          </div>
          {live.status === 'completed' && <p className={styles.previewHint}>
              {tt("ui.this.match.complete.winner.dc54", "This match is complete. Winner:")} {nameOf(live.winner)}.
            </p>}
        </div>
      </div>
    </div>;
};

/* ──────────────── PARTICIPANTS ──────────────── */
const ParticipantsPanel = ({
  participants
}) => {
  const tx = useTx();
  const tt = useT();
  if (!participants.length) {
    return <div>
        <h2 className={styles.panelTitle}>{tt("ui.participants.cd56", "Participants")}</h2>
        <p className={styles.panelSub}>{tt("ui.nobody.has.registered.tournament.50e0", "Nobody has registered for this tournament yet.")}</p>
      </div>;
  }
  return <div>
      <h2 className={styles.panelTitle}>{tt("ui.participants.1fd9", "Participants (")}{participants.length})</h2>
      <div className={styles.partTable}>
        <div className={styles.partTableHeader}>
          <span>{tt("ui.seed.32fe", "Seed")}</span>
          <span>{tt("ui.participant.a773", "Participant")}</span>
          <span>{tt("ui.type.3deb", "Type")}</span>
          <span>{tt("ui.status.bae7", "Status")}</span>
          <span>{tt("ui.entry.fee.28b4", "Entry fee")}</span>
        </div>
        {participants.map((p, i) => <div key={p.registration_id} className={styles.partTableRow}>
            <span className={styles.seedCell}>#{i + 1}</span>
            <span className={styles.partTeamName}>{p.participant?.name || '-'}</span>
            <span className={styles.partCaptain}>{p.type}</span>
            <span className={`${styles.partStatusBadge} ${styles[`partStatus_${p.status}`] || ''}`}>{p.status}</span>
            <span className={styles.partCaptain}>{p.entry_fee_paid ? 'Paid' : tx("Not paid")}</span>
          </div>)}
      </div>
      <p className={styles.panelSub} style={{
      marginTop: '1rem'
    }}>
        {tt("ui.disqualifications.are.handled.by.3733", "Disqualifications are handled by platform admins from the admin console, so they are\n        recorded in the audit trail.")}
      </p>
    </div>;
};

/* ──────────────── BRACKETS ──────────────── */
const BracketsPanel = ({
  rounds
}) => {
  const tt = useT();
  if (!rounds.length) {
    return <div>
        <h2 className={styles.panelTitle}>{tt("ui.bracket.e42a", "Bracket")}</h2>
        <p className={styles.panelSub}>
          {tt("ui.no.bracket.generated.yet.055e", "No bracket generated yet. Generate it from the tournament page once registration closes.")}
        </p>
      </div>;
  }
  return <div>
      <div className={styles.bracketHeader}>
        <h2 className={styles.panelTitle}>{tt("ui.bracket.e42a", "Bracket")}</h2>
        <p className={styles.bracketSub}>{tt("ui.live.bracket.as.scored.0802", "Live bracket as scored. Update results from Match Control.")}</p>
      </div>

      <div className={styles.bracketScroll}>
        <div className={styles.bracketChart}>
          {rounds.map((round, rIdx) => <div key={round.round} className={styles.roundCol} style={{
          '--round-idx': rIdx
        }}>
              <div className={styles.roundLabel}>{tt("ui.round.ec7b", "Round")} {round.round}</div>
              {(round.matches || []).map(m => {
            const winnerId = regIdOf(m.winner);
            const slots = [{
              p: m.participant_1,
              score: m.score_p1
            }, {
              p: m.participant_2,
              score: m.score_p2
            }];
            return <div key={m.match_id} className={styles.bracketMatch}>
                    {slots.map((slot, idx) => <div key={`${m.match_id}_${idx}`} className={`${styles.bracketTeamSlot} ${winnerId && regIdOf(slot.p) === winnerId ? styles.slotWinner : ''}`}>
                        <span className={styles.slotName}>{nameOf(slot.p)}</span>
                        <span className={styles.slotScore}>{slot.score ?? '-'}</span>
                      </div>)}
                  </div>;
          })}
            </div>)}
        </div>
      </div>
    </div>;
};

/* ──────────────── PRODUCTION LINK PANEL ──────────────── */
const ProductionLinkPanel = ({
  tournament
}) => {
  const tt = useT();
  return <div className={styles.linkPanel}>
    <h2 className={styles.panelTitle}>{tt("ui.production.streaming.f4e0", "Production & Streaming")}</h2>
    <p className={styles.panelSub}>
      {tt("ui.broadcast.tooling.still.being.17f8", "Broadcast tooling is still being built - these panels are UI previews and are not wired to a\n      live stream yet.")}
    </p>
    <div className={styles.linkGrid}>
      <span className={styles.linkCard} aria-disabled="true" title={tt("ui.production.not.available.yet.c87f", "Production is not available yet")} style={{
        opacity: 0.45,
        cursor: 'default'
      }}>
        <LuRadio className={styles.linkIcon} />
        <div>
          <p className={styles.linkTitle}>{tt("ui.production.panel.ccb3", "Production Panel")}</p>
          <p className={styles.linkSub}>{tt("ui.match.selector.score.input.9ed2", "Match selector, score input and scoreboard preview.")}</p>
        </div>
        <LuArrowRight className={styles.linkArrow} />
      </span>

      <span className={styles.linkCard} aria-disabled="true" title={tt("ui.production.not.available.yet.c87f", "Production is not available yet")} style={{
        opacity: 0.45,
        cursor: 'default'
      }}>
        <LuExternalLink className={styles.linkIcon} />
        <div>
          <p className={styles.linkTitle}>{tt("ui.obs.overlay.url.9faf", "OBS Overlay URL")}</p>
          <p className={styles.linkSub}>{tt("ui.transparent.overlay.streaming.software.6bba", "Transparent overlay for streaming software.")}</p>
        </div>
        <LuArrowRight className={styles.linkArrow} />
      </span>

      <span className={styles.linkCard} aria-disabled="true" title={tt("ui.production.not.available.yet.c87f", "Production is not available yet")} style={{
        opacity: 0.45,
        cursor: 'default'
      }}>
        <LuPencil className={styles.linkIcon} />
        <div>
          <p className={styles.linkTitle}>{tt("ui.v.ent.production.hub.865e", "V-ENT Production Hub")}</p>
          <p className={styles.linkSub}>{tt("ui.scene.overlay.configuration.2c49", "Scene and overlay configuration.")}</p>
        </div>
        <LuArrowRight className={styles.linkArrow} />
      </span>
    </div>
  </div>;
};
const Manage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <ManageContent />
  </Suspense>;
export default Manage;