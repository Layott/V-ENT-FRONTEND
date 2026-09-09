'use client';

// Who may enter: the codes that open a closed tournament, and the queue of
// people waiting to be let in.
//
// Both existed as settings with nothing behind them. "Protected" was a choice
// in the creation wizard that changed how the tournament was listed and not who
// could register, so an organiser who picked it believed they had closed a door
// that was never shut. And "accept or decline teams" had no queue to accept
// anybody from.
//
// The codes are shown in full and downloadable, because the next thing that
// happens to them is being pasted into a WhatsApp message one at a time.

import { useCallback, useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuDownload, LuX } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { downloadWithToken } from '@/lib/download';
import { useT } from '@/i18n/LanguageProvider';
import styles from './tournament-access.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function TournamentAccess({ tournamentId, token, visibility }) {
  const tt = useT();
  const [invites, setInvites] = useState([]);
  const [limit, setLimit] = useState(64);
  const [queue, setQueue] = useState([]);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [howMany, setHowMany] = useState('8');
  const [copied, setCopied] = useState('');

  const auth = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    if (!tournamentId || !token) { setLoading(false); return; }
    try {
      const [codesRes, queueRes] = await Promise.all([
        fetch(`${API}/tournament/${tournamentId}/invites/`, { headers: auth }),
        fetch(`${API}/tournament/${tournamentId}/registrations/`, { headers: auth }),
      ]);
      const codes = await codesRes.json().catch(() => ({}));
      const regs = await queueRes.json().catch(() => ({}));
      if (codesRes.ok && codes.status === 'success') {
        setInvites(codes.data.invites || []);
        setLimit(codes.data.limit ?? 64);
      }
      if (queueRes.ok && regs.status === 'success') {
        setQueue(regs.data.registrations || []);
        setApprovalRequired(Boolean(regs.data.approval_required));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, token, tt]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(''), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const post = async (path, body) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/${path}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.status === 'success') {
        setNotice(apiMessage(tt, payload, 'access.done', 'Done.'));
        load();
        return true;
      }
      setError(apiMessage(tt, payload, 'api.failed', 'Failed.'));
      return false;
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const mint = () => {
    const count = Number(howMany) || 0;
    if (count < 1) return;
    post('invites/', { count });
  };

  const clearUnused = async () => {
    setBusy(true);
    try {
      await fetch(`${API}/tournament/${tournamentId}/invites/`, {
        method: 'DELETE', headers: auth,
      });
      setNotice(tt('access.cleared', 'Unused codes cleared.'));
      load();
    } finally {
      setBusy(false);
    }
  };

  const decide = (ids, decision) =>
    post('registrations/', { decision, registration_ids: ids });

  const copy = async code => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      // Clipboard is blocked in some in-app browsers. The code is on screen.
    }
  };

  // Fetched with the token and saved from a blob. It used to be a
  // `window.open`, with a comment claiming the token was in the address: it was
  // not, and a navigation cannot carry a header, so every one of these buttons
  // opened a tab showing a JSON refusal.
  const save = async (url, fallbackName) => {
    setError('');
    setBusy(true);
    try {
      const problem = await downloadWithToken(url, token, fallbackName);
      if (problem === 'PREMIUM_REQUIRED') {
        setError(tt('api.PREMIUM_REQUIRED',
          'That is a premium feature. Ask a V-ENT admin to turn premium on for this account.'));
      } else if (problem) {
        setError(tt('export.failed', 'That file could not be downloaded.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const download = kind => save(
    `${API}/tournament/${tournamentId}/invites/download/?as=${kind}`,
    `codes.${kind}`);

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>;

  const closed = visibility === 'protected' || visibility === 'private';
  const waiting = queue.filter(r => r.status === 'pending');

  return (
    <section className={styles.wrap}>
      {/* The queue first: somebody is waiting. */}
      {approvalRequired && (
        <div className={styles.block}>
          <p className={styles.title}>
            {tt('access.queueTitle', 'Waiting to be let in')}
            {waiting.length > 0 && <span className={styles.count}>{waiting.length}</span>}
          </p>
          {waiting.length === 0
            ? <p className={styles.hint}>
                {tt('access.queueEmpty', 'Nobody is waiting. New entrants land here for you to accept.')}
              </p>
            : <>
                <ul className={styles.list}>
                  {waiting.map(row => (
                    <li key={row.id} className={styles.row}>
                      <span className={styles.rowName}>{row.name}</span>
                      <span className={styles.rowActions}>
                        <button type="button" className={styles.accept} disabled={busy}
                                onClick={() => decide([row.id], 'accept')}>
                          <LuCheck aria-hidden="true" />
                          {tt('access.accept', 'Accept')}
                        </button>
                        <button type="button" className={styles.decline} disabled={busy}
                                onClick={() => decide([row.id], 'decline')}>
                          <LuX aria-hidden="true" />
                          {tt('access.decline', 'Decline')}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <button type="button" className={styles.ghost} disabled={busy}
                        onClick={() => decide(waiting.map(r => r.id), 'accept')}>
                  {tt('access.acceptAll', 'Accept everybody waiting')}
                </button>
              </>}
        </div>
      )}

      {/* The codes. */}
      <div className={styles.block}>
        <p className={styles.title}>
          {tt('access.codesTitle', 'Invite codes')}
          <span className={styles.count}>{invites.length}/{limit}</span>
        </p>
        <p className={styles.hint}>
          {closed
            ? tt('access.codesClosed', 'This tournament is closed, so a code is the only way in. Send one to each team you want.')
            : tt('access.codesOpen', 'Anybody can register while this tournament is public. Codes matter once you set it to protected or private.')}
        </p>

        <div className={styles.mint}>
          <input className={styles.input} type="number" min="1" max={limit}
                 value={howMany}
                 onChange={e => setHowMany(e.target.value.replace(/[^0-9]/g, ''))} />
          <button type="button" className={styles.primary} disabled={busy}
                  onClick={mint}>
            {tt('access.mint', 'Make codes')}
          </button>
          {invites.length > 0 && <>
            <button type="button" className={styles.ghost} onClick={() => download('txt')}>
              <LuDownload aria-hidden="true" /> {tt('access.txt', 'Text file')}
            </button>
            <button type="button" className={styles.ghost} onClick={() => download('csv')}>
              <LuDownload aria-hidden="true" /> {tt('access.csv', 'Spreadsheet')}
            </button>
            <button type="button" className={styles.ghost} disabled={busy}
                    onClick={() => download('pdf')}>
              <LuDownload aria-hidden="true" /> {tt('access.pdf', 'PDF')}
            </button>
            <button type="button" className={styles.ghost} disabled={busy}
                    onClick={() => download('docx')}>
              <LuDownload aria-hidden="true" /> {tt('access.docx', 'Word')}
            </button>
            <button type="button" className={styles.ghost} disabled={busy}
                    onClick={clearUnused}>
              {tt('access.clear', 'Clear unused')}
            </button>
          </>}
        </div>

        {invites.length === 0
          ? <p className={styles.hint}>{tt('access.noCodes', 'No codes yet.')}</p>
          : <ul className={styles.codes}>
              {invites.map(invite => (
                <li key={invite.id}
                    className={`${styles.code} ${invite.spent ? styles.spent : ''}`}>
                  <span className={styles.codeText}>{invite.code}</span>
                  <span className={styles.codeUses}>
                    {invite.spent
                      ? tt('access.used', 'used')
                      : tt('access.usesLeft', '{n} left')
                        .replace('{n}', invite.max_uses - invite.used_count)}
                  </span>
                  <button type="button" className={styles.copyBtn}
                          onClick={() => copy(invite.code)}
                          aria-label={tt('share.copy', 'Copy link')}>
                    {copied === invite.code
                      ? <LuCheck aria-hidden="true" />
                      : <LuCopy aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>}
      </div>

      {/* The data out. CSV because the next step is a pivot table or a mail
          merge, and every spreadsheet on earth opens it. */}
      <div className={styles.block}>
        <p className={styles.title}>{tt('export.title', 'Take the data out')}</p>
        <p className={styles.hint}>
          {tt('export.hint2', 'A spreadsheet to work on, or a document to send. The results sheet has a row per match, so an aggregate fixture is not collapsed into one line. Excel, Word and PDF are premium.')}
        </p>
        <div className={styles.sheets}>
          {[['participants', 'export.participants', 'Entrants'],
            ['results', 'export.results', 'Results'],
            ['standings', 'export.standings', 'Standings']].map(([sheet, key, label]) => (
            <div key={sheet} className={styles.sheetRow}>
              <span className={styles.sheetName}>{tt(key, label)}</span>
              <span className={styles.sheetFormats}>
                {[['csv', 'export.asCsv', 'Spreadsheet'],
                  ['xlsx', 'export.asXlsx', 'Excel'],
                  ['docx', 'export.asDocx', 'Word'],
                  ['pdf', 'export.asPdf', 'PDF']].map(([as, fkey, flabel]) => (
                  <button key={as} type="button" className={styles.ghost} disabled={busy}
                          onClick={() => save(
                            `${API}/tournament/${tournamentId}/export/?sheet=${sheet}&as=${as}`,
                            `${sheet}.${as}`)}>
                    <LuDownload aria-hidden="true" /> {tt(fkey, flabel)}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}
    </section>
  );
}
