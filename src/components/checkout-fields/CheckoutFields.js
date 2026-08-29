'use client';

// The questions an organiser asks a buyer, drawn once and used by both
// checkouts.
//
// There is one set of questions per event, and it belongs to the event rather
// than to the route somebody happened to arrive through. A guest and a
// signed-in member answer the same list. Drawing that list in two places is how
// it ends up asked in one of them: the door then has a shirt size for half the
// queue and nothing for the other half, and nobody notices until the shirts are
// already printed.
//
// So the fetching, the rendering and the shape of what is submitted all live
// here, and the two checkouts import them.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './checkout-fields.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/** What this event asks for, split the way the two forms need it. */
export function useCheckoutFields(eventRef) {
  const [fields, setFields] = useState([]);
  // How many one address may hold, so a form can cap its own quantity box
  // instead of refusing after somebody has filled everything in.
  const [maxPerEmail, setMaxPerEmail] = useState(null);

  const load = useCallback(async () => {
    if (!eventRef) return;
    try {
      const res = await fetch(`${API}/event/${eventRef}/checkout-fields/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setFields(body.data.fields || []);
        setMaxPerEmail(body.data.max_tickets_per_email ?? null);
      }
    } catch {
      // An organiser who asked nothing is a working checkout. Email alone
      // still sells a ticket, so a failure here must not block the sale.
    }
  }, [eventRef]);

  useEffect(() => { load(); }, [load]);

  return useMemo(() => ({
    fields,
    maxPerEmail,
    perOrder: fields.filter(f => !f.per_ticket),
    perTicket: fields.filter(f => f.per_ticket),
  }), [fields, maxPerEmail]);
}

/** One field, drawn according to what the organiser said it was. */
export function CheckoutField({ field, value, onChange }) {
  const tt = useT();
  const id = String(field.id);

  if (field.kind === 'checkbox') {
    return (
      <label className={styles.checkRow}>
        <input type="checkbox" checked={Boolean(value)}
               onChange={e => onChange(id, e.target.checked)} />
        <span>{field.label}{field.required && ' *'}</span>
      </label>
    );
  }

  if (field.kind === 'choice') {
    return (
      <label className={styles.field}>
        <span className={styles.label}>{field.label}{field.required && ' *'}</span>
        <select className={styles.input} value={value || ''}
                onChange={e => onChange(id, e.target.value)}>
          <option value="">{tt('guest.pick', 'Choose one')}</option>
          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {field.help_text && <span className={styles.help}>{field.help_text}</span>}
      </label>
    );
  }

  return (
    <label className={styles.field}>
      <span className={styles.label}>{field.label}{field.required && ' *'}</span>
      <input
        className={styles.input}
        type={field.kind === 'number' ? 'number' : field.kind === 'phone' ? 'tel' : 'text'}
        value={value || ''}
        onChange={e => onChange(id, e.target.value)}
      />
      {field.help_text && <span className={styles.help}>{field.help_text}</span>}
    </label>
  );
}

/** A list of them, for one ticket or for the order. */
export function CheckoutFieldList({ fields, values, onChange }) {
  return fields.map(f => (
    <CheckoutField key={f.id} field={f} value={(values || {})[String(f.id)]}
                   onChange={onChange} />
  ));
}

/**
 * Whether the required answers are all there, so a form can refuse before it
 * spends somebody's money rather than after.
 *
 * The server checks this again and is the one that decides. This exists only so
 * the refusal arrives before the wallet is debited.
 */
export function missingRequired(fields, orderAnswers, people) {
  for (const f of fields.filter(x => !x.per_ticket)) {
    if (f.required && !String((orderAnswers || {})[String(f.id)] ?? '').trim()) return f;
  }
  for (const person of people || []) {
    for (const f of fields.filter(x => x.per_ticket)) {
      if (f.required && !String((person.answers || {})[String(f.id)] ?? '').trim()) return f;
    }
  }
  return null;
}
