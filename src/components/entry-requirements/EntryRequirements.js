'use client';

// What an organiser demands before somebody may register, and the queue of
// answers waiting on them.
//
// The shape follows the ask: not four toggles, but a list the organiser
// composes. "follow these accounts and tell us your username", "download this
// and give us the field I have named", "everyone must have connected a Free
// Fire account". So a requirement is a row with its own settings, the order is
// the order the entrant sees, and the list is saved whole.
//
// The catalogue of what can be added comes from the server, from the same
// module that validates what is sent back. A list kept here would drift, and a
// form that offers a requirement the server refuses is worse than one that
// offers fewer.

import { useCallback, useEffect, useState } from 'react';
import {
  LuArrowDown, LuArrowUp, LuCheck, LuPlus, LuX,
} from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './entry-requirements.module.css';

const base = () => `${process.env.NEXT_PUBLIC_API_URL}/tournament`;

// Which config fields each kind actually has. Kept beside the render rather
// than inside it so a new kind is one line here and nothing else.
const FIELDS = {
  country: ['countries'],
  min_age: ['min_age'],
  social_follow: ['links', 'help'],
  download: ['url', 'field_label', 'help'],
  custom_field: ['field_label', 'help'],
  partner_verified: ['partner', 'field_label', 'help'],
};

const CHECKED_BY_NOTE = {
  automatic: 'Checked the moment they try to enter. Nobody reviews it.',
  submitted: 'They send something and you approve it.',
  partner: 'A partner confirms it, or you do if the partner cannot answer.',
};

