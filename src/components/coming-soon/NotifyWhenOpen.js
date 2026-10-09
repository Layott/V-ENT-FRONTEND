'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '@/lib/useLiveData';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useViewer } from '@/lib/gating';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import styles from './coming-soon.module.css';

// "Tell me when it opens" (inbox 421). One press when signed in, recorded on the
// account, and `manage.py notify_module_open <module>` tells everybody who asked
// the day it opens. A signed-out visitor is asked to make an account first,
// because an account is the only way to be told later; the API refuses them
// too.

const NotifyWhenOpen = ({ module }) => {
  const tt = useT();
  const viewer = useViewer();
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const api = `${process.env.NEXT_PUBLIC_API_URL}/roadmap/interest/`;

  const load = useCallback(async () => {
    if (!viewer.token) return;
    try {
      const res = await fetch(api, { headers: { Authorization: `Bearer ${viewer.token}` } });
      const body = await res.json().catch(() => ({}));
      setAsked((body?.data?.modules || []).includes(module));
    } catch {
      // The button still works; it simply starts as not asked.
    }
  }, [api, module, viewer.token]);

  useEffect(() => { load(); }, [load]);
  // Asked in another tab, or on /roadmap: this follows.
  useAutoRefresh(() => load());

  const send = async (method) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(api, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewer.token}` },
        body: JSON.stringify({ module }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setProblem(apiMessage(tt, body, 'roadmap.notifyFailed', 'That did not save. Try again.'));
        return;
      }
      setAsked((body.data?.modules || []).includes(module));
    } catch (err) {
      setProblem(apiMessage(tt, err, 'roadmap.notifyFailed', 'That did not save. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (viewer.loading) return null;

  // Signed out: the sentence asking for an account, and nothing to press.
  if (!viewer.signedIn) {
    return (
      <div className={styles.notify}>
        <NeedsAccount action={tt('roadmap.notifyAction', 'be told when it opens')}>{null}</NeedsAccount>
      </div>
    );
  }

  return (
    <div className={styles.notify}>
      <>
        {asked ? (
          <p className={styles.notifyDone}>
            {tt('roadmap.notifyDone', 'We will tell you when it opens.')}{' '}
            <button type="button" className={styles.textButton} disabled={busy} onClick={() => send('DELETE')}>
              {tt('roadmap.notifyStop', 'Stop')}
            </button>
          </p>
        ) : (
          <button type="button" className={styles.notifyButton} disabled={busy} onClick={() => send('POST')}>
            {busy ? tt('ui.saving', 'Saving...') : tt('roadmap.notify', 'Tell me when it opens')}
          </button>
        )}
      </>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
    </div>
  );
};

export default NotifyWhenOpen;
