'use client';

// Whose name this runs in.
//
// CEO, 2 September 2026: "Users shuould be able to follow an organization, in
// which that particular orgs events, tournaments and anything about that org
// should show constantly."
//
// The follow was built and worked. Walking it signed in, the feed came back
// with zero items, and the reason was at the other end: 0 of 10 tournaments
// and 0 of 5 events carried an organisation, because nothing anywhere could
// set one. The columns had existed from the beginning. This is the control
// that was missing.
//
// It draws nothing at all for somebody who runs no organisation, which is
// almost everybody. A field asking a solo player to pick their organisation
// from an empty list is worse than no field.

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './organization-picker.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * @param value     the current organisation, a slug or an id or ''
 * @param onChange  called with the new slug, or '' for "just me"
 * @param kind      'tournament' or 'event', for the wording
 */
export default function OrganizationPicker({ value, onChange, kind = 'tournament' }) {
  const tt = useT();
  const { data: session, status } = useSession();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.user?.sessionToken;
    if (status !== 'authenticated' || !token) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/organization/mine/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => null);
        if (alive && body?.status === 'success') {
          setOrgs(body.data?.organizations || []);
        }
      } catch {
        // Nothing to say. The field simply does not appear, and the thing is
        // created under the person's own name, which is the common case.
      } finally {
        // Always, so a failure is not a spinner that never ends.
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [status, session?.user?.sessionToken]);

  if (loading || orgs.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <label className={styles.label} htmlFor="vent-org-picker">
        {tt('org.runningAs', 'Running this as')}
      </label>
      <select
        id="vent-org-picker"
        className={styles.select}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{tt('org.justMe', 'Just me')}</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.slug || o.id}>{o.name}</option>
        ))}
      </select>
      <p className={styles.hint}>
        {kind === 'event'
          ? tt('org.eventHint',
            'Pick one of your organisations and this event appears on its page, and in the feed of everybody following it.')
          : tt('org.tournamentHint',
            'Pick one of your organisations and this tournament appears on its page, and in the feed of everybody following it.')}
      </p>
    </div>
  );
}