export default function EntryRequirements({ tournamentId, token, canEdit = true }) {
  const tt = useT();

  const [rows, setRows] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [queue, setQueue] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [refusing, setRefusing] = useState(null); // submission id
  const [refusalNote, setRefusalNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${base()}/${tournamentId}/requirements/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.requirements || []);
        setCatalogue(body.data.catalogue || []);
      } else {
        setError(apiMessage(tt, body, 'api.requirementsLoadFailed',
          'Could not load the entry requirements.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQueue = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${base()}/${tournamentId}/requirements/queue/`,
        { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setQueue(body.data.submissions || []);
        setPendingCount(body.data.counts?.pending || 0);
      }
    } catch {
      // The queue is an extra on this screen. Failing to load it must not take
      // the requirement list down with it.
    }
  }, [tournamentId, token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadQueue(); }, [loadQueue]);

  const add = kind => {
    const spec = catalogue.find(c => c.kind === kind);
    if (!spec) return;
    setAdding(false);
    setRows(prev => ([...prev, {
      kind,
      label: spec.label,
      checked_by: spec.checked_by,
      config: { ...(spec.config || {}) },
      required: true,
      order: prev.length,
    }]));
  };

  const remove = index => setRows(prev => prev.filter((_r, i) => i !== index));

  // Buttons rather than drag: this has to work on a 390px screen, where a drag
  // handle is a way to lose your place.
  const move = (index, by) => setRows(prev => {
    const list = [...prev];
    const to = index + by;
    if (to < 0 || to >= list.length) return prev;
    [list[index], list[to]] = [list[to], list[index]];
    return list;
  });

  const setConfig = (index, key, value) => setRows(prev => prev.map((r, i) => (
    i === index ? { ...r, config: { ...(r.config || {}), [key]: value } } : r
  )));

  const setRequired = (index, value) => setRows(prev => prev.map((r, i) => (
    i === index ? { ...r, required: value } : r
  )));

  const save = async () => {
    setSaving(true);
    setNote('');
    setError('');
    try {
      const res = await fetch(`${base()}/${tournamentId}/requirements/set/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requirements: rows.map(r => ({
            kind: r.kind, config: r.config || {}, required: r.required !== false,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.requirements || []);
        setNote(body.data.requirements?.length
          ? tt('req.saved', 'Entry requirements saved.')
          : tt('req.savedOpen', 'Saved. This tournament is open to everyone.'));
        return;
      }
      setError(apiMessage(tt, body, 'api.requirementsSaveFailed',
        'Could not save the entry requirements.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const review = async (submissionId, decision, why) => {
    setSaving(true);
    try {
      const res = await fetch(
        `${base()}/${tournamentId}/requirements/queue/${submissionId}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ decision, note: why || '' }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRefusing(null);
        setRefusalNote('');
        setNote(decision === 'approved'
          ? tt('req.approved', 'Approved.')
          : tt('req.refused', 'Refused, and they have been told why.'));
        loadQueue();
        return;
      }
      setError(apiMessage(tt, body, 'api.reviewFailed', 'Could not record that.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  if (!rows) return <p className={styles.state}>{error}</p>;

  const unused = catalogue.filter(c => !rows.some(r => r.kind === c.kind));

  return (
    <div className={styles.editor}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>
            {tt('req.title', 'What somebody needs before they can enter')}
          </h3>
          <p className={styles.hint}>
            {rows.length === 0
              ? tt('req.noneHint', 'Nothing set, so anybody can enter. Add a requirement and it applies to every registration from now on.')
              : tt('req.hint', 'They see this list before they pay anything, and a refusal names the one thing they still owe.')}
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <ol className={styles.list}>
          {rows.map((row, index) => (
            <li key={`${row.kind}-${index}`} className={styles.row}>
              <span className={styles.order}>{index + 1}</span>

              <div className={styles.rowBody}>
                <div className={styles.rowHead}>
                  <span className={styles.rowLabel}>{row.label || row.kind}</span>
                  <span className={styles.by}>
                    {tt(`req.by.${row.checked_by}`, CHECKED_BY_NOTE[row.checked_by] || '')}
                  </span>
                </div>

                {(FIELDS[row.kind] || []).map(key => (
                  <RequirementField
                    key={key}
                    fieldKey={key}
                    value={(row.config || {})[key]}
                    onChange={v => setConfig(index, key, v)}
                    disabled={!canEdit}
                    tt={tt}
                  />
                ))}

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={row.required !== false}
                    onChange={e => setRequired(index, e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span>{tt('req.required', 'Stops the registration if it is not met')}</span>
                </label>
              </div>

              {canEdit && (
                <div className={styles.rowActions}>
                  <button type="button" className={styles.iconBtn} disabled={index === 0}
                          aria-label={tt('req.moveUp', 'Move up')}
                          onClick={() => move(index, -1)}><LuArrowUp aria-hidden="true" /></button>
                  <button type="button" className={styles.iconBtn} disabled={index === rows.length - 1}
                          aria-label={tt('req.moveDown', 'Move down')}
                          onClick={() => move(index, 1)}><LuArrowDown aria-hidden="true" /></button>
                  <button type="button" className={styles.iconBtn}
                          aria-label={tt('req.remove', 'Remove')}
                          onClick={() => remove(index)}><LuX aria-hidden="true" /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {canEdit && unused.length > 0 && (
        adding ? (
          <div className={styles.picker}>
            {unused.map(spec => (
              <button key={spec.kind} type="button" className={styles.pick}
                      onClick={() => add(spec.kind)}>
                <span className={styles.pickLabel}>{spec.label}</span>
                <span className={styles.pickBy}>
                  {tt(`req.by.${spec.checked_by}`, CHECKED_BY_NOTE[spec.checked_by] || '')}
                </span>
              </button>
            ))}
            <button type="button" className={styles.ghost} onClick={() => setAdding(false)}>
              {tt('ui.cancel.77df', 'Cancel')}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.ghost} onClick={() => setAdding(true)}>
            <LuPlus aria-hidden="true" /> {tt('req.add', 'Add a requirement')}
          </button>
        )
      )}

      {canEdit && (
        <button type="button" className={styles.save} onClick={save} disabled={saving}>
          {saving ? tt('ui.saving.8f2a', 'Saving…') : tt('req.save', 'Save requirements')}
        </button>
      )}

      {note && <p className={styles.note}>{note}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {/* ------------------------------------------------------------ queue */}
      {canEdit && (
        <section className={styles.block}>
          <h4 className={styles.blockTitle}>
            {tt('req.queue', 'Waiting on you')}{pendingCount ? ` (${pendingCount})` : ''}
          </h4>

          {queue.length === 0 ? (
            <p className={styles.hint}>
              {tt('req.queueEmpty', 'Nothing to check. Anything people send lands here.')}
            </p>
          ) : queue.map(item => (
            <div key={item.id} className={styles.submission}>
              <div className={styles.subHead}>
                <span className={styles.subWho}>{item.user?.username}</span>
                <span className={styles.subWhat}>{item.requirement?.label}</span>
              </div>
              <pre className={styles.subValue}>
                {typeof item.value === 'string' ? item.value : JSON.stringify(item.value, null, 2)}
              </pre>

              {refusing === item.id ? (
                <div className={styles.refuseRow}>
                  <input
                    className={styles.text}
                    value={refusalNote}
                    onChange={e => setRefusalNote(e.target.value)}
                    placeholder={tt('req.refuseWhy', 'Say what they should fix')}
                  />
                  <button type="button" className={styles.ghost} disabled={saving || !refusalNote.trim()}
                          onClick={() => review(item.id, 'refused', refusalNote)}>
                    {tt('req.refuseSend', 'Send it back')}
                  </button>
                  <button type="button" className={styles.ghost}
                          onClick={() => { setRefusing(null); setRefusalNote(''); }}>
                    {tt('ui.cancel.77df', 'Cancel')}
                  </button>
                </div>
              ) : (
                <div className={styles.subActions}>
                  <button type="button" className={styles.approve} disabled={saving}
                          onClick={() => review(item.id, 'approved')}>
                    <LuCheck aria-hidden="true" /> {tt('req.approve', 'Approve')}
                  </button>
                  <button type="button" className={styles.ghost}
                          onClick={() => setRefusing(item.id)}>
                    {tt('req.refuseBtn', 'Send it back')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// One config field. `countries` and `links` are lists an organiser types one
// per line, because a comma-separated box is a way to lose an entry to a
// trailing space.
function RequirementField({ fieldKey, value, onChange, disabled, tt }) {
  const LABELS = {
    countries: ['req.f.countries', 'Countries, one per line (NG, GH, KE)'],
    min_age: ['req.f.minAge', 'Minimum age'],
    links: ['req.f.links', 'Accounts to follow, one link per line'],
    url: ['req.f.url', 'Where they download it'],
    field_label: ['req.f.fieldLabel', 'What to call the field you are asking for'],
    partner: ['req.f.partner', 'Which partner confirms it'],
    help: ['req.f.help', 'Anything else they should know (optional)'],
  };
  const [key, fallback] = LABELS[fieldKey] || [`req.f.${fieldKey}`, fieldKey];

  if (fieldKey === 'countries' || fieldKey === 'links') {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{tt(key, fallback)}</span>
        <textarea
          className={styles.text}
          rows={fieldKey === 'links' ? 3 : 2}
          disabled={disabled}
          value={(Array.isArray(value) ? value : []).join('\n')}
          onChange={e => onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
        />
      </label>
    );
  }

  if (fieldKey === 'min_age') {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{tt(key, fallback)}</span>
        <input
          className={styles.number}
          type="number"
          min="1"
          max="99"
          disabled={disabled}
          value={value ?? 18}
          onChange={e => onChange(Number(e.target.value) || 0)}
        />
      </label>
    );
  }

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{tt(key, fallback)}</span>
      <input
        className={styles.text}
        type="text"
        disabled={disabled}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={fieldKey === 'field_label' ? 'Riot ID' : undefined}
      />
    </label>
  );
}
