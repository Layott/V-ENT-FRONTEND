'use client';

// One record, all of it (inbox 420): every field, every record linked to it,
// every change made to it here, and what may be done to it.
//
// Drawn from the field descriptions the server sends, so this screen knows
// nothing about any one model. Secret columns arrive as "hidden" and stay that
// way. Money records are view only: a correction is a new entry with a reason,
// made through the same transfer as every other movement of coins. A delete
// goes to the bin for 90 days and can be restored. Every change keeps the old
// value and can be undone.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import DateField from '@/components/date-field/DateField';
import NamePicker from '@/components/name-picker/NamePicker';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { adminToken } from '@/lib/adminToken';
import { formatDateTime, formatNumber, isoToLocalInput, localInputToISO } from '@/lib/datetime';
import { editStart, kindHref, readable, recordHref, recordsCall } from '@/lib/adminRecords';
import styles from '../../records.module.css';

function Value({ field, tt }) {
  const text = readable(field, tt);
  if (text === null) return <span className={styles.empty}>{tt('adminRecords.emptyValue', 'Empty')}</span>;
  if (field.hidden) return <span className={styles.hidden}>{text}</span>;
  if (field.kind === 'link' && field.value.model) {
    return <Link className={styles.valueLink} href={recordHref(field.value.model, field.value.pk)}>{text}</Link>;
  }
  if (field.kind === 'json' || field.kind === 'longtext') return <pre className={styles.pre}>{text}</pre>;
  return <>{text}</>;
}

