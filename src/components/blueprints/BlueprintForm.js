'use client';

// The fields of a blueprint (P7): which tournament it copies, its name, how
// often, the first start, how many days ahead each edition is made, whether
// each one is published, when to stop, and the number the next one carries.
//
// One form for making a blueprint (from the console's Run it again, or the
// Blueprints tab) and for changing one, so the two can never ask different
// questions. Times are typed on the reader's own clock and sent as instants
// (localInputToISO); the blueprint keeps that clock's zone, so an 18:00 cup
// stays at 18:00 when the clocks change.

import { useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import DateField from '@/components/date-field/DateField';
import { isoToLocalInput, localInputToISO, viewerZone } from '@/lib/datetime';
import { EVERY_CHOICES, everyWord } from '@/lib/blueprintSchedule';
import styles from './blueprints.module.css';

/** The name a blueprint gets by default: the tournament's, without "(copy)" or "#12". */
export function defaultName(title) {
  return String(title || '').replace(/\s*\(copy\)\s*$/i, '').replace(/\s*#\d+\s*$/, '').trim();
}

export default function BlueprintForm({ initial = {}, sources = null, busy = false,
  submitLabel, onSubmit, onCancel }) {
  const tt = useT();
  const [source, setSource] = useState(initial.tournament?.slug || sources?.[0]?.slug || '');
  const [name, setName] = useState(initial.name || '');
  const [every, setEvery] = useState(initial.every || 'week');
  const [first, setFirst] = useState(isoToLocalInput(initial.first_start));
  const [lead, setLead] = useState(String(initial.lead_days ?? 7));
  const [publish, setPublish] = useState(Boolean(initial.publish));
  const [endsAfter, setEndsAfter] = useState(initial.ends_after ? String(initial.ends_after) : '');
  const [number, setNumber] = useState(String(initial.next_number ?? 1));
  const [problem, setProblem] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setProblem('');
    if (every !== 'none' && !first) {
      setProblem(tt('blueprint.form.needFirst', 'Say when the first edition starts.'));
      return;
    }
    const body = {
      name: name.trim(),
      every,
      first_start: every === 'none' && !first ? null : localInputToISO(first),
      lead_days: Number(lead) || 0,
      publish,
      ends_after: endsAfter ? Number(endsAfter) : null,
      next_number: Number(number) || 1,
    };
    if (sources) body.tournament = source;
    // The zone the times were typed in, kept with the blueprint. Changing an
    // existing blueprint keeps the zone it was made in.
    if (!initial.token) body.timezone = viewerZone() || 'Africa/Lagos';
    if (body.first_start === null) delete body.first_start;
    onSubmit(body);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      {sources && (
        <label className={styles.field}>
          <span className={styles.label}>{tt('blueprint.form.source', 'Copy this tournament')}</span>
          <select className={styles.input} value={source} disabled={busy}
                  onChange={(e) => setSource(e.target.value)}>
            {sources.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
          </select>
        </label>
      )}

      <label className={styles.field}>
        <span className={styles.label}>{tt('blueprint.form.name', 'Name')}</span>
        <input className={styles.input} value={name} maxLength={120} disabled={busy}
               placeholder={tt('blueprint.form.namePlaceholder', 'Friday Cup')}
               onChange={(e) => setName(e.target.value)} />
        <span className={styles.help}>
          {tt('blueprint.form.nameHelp', 'Each edition is called this with its number after it: Friday Cup #12.')}
        </span>
      </label>

      <div className={styles.field}>
        <span className={styles.label}>{tt('blueprint.form.every', 'How often')}</span>
        <div className={styles.chips} role="group" aria-label={tt('blueprint.form.every', 'How often')}>
          {EVERY_CHOICES.map((key) => (
            <button key={key} type="button" disabled={busy} aria-pressed={every === key}
                    className={`${styles.chip} ${every === key ? styles.chipOn : ''}`}
                    onClick={() => setEvery(key)}>
              {everyWord(tt, key)}
            </button>
          ))}
        </div>
      </div>

      {every !== 'none' && (
        <div className={styles.field}>
          <span className={styles.label}>{tt('blueprint.form.first', 'The first edition starts')}</span>
          <DateField withTime value={first} disabled={busy} onChange={(e) => setFirst(e.target.value)} />
          <span className={styles.help}>
            {tt('blueprint.form.firstHelp', 'Every later edition starts at the same time on your clock.')}
          </span>
        </div>
      )}

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('blueprint.form.lead', 'Made how many days before it starts')}</span>
          <input className={styles.input} type="number" min="0" max="60" inputMode="numeric"
                 value={lead} disabled={busy} onChange={(e) => setLead(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('blueprint.form.number', 'The next edition is number')}</span>
          <input className={styles.input} type="number" min="1" inputMode="numeric"
                 value={number} disabled={busy} onChange={(e) => setNumber(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('blueprint.form.endsAfter', 'Stop after this many (optional)')}</span>
          <input className={styles.input} type="number" min="1" inputMode="numeric"
                 value={endsAfter} disabled={busy}
                 placeholder={tt('blueprint.form.endsAfterPlaceholder', 'Keep going')}
                 onChange={(e) => setEndsAfter(e.target.value)} />
        </label>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{tt('blueprint.form.publish', 'When an edition is made')}</span>
        <div className={styles.chips} role="group" aria-label={tt('blueprint.form.publish', 'When an edition is made')}>
          <button type="button" disabled={busy} aria-pressed={!publish}
                  className={`${styles.chip} ${!publish ? styles.chipOn : ''}`}
                  onClick={() => setPublish(false)}>
            {tt('blueprint.form.asDraft', 'Keep it a draft for me to check')}
          </button>
          <button type="button" disabled={busy} aria-pressed={publish}
                  className={`${styles.chip} ${publish ? styles.chipOn : ''}`}
                  onClick={() => setPublish(true)}>
            {tt('blueprint.form.publishIt', 'Publish it so people can enter')}
          </button>
        </div>
      </div>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy || (sources && !source)}>
          {submitLabel || tt('blueprint.form.save', 'Save')}
        </button>
        {onCancel && (
          <button type="button" className={styles.ghost} disabled={busy} onClick={onCancel}>
            {tt('blueprint.form.cancel', 'Cancel')}
          </button>
        )}
      </div>
    </form>
  );
}
