'use client';

import { appLocale } from '@/lib/appLocale';
import { mediaUrl } from '@/lib/mediaUrl';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Avatar from '@/components/avatar/Avatar';
import { FiArrowLeft } from 'react-icons/fi';
import {
  FaUsers, FaInfoCircle, FaCommentDots, FaCrown, FaShieldAlt,
  FaLock, FaPlus, FaTrash, FaVolumeMute, FaUserSlash, FaPen, FaPaperPlane, FaCog } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './club.module.css';
import { useT, useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
import { sameUser } from '@/lib/gating';

// How often the open topic asks for anything said since the last message it
// holds. `after` returns only what is new, so this is a small request rather
// than the whole thread again.
const REFRESH_MS = 8000;

const relativeTime = iso => {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${Math.max(diffSec, 0)}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return new Date(iso).toLocaleDateString(appLocale(), {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const ROLE_ORDER = { owner: 3, admin: 2, moderator: 1, member: 0 };

const ClubInner = ({ slug: slugFromPath }) => {
  const tx = useTx();
  const tt = useT();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = slugFromPath || searchParams.get('id');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const token = session?.user?.sessionToken || null;

  const [club, setClub] = useState(null);
  const [topics, setTopics] = useState([]);
  const [me, setMe] = useState(null);
  const [openTopic, setOpenTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);

  const threadRef = useRef(null);
  const stickToBottom = useRef(true);

  const authHeaders = useCallback(() => (
    token ? { Authorization: `Bearer ${token}` } : {}
  ), [token]);

  // -- loading ------------------------------------------------------------

  const loadOverview = useCallback(async () => {
    if (!ref) return;
    try {
      const res = await fetch(`${apiUrl}/club/${encodeURIComponent(ref)}/overview/`, {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (body?.status === 'moved') {
        router.replace(body.data.url);
        return;
      }
      if (res.status === 403) { setLocked(true); return; }
      if (body?.status !== 'success') { setNotFound(true); return; }
      setClub(body.data.club);
      setTopics(body.data.topics || []);
      setMe(body.data.me || null);
      setOpenTopic(prev => {
        const still = (body.data.topics || []).some(t => t.id === prev);
        return still ? prev : (body.data.topics?.[0]?.id ?? null);
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, ref, router, authHeaders]);

  useEffect(() => {
    if (!ref) {
      // No name in the address means somebody trimmed it or followed a very
      // old link. The list is a better landing than "not found".
      setLoading(false);
      router.replace('/community?tab=clubs');
      return;
    }
    if (sessionStatus === 'loading') return;
    loadOverview();
  }, [ref, router, loadOverview, sessionStatus]);

  // The whole open topic, once, when it changes.
  useEffect(() => {
    if (!club || !openTopic) return;
    let cancelled = false;
    setLoadingMessages(true);
    (async () => {
      try {
        const res = await fetch(
          `${apiUrl}/club/${encodeURIComponent(club.slug)}/topic/${openTopic}/`,
          { headers: authHeaders() });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (body?.status === 'success') {
          setMessages(body.data.messages || []);
          stickToBottom.current = true;
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [club, openTopic, apiUrl, authHeaders]);

  // Anything said since. Only ever adds, so somebody reading older messages is
  // not yanked around by the poll.
  useEffect(() => {
    if (!club || !openTopic) return undefined;
    const tick = async () => {
      const last = messages.length ? messages[messages.length - 1].id : 0;
      try {
        const res = await fetch(
          `${apiUrl}/club/${encodeURIComponent(club.slug)}/topic/${openTopic}/?after=${last}`,
          { headers: authHeaders() });
        const body = await res.json().catch(() => null);
        if (body?.status === 'success' && body.data.messages?.length) {
          setMessages(prev => {
            const known = new Set(prev.map(m => m.id));
            return [...prev, ...body.data.messages.filter(m => !known.has(m.id))];
          });
        }
      } catch { /* a dropped poll is not worth telling anybody about */ }
    };
    const timer = setInterval(tick, REFRESH_MS);
    return () => clearInterval(timer);
  }, [club, openTopic, messages, apiUrl, authHeaders]);

  const loadMembers = useCallback(async () => {
    if (!club) return;
    const res = await fetch(`${apiUrl}/club/${encodeURIComponent(club.slug)}/members/`, {
      headers: authHeaders(),
    });
    const body = await res.json().catch(() => null);
    if (body?.status === 'success') setMembers(body.data.members || []);
  }, [apiUrl, club, authHeaders]);

  useEffect(() => {
    if (activeTab === 'members') loadMembers();
  }, [activeTab, loadMembers]);

  // Keep the newest message in view, unless the reader has scrolled up to read
  // something older.
  useEffect(() => {
    const el = threadRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // -- actions ------------------------------------------------------------

  const act = useCallback(async (path, body) => {
    setProblem('');
    const res = await fetch(`${apiUrl}/club/${encodeURIComponent(club.slug)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body || {}),
    });
    const payload = await res.json().catch(() => null);
    if (payload?.status !== 'success') {
      setProblem(payload?.message || tt('ui.club.action.failed.4b71', 'That did not go through.'));
      return null;
    }
    return payload.data;
  }, [apiUrl, club, authHeaders, tt]);

  // -- running the club ---------------------------------------------------

  const [draft, setDraft] = useState({ name: '', description: '', is_private: false });
  const [savingClub, setSavingClub] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Seeded from the club rather than held as one source, so opening the tab
  // always shows what is actually stored rather than a stale edit.
  useEffect(() => {
    if (!club) return;
    setDraft({
      name: club.name || '',
      description: club.description || '',
      is_private: !!club.is_private,
    });
  }, [club]);

  const handleSaveClub = async () => {
    if (savingClub) return;
    setSavingClub(true);
    setSaved(false);
    const data = await act('/update/', {
      name: draft.name.trim(),
      description: draft.description.trim(),
      is_private: draft.is_private,
    });
    setSavingClub(false);
    if (!data) return;
    setSaved(true);
    // A rename moves the address. Staying on the old one leaves the page
    // showing a club at a URL that now only redirects.
    const next = data.url || (data.club?.slug ? `/community/club/${data.club.slug}` : null);
    if (next && data.club?.slug && data.club.slug !== club.slug) router.replace(next);
    else await loadOverview();
  };

  const handleDeleteClub = async () => {
    if (deleting) return;
    setDeleting(true);
    const data = await act('/delete/', { confirm_name: confirmName.trim() });
    setDeleting(false);
    if (!data) return;
    router.push('/community?tab=clubs');
  };

  const handleJoin = async () => {
    if (!token) { router.push('/login'); return; }
    const data = await act('/join/');
    if (data) { await loadOverview(); }
  };

  const handleLeave = async () => {
    const data = await act('/leave/');
    if (data) { await loadOverview(); }
  };

  const handleSend = async e => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const data = await act(`/topic/${openTopic}/post/`, { body });
    setSending(false);
    if (data) {
      setDraft('');
      stickToBottom.current = true;
      setMessages(prev => (prev.some(m => m.id === data.message.id)
        ? prev : [...prev, data.message]));
      setTopics(prev => prev.map(t => (t.id === openTopic
        ? { ...t, message_count: (t.message_count || 0) + 1 } : t)));
    }
  };

  const handleAddTopic = async e => {
    e.preventDefault();
    const name = newTopic.trim();
    if (!name) return;
    const data = await act('/topic/create/', { name });
    if (data) {
      setTopics(prev => [...prev, data.topic]);
      setOpenTopic(data.topic.id);
      setNewTopic('');
      setAddingTopic(false);
    }
  };

  const handleLockTopic = async topic => {
    const data = await act(`/topic/${topic.id}/update/`, { is_locked: !topic.is_locked });
    if (data) setTopics(prev => prev.map(t => (t.id === topic.id ? { ...t, ...data.topic } : t)));
  };

  const handleDeleteTopic = async topic => {
    const data = await act(`/topic/${topic.id}/delete/`);
    if (data) {
      const left = topics.filter(t => t.id !== topic.id);
      setTopics(left);
      if (openTopic === topic.id) setOpenTopic(left[0]?.id ?? null);
    }
  };

  const handleDeleteMessage = async id => {
    const data = await act(`/message/${id}/delete/`);
    if (data) setMessages(prev => prev.map(m => (
      m.id === id ? { ...m, deleted: true, body: '' } : m)));
  };

  const handleRole = async (username, role) => {
    const data = await act('/role/', { username, role });
    if (data) setMembers(prev => prev.map(m => (
      m.user.username === username ? data.member : m)));
  };

  const handleMute = async (username, minutes) => {
    const data = await act('/mute/', { username, minutes });
    if (data) setMembers(prev => prev.map(m => (
      m.user.username === username ? data.member : m)));
  };

  const handleRemove = async username => {
    const data = await act('/remove-member/', { username });
    if (data) setMembers(prev => prev.filter(m => m.user.username !== username));
  };

  // -- what the caller may do --------------------------------------------

  // A key built by interpolation is invisible to the dictionary checker and
  // therefore silently English forever. Four roles, four literal keys.
  const roleWord = role => ({
    owner: tt('ui.club.role.owner.c401', 'owner'),
    admin: tt('ui.club.role.admin.7f2b', 'admin'),
    moderator: tt('ui.club.role.moderator.3e88', 'moderator'),
    member: tt('ui.club.role.member.5a19', 'member'),
  }[role] || role);

  const myRank = ROLE_ORDER[me?.role] ?? -1;
  const canManageTopics = !!me?.can_manage_topics;
  const canModerate = !!me?.can_moderate;
  // Renaming changes the address, so it is an admin power. Deleting is the
  // owner's alone: an admin was appointed to help run the club, not end it.
  const canEditClub = !!me?.can_edit_club;
  const canDeleteClub = !!me?.can_delete_club;
  const topic = topics.find(t => t.id === openTopic) || null;

  // -- render -------------------------------------------------------------

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.skeletonHero} />
            <div className={styles.skeletonRail} />
            <div className={styles.skeletonThread} />
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const shell = inner => (
    <div className={styles.pageContainer}>
      <Header /><MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <button className={styles.backLink} onClick={() => router.push('/community?tab=clubs')}>
            <FiArrowLeft /> {tt('ui.back.clubs.8673', 'Back to clubs')}
          </button>
          {inner}
        </div>
      </main>
      <BottomMenu />
    </div>
  );

  if (locked) {
    return shell(
      <div className={styles.emptyState}>
        <FaLock className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>{tt('ui.club.private.9f21', 'This club is private.')}</p>
        <p className={styles.emptyBody}>
          {tt('ui.club.private.body.3a08', 'Only members can read what is said here. Ask somebody in it for an invite.')}
        </p>
      </div>,
    );
  }

  if (notFound || !club) {
    return shell(
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>{tt('ui.club.not.found.e978', 'Club not found.')}</p>
        <Link href="/community?tab=clubs" className={styles.emptyLink}>
          {tt('ui.browse.clubs.7c14', 'Browse every club')}
        </Link>
      </div>,
    );
  }

  return shell(
    <>
      <section className={styles.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(club.banner)} alt={`${club.name} banner`} className={styles.heroBanner} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroBody}>
          <div className={styles.heroLogoWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(club.logo)} alt={`${club.name} logo`} className={styles.heroLogo} />
          </div>
          <div className={styles.heroInfo}>
            <div className={styles.heroTitleRow}>
              <h1 className={styles.heroName}>{club.name}</h1>
              {club.is_private && (
                <span className={styles.heroBadge}>
                  <FaShieldAlt /> {tt('ui.invite.only.80fa', 'Invite only')}
                </span>
              )}
            </div>
            <p className={styles.heroMeta}>
              <FaUsers /> {(club.member_count || 0).toLocaleString(appLocale())}{' '}
              {tt('ui.members.lower.51bd', 'members')}
              {club.game ? ` · ${club.game}` : ''}
            </p>
          </div>
          <div className={styles.heroCta}>
            {!me?.is_member ? (
              <button className={`${styles.joinBtn} goldBTN`} onClick={handleJoin}>
                {tt('ui.join.club.965f', 'Join club')}
              </button>
            ) : me.role === 'owner' ? (
              <span className={styles.joinedBtn}><FaCrown /> {tt('ui.club.you.own.6d3f', 'You run this club')}</span>
            ) : (
              <button className={styles.leaveBtn} onClick={handleLeave}>
                {tt('ui.leave.club.2e57', 'Leave club')}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className={styles.tabs} role="tablist">
        {[
          { id: 'chat', label: tt('ui.club.tab.chat.b104', 'Chat'), icon: <FaCommentDots /> },
          { id: 'members', label: tt('ui.club.tab.members.c22e', 'Members'), icon: <FaUsers /> },
          { id: 'about', label: tt('ui.club.tab.about.f0a9', 'About'), icon: <FaInfoCircle /> },
          ...(canEditClub
            ? [{ id: 'settings', label: tt('club.tabSettings', 'Settings'), icon: <FaCog /> }]
            : []),
        ].map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id}
                  className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(t.id)}>
            <span className={styles.tabIcon}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {activeTab === 'chat' && (
        <div className={styles.chatLayout}>
          <div className={styles.topicRail}>
            <p className={styles.railHeading}>{tt('ui.club.topics.a5c2', 'Topics')}</p>
            <div className={styles.railList}>
              {topics.map(t => (
                <button key={t.id}
                        className={`${styles.topicChip} ${t.id === openTopic ? styles.topicChipOpen : ''}`}
                        onClick={() => setOpenTopic(t.id)}>
                  <span className={styles.topicChipName}>
                    {t.is_locked && <FaLock className={styles.topicLockIcon} />}
                    {t.name}
                  </span>
                  {typeof t.message_count === 'number' && (
                    <span className={styles.topicCount}>{t.message_count}</span>
                  )}
                </button>
              ))}
            </div>
            {canManageTopics && (addingTopic ? (
              <form className={styles.topicForm} onSubmit={handleAddTopic}>
                <input className={styles.topicInput} value={newTopic} maxLength={80}
                       onChange={e => setNewTopic(e.target.value)} autoFocus
                       placeholder={tt('ui.club.topic.name.d3f6', 'Topic name')} />
                <button type="submit" className={styles.topicSave}>
                  {tt('ui.club.topic.add.1e9b', 'Add')}
                </button>
                <button type="button" className={styles.topicCancel}
                        onClick={() => { setAddingTopic(false); setNewTopic(''); }}>
                  {tt('ui.cancel.3f11', 'Cancel')}
                </button>
              </form>
            ) : (
              <button className={styles.addTopicBtn} onClick={() => setAddingTopic(true)}>
                <FaPlus /> {tt('ui.club.new.topic.8ba0', 'New topic')}
              </button>
            ))}
          </div>

          <div className={styles.threadPane}>
            {topic && (
              <div className={styles.threadHead}>
                <div>
                  <p className={styles.threadName}>
                    {topic.is_locked && <FaLock className={styles.topicLockIcon} />}
                    {topic.name}
                  </p>
                  {topic.description && <p className={styles.threadDesc}>{tx(topic.description)}</p>}
                </div>
                {canManageTopics && (
                  <div className={styles.threadTools}>
                    <button className={styles.toolBtn} onClick={() => handleLockTopic(topic)}
                            title={topic.is_locked
                              ? tt('ui.club.unlock.topic.5c0d', 'Unlock topic')
                              : tt('ui.club.lock.topic.9a41', 'Lock topic')}>
                      <FaLock />
                      {topic.is_locked
                        ? tt('ui.club.unlock.5f2a', 'Unlock')
                        : tt('ui.club.lock.b6e3', 'Lock')}
                    </button>
                    {topics.length > 1 && (
                      <button className={styles.toolBtn} onClick={() => handleDeleteTopic(topic)}>
                        <FaTrash /> {tt('ui.club.delete.topic.72d5', 'Delete topic')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className={styles.thread} ref={threadRef} onScroll={onThreadScroll}>
              {loadingMessages ? (
                <>
                  <div className={styles.skeletonMsg} />
                  <div className={styles.skeletonMsg} />
                  <div className={styles.skeletonMsg} />
                </>
              ) : messages.length === 0 ? (
                <p className={styles.threadEmpty}>
                  {tt('ui.club.no.messages.4d7c', 'Nothing said here yet. Start it off.')}
                </p>
              ) : messages.map(m => (
                <div key={m.id} className={styles.msgRow}>
                  <Avatar src={m.author?.avatar} name={m.author?.username || '?'} size={34} />
                  <div className={styles.msgBody}>
                    <div className={styles.msgHead}>
                      {m.author
                        ? <UserChip user={m.author} size={0} nameClassName={styles.msgAuthor} />
                        : <span className={styles.msgAuthor}>{tt('ui.club.someone.0f8e', 'Someone')}</span>}
                      <span className={styles.msgTime}>{relativeTime(m.created_at)}</span>
                      {!m.deleted
                        && (canModerate || sameUser(m.author?.username, session?.user?.username)) && (
                        <button className={styles.msgDelete}
                                aria-label={tt('ui.club.remove.message.b8c7', 'Remove message')}
                                onClick={() => handleDeleteMessage(m.id)}>
                          <FaTrash />
                        </button>
                      )}
                    </div>
                    {m.deleted
                      ? <p className={styles.msgRemoved}>
                          {tt('ui.club.message.removed.3e19', 'This message was removed.')}
                        </p>
                      : <p className={styles.msgText}>{m.body}</p>}
                  </div>
                </div>
              ))}
            </div>

            {!me?.is_member ? (
              <p className={styles.composerNote}>
                {token
                  ? tt('ui.club.join.to.post.7a3d', 'Join this club to say something in it.')
                  : tt('ui.club.signin.to.post.2b6f', 'Sign in and join this club to say something in it.')}
              </p>
            ) : me.is_muted ? (
              <p className={styles.composerNote}>
                {tt('ui.club.you.are.muted.9d02', 'You are muted in this club. You can still read.')}
              </p>
            ) : topic?.is_locked && !canModerate ? (
              <p className={styles.composerNote}>
                {tt('ui.club.topic.locked.1c48', 'This topic is locked. Only the people running the club can post in it.')}
              </p>
            ) : (
              <form className={styles.composer} onSubmit={handleSend}>
                <textarea className={styles.composerInput} value={draft} rows={1} maxLength={4000}
                          placeholder={tt('ui.club.say.something.6e5a', 'Say something')}
                          onChange={e => setDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
                          }} />
                <button type="submit" className={styles.composerSend}
                        disabled={sending || !draft.trim()}
                        aria-label={tt('ui.club.send.5f80', 'Send')}>
                  <FaPaperPlane />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className={styles.membersList}>
          {members.length === 0 && (
            <p className={styles.threadEmpty}>{tt('ui.club.no.members.5d31', 'Nobody has joined yet.')}</p>
          )}
          {members.map(m => {
            const theirRank = ROLE_ORDER[m.role] ?? 0;
            const above = myRank > theirRank;
            return (
              <div key={m.id} className={styles.memberRow}>
                <Link href={`/u/${encodeURIComponent(m.user.username)}`} className={styles.memberWho}>
                  <Avatar src={m.user.avatar} name={m.user.username} size={44} />
                  <div className={styles.memberInfo}>
                    <UserChip user={m.user} size={0} link={false} nameClassName={styles.memberName} />
                    <span className={`${styles.memberRole} ${styles[`role_${m.role}`] || ''}`}>
                      {m.role === 'owner' && <FaCrown className={styles.roleIcon} />}
                      {m.role === 'admin' && <FaShieldAlt className={styles.roleIcon} />}
                      {m.role === 'moderator' && <FaPen className={styles.roleIcon} />}
                      {roleWord(m.role)}
                      {m.is_muted ? ` · ${tt('ui.club.muted.4f6c', 'muted')}` : ''}
                    </span>
                  </div>
                </Link>
                {above && (
                  <div className={styles.memberTools}>
                    {me?.can_manage_roles && (
                      <select className={styles.roleSelect} value={m.role}
                              aria-label={tt('ui.club.change.role.0e77', 'Change role')}
                              onChange={e => handleRole(m.user.username, e.target.value)}>
                        <option value="member">{roleWord('member')}</option>
                        <option value="moderator">{roleWord('moderator')}</option>
                        {me.role === 'owner' && (
                          <option value="admin">{roleWord('admin')}</option>
                        )}
                      </select>
                    )}
                    {me?.can_moderate && (
                      <button className={styles.toolBtn}
                              onClick={() => handleMute(m.user.username, m.is_muted ? 0 : 60)}>
                        <FaVolumeMute />
                        {m.is_muted
                          ? tt('ui.club.unmute.8c11', 'Unmute')
                          : tt('ui.club.mute.hour.3d94', 'Mute 1h')}
                      </button>
                    )}
                    {me?.can_remove_members && (
                      <button className={styles.toolBtn} onClick={() => handleRemove(m.user.username)}>
                        <FaUserSlash /> {tt('ui.club.remove.7b26', 'Remove')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'about' && (
        <div className={styles.aboutCard}>
          <h2 className={styles.aboutHeading}>{tt('ui.about.6b21', 'About')} {club.name}</h2>
          <p className={styles.aboutText}>
            {club.description
              ? tx(club.description)
              : tt('ui.club.no.description.2a53', 'This club has not written a description yet.')}
          </p>
          <div className={styles.aboutStats}>
            <div className={styles.aboutStat}>
              <span className={styles.aboutStatLabel}>{tt('ui.game.e3e8', 'Game')}</span>
              <span className={styles.aboutStatValue}>
                {club.game || tt('ui.club.any.game.9e4b', 'Any game')}
              </span>
            </div>
            <div className={styles.aboutStat}>
              <span className={styles.aboutStatLabel}>{tt('ui.members.1cb4', 'Members')}</span>
              <span className={styles.aboutStatValue}>
                {(club.member_count || 0).toLocaleString(appLocale())}
              </span>
            </div>
            <div className={styles.aboutStat}>
              <span className={styles.aboutStatLabel}>{tt('ui.club.topics.a5c2', 'Topics')}</span>
              <span className={styles.aboutStatValue}>{topics.length}</span>
            </div>
            <div className={styles.aboutStat}>
              <span className={styles.aboutStatLabel}>{tt('ui.type.3deb', 'Type')}</span>
              <span className={styles.aboutStatValue}>
                {club.is_private
                  ? tt('ui.invite.only.80fa', 'Invite only')
                  : tt('ui.club.public.6f30', 'Public')}
              </span>
            </div>
            <div className={styles.aboutStat}>
              <span className={styles.aboutStatLabel}>{tt('ui.club.run.by.5b8a', 'Run by')}</span>
              <span className={styles.aboutStatValue}>
                {club.owner ? `@${club.owner.username}` : tt('ui.club.nobody.7d02', 'Nobody')}
              </span>
            </div>
            <div className={styles.aboutStat}>
              <span className={styles.aboutStatLabel}>{tt('ui.created.accf', 'Created')}</span>
              <span className={styles.aboutStatValue}>
                {new Date(club.created_at).toLocaleDateString(appLocale(), {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && canEditClub && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingsCard}>
            <p className={styles.settingsTitle}>{tt('club.settingsTitle', 'About this club')}</p>
            <p className={styles.settingsHint}>
              {tt('club.renameHint', 'Renaming changes the address. Every link already shared keeps working.')}
            </p>
            <label className={styles.settingsField}>
              <span className={styles.settingsLabel}>{tt('club.name', 'Name')}</span>
              <input className={styles.settingsInput} value={draft.name} maxLength={120}
                     onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            </label>
            <label className={styles.settingsField}>
              <span className={styles.settingsLabel}>{tt('club.description', 'Description')}</span>
              <textarea className={styles.settingsArea} rows={3} value={draft.description}
                        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
            </label>
            <label className={styles.settingsCheck}>
              <input type="checkbox" checked={draft.is_private}
                     onChange={e => setDraft(d => ({ ...d, is_private: e.target.checked }))} />
              <span>{tt('community.clubPrivate', 'Private: only members can read it')}</span>
            </label>
            <button type="button" className={`${styles.settingsSave} goldBTN`}
                    onClick={handleSaveClub} disabled={savingClub}>
              {savingClub ? tt('ui.saving', 'Saving...') : tt('ui.save', 'Save')}
            </button>
            {saved && <span className={styles.settingsSaved}>{tt('ui.saved', 'Saved')}</span>}
          </div>

          {canDeleteClub && (
            <div className={styles.dangerCard}>
              <p className={styles.settingsTitle}>{tt('club.deleteTitle', 'Delete this club')}</p>
              <p className={styles.settingsHint}>
                {tt('club.deleteHint', 'Every topic and message goes with it, and it cannot be undone. Type the name to confirm.')}
              </p>
              <input className={styles.settingsInput} value={confirmName}
                     placeholder={club.name}
                     onChange={e => setConfirmName(e.target.value)} />
              <button type="button" className={`${styles.deleteBtn} redBTN`}
                      onClick={handleDeleteClub}
                      disabled={deleting
                        || confirmName.trim().toLowerCase() !== (club.name || '').trim().toLowerCase()}>
                {deleting ? tt('club.deleting', 'Deleting...') : tt('club.deleteAction', 'Delete this club')}
              </button>
            </div>
          )}
        </div>
      )}
    </>,
  );
};

const ClubPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <ClubInner />
  </Suspense>
);

export default ClubPage;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { ClubInner };
