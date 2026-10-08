'use client';

/**
 * Going together: the "Going together" tab on an event page (inbox 305).
 *
 * A ticket holder can choose to show that they are going, the area they are
 * leaving from, and whether other people at the event may ping them to meet
 * up. Every rule lives on the server (`vent_event/together.py`): which options
 * a person has depends on their age band and on whether the event is 18+, and
 * the screen only ever offers what the server allows. Anything refused is said
 * in words with the way forward, never a dead button.
 *
 * Signed out, it shows how many people are sharing and a sign-in link: no
 * control is rendered live to somebody who cannot use it.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import UserChip from '@/components/user-chip/UserChip';
import UserPicker from '@/components/user-picker/UserPicker';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { plural } from '@/lib/plural';
import styles from './going-together.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const REFUSAL = {
  NO_TICKET: ['together.noTicket', 'Only people with a ticket to this event can take part.'],
  NEEDS_BIRTHDAY: ['together.needsBirthday', 'Add your date of birth first. What you can share depends on your age.'],
  TOO_YOUNG: ['together.tooYoung', 'This is not available to people under 13.'],
  ADULTS_ONLY_EVENT: ['together.adultsOnly', 'This event is 18+, so this is not available to you here.'],
};

const VISIBILITY = {
  off: ['together.vis.off', 'Nobody'],
  mutuals: ['together.vis.mutuals', 'Mutual follows'],
  event: ['together.vis.event', 'Everyone at the event'],
  approved: ['together.vis.approved', 'Mutual follows and people I approve'],
};

const PING_REFUSAL = {
  PINGS_CLOSED: ['together.ping.closed', 'Not taking pings'],
  PING_AGE: ['together.ping.age', 'Pings are only between people of the same age group'],
  PING_MUTUALS_ONLY: ['together.ping.mutualsOnly', 'Pings only between mutual follows here'],
  PINGS_NOT_FOR_YOU: ['together.ping.notForYou', 'Turn on your own pings to ping people'],
};

export default function GoingTogether({ eventRef, onOpenTickets }) {
  const tt = useT();
  const { token, loading: sessionLoading, signedIn } = useViewer();
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('loading');
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [approveName, setApproveName] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setStatus('loading');
    try {
      const res = await fetch(`${API}/event/${eventRef}/together/`, { headers: headers() });
      const body = await res.json();
      if (body.status !== 'success') throw new Error('together');
      setState(body.data);
      // A quiet refresh brings in new pings and people; it never overwrites
      // choices somebody is in the middle of making.
      if (body.data.me && !quiet) setDraft(body.data.me);
      setStatus('ready');
    } catch {
      if (!quiet) setStatus('failed');
    }
  }, [eventRef, headers]);

  useAutoRefresh(() => load({ quiet: true }));

  useEffect(() => { if (!sessionLoading) load(); }, [sessionLoading, load]);

  const call = async (path, method, payload, done) => {
    setBusy(true);
    setProblem('');
    setNotice('');
    try {
      const res = await fetch(`${API}/event/${eventRef}/together/${path}`, {
        method, headers: headers(), body: payload ? JSON.stringify(payload) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (body.status !== 'success') {
        setProblem(apiMessage(tt, body, 'together.failed', 'That did not work. Try again.'));
        return;
      }
      if (done) setNotice(done);
      await load();
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const vis = (v) => tt(...VISIBILITY[v]);

  if (status === 'loading') return <p className={styles.muted}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  if (status === 'failed') {
    return <p className={styles.problem} role="alert">
      {tt('together.loadFailed', 'Going together could not be loaded.')}{' '}
      <button type="button" className={styles.linkBtn} onClick={load}>{tt('ui.retry.9f5c', 'Retry')}</button>
    </p>;
  }

  const intro = <div className={styles.intro}>
    <h2 className={styles.title}>{tt('together.title', 'Going together')}</h2>
    <p className={styles.lead}>
      {tt('together.lead', 'Show that you are going, share the area you are leaving from, and meet up with people who like the same games. Everything here is off until you switch it on, and you choose who sees it.')}
    </p>
    <p className={styles.count}>
      {plural(tt, state.count, 'together.countOne', '{n} person is sharing that they are going.',
        'together.count', '{n} people are sharing that they are going.')}
      {state.min_age >= 18 && <span className={styles.adultChip}>{tt('together.adultEvent', '18+ event')}</span>}
    </p>
  </div>;

  if (!signedIn) {
    return <section className={styles.wrap}>{intro}
      <p className={styles.muted}>
        {tt('together.signIn', 'Sign in with the account that holds your ticket to take part.')}{' '}
        <Link href="/login" className={styles.link}>{tt('ui.login.7b3c', 'Log in')}</Link>
      </p>
    </section>;
  }

  if (state.reason) {
    const [key, text] = REFUSAL[state.reason] || ['together.unavailable', 'This is not available to you here.'];
    return <section className={styles.wrap}>{intro}
      <div className={styles.panel}>
        <p className={styles.body}>{tt(key, text)}</p>
        {state.reason === 'NO_TICKET' && onOpenTickets && <button type="button" className={styles.primary} onClick={onOpenTickets}>
          {tt('together.getTicket', 'Get a ticket')}
        </button>}
        {state.reason === 'NEEDS_BIRTHDAY' && <Link href="/settings?panel=account" className={styles.primary}>
          {tt('together.addBirthday', 'Add my date of birth')}
        </Link>}
      </div>
    </section>;
  }

  const allowed = state.allowed || { attendance: ['off'], departure: [], pings: false };
  const d = draft || state.me;
  const save = () => call('me/', 'POST', {
    attendance_visibility: d.attendance_visibility,
    departure_visibility: d.departure_visibility,
    departure_area: d.departure_area,
    pings_open: d.pings_open,
  }, tt('together.saved', 'Saved.'));

  const chips = (field, options) => <div className={styles.chips} role="group">
    {options.map((o) => <button key={o} type="button" aria-pressed={d[field] === o}
      className={d[field] === o ? `${styles.chip} ${styles.chipOn}` : styles.chip}
      onClick={() => setDraft({ ...d, [field]: o })}>{vis(o)}</button>)}
  </div>;

  const incoming = state.pings.incoming || [];
  return <section className={styles.wrap}>
    {intro}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {problem && <p className={styles.problem} role="alert">{problem}</p>}

    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{tt('together.mine', 'What you share')}</h3>

      <p className={styles.label}>{tt('together.whoSeesGoing', 'Who can see that you are going')}</p>
      {chips('attendance_visibility', allowed.attendance)}

      <p className={styles.label}>{tt('together.whoSeesArea', 'Who can see the area you are leaving from')}</p>
      {state.event_over
        ? <p className={styles.muted}>{tt('together.over', 'The event is over, so areas are no longer shown or changed.')}</p>
        : allowed.departure.length > 1
          ? <>
            {chips('departure_visibility', allowed.departure)}
            {d.departure_visibility !== 'off' && <input className={styles.input} maxLength={80}
              value={d.departure_area || ''} onChange={(e) => setDraft({ ...d, departure_area: e.target.value })}
              placeholder={tt('together.areaPlaceholder', 'For example Yaba, Lekki Phase 1 or Ikeja')}
              aria-label={tt('together.areaLabel', 'The area you are leaving from')} />}
          </>
          : <p className={styles.muted}>{tt('together.areaNotForYou', 'Sharing where you leave from is not available for your age group.')}</p>}

      <label className={styles.toggleRow}>
        <input type="checkbox" checked={!!d.pings_open} disabled={!allowed.pings}
          onChange={(e) => setDraft({ ...d, pings_open: e.target.checked })} />
        <span>
          {allowed.pings
            ? tt('together.pingsLabel', 'Let people at this event ping me to meet up')
            : tt('together.pingsNotForYou', 'Meet-up pings are not available for your age group.')}
        </span>
      </label>

      <button type="button" className={styles.primary} disabled={busy} onClick={save}>
        {busy ? tt('ui.saving.8f2a', 'Saving…') : tt('together.save', 'Save')}
      </button>
    </div>

    {d.departure_visibility === 'approved' && !state.event_over && <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{tt('together.approvedTitle', 'People you approve')}</h3>
      <p className={styles.muted}>{tt('together.approvedLead', 'Besides your mutual follows, only these people see your area.')}</p>
      {(state.me.approved || []).length === 0
        ? <p className={styles.muted}>{tt('together.approvedNone', 'Nobody yet.')}</p>
        : <ul className={styles.list}>{state.me.approved.map((p) => <li key={p.username} className={styles.row}>
          <UserChip user={p} size={28} />
          <button type="button" className={styles.quiet} disabled={busy}
            onClick={() => call('approve/', 'DELETE', { username: p.username }, tt('together.removed', 'Removed.'))}>
            {tt('together.remove', 'Remove')}
          </button>
        </li>)}</ul>}
      <div className={styles.inline}>
        <div className={styles.pickerCell}>
          <UserPicker value={approveName} onChange={setApproveName} token={token}
            placeholder={tt('together.usernamePlaceholder', 'Their username')} />
        </div>
        <button type="button" className={styles.primary} disabled={busy || !approveName.trim()}
          onClick={() => call('approve/', 'POST', { username: approveName }, tt('together.approved', 'Approved.')).then(() => setApproveName(''))}>
          {tt('together.approve', 'Approve')}
        </button>
      </div>
    </div>}

    {incoming.length > 0 && <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{tt('together.pingsIn', 'Pings to you')}</h3>
      <ul className={styles.list}>{incoming.map((p) => <li key={p.id} className={styles.row}>
        <div>
          <UserChip user={p.person} size={28} />
          {p.message && <p className={styles.message}>{p.message}</p>}
        </div>
        {p.status === 'sent'
          ? <div className={styles.inline}>
            <button type="button" className={styles.primary} disabled={busy}
              onClick={() => call(`ping/${p.id}/answer/`, 'POST', { accept: true }, tt('together.accepted', 'Accepted. You can message each other now.'))}>
              {tt('together.accept', 'Accept')}
            </button>
            <button type="button" className={styles.quiet} disabled={busy}
              onClick={() => call(`ping/${p.id}/answer/`, 'POST', { accept: false }, tt('together.declined', 'Declined.'))}>
              {tt('together.decline', 'Decline')}
            </button>
          </div>
          : p.status === 'accepted' && p.conversation
            ? <Link href={`/community/dm/${p.conversation}`} className={styles.link}>{tt('together.openChat', 'Open the conversation')}</Link>
            : <span className={styles.muted}>{p.status === 'declined' ? tt('together.youDeclined', 'You declined') : ''}</span>}
      </li>)}</ul>
    </div>}

    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{tt('together.people', 'People going')}</h3>
      {state.pings_left_today < 10 && <p className={styles.muted}>
        {plural(tt, state.pings_left_today, 'together.pingsLeftOne', '{n} ping left today.',
          'together.pingsLeft', '{n} pings left today.')}
      </p>}
      {state.people.length === 0
        ? <p className={styles.muted}>{tt('together.nobody', 'Nobody you can see is sharing yet. People appear here when they choose to show they are going.')}</p>
        : <ul className={styles.list}>{state.people.map((row) => <li key={row.person.username} className={styles.personRow}>
          <div className={styles.personMain}>
            <UserChip user={row.person} size={32} />
            {(row.shared.games.length > 0 || row.shared.interests.length > 0) && <p className={styles.shared}>
              {tt('together.bothLike', 'You both like')}: {[...row.shared.games, ...row.shared.interests].join(', ')}
            </p>}
            {row.departure_area && <p className={styles.area}>
              {tt('together.leavingFrom', 'Leaving from')}: <strong>{row.departure_area}</strong>
            </p>}
          </div>
          <div className={styles.personAction}>
            {row.ping_sent
              ? <span className={styles.muted}>{row.ping_sent === 'accepted' ? tt('together.theyAccepted', 'They accepted') : row.ping_sent === 'declined' ? tt('together.theyDeclined', 'They declined') : tt('together.pingSent', 'Ping sent')}</span>
              : row.ping_received
                ? <span className={styles.muted}>{row.ping_received === 'accepted'
                  ? tt('together.youAccepted', 'You accepted')
                  : row.ping_received === 'declined'
                    ? tt('together.youDeclined', 'You declined')
                    : tt('together.theyPingedYou', 'They pinged you: answer above')}</span>
                : row.ping_refusal
                  ? <span className={styles.muted}>{tt(...(PING_REFUSAL[row.ping_refusal] || ['together.ping.closed', 'Not taking pings']))}</span>
                  : <button type="button" className={styles.primary} disabled={busy || state.pings_left_today <= 0}
                    onClick={() => call('ping/', 'POST', { username: row.person.username }, tt('together.pinged', 'Ping sent. They choose whether to answer.'))}>
                    {tt('together.ping', 'Ping to meet up')}
                  </button>}
          </div>
        </li>)}</ul>}
    </div>

    <p className={styles.footnote}>
      {tt('together.privacy', 'Your area is hidden from everyone once the event ends. V-ENT keeps a record of it for safety, which only authorised staff can search, and you can download it with your data from Settings.')}
      {' '}<Link href="/privacy-policy#going-together" className={styles.link}>{tt('together.privacyLink', 'How this is kept')}</Link>
    </p>
  </section>;
}
