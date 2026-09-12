'use client';

// An organisation's own Discord server, and what V-ENT may do in it.
//
// CEO, 7 September 2026, asked whether the bot should ask for everything at
// once: "let each organiser grant only the parts they want."
//
// So the connect step is a set of checkboxes, and the invite this page opens
// carries exactly the permissions that were ticked. An organiser who wants
// only announcements authorises a bot that cannot delete a message in their
// server, and Discord is what enforces that rather than V-ENT remembering.
//
// ## Two reasons a control can be unavailable, and they read differently
//
// `granted` is what the organisation chose. `can` is what Discord still allows
// right now, re-read every time this loads. A capability that was granted and
// is no longer allowed means somebody changed the bot's role in Discord, and
// the fix is in their server settings rather than here. Saying "you have not
// granted that" in that case would send them to the wrong screen.
//
// ## Delete is not beside the others
//
// It removes other people's words from a community that is not ours. It sits
// last, says how many were actually removed rather than how many were asked
// for, and names Discord's two-week limit before somebody hits it.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import styles from './discord-server.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function DiscordServerPanel({ orgRef, token, showToast }) {
  const tt = useT();
  const [servers, setServers] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wanted, setWanted] = useState(['announce']);
  const [busy, setBusy] = useState('');

  const base = `${API}/auth/discord/guild/${orgRef}`;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!orgRef || !token) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${base}/servers/`, { headers: authHeaders });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        setServers(body.data.servers || []);
        setCapabilities(body.data.capabilities || []);
        setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'dserver.loadFailed', 'Could not load your Discord servers.'));
      }
    } catch (err) {
      if (!quiet) setError(apiMessage(tt, err, 'dserver.loadFailed', 'Could not load your Discord servers.'));
    } finally {
      if (!quiet) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, token, orgRef, tt]);

  // Permissions are read live from Discord on every load, so this keeps the
  // "what can it actually do" column honest without anybody reloading.
  useAutoRefresh(() => load({ quiet: true }), [], { interval: 60000 });
  useEffect(() => { load(); }, [load]);

  const toggleWanted = id => setWanted(w =>
    w.includes(id) ? w.filter(x => x !== id) : [...w, id]);

  const connect = async () => {
    setBusy('connect');
    try {
      const res = await fetch(`${base}/install/?caps=${wanted.join(',')}`,
                              { headers: authHeaders });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.data?.url) {
        // The whole page, not a popup: Discord's add-to-server screen asks
        // which server and shows the permission list, and that is a decision
        // somebody should make in a full window rather than a 520px one.
        window.location.href = body.data.url;
        return;
      }
      setError(apiMessage(tt, body, 'dserver.connectFailed', 'Could not start that.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'dserver.connectFailed', 'Could not start that.'));
    } finally {
      setBusy('');
    }
  };

  const disconnect = async id => {
    setBusy(`d${id}`);
    try {
      const res = await fetch(`${base}/servers/${id}/`, {
        method: 'DELETE', headers: authHeaders,
      });
      const body = await res.json().catch(() => ({}));
      showToast?.(body.message || tt('dserver.disconnected', 'Disconnected.'));
      await load({ quiet: true });
    } catch { /* the next refresh corrects the screen */ } finally { setBusy(''); }
  };

  if (loading) return <p className={styles.muted}>{tt('dserver.loading', 'Loading...')}</p>;

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('dserver.title', 'Your Discord server')}</h3>
      <p className={styles.hint}>
        {tt('dserver.hint', 'Add the V-ENT bot to a server you run, and it can post there for you. Choose what it may do: it is only given the permissions you tick, so anything you leave unticked it cannot do even by mistake.')}
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {servers.length === 0 ? (
        <p className={styles.muted}>
          {tt('dserver.none', 'No server connected yet.')}
        </p>
      ) : (
        <ul className={styles.list}>
          {servers.map(s => (
            <ServerRow key={s.id} server={s} base={base} tt={tt}
                       capabilities={capabilities}
                       authHeaders={authHeaders} showToast={showToast}
                       reload={() => load({ quiet: true })}
                       onDisconnect={() => disconnect(s.id)}
                       busy={busy === `d${s.id}`} />
          ))}
        </ul>
      )}

      <h4 className={styles.subTitle}>
        {servers.length === 0
          ? tt('dserver.connect', 'Connect a server')
          : tt('dserver.connectAnother', 'Connect another server')}
      </h4>

      <div className={styles.caps}>
        {capabilities.map(c => {
          const on = c.required || wanted.includes(c.id);
          return (
            <button key={c.id} type="button"
                    className={on ? styles.capOn : styles.cap}
                    aria-pressed={on}
                    disabled={c.required}
                    onClick={() => toggleWanted(c.id)}>
              <span className={styles.capLabel}>
                {tt(`dserver.cap.${c.id}`, c.label)}
                {c.required && ` ${tt('dserver.always', '(always)')}`}
              </span>
              <span className={styles.capBlurb}>
                {tt(`dserver.capBlurb.${c.id}`, c.blurb)}
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" className={styles.save} onClick={connect}
              disabled={busy === 'connect'}>
        {busy === 'connect'
          ? tt('dserver.opening', 'Opening Discord...')
          : tt('dserver.addBot', 'Add the V-ENT bot')}
      </button>
    </section>
  );
}


function ServerRow({ server, base, tt, capabilities, authHeaders, showToast,
                    reload, onDisconnect, busy }) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState({ channels: [], roles: [] });
  const [working, setWorking] = useState('');

  const loadTargets = useCallback(async () => {
    try {
      const res = await fetch(`${base}/servers/${server.id}/targets/`,
                              { headers: authHeaders });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') setTargets(body.data);
    } catch { /* the controls simply have nothing to offer */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, server.id]);

  // What the bot has done here, from the same log every action writes to.
  // The endpoint has answered since the day the server panel was built;
  // until 12 September nothing on the panel asked it, so "what did V-ENT do
  // in my server" was a question only the database could answer.
  const [log, setLog] = useState(null);       // null = not asked yet
  const [logError, setLogError] = useState('');
  const [showLog, setShowLog] = useState(false);
  const loadLog = async () => {
    setLogError('');
    try {
      const res = await fetch(`${base}/servers/${server.id}/log/`,
                              { headers: authHeaders });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setLogError(apiMessage(tt, body, 'dserver.logFailed',
          'The log could not be loaded.'));
        return;
      }
      setLog(body.data?.actions || []);
    } catch (err) {
      setLogError(apiMessage(tt, err, 'dserver.logFailed',
        'The log could not be loaded.'));
    }
  };

  const act = async (path, payload, label) => {
    setWorking(label);
    try {
      const res = await fetch(`${base}/servers/${server.id}/${path}/`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      showToast?.(body.message || (body.status === 'success' ? 'Done.' : 'That did not work.'));
      if (body.status === 'success') await reload();
      return body.status === 'success';
    } catch {
      showToast?.(tt('dserver.actionFailed', 'That did not reach Discord.'));
      return false;
    } finally {
      setWorking('');
    }
  };

  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <span className={styles.rowName}>
          {server.guild_name || server.guild_id}
        </span>
        {server.last_error
          ? <span className={styles.badgeBad}>{server.last_error}</span>
          : server.checked_at
            ? <span className={styles.badgeOk}>
                {tt('dserver.checked', 'Checked {when}')
                  .replace('{when}', formatDateTime(server.checked_at))}
              </span>
            : null}
      </div>

      {/* What it may do, and what it actually can. A capability that was
          granted but is no longer allowed means somebody changed the bot's
          role in Discord, and that is where it gets fixed. */}
      <div className={styles.capRow}>
        {capabilities.map(c => {
          const granted = (server.granted || []).includes(c.id);
          const can = Boolean((server.can || {})[c.id]);
          if (!granted) return null;
          return (
            <span key={c.id} className={can ? styles.pillOk : styles.pillGap}>
              {tt(`dserver.cap.${c.id}`, c.label)}
              {!can && ` ${tt('dserver.blockedInDiscord', 'blocked in Discord')}`}
            </span>
          );
        })}
      </div>

      <div className={styles.rowActions}>
        <button type="button" className={styles.ghost}
                onClick={() => { const next = !open; setOpen(next); if (next) loadTargets(); }}>
          {open ? tt('dserver.hide', 'Hide controls') : tt('dserver.show', 'Use the bot')}
        </button>
        <button type="button" className={styles.ghost}
                aria-expanded={showLog}
                onClick={() => { const next = !showLog; setShowLog(next); if (next) loadLog(); }}>
          {showLog ? tt('dserver.hideLog', 'Hide the log') : tt('dserver.showLog', 'What the bot did')}
        </button>
        <button type="button" className={styles.ghost} onClick={onDisconnect}
                disabled={busy}>
          {busy ? tt('dserver.working', 'Working...') : tt('dserver.disconnect', 'Disconnect')}
        </button>
      </div>

      {open && <Controls server={server} targets={targets} tt={tt} act={act}
                        working={working} />}

      {showLog && (
        <div className={styles.controls}>
          <div className={styles.block}>
            <span className={styles.blockTitle}>{tt('dserver.log', 'What V-ENT has done here')}</span>
            {logError ? (
              <p className={styles.muted}>{logError}</p>
            ) : log === null ? (
              <p className={styles.muted}>{tt('common.loading', 'Loading...')}</p>
            ) : log.length === 0 ? (
              <p className={styles.muted}>{tt('dserver.logEmpty', 'Nothing yet.')}</p>
            ) : (
              <ul className={styles.log}>
                {log.map((a, i) => (
                  <li key={`${a.at}-${i}`} className={a.ok ? styles.logRow : styles.logRowBad}>
                    <span className={styles.logWhen}>{formatDateTime(a.at)}</span>
                    <span className={styles.logWhat}>
                      {tt(`dserver.act.${a.kind}`, a.kind)}
                      {a.target ? ` ${a.target}` : ''}
                      {a.detail && typeof a.detail === 'object'
                        ? ` ${Object.entries(a.detail).map(([k, v]) => `${k}: ${v}`).join(', ')}`
                        : ''}
                      {a.actor ? ` (${a.actor})` : ''}
                      {!a.ok && a.error ? ` ${a.error}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}


