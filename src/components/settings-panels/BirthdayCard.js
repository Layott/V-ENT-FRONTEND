'use client';

/**
 * Date of birth, set once (inbox 351).
 *
 * Nothing on the site could set it, and going together at events (inbox 305)
 * decides what somebody may share by their age. Set once so an age rule cannot
 * be stepped past by changing it; a mistake is corrected by support, and the
 * card says so rather than offering a field that would be refused.
 */
import { useCallback, useEffect, useState } from 'react';
import DateField from '@/components/date-field/DateField';
import shared from './settingsShared.module.css';
import styles from './BirthdayCard.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/lib/datetime';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function BirthdayCard({ showToast }) {
  const tt = useT();
  const { token, loading } = useViewer();
  const [saved, setSaved] = useState(undefined);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/setting/birthday/`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      setSaved(body.status === 'success' ? body.data.date_of_birth : null);
    } catch {
      setSaved(null);
    }
  }, [token]);

  useEffect(() => { if (!loading) load(); }, [loading, load]);

  const save = async () => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/setting/birthday/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date_of_birth: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (body.status === 'success') {
        setSaved(body.data.date_of_birth);
        showToast?.(tt('birthday.saved', 'Date of birth saved.'));
      } else {
        setProblem(apiMessage(tt, body, 'birthday.failed', 'That date could not be saved.'));
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className={shared.card}>
      <h3 className={shared.cardTitle}>{tt('birthday.title', 'Date of birth')}</h3>
      <p className={shared.cardSub}>
        {tt('birthday.why', 'Used to decide what you can share at events, such as going together. Never shown to anybody else.')}
      </p>
      {saved === undefined && <p className={shared.fieldHelper}>{tt('ui.loading.33ce', 'Loading…')}</p>}
      {saved && <p className={shared.fieldHelper}>
        {tt('birthday.set', 'Saved as {date}. To correct it, contact support.').replace('{date}', formatDate(saved))}
      </p>}
      {saved === null && <div className={shared.formGroup}>
        <DateField value={value} onChange={(e) => setValue(e.target.value)} max={today}
          ariaLabel={tt('birthday.title', 'Date of birth')} placeholder={tt('birthday.placeholder', 'Choose your date of birth')} />
        <span className={shared.fieldHelper}>{tt('birthday.once', 'You can set this once. Check it before saving.')}</span>
        {problem && <span className={`${shared.fieldHelper} ${styles.problem}`} role="alert">{problem}</span>}
        <div className={shared.formFooter}>
          <button type="button" className={`${shared.btn} ${shared.goldBTN}`} disabled={busy || !value} onClick={save}>
            {busy ? tt('ui.saving.8f2a', 'Saving…') : tt('birthday.save', 'Save date of birth')}
          </button>
        </div>
      </div>}
    </div>
  );
}
