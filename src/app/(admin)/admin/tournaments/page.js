'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './tournaments.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const PAGE_SIZE = 20;
function statusBadgeClass(s) {
  if (s === 'active') return shared.sActive;
  if (s === 'ongoing') return shared.sOngoing;
  if (s === 'draft') return shared.sDraft;
  if (s === 'cancelled') return shared.sCancelled;
  if (s === 'completed') return shared.sApproved;
  return shared.sDraft;
}
function TournamentsInner() {
  const tx = useTx();
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const mayEdit = !!admin?.permissions?.cancel_tournament;
  const [tournaments, setTournaments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [disqTarget, setDisqTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const fetchTournaments = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    setDataLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page,
        page_size: PAGE_SIZE,
        ordering: sortBy
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/tournaments/?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTournaments(data.data?.results || []);
        setTotal(data.data?.count ?? (data.data?.results || []).length);
      } else {
        setError(apiMessage(tt, data, "api.failedToLoadTournaments", "Failed to load tournaments."));
      }
    } catch {
      setError(tt("msg.connectionError", "Connection error."));
    } finally {
      setDataLoading(false);
    }
  }, [page, search, statusFilter, sortBy]);
  useEffect(() => {
    if (!authLoading && admin) fetchTournaments();
  }, [authLoading, admin, fetchTournaments]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);
  async function cancelTournament(id) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: true
    }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/tournaments/${id}/cancel/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt("msg.tournamentCancelled", "Tournament cancelled."), 'success');
        setCancelTarget(null);
        fetchTournaments();
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: false
    }));
  }
  async function saveTournament(id, payload) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: true
    }));
    try {
      // The organiser's own endpoint. An admin who is not the owner is allowed
      // through by the server's permission check, and the edit is written to
      // the audit log so the organiser can find out who changed their tournament.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/edit-tournament/${id}/`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt("admin.tournamentSaved", "Tournament updated."), 'success');
        setEditTarget(null);
        fetchTournaments();
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: false
    }));
  }
  async function overrideScore(id, payload) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: true
    }));
    try {
      // Score override is keyed on the MATCH id, not the tournament id.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/matches/${payload.match_id}/score/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score_p1: payload.score_p1,
          score_p2: payload.score_p2,
          winner_registration_id: payload.winner_registration_id,
          reason: payload.reason
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt('admin.scoreOverridden', 'Score corrected for match {n}.').replace('{n}', payload.match_id), 'success');
        setOverrideTarget(null);
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: false
    }));
  }
  async function disqualifyTeam(id, teamName) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: true
    }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/tournaments/${id}/disqualify/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team_name: teamName
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt('admin.disqualified', '{name} disqualified.').replace('{name}', teamName), 'success');
        setDisqTarget(null);
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: false
    }));
  }
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt("ui.tournaments.fee2", "Tournaments")}</h1>
              <p className={shared.pageSubtitle}>{tt("ui.oversee.all.platform.tournaments.a1c4", "Oversee all platform tournaments.")}</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <div className={shared.filtersRow}>
              <select className={shared.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">{tt("ui.all.statuses.9cb2", "All Statuses")}</option>
                <option value="active">{tt("ui.active.a733", "Active")}</option>
                <option value="ongoing">{tt("ui.ongoing.2e02", "Ongoing")}</option>
                <option value="draft">{tt("ui.draft.23d3", "Draft")}</option>
                <option value="cancelled">{tt("ui.cancelled.a1bf", "Cancelled")}</option>
                <option value="completed">{tt("ui.completed.1798", "Completed")}</option>
              </select>
              <select className={shared.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="-created_at">{tt("ui.newest.first.a40b", "Newest First")}</option>
                <option value="created_at">{tt("ui.oldest.first.06dc", "Oldest First")}</option>
                <option value="name">{tt("ui.name.z.257c", "Name A-Z")}</option>
                <option value="-prize_pool">{tt("ui.prize.high.low.7215", "Prize (High-Low)")}</option>
                <option value="-participants_count">{tt("ui.participants.high.low.d433", "Participants (High-Low)")}</option>
              </select>
              <span className={shared.resultsCount}>{(total === 1 ? tt('admin.countTournamentsOne', '{n} tournament') : tt('admin.countTournamentsMany', '{n} tournaments')).replace('{n}', total.toLocaleString())}</span>
            </div>

            {dataLoading ? <p className={shared.stateText}>{tt("ui.loading.33ce", "Loading…")}</p> : tournaments.length === 0 ? <p className={shared.stateText}>{tt("ui.no.tournaments.found.6976", "No tournaments found.")}</p> : <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>{tt("ui.tournament.a2c1", "Tournament")}</th>
                      <th className={shared.hideMobile}>{tt("ui.organizer.debd", "Organizer")}</th>
                      <th>{tt("ui.status.bae7", "Status")}</th>
                      <th className={shared.hideMobile}>{tt("ui.participants.cd56", "Participants")}</th>
                      <th className={shared.hideMobile}>{tt("ui.prize.pool.548a", "Prize Pool")}</th>
                      <th className={shared.hideMobile}>{tt("ui.created.accf", "Created")}</th>
                      <th>{tt("ui.actions.c3cd", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map(t => <tr key={t.id}>
                        <td>
                          <div>
                            <p className={styles.tName}>{t.name || t.title}</p>
                            <p className={styles.tGame}>{t.game || '-'}</p>
                          </div>
                        </td>
                        <td className={shared.hideMobile}>{t.organizer_username || '-'}</td>
                        <td>
                          <span className={`${shared.badge} ${statusBadgeClass(t.status)}`}>
                            {t.status || 'draft'}
                          </span>
                        </td>
                        <td className={shared.hideMobile}>{t.participants_count || 0}</td>
                        <td className={shared.hideMobile}>
                          {t.prize_pool ? `${Number(t.prize_pool).toLocaleString()} VC` : '-'}
                        </td>
                        <td className={shared.hideMobile}>
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <div className={shared.actGroup}>
                            {mayEdit && <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setEditTarget(t)} disabled={!!actionLoading[t.id]} title={tt("admin.editAsAdmin", "Edit this tournament as an admin. The organiser is told it changed.")}>
                              {tt("admin.editTournament", "Edit")}
                            </button>}
                            <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setOverrideTarget(t)} disabled={!!actionLoading[t.id]} title={tt("ui.override.match.score.b227", "Override match score")}>
                              {tt("ui.score.489f", "Score")}
                            </button>
                            <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setDisqTarget(t)} disabled={!!actionLoading[t.id]} title={tt("ui.disqualify.team.b320", "Disqualify team")}>
                              DQ
                            </button>
                            {t.status !== 'cancelled' && t.status !== 'completed' && <button className={`${shared.actBtn} ${shared.actReject}`} onClick={() => setCancelTarget(t)} disabled={!!actionLoading[t.id]}>
                                {tt("ui.cancel.77df", "Cancel")}
                              </button>}
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}

            {totalPages > 1 && <div className={shared.pagination}>
                <span className={shared.paginationInfo}>{tt("ui.page.fb06", "Page")} {page} of {totalPages}</span>
                <div className={shared.paginationBtns}>
                  <button className={shared.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({
                length: Math.min(5, totalPages)
              }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return <button key={p} className={`${shared.pageBtn} ${p === page ? shared.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
                  <button className={shared.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              </div>}
          </div>
        </main>
      </div>

      {/* Cancel modal */}
      {cancelTarget && <div className={styles.modalOverlay} onClick={() => setCancelTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>{tt("ui.cancel.tournament.0324", "Cancel Tournament?")}</p>
            <p className={styles.modalSub}>
              &ldquo;{cancelTarget.name}{tt("ui.will.be.cancelled.participants.e2ae", "” will be cancelled and participants notified. This cannot be undone.")}
            </p>
            <div className={styles.modalBtns}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setCancelTarget(null)}>{tt("ui.back.b52b", "Back")}</button>
              <button className={`${shared.actBtn} ${shared.actReject}`} onClick={() => cancelTournament(cancelTarget.id)} disabled={!!actionLoading[cancelTarget.id]}>
                {actionLoading[cancelTarget.id] ? tx("Cancelling…") : tx("Confirm Cancel")}
              </button>
            </div>
          </div>
        </div>}

      {/* Override score modal */}
      {overrideTarget && <OverrideScoreModal tournament={overrideTarget} onCancel={() => setOverrideTarget(null)} onSubmit={payload => overrideScore(overrideTarget.id, payload)} loading={!!actionLoading[overrideTarget.id]} />}

      {editTarget && <EditTournamentModal tournament={editTarget} onCancel={() => setEditTarget(null)} onSubmit={payload => saveTournament(editTarget.id, payload)} loading={!!actionLoading[editTarget.id]} />}

      {/* Disqualify modal */}
      {disqTarget && <DisqualifyModal tournament={disqTarget} onCancel={() => setDisqTarget(null)} onSubmit={team => disqualifyTeam(disqTarget.id, team)} loading={!!actionLoading[disqTarget.id]} />}
    </div>;
}
/** Correct somebody else's tournament from the console.

 *  Loads the record first and shows what is actually stored, rather than an
 *  empty form: an admin correcting a start time needs to see the wrong one. If
 *  the load fails the fields stay disabled, because a blank form submitted over
 *  a real tournament erases it.
 */
function EditTournamentModal({
  tournament,
  onCancel,
  onSubmit,
  loading
}) {
  const tt = useT();
  const [form, setForm] = useState(null);
  // What the server gave us, kept so submit can send the difference.
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('adminToken');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/view-tournament/${tournament.id}/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.status !== 'success' || !data.data) {
          setLoadError(true);
          return;
        }
        const t = data.data.tournament || data.data;
        const at = v => v ? String(v).slice(0, 16) : '';
        const initial = {
          tournament_title: t.tournament_title || t.name || '',
          tournament_description: t.tournament_description || '',
          tournament_rules: t.tournament_rules || '',
          tournament_location: t.tournament_location || '',
          tournament_visibility: t.tournament_visibility || 'public',
          start_date_and_time: at(t.start_date_and_time),
          end_date_and_time: at(t.end_date_and_time)
        };
        setForm(initial);
        setLoaded(initial);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournament.id]);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const submit = () => {
    // Only what actually differs from what was loaded. Sending every non-empty
    // field saved the right values, but the audit entry then listed four fields
    // for a one-word correction, and an audit log that overstates what an admin
    // touched cannot answer the question it exists for.
    const payload = {};
    Object.keys(form || {}).forEach(k => {
      const now = form[k];
      if (now === '' || now == null) return;
      if (loaded && now === loaded[k]) return;
      payload[k] = now;
    });
    onSubmit(payload);
  };
  return <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <p className={styles.modalTitle}>{tt("admin.editTournamentTitle", "Edit tournament")}</p>
        <p className={styles.modalSub}>
          {tt("admin.editTournamentSub", "Organised by {name}. The change is recorded in the audit log.").replace('{name}', tournament.organizer_username || '')}
        </p>

        {loadError ? <p className={styles.modalSub}>
            {tt("admin.editLoadFailed", "This tournament could not be loaded, so the form was left closed rather than risk saving over it.")}
          </p> : !form ? <p className={styles.modalSub}>{tt("ui.loading", "Loading…")}</p> : <>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldTitle", "Title")}</label>
              <input className={styles.formInput} value={form.tournament_title} onChange={e => set('tournament_title', e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldDescription", "Description")}</label>
              <input className={styles.formInput} value={form.tournament_description} onChange={e => set('tournament_description', e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldRules", "Rules")}</label>
              <input className={styles.formInput} value={form.tournament_rules} onChange={e => set('tournament_rules', e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldLocation", "Location")}</label>
              <input className={styles.formInput} value={form.tournament_location} onChange={e => set('tournament_location', e.target.value)} />
            </div>
            <div className={styles.formRow2}>
              <div>
                <label className={styles.formLabel}>{tt("admin.fieldStart", "Starts")}</label>
                <input type="datetime-local" className={styles.formInput} value={form.start_date_and_time} onChange={e => set('start_date_and_time', e.target.value)} />
              </div>
              <div>
                <label className={styles.formLabel}>{tt("admin.fieldEnd", "Ends")}</label>
                <input type="datetime-local" className={styles.formInput} value={form.end_date_and_time} onChange={e => set('end_date_and_time', e.target.value)} />
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldVisibility", "Visibility")}</label>
              <select className={styles.formInput} value={form.tournament_visibility} onChange={e => set('tournament_visibility', e.target.value)}>
                <option value="public">{tt("admin.visibilityPublic", "Public")}</option>
                <option value="private">{tt("admin.visibilityPrivate", "Private")}</option>
              </select>
            </div>
          </>}

        <div className={styles.modalBtns}>
          <button className={`${shared.actBtn}`} onClick={onCancel}>{tt("ui.cancel.77df", "Cancel")}</button>
          <button className={`${shared.actBtn} ${shared.actView}`} onClick={submit} disabled={loading || !form || loadError}>
            {loading ? tt("ui.saving", "Saving…") : tt("ui.save", "Save")}
          </button>
        </div>
      </div>
    </div>;
}
function OverrideScoreModal({
  tournament,
  onCancel,
  onSubmit,
  loading
}) {
  const tx = useTx();
  const tt = useT();
  const [matchId, setMatchId] = useState('');
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);
  const [winnerRegId, setWinnerRegId] = useState('');
  const [reason, setReason] = useState('');
  const canSubmit = matchId.trim() && winnerRegId.trim();
  return <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <p className={styles.modalTitle}>{tt("ui.override.match.score.4b28", "Override Match Score")}</p>
        <p className={styles.modalSub}>
          {tt("ui.tournament.9c45", "For tournament “")}{tournament.name}&rdquo;.
        </p>
        <div className={styles.formRow}>
          <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.match.id.ffcf", "Match ID")} <InfoTip id="adminMatchId" /></span></label>
          <input className={styles.formInput} value={matchId} onChange={e => setMatchId(e.target.value)} placeholder={tt("ui.numeric.match.id.08ad", "Numeric match id")} />
        </div>
        <div className={styles.formRow2}>
          <div>
            <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.score.p.af0f", "Score P1")} <InfoTip id="adminScore" /></span></label>
            <input type="number" className={styles.formInput} value={scoreP1} onChange={e => setScoreP1(parseInt(e.target.value || '0', 10))} />
          </div>
          <div>
            <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.score.p.f3ba", "Score P2")} <InfoTip id="adminScore" /></span></label>
            <input type="number" className={styles.formInput} value={scoreP2} onChange={e => setScoreP2(parseInt(e.target.value || '0', 10))} />
          </div>
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.winner.registration.id.e256", "Winner registration ID")} <InfoTip id="adminWinnerRegId" /></span></label>
          <input className={styles.formInput} value={winnerRegId} onChange={e => setWinnerRegId(e.target.value)} placeholder={tt("ui.registration.id.winning.side.2c12", "Registration id of the winning side")} />
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>{tt("ui.reason.f219", "Reason")}</label>
          <textarea className={styles.formInput} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder={tt("ui.reason.override.logged.audit.eaa9", "Reason for the override (logged in audit)")} />
        </div>
        <div className={styles.modalBtns}>
          <button className={`${shared.actBtn} ${shared.actView}`} onClick={onCancel}>{tt("ui.cancel.77df", "Cancel")}</button>
          <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={() => onSubmit({
          match_id: matchId,
          score_p1: scoreP1,
          score_p2: scoreP2,
          winner_registration_id: winnerRegId,
          reason
        })} disabled={loading || !canSubmit}>
            {loading ? tx("Saving…") : tx("Apply Override")}
          </button>
        </div>
      </div>
    </div>;
}
function DisqualifyModal({
  tournament,
  onCancel,
  onSubmit,
  loading
}) {
  const tx = useTx();
  const tt = useT();
  const [team, setTeam] = useState('');
  const [reason, setReason] = useState('');
  return <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <p className={styles.modalTitle}>{tt("ui.disqualify.team.9c85", "Disqualify Team")}</p>
        <p className={styles.modalSub}>
          {tt("ui.from.tournament.bd57", "From tournament “")}{tournament.name}&rdquo;.
        </p>
        <div className={styles.formRow}>
          <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.team.name.5d4f", "Team Name")} <InfoTip id="adminDqTeam" /></span></label>
          <input className={styles.formInput} value={team} onChange={e => setTeam(e.target.value)} placeholder={tt("ui.e.g.crimson.wolves.98c1", "e.g. Crimson Wolves")} />
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>{tt("ui.reason.f219", "Reason")}</label>
          <textarea className={styles.formInput} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder={tt("ui.reason.disqualification.2336", "Reason for disqualification")} />
        </div>
        <div className={styles.modalBtns}>
          <button className={`${shared.actBtn} ${shared.actView}`} onClick={onCancel}>{tt("ui.cancel.77df", "Cancel")}</button>
          <button className={`${shared.actBtn} ${shared.actReject}`} onClick={() => team.trim() && onSubmit(team)} disabled={loading || !team.trim()}>
            {loading ? tx("Submitting…") : tt('admin.disqualify', 'Disqualify')}
          </button>
        </div>
      </div>
    </div>;
}
export default function AdminTournamentsPage() {
  return <AdminToastProvider>
      <TournamentsInner />
    </AdminToastProvider>;
}