function Editor({ field, value, onChange, tt }) {
  const label = `${field.label} (${field.name})`;
  if (field.kind === 'boolean') {
    return (
      <select className={`${styles.select} ${styles.full}`} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {field.null && <option value="">{tt('adminRecords.emptyValue', 'Empty')}</option>}
        <option value="true">{tt('adminRecords.yes', 'Yes')}</option>
        <option value="false">{tt('adminRecords.no', 'No')}</option>
      </select>
    );
  }
  if (field.choices) {
    return (
      <select className={`${styles.select} ${styles.full}`} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {field.null && <option value="">{tt('adminRecords.emptyValue', 'Empty')}</option>}
        {field.choices.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    );
  }
  if (field.kind === 'date' || field.kind === 'datetime') {
    return <DateField value={value} onChange={(e) => onChange(e.target.value)} withTime={field.kind === 'datetime'} ariaLabel={label} />;
  }
  if (field.kind === 'json' || field.kind === 'longtext') {
    return <textarea className={styles.area} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input className={`${styles.input} ${styles.full}`} aria-label={label} value={value}
           inputMode={field.kind === 'integer' || field.kind === 'number' || field.kind === 'link' ? 'decimal' : undefined}
           placeholder={field.kind === 'link' ? tt('adminRecords.linkNumber', 'The number of the record it points at') : undefined}
           onChange={(e) => onChange(e.target.value)} />
  );
}

function RecordInner() {
  const tt = useT();
  const router = useRouter();
  const toast = useAdminToast();
  const { model, pk: rawPk } = useParams();
  const pk = decodeURIComponent(rawPk);
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteWhy, setDeleteWhy] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [fix, setFix] = useState({ direction: 'credit', amount: '', kind: 'user', other: '', reason: '' });

  const load = useCallback(async () => {
    setError('');
    const { ok, body } = await recordsCall(`/${model}/${encodeURIComponent(pk)}/`);
    if (ok) setRec(body.data);
    else setError(apiMessage(tt, body, 'adminRecords.recordFailed', 'This record could not be loaded.'));
  }, [model, pk, tt]);

  useEffect(() => {
    if (!authLoading && admin) load();
  }, [authLoading, admin, load]);

  const startEdit = () => {
    const start = {};
    rec.fields.filter((f) => f.editable).forEach((f) => {
      start[f.name] = f.kind === 'datetime' ? isoToLocalInput(f.value) : editStart(f);
    });
    setDraft(start);
    setReason('');
    setEditing(true);
  };

  const save = async () => {
    const changed = {};
    rec.fields.filter((f) => f.editable).forEach((f) => {
      const before = f.kind === 'datetime' ? isoToLocalInput(f.value) : editStart(f);
      if (draft[f.name] === before) return;
      let value = draft[f.name];
      if (f.kind === 'boolean') value = value === '' ? null : value === 'true';
      else if (f.kind === 'datetime') value = value ? localInputToISO(value) : null;
      else if (value === '' && f.null) value = null;
      changed[f.name] = value;
    });
    if (!Object.keys(changed).length) {
      toast.push(tt('adminRecords.nothingChanged', 'Nothing is different.'), 'error');
      return;
    }
    setBusy(true);
    const { ok, body } = await recordsCall(`/${model}/${encodeURIComponent(pk)}/`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: changed, reason }),
    });
    setBusy(false);
    if (ok) {
      setRec(body.data);
      setEditing(false);
      toast.push(tt('adminRecords.saved', 'Saved. The old values are kept in the history below.'), 'success');
    } else {
      toast.push(apiMessage(tt, body, 'adminRecords.saveFailed', 'That did not save.'), 'error');
    }
  };

  const undo = async (version) => {
    setBusy(true);
    const { ok, body } = await recordsCall(`/versions/${version.id}/revert/`, { method: 'POST', body: JSON.stringify({}) });
    setBusy(false);
    if (ok) {
      toast.push(tt('adminRecords.undone', 'Undone. The undo is in the history too.'), 'success');
      load();
    } else {
      toast.push(apiMessage(tt, body, 'adminRecords.undoFailed', 'That could not be undone.'), 'error');
    }
  };

  const openDelete = async () => {
    setDeleteWhy('');
    setDeleting({ loading: true });
    const { ok, body } = await recordsCall(`/${model}/${encodeURIComponent(pk)}/delete/`);
    setDeleting(ok ? body.data : { allowed: false, code: body.code || 'FAILED' });
  };

  const confirmDelete = async () => {
    setBusy(true);
    const { ok, body } = await recordsCall(`/${model}/${encodeURIComponent(pk)}/delete/`, {
      method: 'POST',
      body: JSON.stringify({ reason: deleteWhy }),
    });
    setBusy(false);
    if (ok) {
      toast.push(tt('adminRecords.binned', 'In the bin for 90 days. It can be restored from there.'), 'success');
      router.push('/admin/records/bin');
    } else {
      toast.push(apiMessage(tt, body, 'adminRecords.deleteFailed', 'That could not be deleted.'), 'error');
    }
  };

  const correct = async () => {
    setBusy(true);
    const { ok, body } = await recordsCall(`/${model}/${encodeURIComponent(pk)}/correct/`, {
      method: 'POST',
      body: JSON.stringify({
        direction: fix.direction, amount: fix.amount, other_kind: fix.kind, other: fix.other, reason: fix.reason,
      }),
    });
    setBusy(false);
    if (ok) {
      setCorrecting(false);
      setFix({ direction: 'credit', amount: '', kind: 'user', other: '', reason: '' });
      toast.push(tt('adminRecords.corrected', 'Corrected. Both statements show the new entry.'), 'success');
      load();
    } else {
      toast.push(apiMessage(tt, body, 'adminRecords.correctFailed', 'The correction did not go through.'), 'error');
    }
  };

  const refusal = (code) => ({
    MONEY_IS_VIEW_ONLY: tt('adminRecords.refuseMoney', 'Money records are never deleted. Correct them with a new entry.'),
    CASCADE_TOUCHES_MONEY: tt('adminRecords.refuseCascade', 'Deleting this would take money records with it, so it cannot be deleted here.'),
    PROTECTED: tt('adminRecords.refuseProtected', 'Other records depend on this one and would break, so it cannot be deleted.'),
    PAID_ENTRANTS: tt('adminRecords.refusePaid', 'People have paid for this. Cancel it first, which refunds them, and then it can be deleted.'),
  }[code] || tt('adminRecords.refuseOther', 'This cannot be deleted here.'));

  if (authLoading) return null;
  const editable = rec ? rec.fields.filter((f) => f.editable) : [];
  return (
    <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <Link href={kindHref(model)} className={shared.sectionLink}>
            {rec ? tt('adminRecords.backToKind', 'All {kind} records').replace('{kind}', rec.name) : tt('adminRecords.backToKinds', 'All kinds of record')}
          </Link>
          {error ? (
            <div className={shared.card}>
              <p className={shared.errorText}>{error}</p>
              <button type="button" className={styles.quiet} onClick={load}>{tt('admin.retry', 'Try again')}</button>
            </div>
          ) : !rec ? (
            <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>
          ) : (
            <>
              <div className={shared.pageHeader}>
                <div>
                  <h1 className={shared.pageTitle}>{rec.label}</h1>
                  <p className={shared.pageSubtitle}>
                    {rec.name} <span className={styles.pk}>#{rec.pk}</span>{' '}
                    {rec.money && <span className={styles.tag}>{tt('adminRecords.moneyViewOnly', 'Money: view only')}</span>}{' '}
                    {rec.deleted && <span className={`${styles.tag} ${styles.tagGrey}`}>{tt('adminRecords.softDeleted', 'Deleted, in the bin')}</span>}
                  </p>
                </div>
                <div className={styles.actions}>
                  {rec.may_edit && !editing && editable.length > 0 && (
                    <button type="button" className={styles.quiet} onClick={startEdit}>{tt('adminRecords.edit', 'Change')}</button>
                  )}
                  {rec.may_correct && (
                    <button type="button" className={styles.quiet} onClick={() => setCorrecting(true)}>{tt('adminRecords.correct', 'Correct with a new entry')}</button>
                  )}
                  {rec.may_edit && !rec.money && !rec.deleted && (
                    <button type="button" className={styles.danger} onClick={openDelete}>{tt('adminRecords.delete', 'Put in the bin')}</button>
                  )}
                </div>
              </div>

              <div className={styles.sections}>
                <section className={shared.card} aria-labelledby="rec-fields">
                  <h2 id="rec-fields" className={styles.sectionTitle}>{tt('adminRecords.fields', 'Every field')}</h2>
                  {editing && <p className={styles.note}>{tt('adminRecords.editNote', 'Only the fields that can be changed here have a box. Secret fields, money and pictures are changed on their own screens.')}</p>}
                  <dl className={styles.fields}>
                    {rec.fields.map((f) => (
                      <div key={f.name} className={styles.field}>
                        <dt className={styles.fieldName}>{f.label} <span className={styles.pk}>{f.name}</span></dt>
                        <dd className={styles.fieldValue}>
                          {editing && f.editable
                            ? <Editor field={f} value={draft[f.name] ?? ''} onChange={(v) => setDraft((d) => ({ ...d, [f.name]: v }))} tt={tt} />
                            : <Value field={f} tt={tt} />}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {editing && (
                    <>
                      <label className={styles.label} htmlFor="rec-reason">{tt('adminRecords.why', 'Why this is being changed')}</label>
                      <input id="rec-reason" className={`${styles.input} ${styles.full}`} value={reason} maxLength={500}
                             onChange={(e) => setReason(e.target.value)} />
                      <div className={styles.actions}>
                        <button type="button" className={styles.button} disabled={busy || !reason.trim()} onClick={save}>
                          {busy ? tt('ui.saving', 'Saving...') : tt('adminRecords.save', 'Save the change')}
                        </button>
                        <button type="button" className={styles.quiet} disabled={busy} onClick={() => setEditing(false)}>{tt('adminRecords.cancel', 'Cancel')}</button>
                      </div>
                    </>
                  )}
                </section>

                <section className={shared.card} aria-labelledby="rec-linked">
                  <h2 id="rec-linked" className={styles.sectionTitle}>{tt('adminRecords.linked', 'Linked records')}</h2>
                  {rec.linked.length === 0
                    ? <p className={shared.stateText}>{tt('adminRecords.noLinked', 'Nothing else points at this record.')}</p>
                    : <div className={styles.linked}>
                        {rec.linked.map((g) => (
                          <div key={`${g.model}-${g.field}`}>
                            <h3 className={styles.linkedTitle}>
                              {g.name} <span className={styles.count}>{formatNumber(g.count)}</span>
                            </h3>
                            <ul className={styles.list}>
                              {g.items.map((r) => (
                                <li key={r.pk}>
                                  <Link className={styles.rowLink} href={recordHref(g.model, r.pk)}>
                                    <span className={styles.rowName}>{r.label}</span>
                                    <span className={styles.pk}>#{r.pk}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            {g.count > g.items.length && (
                              <p className={styles.count}>
                                {tt('adminRecords.moreLinked', 'and {n} more').replace('{n}', formatNumber(g.count - g.items.length))}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>}
                </section>

                <section className={shared.card} aria-labelledby="rec-history">
                  <h2 id="rec-history" className={styles.sectionTitle}>{tt('adminRecords.history', 'Changes made here')}</h2>
                  {rec.versions.length === 0
                    ? <p className={shared.stateText}>{tt('adminRecords.noHistory', 'Nobody has changed this record from the console.')}</p>
                    : <ul className={styles.versions}>
                        {rec.versions.map((v) => (
                          <li key={v.id} className={styles.version}>
                            <div className={styles.versionHead}>
                              <span>{formatDateTime(v.changed_at)}</span>
                              <span>{v.changed_by || tt('adminRecords.someone', 'An admin')}</span>
                              {v.reverts && <span className={`${styles.tag} ${styles.tagGrey}`}>{tt('adminRecords.anUndo', 'An undo')}</span>}
                            </div>
                            {Object.entries(v.changes).map(([name, [before, after]]) => (
                              <p key={name} className={styles.change}>
                                <strong>{name}</strong>: {JSON.stringify(before)} → {JSON.stringify(after)}
                              </p>
                            ))}
                            {v.reason && <p className={styles.note}>{v.reason}</p>}
                            {rec.may_edit && (
                              <button type="button" className={styles.quiet} disabled={busy} onClick={() => undo(v)}>
                                {tt('adminRecords.undo', 'Undo this change')}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>}
                </section>
              </div>
            </>
          )}
        </main>
      </div>

      {deleting && (
        <div className={shared.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="del-title">
          <div className={shared.modal}>
            <h2 id="del-title" className={shared.modalTitle}>{tt('adminRecords.deleteTitle', 'Put this in the bin?')}</h2>
            {deleting.loading ? (
              <p className={shared.modalSub}>{tt('ui.loading.33ce', 'Loading…')}</p>
            ) : !deleting.allowed ? (
              <p className={shared.modalSub}>{refusal(deleting.code)}</p>
            ) : (
              <>
                <p className={shared.modalSub}>
                  {deleting.soft
                    ? tt('adminRecords.deleteSoft', 'It disappears from the site and stays restorable for 90 days.')
                    : tt('adminRecords.deleteHard', 'These go with it, and all of them come back if it is restored within 90 days:')}
                </p>
                {!deleting.soft && (
                  <ul className={styles.list}>
                    {Object.entries(deleting.counts).map(([kind, n]) => (
                      <li key={kind} className={styles.count}>{kind}: {formatNumber(n)}</li>
                    ))}
                  </ul>
                )}
                <label className={styles.label} htmlFor="del-why">{tt('adminRecords.deleteWhy', 'Why it is being deleted')}</label>
                <input id="del-why" className={shared.modalInput} value={deleteWhy} maxLength={500} onChange={(e) => setDeleteWhy(e.target.value)} />
              </>
            )}
            <div className={shared.modalActions}>
              <button type="button" className={styles.quiet} onClick={() => setDeleting(null)}>{tt('adminRecords.cancel', 'Cancel')}</button>
              {deleting.allowed && (
                <button type="button" className={styles.danger} disabled={busy || !deleteWhy.trim()} onClick={confirmDelete}>
                  {tt('adminRecords.deleteConfirm', 'Put it in the bin')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {correcting && (
        <div className={shared.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="fix-title">
          <div className={shared.modal}>
            <h2 id="fix-title" className={shared.modalTitle}>{tt('adminRecords.correctTitle', 'Correct with a new entry')}</h2>
            <p className={shared.modalSub}>
              {tt('adminRecords.correctSub', 'The record stays as it is. A new entry moves the coins and lands on both statements, with your reason.')}
            </p>
            <select className={shared.modalInput} value={fix.direction} aria-label={tt('adminRecords.direction', 'Add or take coins')}
                    onChange={(e) => setFix((f) => ({ ...f, direction: e.target.value }))}>
              <option value="credit">{tt('adminRecords.credit', 'Add coins to this wallet')}</option>
              <option value="debit">{tt('adminRecords.debit', 'Take coins from this wallet')}</option>
            </select>
            <input className={shared.modalInput} type="number" min="0.01" step="0.01" value={fix.amount}
                   placeholder={tt('wallet.amount', 'How much, in VENT COINS')}
                   onChange={(e) => setFix((f) => ({ ...f, amount: e.target.value }))} />
            <select className={shared.modalInput} value={fix.kind} aria-label={tt('adminRecords.otherKind', 'The other side')}
                    onChange={(e) => setFix((f) => ({ ...f, kind: e.target.value, other: '' }))}>
              <option value="user">{tt('adminRecords.otherUser', 'The other side is a person')}</option>
              <option value="team">{tt('adminRecords.otherTeam', 'The other side is a team')}</option>
              <option value="org">{tt('adminRecords.otherOrg', 'The other side is an organisation')}</option>
            </select>
            <div className={shared.modalPicker}>
              <NamePicker kind={fix.kind} value={fix.other} onChange={(v) => setFix((f) => ({ ...f, other: v }))} token={adminToken()}
                          placeholder={fix.direction === 'credit'
                            ? tt('adminRecords.otherFrom', 'Whose wallet the coins come from')
                            : tt('adminRecords.otherTo', 'Whose wallet the coins go to')} />
            </div>
            <input className={shared.modalInput} value={fix.reason} maxLength={200}
                   placeholder={tt('adminRecords.correctWhy', 'Why this is being corrected')}
                   onChange={(e) => setFix((f) => ({ ...f, reason: e.target.value }))} />
            <div className={shared.modalActions}>
              <button type="button" className={styles.quiet} onClick={() => setCorrecting(false)}>{tt('adminRecords.cancel', 'Cancel')}</button>
              <button type="button" className={styles.button} disabled={busy || !fix.amount || !fix.other || !fix.reason.trim()} onClick={correct}>
                {tt('adminRecords.correctConfirm', 'Make the correction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminRecordPage() {
  return <AdminToastProvider><RecordInner /></AdminToastProvider>;
}
