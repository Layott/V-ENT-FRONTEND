'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback, useRef } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './partners.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// The partner queue. Approving is not one button: an admin ticks exactly which
// scopes a partner gets, and SSO is a second decision on top, because a partner
// signing V-ENT members in on their own site is handling identities rather than
// reading a fixture list.

// The API's status values are its own vocabulary, not something to print.
// Everything that shows a partner status goes through here, so there is one
// place to add a status and one place that decides how it reads.
const statusLabel = (tt, value) => {
  const key = String(value || '').toLowerCase();
  const labels = {
    pending: tt('admin.partnerPending', 'Awaiting review'),
    approved: tt('admin.partnerApproved', 'Approved'),
    rejected: tt('admin.partnerRejected', 'Rejected'),
    suspended: tt('admin.partnerSuspended', 'Suspended'),
    none: tt('admin.partnerNotRequested', 'Not requested')
  };
  return labels[key] || value || '-';
};

function statusBadgeClass(s) {
  if (s === 'pending') return shared.sPending;
  if (s === 'approved') return shared.sApproved;
  if (s === 'rejected' || s === 'suspended') return shared.sRejected;
  return shared.sDraft;
}
function PartnersInner() {
  const tx = useTx();
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const [partners, setPartners] = useState([]);
  const [scopes, setScopes] = useState({});
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [draftScopes, setDraftScopes] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [issuedSecret, setIssuedSecret] = useState(null);

  // Each request takes a ticket: filter changes overlap, and the slower answer
  // must not overwrite the newer one.
  const requestRef = useRef(0);
  const fetchPartners = useCallback(async () => {
    const ticket = requestRef.current + 1;
    requestRef.current = ticket;
    const token = localStorage.getItem('adminToken');
    setDataLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/admin/list/?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (requestRef.current !== ticket) return;
      if (data.status === 'success') {
        const rows = data.data?.partners || [];
        setPartners(rows);
        setScopes(data.data?.scopes || {});
        setCounts(data.data?.counts || {});
        // Keep the open drawer in step with what was just reloaded. Without
        // this it goes on showing the partner as it was before the action, and
        // a rotation that genuinely worked looks like it did nothing.
        setOpen((current) => (current ? rows.find((r) => r.id === current.id) || current : current));
      } else {
        setError(apiMessage(tt, data, "api.couldNotLoadPartners", "Could not load partners."));
      }
    } catch {
      if (requestRef.current === ticket) setError(tt("msg.couldNotLoadPartners", "Could not load partners."));
    } finally {
      if (requestRef.current === ticket) setDataLoading(false);
    }
  }, [statusFilter]);
  useEffect(() => {
    if (!authLoading && admin) fetchPartners();
  }, [authLoading, admin, fetchPartners]);
  const openPartner = p => {
    setOpen(p);
    setDraftScopes(p.approved_scopes?.length ? p.approved_scopes : p.requested_scopes || []);
    setNote(p.review_note || '');
    setIssuedSecret(null);
  };
  const post = async (path, body) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return {
      res,
      body: await res.json()
    };
  };
  const [rotated, setRotated] = useState(null);

  // Changing the grant on a partner that is already live. Deliberately a
  // different endpoint from the review, so the approval history is not rewritten
  // every time somebody unticks a scope.
  const saveScopes = async () => {
    setBusy(true);
    const { ok, body } = await post(`/partners/admin/${open.id}/scopes/`, {
      scopes: draftScopes,
      reason: note,
    });
    setBusy(false);
    if (ok) {
      toast.push(tt('admin.partners.scopesSaved', 'Scopes updated.'), 'success');
      await load();
      setOpen(body.data || open);
      return;
    }
    toast.push(apiMessage(tt, body, 'api.failed', 'Failed.'), 'error');
  };

  const rotateKey = async (key) => {
    setBusy(true);
    setRotated(null);
    const { ok, body } = await post(
      `/partners/admin/${open.id}/keys/${key.id}/rotate/`, { reason: note });
    setBusy(false);
    if (ok) {
      setRotated(body.data);
      toast.push(tt('admin.partners.rotated', 'Key rotated.'), 'success');
      await load();
      return;
    }
    toast.push(apiMessage(tt, body, 'api.failed', 'Failed.'), 'error');
  };

  const decide = async decision => {
    setBusy(true);
    try {
      const {
        res,
        body
      } = await post(`/partners/admin/${open.id}/review/`, {
        decision,
        scopes: draftScopes,
        note
      });
      toast[res.ok ? 'success' : 'error'](apiMessage(tt, body, "api.done", "Done."));
      if (res.ok) {
        setOpen(null);
        await fetchPartners();
      }
    } finally {
      setBusy(false);
    }
  };
  const decideSso = async decision => {
    setBusy(true);
    try {
      const {
        res,
        body
      } = await post(`/partners/admin/${open.id}/sso-review/`, {
        decision,
        note
      });
      if (res.ok && body.data?.client_secret) {
        setIssuedSecret({
          id: body.data.client_id,
          secret: body.data.client_secret
        });
      }
      toast[res.ok ? 'success' : 'error'](apiMessage(tt, body, "api.done", "Done."));
      if (res.ok) await fetchPartners();
    } finally {
      setBusy(false);
    }
  };
  const toggleScope = key => {
    setDraftScopes(current => current.includes(key) ? current.filter(s => s !== key) : [...current, key]);
  };
  if (authLoading) return <div className={shared.loadingScreen}>{tt("ui.loading.b04b", "Loading...")}</div>;
  return <div className={shared.adminShell}>
      <AdminNav admin={admin} onLogout={logout} />
      <div className={shared.adminMain}>
        <AdminHeader title={tt("ui.partners.aa16", "Partners")} admin={admin} onLogout={logout} />

        <div className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt("ui.partners.aa16", "Partners")}</h1>
              <p className={shared.pageSubtitle}>
                {tt("admin.partners.subtitle", "Applications, API keys and the scopes each partner may read.")}
              </p>
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{tt("ui.waiting.review.75de", "Waiting on review")}</span>
              <span className={styles.summaryValue}>{counts.pending ?? 0}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{tt("ui.approved.41b8", "Approved")}</span>
              <span className={styles.summaryValue}>{counts.approved ?? 0}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{tt("ui.sso.requested.0608", "SSO requested")}</span>
              <span className={styles.summaryValue}>{counts.sso_requested ?? 0}</span>
            </div>
          </div>

          <div className={styles.filterRow}>
            {['', 'pending', 'approved', 'rejected', 'suspended'].map(s => <button key={s || 'all'} type="button" className={`${styles.filterChip} ${statusFilter === s ? styles.filterChipOn : ''}`} onClick={() => setStatusFilter(s)}>
                {s === '' ? tt('admin.allStatuses', 'All') : statusLabel(tt, s)}
              </button>)}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {dataLoading && <p className={styles.muted}>{tt("ui.loading.partners.fa9b", "Loading partners...")}</p>}
          {!dataLoading && partners.length === 0 && <p className={styles.muted}>{tt("ui.no.partner.applications.yet.15b7", "No partner applications yet.")}</p>}

          {!dataLoading && partners.length > 0 && <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>{tt("ui.partner.9357", "Partner")}</th>
                    <th>{tt("ui.applied.3e3f", "Applied by")}</th>
                    <th>{tt("ui.status.bae7", "Status")}</th>
                    <th>SSO</th>
                    <th>{tt("ui.scopes.c235", "Scopes")}</th>
                    <th>{tt("ui.keys.e565", "Keys")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map(p => <tr key={p.id}>
                      <td>
                        <span className={styles.partnerName}>{p.name}</span>
                        {p.website && <span className={styles.muted}> {p.website}</span>}
                      </td>
                      <td>{p.owner}</td>
                      <td><span className={statusBadgeClass(p.status)}>{statusLabel(tt, p.status)}</span></td>
                      <td>{statusLabel(tt, p.sso_status)}</td>
                      <td>{tt('admin.scopesGranted', '{granted} of {asked}').replace('{granted}', p.approved_scopes?.length || 0).replace('{asked}', p.requested_scopes?.length || 0)}</td>
                      <td>{(p.keys || []).filter(k => !k.revoked_at).length}</td>
                      <td>
                        <button type="button" className={styles.reviewBtn} onClick={() => openPartner(p)}>
                          {tt("ui.review.e29a", "Review")}
                        </button>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>}
        </div>
      </div>

      {open && <div className={styles.drawerBackdrop} onClick={() => setOpen(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <h2 className={styles.drawerTitle}>{open.name}</h2>
            <p className={styles.muted}>
              {open.contact_name} · {open.contact_email}
              {open.website ? ` · ${open.website}` : ''}
            </p>

            {open.intended_use && <>
                <p className={styles.sectionLabel}>{tt("ui.what.they.want.build.22ee", "What they want to build")}</p>
                <p className={styles.body}>{open.intended_use}</p>
              </>}

            <p className={styles.sectionLabel}>{tt("ui.scopes.grant.97c4", "Scopes to grant")}</p>
            <p className={styles.muted}>
              {tt("ui.only.what.ticked.granted.c785", "Only what is ticked is granted. A key can never read past this, and unticking a scope\n              closes it for keys that already exist.")}
            </p>
            <div className={styles.scopeList}>
              {Object.entries(scopes).map(([key, label]) => <label key={key} className={styles.scopeRow}>
                  <input type="checkbox" checked={draftScopes.includes(key)} onChange={() => toggleScope(key)} />
                  <span>
                    <code>{key}</code> {label}
                    {open.requested_scopes?.includes(key) && <span className={styles.askedTag}>{tt("ui.asked.c9be", "asked for")}</span>}
                  </span>
                </label>)}
            </div>

            <p className={styles.sectionLabel}>{tt("ui.note.2c92", "Note")}</p>
            <textarea className={styles.noteInput} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={tt("ui.recorded.partner.sent.decision.b4e5", "Recorded on the partner and sent with the decision email.")} />

            <div className={styles.drawerActions}>
              {open.status !== 'approved' && <button type="button" className={styles.approve} onClick={() => decide('approved')} disabled={busy}>
                  {open.status === 'suspended'
                    ? tt('admin.partners.reinstate', 'Reinstate')
                    : tt('ui.approve.these.scopes.d4e9', 'Approve with these scopes')}
                </button>}

              {/* Changing the grant on a live partner is not a re-approval, and
                  sending it through the review endpoint would rewrite the note,
                  the reviewer and the date - the history somebody later reads. */}
              {open.status === 'approved' && <button type="button" className={styles.approve} onClick={saveScopes} disabled={busy}>
                  {tt('admin.partners.saveScopes', 'Save these scopes')}
                </button>}

              {open.status !== 'rejected' && <button type="button" className={styles.reject} onClick={() => decide('rejected')} disabled={busy}>
                  {tt("ui.reject.2b03", "Reject")}
                </button>}

              {open.status === 'approved' && <button type="button" className={styles.reject} onClick={() => decide('suspended')} disabled={busy}>
                  {tt("ui.suspend.b242", "Suspend")}
                </button>}
            </div>

            {open.status === 'suspended' && <p className={styles.muted}>
                {tt('admin.partners.suspendedNote',
                  'Suspended. Every key was revoked when this happened, so reinstating does not bring them back - the partner issues a new one, or you rotate one for them.')}
              </p>}

            {/* -------------------------------------------------------- keys */}
            <div className={styles.keysBlock}>
              <p className={styles.sectionLabel}>{tt('admin.partners.keys', 'API keys')}</p>
              {(open.keys || []).filter(k => !k.revoked_at).length === 0
                ? <p className={styles.muted}>{tt('admin.partners.noKeys', 'No live keys.')}</p>
                : (open.keys || []).filter(k => !k.revoked_at).map(k => <div key={k.id} className={styles.keyRow}>
                      <span className={styles.keyName}>{k.name}</span>
                      <code className={styles.keyId}>{k.key_id}</code>
                      <span className={styles.muted}>
                        {(k.scopes || []).length} {tt('admin.partners.scopesShort', 'scopes')}
                      </span>
                      <button type="button" className={styles.ghost} onClick={() => rotateKey(k)} disabled={busy}>
                        {tt('admin.partners.rotate', 'Rotate')}
                      </button>
                    </div>)}
              <p className={styles.muted}>
                {tt('admin.partners.rotateNote',
                  'Rotating revokes the old key and issues a replacement in the same breath, so there is never a moment with two live keys or with none. The new secret is shown once.')}
              </p>
            </div>

            {rotated && <div className={styles.secretBox}>
                <p className={styles.secretLabel}>
                  {tt('admin.partners.rotatedLabel', 'Send this to the partner. The secret is shown once.')}
                </p>
                <code className={styles.secret}>{rotated.key.key_id}</code>
                <code className={styles.secret}>{rotated.secret}</code>
              </div>}

            <div className={styles.ssoBlock}>
              <p className={styles.sectionLabel}>{tt("ui.sign.v.ent.fc3b", "Sign in with V-ENT")}</p>
              <p className={styles.muted}>
                {tt("ui.status.11dc", "Status:")} {statusLabel(tt, open.sso_status)}.{' '}
                {open.sso_status === 'requested' ? tx("This partner wants to sign V-ENT members in on their own site.") : tx("A partner must request this before it can be approved.")}
              </p>
              <dl className={styles.metaGrid}>
                <div><dt>{tt("ui.legal.name.15cd", "Legal name")}</dt><dd>{open.legal_name || tx("Not given")}</dd></div>
                <div><dt>{tt("ui.registration.b233", "Registration")}</dt><dd>{open.registration_number || tx("Not given")}</dd></div>
                <div><dt>{tt("ui.privacy.policy.7cea", "Privacy policy")}</dt><dd>{open.privacy_policy_url || tx("Not given")}</dd></div>
                <div><dt>{tt("ui.data.contact.84ae", "Data contact")}</dt><dd>{open.data_protection_contact || tx("Not given")}</dd></div>
                <div><dt>{tt("ui.redirect.addresses.cc32", "Redirect addresses")}</dt><dd>{(open.redirect_uris || []).join(', ') || tt('admin.none', 'None')}</dd></div>
              </dl>

              {issuedSecret && <div className={styles.secretBox}>
                  <p className={styles.secretLabel}>{tt("ui.send.these.partner.secret.858f", "Send these to the partner. The secret is shown once.")}</p>
                  <code className={styles.secret}>{tt("ui.client.id.1414", "client_id:")} {issuedSecret.id}</code>
                  <code className={styles.secret}>{tt("ui.client.secret.84ce", "client_secret:")} {issuedSecret.secret}</code>
                </div>}

              <div className={styles.drawerActions}>
                <button type="button" className={styles.approve} onClick={() => decideSso('approved')} disabled={busy}>
                  {tt("ui.approve.sso.830f", "Approve SSO")}
                </button>
                <button type="button" className={styles.reject} onClick={() => decideSso('rejected')} disabled={busy}>
                  {tt("ui.refuse.sso.4a82", "Refuse SSO")}
                </button>
              </div>
            </div>

            <button type="button" className={styles.closeBtn} onClick={() => setOpen(null)}>{tt("ui.close.bbfa", "Close")}</button>
          </div>
        </div>}
    </div>;
}
export default function AdminPartnersPage() {
  return <AdminToastProvider>
      <PartnersInner />
    </AdminToastProvider>;
}