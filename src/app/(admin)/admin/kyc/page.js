'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAdminAuth } from '@/components/admin/useAdminAuth'
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast'
import shared from '@/components/admin/admin.module.css'
import styles from './kyc.module.css'

const REJECT_REASONS = [
  'Document unclear or unreadable',
  'Name mismatch',
  'Expired document',
  'Document not acceptable',
  'Suspected fraud',
]

const TABS = [
  { key: 'pending',     label: 'Pending' },
  { key: 'approved',    label: 'Approved' },
  { key: 'rejected',    label: 'Rejected' },
  { key: '',            label: 'All' },
]

function statusBadgeClass(s) {
  if (s === 'approved') return shared.sApproved
  if (s === 'rejected') return shared.sRejected
  return shared.sKyc
}

function KycInner() {
  const { admin, loading: authLoading, logout } = useAdminAuth()
  const toast = useAdminToast()
  const [submissions, setSubmissions] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [previewModal, setPreviewModal] = useState(null) // { kyc, mode: 'view' | 'reject' }
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0])
  const [rejectNotes, setRejectNotes] = useState('')
  // Identity documents are not public files: the endpoint wants a Bearer token,
  // which an <img src> cannot send. Fetch the bytes, render an object URL, and
  // revoke it when the modal closes so the image does not linger in memory.
  const [docBlobUrl, setDocBlobUrl] = useState(null)
  const [docError, setDocError] = useState('')

  useEffect(() => {
    const url = previewModal?.mode === 'view' ? previewModal?.kyc?.doc_url : null
    if (!url) {
      setDocBlobUrl(null)
      setDocError('')
      return undefined
    }

    let objectUrl = null
    let cancelled = false
    setDocError('')
    ;(async () => {
      try {
        const token = localStorage.getItem('adminToken')
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error(`Document fetch failed (${res.status})`)
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setDocBlobUrl(objectUrl)
      } catch (err) {
        if (!cancelled) setDocError('Could not load this document.')
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setDocBlobUrl(null)
    }
  }, [previewModal])

  const fetchKyc = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page_size: 50 })
      if (activeTab) params.set('status', activeTab)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/kyc/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.status === 'success') {
        let list = data.data?.results || []
        if (search) {
          const q = search.toLowerCase()
          list = list.filter((k) =>
            (k.username || '').toLowerCase().includes(q) ||
            (k.email || '').toLowerCase().includes(q)
          )
        }
        setSubmissions(list)
      } else setError(data.message || 'Failed to load.')
    } catch { setError('Connection error.') }
    setDataLoading(false)
  }, [activeTab, search])

  useEffect(() => {
    if (!authLoading && admin) fetchKyc()
  }, [authLoading, admin, fetchKyc])

  async function approveKyc(id) {
    const token = localStorage.getItem('adminToken')
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/kyc/${id}/approve/`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push('KYC approved.', 'success')
        setPreviewModal(null)
        fetchKyc()
      } else toast.push(data.message || 'Failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setActionLoading((p) => ({ ...p, [id]: false }))
  }

  async function rejectKyc(id, reason, notes) {
    const token = localStorage.getItem('adminToken')
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/kyc/${id}/reject/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, notes }),
        }
      )
      const data = await res.json()
      if (data.status === 'success') {
        toast.push(`KYC rejected - ${reason}.`, 'success')
        setPreviewModal(null)
        setRejectNotes('')
        fetchKyc()
      } else toast.push(data.message || 'Failed.', 'error')
    } catch { toast.push('Connection error.', 'error') }
    setActionLoading((p) => ({ ...p, [id]: false }))
  }

  if (authLoading) return null

  const pendingCount = submissions.filter((k) => k.status === 'pending').length

  return (
    <div className={shared.pageContainer}>
      <div
        className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{ kyc: pendingCount }} />
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
              <h1 className={shared.pageTitle}>KYC Review</h1>
              <p className={shared.pageSubtitle}>Verify user identity documents.</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.key || 'all'}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dataLoading ? (
            <p className={shared.stateText}>Loading…</p>
          ) : submissions.length === 0 ? (
            <p className={shared.stateText}>No KYC submissions found.</p>
          ) : (
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th className={shared.hideMobile}>Submitted</th>
                    <th>Doc Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <div className={shared.userCell}>
                          <div className={shared.userAvatar}>
                            {(k.username || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className={styles.kycUser}>{k.username}</p>
                            <p className={styles.kycEmail}>{k.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={shared.hideMobile}>
                        {k.submitted_at ? new Date(k.submitted_at).toLocaleDateString() : '-'}
                      </td>
                      <td>{(k.doc_type || 'national_id').replace('_', ' ')}</td>
                      <td>
                        <span className={`${shared.badge} ${statusBadgeClass(k.status)}`}>
                          {k.status}
                        </span>
                      </td>
                      <td>
                        <div className={shared.actGroup}>
                          <button
                            className={`${shared.actBtn} ${shared.actView}`}
                            onClick={() => setPreviewModal({ kyc: k, mode: 'view' })}
                          >
                            View Docs
                          </button>
                          {k.status === 'pending' && (
                            <>
                              <button
                                className={`${shared.actBtn} ${shared.actApprove}`}
                                onClick={() => approveKyc(k.id)}
                                disabled={!!actionLoading[k.id]}
                              >
                                {actionLoading[k.id] ? '…' : 'Approve'}
                              </button>
                              <button
                                className={`${shared.actBtn} ${shared.actReject}`}
                                onClick={() => {
                                  setRejectReason(REJECT_REASONS[0])
                                  setRejectNotes('')
                                  setPreviewModal({ kyc: k, mode: 'reject' })
                                }}
                                disabled={!!actionLoading[k.id]}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* KYC preview / reject modal */}
      {previewModal && (
        <div className={styles.modalOverlay} onClick={() => setPreviewModal(null)}>
          <div
            className={`${styles.modal} ${previewModal.mode === 'reject' ? styles.modalNarrow : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalTitle}>
                  {previewModal.mode === 'reject' ? 'Reject KYC Submission' : 'KYC Documents'}
                </p>
                <p className={styles.modalSub}>
                  {previewModal.kyc.username} · {(previewModal.kyc.doc_type || '').replace('_', ' ')}
                </p>
              </div>
              <button className={styles.modalClose} onClick={() => setPreviewModal(null)}>×</button>
            </div>

            {previewModal.mode === 'view' && (
              <>
                <div className={styles.docGrid}>
                  <div className={styles.docCol}>
                    <p className={styles.docLabel}>Front of document</p>
                    {docError ? (
                      <p className={styles.docLabel}>{docError}</p>
                    ) : docBlobUrl ? (
                      <img
                        src={docBlobUrl}
                        alt="Document front"
                        className={styles.docImage}
                      />
                    ) : (
                      <p className={styles.docLabel}>Loading document...</p>
                    )}
                  </div>
                  {previewModal.kyc.doc_back_url && (
                    <div className={styles.docCol}>
                      <p className={styles.docLabel}>Back of document</p>
                      <img
                        src={previewModal.kyc.doc_back_url}
                        alt="Document back"
                        className={styles.docImage}
                      />
                    </div>
                  )}
                  {previewModal.kyc.selfie_url && (
                    <div className={styles.docCol}>
                      <p className={styles.docLabel}>Selfie verification</p>
                      <img
                        src={previewModal.kyc.selfie_url}
                        alt="Selfie"
                        className={styles.docImage}
                      />
                    </div>
                  )}
                </div>
                {previewModal.kyc.status === 'pending' && (
                  <div className={styles.modalBtns}>
                    <button
                      className={`${shared.actBtn} ${shared.actReject}`}
                      onClick={() => {
                        setRejectReason(REJECT_REASONS[0])
                        setRejectNotes('')
                        setPreviewModal({ kyc: previewModal.kyc, mode: 'reject' })
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className={`${shared.actBtn} ${shared.actApprove}`}
                      onClick={() => approveKyc(previewModal.kyc.id)}
                      disabled={!!actionLoading[previewModal.kyc.id]}
                    >
                      {actionLoading[previewModal.kyc.id] ? '…' : 'Approve'}
                    </button>
                  </div>
                )}
                {previewModal.kyc.status === 'rejected' && previewModal.kyc.rejection_reason && (
                  <div className={styles.rejectionInfo}>
                    Rejected: {previewModal.kyc.rejection_reason}
                  </div>
                )}
              </>
            )}

            {previewModal.mode === 'reject' && (
              <>
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Reason</label>
                  <select
                    className={styles.formInput}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  >
                    {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Additional notes (optional)</label>
                  <textarea
                    className={styles.formInput}
                    rows={3}
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Optional notes for the user…"
                  />
                </div>
                <div className={styles.modalBtns}>
                  <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setPreviewModal(null)}>
                    Cancel
                  </button>
                  <button
                    className={`${shared.actBtn} ${shared.actReject}`}
                    onClick={() => rejectKyc(previewModal.kyc.id, rejectReason, rejectNotes)}
                    disabled={!!actionLoading[previewModal.kyc.id]}
                  >
                    {actionLoading[previewModal.kyc.id] ? '…' : 'Confirm Reject'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminKycPage() {
  return (
    <AdminToastProvider>
      <KycInner />
    </AdminToastProvider>
  )
}
