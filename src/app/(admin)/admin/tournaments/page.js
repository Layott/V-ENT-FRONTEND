'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './tournaments.module.css'

const PAGE_SIZE = 20

function statusBadgeClass(s) {
  if (s === 'active')    return shared.sActive
  if (s === 'ongoing')   return shared.sOngoing
  if (s === 'draft')     return shared.sDraft
  if (s === 'cancelled') return shared.sCancelled
  if (s === 'completed') return shared.sApproved
  return shared.sDraft
}

function TournamentsInner() {
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [tournaments, setTournaments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('-created_at')
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [overrideTarget, setOverrideTarget] = useState(null)
  const [disqTarget, setDisqTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  const fetchTournaments = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE, ordering: sortBy })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/tournaments/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.status === 'success') {
        setTournaments(data.data?.results || [])
        setTotal(data.data?.count ?? (data.data?.results || []).length)
      } else {
        setError(data.message || 'Failed to load tournaments.')
      }
    } catch {
      setError('Connection error.')
    } finally {
      setDataLoading(false)
    }
  }, [page, search, statusFilter, sortBy])

  useEffect(() => {
    if (!authLoading && admin) fetchTournaments()
  }, [authLoading, admin, fetchTournaments])

  useEffect(() => { setPage(1) }, [search, statusFilter, sortBy])

  async function cancelTournament(id) {
    const token = localStorage.getItem('adminToken')
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/tournaments/${id}/cancel/`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push('Tournament cancelled.', 'success')
        setCancelTarget(null)
        fetchTournaments()
      } else toast.push(data.message || 'Failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setActionLoading((p) => ({ ...p, [id]: false }))
  }

  async function overrideScore(id, payload) {
    const token = localStorage.getItem('adminToken')
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      // Score override is keyed on the MATCH id, not the tournament id.
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/matches/${payload.match_id}/score/`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score_p1: payload.score_p1,
            score_p2: payload.score_p2,
            winner_registration_id: payload.winner_registration_id,
            reason: payload.reason,
          }),
        }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`Score overridden for Match ${payload.match_id}.`, 'success')
        setOverrideTarget(null)
      } else toast.push(data.message || 'Failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setActionLoading((p) => ({ ...p, [id]: false }))
  }

  async function disqualifyTeam(id, teamName) {
    const token = localStorage.getItem('adminToken')
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/tournaments/${id}/disqualify/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_name: teamName }),
        }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`${teamName} disqualified.`, 'success')
        setDisqTarget(null)
      } else toast.push(data.message || 'Failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setActionLoading((p) => ({ ...p, [id]: false }))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  if (authLoading) return null

  return (
    <div className={shared.pageContainer}>
      <div
        className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader
          admin={admin}
          onLogout={logout}
          onMenuOpen={() => setSidebarOpen(true)}
          searchValue={search}
          onSearch={setSearch}
        />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>Tournaments</h1>
              <p className={shared.pageSubtitle}>Oversee all platform tournaments.</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <div className={shared.filtersRow}>
              <select
                className={shared.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="ongoing">Ongoing</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
              <select
                className={shared.filterSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="-prize_pool">Prize (High-Low)</option>
                <option value="-participants_count">Participants (High-Low)</option>
              </select>
              <span className={shared.resultsCount}>{total.toLocaleString()} {total === 1 ? 'tournament' : 'tournaments'}</span>
            </div>

            {dataLoading ? (
              <p className={shared.stateText}>Loading…</p>
            ) : tournaments.length === 0 ? (
              <p className={shared.stateText}>No tournaments found.</p>
            ) : (
              <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Tournament</th>
                      <th className={shared.hideMobile}>Organizer</th>
                      <th>Status</th>
                      <th className={shared.hideMobile}>Participants</th>
                      <th className={shared.hideMobile}>Prize Pool</th>
                      <th className={shared.hideMobile}>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map((t) => (
                      <tr key={t.id}>
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
                            <button
                              className={`${shared.actBtn} ${shared.actView}`}
                              onClick={() => setOverrideTarget(t)}
                              disabled={!!actionLoading[t.id]}
                              title="Override match score"
                            >
                              Score
                            </button>
                            <button
                              className={`${shared.actBtn} ${shared.actView}`}
                              onClick={() => setDisqTarget(t)}
                              disabled={!!actionLoading[t.id]}
                              title="Disqualify team"
                            >
                              DQ
                            </button>
                            {t.status !== 'cancelled' && t.status !== 'completed' && (
                              <button
                                className={`${shared.actBtn} ${shared.actReject}`}
                                onClick={() => setCancelTarget(t)}
                                disabled={!!actionLoading[t.id]}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className={shared.pagination}>
                <span className={shared.paginationInfo}>Page {page} of {totalPages}</span>
                <div className={shared.paginationBtns}>
                  <button className={shared.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return (
                      <button key={p} className={`${shared.pageBtn} ${p === page ? shared.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
                    )
                  })}
                  <button className={shared.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <div className={styles.modalOverlay} onClick={() => setCancelTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>Cancel Tournament?</p>
            <p className={styles.modalSub}>
              &ldquo;{cancelTarget.name}&rdquo; will be cancelled and participants notified. This cannot be undone.
            </p>
            <div className={styles.modalBtns}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setCancelTarget(null)}>Back</button>
              <button
                className={`${shared.actBtn} ${shared.actReject}`}
                onClick={() => cancelTournament(cancelTarget.id)}
                disabled={!!actionLoading[cancelTarget.id]}
              >
                {actionLoading[cancelTarget.id] ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override score modal */}
      {overrideTarget && (
        <OverrideScoreModal
          tournament={overrideTarget}
          onCancel={() => setOverrideTarget(null)}
          onSubmit={(payload) => overrideScore(overrideTarget.id, payload)}
          loading={!!actionLoading[overrideTarget.id]}
        />
      )}

      {/* Disqualify modal */}
      {disqTarget && (
        <DisqualifyModal
          tournament={disqTarget}
          onCancel={() => setDisqTarget(null)}
          onSubmit={(team) => disqualifyTeam(disqTarget.id, team)}
          loading={!!actionLoading[disqTarget.id]}
        />
      )}
    </div>
  )
}

function OverrideScoreModal({ tournament, onCancel, onSubmit, loading }) {
  const [matchId, setMatchId] = useState('')
  const [scoreP1, setScoreP1] = useState(0)
  const [scoreP2, setScoreP2] = useState(0)
  const [winnerRegId, setWinnerRegId] = useState('')
  const [reason, setReason] = useState('')

  const canSubmit = matchId.trim() && winnerRegId.trim()

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.modalTitle}>Override Match Score</p>
        <p className={styles.modalSub}>
          For tournament &ldquo;{tournament.name}&rdquo;.
        </p>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Match ID</label>
          <input
            className={styles.formInput}
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            placeholder="Numeric match id"
          />
        </div>
        <div className={styles.formRow2}>
          <div>
            <label className={styles.formLabel}>Score P1</label>
            <input
              type="number"
              className={styles.formInput}
              value={scoreP1}
              onChange={(e) => setScoreP1(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div>
            <label className={styles.formLabel}>Score P2</label>
            <input
              type="number"
              className={styles.formInput}
              value={scoreP2}
              onChange={(e) => setScoreP2(parseInt(e.target.value || '0', 10))}
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Winner registration ID</label>
          <input
            className={styles.formInput}
            value={winnerRegId}
            onChange={(e) => setWinnerRegId(e.target.value)}
            placeholder="Registration id of the winning side"
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Reason</label>
          <textarea
            className={styles.formInput}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for the override (logged in audit)"
          />
        </div>
        <div className={styles.modalBtns}>
          <button className={`${shared.actBtn} ${shared.actView}`} onClick={onCancel}>Cancel</button>
          <button
            className={`${shared.actBtn} ${shared.actApprove}`}
            onClick={() => onSubmit({
              match_id: matchId,
              score_p1: scoreP1,
              score_p2: scoreP2,
              winner_registration_id: winnerRegId,
              reason,
            })}
            disabled={loading || !canSubmit}
          >
            {loading ? 'Saving…' : 'Apply Override'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DisqualifyModal({ tournament, onCancel, onSubmit, loading }) {
  const [team, setTeam] = useState('')
  const [reason, setReason] = useState('')
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.modalTitle}>Disqualify Team</p>
        <p className={styles.modalSub}>
          From tournament &ldquo;{tournament.name}&rdquo;.
        </p>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Team Name</label>
          <input
            className={styles.formInput}
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="e.g. Crimson Wolves"
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Reason</label>
          <textarea
            className={styles.formInput}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for disqualification"
          />
        </div>
        <div className={styles.modalBtns}>
          <button className={`${shared.actBtn} ${shared.actView}`} onClick={onCancel}>Cancel</button>
          <button
            className={`${shared.actBtn} ${shared.actReject}`}
            onClick={() => team.trim() && onSubmit(team)}
            disabled={loading || !team.trim()}
          >
            {loading ? 'Submitting…' : 'Disqualify'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTournamentsPage() {
  return (
    <AdminToastProvider>
      <TournamentsInner />
    </AdminToastProvider>
  )
}
