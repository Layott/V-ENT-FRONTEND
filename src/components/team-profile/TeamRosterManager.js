'use client';

// Getting people into a team, and saying what they may do.
//
// CEO, 29 August 2026: "There is no way for me to add players to my teams or
// invite people, or get a link players can use to join directly. no where to
// also manage the roles of players in the team and the access they have and
// what they can control."
//
// Three ways in, and they are different things, so they are three parts of one
// panel rather than three screens:
//
//   - invite a named player, who is told and answers;
//   - post a link, which anyone who follows it can use;
//   - and, already built, accept the people who ask.
//
// Every control here is drawn from `my_permissions`, which the server sends
// with the roster. A coach is not shown an invite box that would refuse them:
// telling somebody what they cannot do before they try is the difference
// between a rule and a trap.

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
import styles from './team-roster-manager.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const TeamRosterManager = ({ team, onToast }) => {
  const tt = useT();
  const { data: session } = useSession();
  const ref = team?.slug || team?.id || team?.team_id;

  const [roster, setRoster] = useState(null);
  const [invites, setInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [invitee, setInvitee] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [linkUses, setLinkUses] = useState('');
  const [linkDays, setLinkDays] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken
      ? { Authorization: `Bearer ${session.user.sessionToken}` }
      : {}),
  }), [session]);

  const load = useCallback(async () => {
    if (!ref || !session?.user?.sessionToken) return;
    try {
      const [rosterRes, rolesRes] = await Promise.all([
        fetch(`${API}/team/${ref}/roster/`, { headers: headers() }),
        fetch(`${API}/team/roles/`),
      ]);
      const rosterData = await rosterRes.json();
      if (rosterData.status === 'success') setRoster(rosterData.data);
      const rolesData = await rolesRes.json();
      if (rolesData.status === 'success') setRoles(rolesData.data.roles || []);

      // Only somebody who may invite can read the invitations, so this is
      // asked for separately rather than failing the whole panel.
      if ((rosterData.data?.my_permissions || []).includes('invite')) {
        const invRes = await fetch(`${API}/team/${ref}/invites/`, { headers: headers() });
        const invData = await invRes.json();
        if (invData.status === 'success') setInvites(invData.data.invites || []);
      }
    } catch {
      setError(tt('team.rosterFailed', 'Could not load the roster.'));
    }
  }, [ref, session, headers, tt]);

  useEffect(() => { load(); }, [load]);

  const can = (p) => (roster?.my_permissions || []).includes(p);

  // The server decides what a role MAY DO; the page decides what it is
  // CALLED. A sentence built in Python arrives already written and cannot be
  // translated, so the English it sends is only the fallback.
  const roleLabel = (r) => tt(r.label_key || `role.${r.role}`, r.label);
  const roleBlurb = (r) => tt(r.blurb_key || `role.${r.role}.blurb`, r.blurb || '');
  const roleName = (role) => {
    const found = roles.find(r => r.role === role);
    return found ? roleLabel(found) : String(role || '').replace('_', ' ');
  };

  const send = async (path, body, okMessage) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/team/${path}`, {
        method: 'POST', headers: headers(), body: JSON.stringify(body || {}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        onToast?.(okMessage);
        await load();
        return true;
      }
      setError(apiMessage(tt, data, 'api.failed', 'That did not work.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server.'));
    } finally {
      setBusy(false);
    }
    return false;
  };

  const invite = async () => {
    if (!invitee.trim()) return;
    const done = await send(`${ref}/invites/`,
      { username: invitee.trim(), role: inviteRole },
      tt('team.inviteSent', 'Invitation sent.'));
    if (done) setInvitee('');
  };

  const makeLink = () => send(`${ref}/invites/`, {
    kind: 'link',
    role: inviteRole,
    max_uses: Number(linkUses) || 0,
    expires_in_days: Number(linkDays) || 0,
  }, tt('team.linkMade', 'Join link created.'));

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setError(tt('team.copyBlocked', 'Copying was blocked. Select the link and copy it.'));
    }
  };

  if (!roster) return null;

  const roleInfo = roles.find(r => r.role === inviteRole);
  const links = invites.filter(i => i.kind === 'link' && !i.spent);
  const pending = invites.filter(i => i.kind === 'direct' && i.status === 'pending');

  // Nothing to manage, so nothing is drawn. A panel of disabled controls tells
  // somebody they are unwelcome; showing none tells them nothing at all, which
  // is correct for a player who is simply a player.
  if (!can('invite') && !can('set_role') && !can('remove_member')) return null;

  return (
    <div className={styles.wrap}>
      {error && <p className={styles.error}>{error}</p>}

      {can('invite') && (
        <section className={styles.card}>
          <h3 className={styles.title}>{tt('team.addPlayers', 'Add players')}</h3>
          <p className={styles.hint}>
            {tt('team.addPlayersHint', 'Invite somebody by their username, or post a link anyone can use to join.')}
          </p>

          <div className={styles.row}>
            <input
              className={styles.input}
              placeholder={tt('team.usernamePlaceholder', 'Their username')}
              value={invitee}
              onChange={e => setInvitee(e.target.value)}
            />
            <select className={styles.select} value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}>
              {roles.filter(r => r.role !== 'owner').map(r => (
                <option key={r.role} value={r.role}>{roleLabel(r)}</option>
              ))}
            </select>
            <button type="button" className={styles.primary} disabled={busy || !invitee.trim()}
                    onClick={invite}>
              {tt('team.invite', 'Invite')}
            </button>
          </div>

          {/* What the role they are being given actually means. */}
          {roleInfo && <p className={styles.roleBlurb}>{roleBlurb(roleInfo)}</p>}

          {can('manage_links') && (
            <div className={styles.linkBlock}>
              <h4 className={styles.subTitle}>{tt('team.joinLink', 'A link anyone can use')}</h4>
              <p className={styles.hint}>
                {tt('team.joinLinkHint', 'Post it in a group chat. Give it a limit so one forwarded message does not leave the door open forever.')}
              </p>
              <div className={styles.row}>
                <input className={styles.small} type="number" min="0"
                       placeholder={tt('team.maxUses', 'Uses (0 = no limit)')}
                       value={linkUses} onChange={e => setLinkUses(e.target.value)} />
                <input className={styles.small} type="number" min="0"
                       placeholder={tt('team.expiresDays', 'Expires in days (0 = never)')}
                       value={linkDays} onChange={e => setLinkDays(e.target.value)} />
                <button type="button" className={styles.ghost} disabled={busy} onClick={makeLink}>
                  {tt('team.makeLink', 'Create link')}
                </button>
              </div>

              {links.length === 0
                ? <p className={styles.muted}>{tt('team.noLinks', 'No live join link.')}</p>
                : links.map(l => (
                  <div key={l.id} className={styles.linkRow}>
                    <code className={styles.linkUrl}>{l.url}</code>
                    <span className={styles.linkMeta}>
                      {l.max_uses
                        ? tt('team.usesLeft', '{n} of {max} used')
                            .replace('{n}', l.uses).replace('{max}', l.max_uses)
                        : tt('team.usesNoLimit', '{n} used, no limit').replace('{n}', l.uses)}
                    </span>
                    <button type="button" className={styles.ghost} onClick={() => copy(l.url)}>
                      {copied === l.url ? tt('team.copied', 'Copied') : tt('team.copy', 'Copy')}
                    </button>
                    <button type="button" className={styles.danger} disabled={busy}
                            onClick={() => send(`${ref}/invites/${l.id}/revoke/`, {},
                                                tt('team.linkOff', 'Link switched off.'))}>
                      {tt('team.switchOff', 'Switch off')}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className={styles.linkBlock}>
              <h4 className={styles.subTitle}>{tt('team.waiting', 'Waiting for an answer')}</h4>
              {pending.map(i => (
                <div key={i.id} className={styles.linkRow}>
                  <UserChip user={i.user} size={28} />
                  <span className={styles.linkMeta}>{roleName(i.role)}</span>
                  <button type="button" className={styles.danger} disabled={busy}
                          onClick={() => send(`${ref}/invites/${i.id}/revoke/`, {},
                                              tt('team.inviteWithdrawn', 'Invitation withdrawn.'))}>
                    {tt('team.withdraw', 'Withdraw')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(can('set_role') || can('remove_member')) && (
        <section className={styles.card}>
          <h3 className={styles.title}>{tt('team.whoDoesWhat', 'Who does what')}</h3>
          <p className={styles.hint}>
            {tt('team.whoDoesWhatHint', 'A role decides what somebody can do here. The owner keeps their role until the team is transferred.')}
          </p>

          {(roster.members || []).map(m => {
            const isOwner = m.role === 'owner';
            return (
              <div key={m.id} className={styles.memberRow}>
                <UserChip user={m.user} size={34} secondary />
                {can('set_role') && !isOwner ? (
                  <select className={styles.select} value={m.role} disabled={busy}
                          onChange={e => send(`${ref}/set-role/`,
                            { username: m.user.username, role: e.target.value },
                            tt('team.roleUpdated', 'Role updated.'))}>
                    {roles.filter(r => r.role !== 'owner').map(r => (
                      <option key={r.role} value={r.role}>{roleLabel(r)}</option>
                    ))}
                  </select>
                ) : (
                  <span className={styles.roleTag}>{roleName(m.role)}</span>
                )}
                {!isOwner && can('remove_member') && (
                  <button type="button" className={styles.danger} disabled={busy}
                          onClick={() => send(`${ref}/remove/`, { username: m.user.username },
                                              tt('team.removed', 'Removed from the team.'))}>
                    {tt('team.remove', 'Remove')}
                  </button>
                )}
              </div>
            );
          })}

          <details className={styles.details}>
            <summary className={styles.summary}>
              {tt('team.whatRolesMean', 'What each role can do')}
            </summary>
            <div className={styles.roleList}>
              {roles.map(r => (
                <div key={r.role} className={styles.roleItem}>
                  <strong className={styles.roleName}>{roleLabel(r)}</strong>
                  <span className={styles.roleText}>{roleBlurb(r)}</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  );
};

export default TeamRosterManager;