function Controls({ server, targets, tt, act, working }) {
  const can = server.can || {};
  const [channel, setChannel] = useState('');
  const [text, setText] = useState('');
  const [role, setRole] = useState('');
  const [person, setPerson] = useState('');
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState('text');
  const [purgeCount, setPurgeCount] = useState('');
  const [purgeFrom, setPurgeFrom] = useState('');

  const channels = (targets.channels || []).filter(c => !c.category);
  const categories = (targets.channels || []).filter(c => c.category);

  return (
    <div className={styles.controls}>
      {can.announce && <div className={styles.block}>
        <span className={styles.blockTitle}>{tt('dserver.post', 'Post a message')}</span>
        <select className={styles.input} value={channel}
                onChange={e => setChannel(e.target.value)}>
          <option value="">{tt('dserver.pickChannel', 'Pick a channel')}</option>
          {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
        </select>
        <input className={styles.input} type="text" value={text}
               placeholder={tt('dserver.what', 'What do you want to say?')}
               onChange={e => setText(e.target.value)} />
        {can.mention && (
          <select className={styles.input} value={role}
                  onChange={e => setRole(e.target.value)}>
            <option value="">{tt('dserver.tagNobody', 'Tag nobody')}</option>
            {(targets.roles || []).map(r =>
              <option key={r.id} value={r.id}>@{r.name}</option>)}
          </select>
        )}
        <button type="button" className={styles.go}
                disabled={!channel || !text.trim() || working === 'post'}
                onClick={() => act('post', {
                  channel_id: channel, content: text.trim(),
                  mention_roles: role ? [role] : [],
                }, 'post')}>
          {working === 'post' ? tt('dserver.sending', 'Sending...') : tt('dserver.send', 'Send')}
        </button>
      </div>}

      {can.roles && <div className={styles.block}>
        <span className={styles.blockTitle}>{tt('dserver.giveRole', 'Give somebody a role')}</span>
        <input className={styles.input} type="text" value={person}
               placeholder={tt('dserver.discordId', 'Their Discord user ID')}
               onChange={e => setPerson(e.target.value)} />
        <select className={styles.input} value={role}
                onChange={e => setRole(e.target.value)}>
          <option value="">{tt('dserver.pickRole', 'Pick a role')}</option>
          {(targets.roles || []).map(r =>
            <option key={r.id} value={r.id}>@{r.name}</option>)}
        </select>
        <div className={styles.pair}>
          <button type="button" className={styles.go}
                  disabled={!person.trim() || !role || working === 'role'}
                  onClick={() => act('role', {
                    discord_user_id: person.trim(), role_id: role,
                  }, 'role')}>
            {tt('dserver.give', 'Give it')}
          </button>
          <button type="button" className={styles.ghost}
                  disabled={!person.trim() || !role || working === 'role'}
                  onClick={() => act('role', {
                    discord_user_id: person.trim(), role_id: role, remove: true,
                  }, 'role')}>
            {tt('dserver.take', 'Take it back')}
          </button>
        </div>
      </div>}

      {can.channels && <div className={styles.block}>
        <span className={styles.blockTitle}>{tt('dserver.makeChannel', 'Create a channel or category')}</span>
        <input className={styles.input} type="text" value={newName}
               placeholder={tt('dserver.channelName', 'round-of-16')}
               onChange={e => setNewName(e.target.value)} />
        <select className={styles.input} value={newKind}
                onChange={e => setNewKind(e.target.value)}>
          <option value="text">{tt('dserver.aChannel', 'A channel')}</option>
          <option value="category">{tt('dserver.aCategory', 'A category')}</option>
        </select>
        {newKind === 'text' && categories.length > 0 && (
          <select className={styles.input} value={channel}
                  onChange={e => setChannel(e.target.value)}>
            <option value="">{tt('dserver.noCategory', 'Not in a category')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button type="button" className={styles.go}
                disabled={!newName.trim() || working === 'channel'}
                onClick={() => act('channel', {
                  name: newName.trim(), kind: newKind,
                  parent_id: newKind === 'text' ? channel : '',
                }, 'channel')}>
          {tt('dserver.create', 'Create it')}
        </button>
      </div>}

      {can.moderate && <div className={styles.blockDanger}>
        <span className={styles.blockTitle}>{tt('dserver.purge', 'Delete messages')}</span>
        {/* Discord's limits, said before somebody hits them rather than as a
            failure afterwards. */}
        <p className={styles.warn}>
          {tt('dserver.purgeWarn', "This removes other people's messages and cannot be undone. Discord will not delete more than 100 at a time, or anything older than two weeks.")}
        </p>
        <select className={styles.input} value={channel}
                onChange={e => setChannel(e.target.value)}>
          <option value="">{tt('dserver.pickChannel', 'Pick a channel')}</option>
          {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
        </select>
        <input className={styles.input} type="number" min="1" max="100"
               value={purgeCount} placeholder={tt('dserver.howMany', 'How many')}
               onChange={e => setPurgeCount(e.target.value)} />
        <input className={styles.input} type="text" value={purgeFrom}
               placeholder={tt('dserver.onlyFrom', 'Only from this Discord user ID (optional)')}
               onChange={e => setPurgeFrom(e.target.value)} />
        <button type="button" className={styles.danger}
                disabled={!channel || !purgeCount || working === 'purge'}
                onClick={() => act('purge', {
                  channel_id: channel, limit: Number(purgeCount),
                  from_discord_user_id: purgeFrom.trim(),
                }, 'purge')}>
          {working === 'purge'
            ? tt('dserver.deleting', 'Deleting...')
            : tt('dserver.deleteThem', 'Delete them')}
        </button>
      </div>}
    </div>
  );
}
