'use client';

import { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Avatar from '@/components/avatar/Avatar';
import Link from 'next/link';
import {
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaShare,
  FaBookmark,
  FaRegBookmark,
  FaComments,
  FaUsers,
  FaEnvelope,
  FaCrosshairs,
  FaImage,
  FaPaperPlane,
  FaPoll,
  FaThumbtack,
  FaLock,
  FaSearch,
  FaPlus,
  FaCheck,
} from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './community.module.css';
import useGames from '@/hooks/useGames';

const TABS = [
  { id: 'feed', label: 'Feed', icon: <FaComments /> },
  { id: 'forums', label: 'Forums', icon: <FaComments /> },
  { id: 'clubs', label: 'Clubs', icon: <FaUsers /> },
  { id: 'dms', label: 'DMs', icon: <FaEnvelope /> },
  { id: 'scrims', label: 'Scrims', icon: <FaCrosshairs /> },
];

const FORUM_CATEGORIES = ['All', 'General', 'Tournaments', 'Anime', 'Marketplace', 'Tech'];
const SCRIM_REGIONS = ['NG-West', 'NG-East', 'ZA', 'KE', 'EU-West', 'NA-East'];

const relativeTime = (iso) => {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const CommunityInner = () => {
  const { data: session, status: sessionStatus } = useSession();
  const { gameTitles } = useGames();
  const token = session?.user?.sessionToken || '';

  // Every read and write here needs the Bearer token. Without it writes answer
  // 401, and reads come back with every viewer flag (liked / joined / owner)
  // false - so nothing fetches until the session has resolved.
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const sessionReady = sessionStatus !== 'loading';

  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const tabParam = searchParams.get('tab');
  const initialTab = TABS.find((t) => t.id === tabParam) ? tabParam : 'feed';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [me, setMe] = useState({
    username: 'you',
    full_name: 'You',
    avatar: null,
  });

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
      if (stored) {
        const p = JSON.parse(stored);
        setMe({
          username: p.username || 'you',
          full_name: p.full_name || p.fullname || 'You',
          avatar: p.profile_picture ,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleTabChange = (id) => {
    setActiveTab(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'feed') params.delete('tab');
    else params.set('tab', id);
    router.replace(`/community${params.toString() ? `?${params}` : ''}`, { scroll: false });
  };

  // ─── FEED ───
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [composeText, setComposeText] = useState('');
  const [composeImage, setComposeImage] = useState('');
  const [feedQuery, setFeedQuery] = useState('');
  const fileInputRef = useRef(null);

  const loadPosts = async () => {
    setFeedLoading(true);
    try {
      const res = await fetch(`${apiUrl}/post/list/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === 'success') setPosts(data.data.posts || []);
    } catch (err) {
      console.error('Posts fetch error:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (sessionReady && activeTab === 'feed') loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, sessionReady]);

  const handleCreatePost = async () => {
    if (!composeText.trim() && !composeImage) return;
    try {
      const res = await fetch(`${apiUrl}/post/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          body: composeText.trim(),
          content: composeText.trim(),
          images: composeImage ? [composeImage] : [],
          type: composeImage ? 'image' : 'text',
        }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.post) {
        setPosts((prev) => [data.data.post, ...prev]);
        setComposeText('');
        setComposeImage('');
      }
    } catch (err) {
      console.error('Compose post error:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setComposeImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAttachImage = () => fileInputRef.current?.click();

  const handleToggleLike = async (postId) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? {
      ...p,
      is_liked: !p.is_liked,
      likes_count: p.likes_count + (p.is_liked ? -1 : 1),
    } : p));
    try {
      await fetch(`${apiUrl}/post/${postId}/like/`, { method: 'POST', headers: authHeaders() });
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleToggleBookmark = (postId) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_bookmarked: !p.is_bookmarked } : p));
  };

  const filteredPosts = useMemo(() => {
    const q = feedQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) =>
      (p.content || '').toLowerCase().includes(q) ||
      (p.author?.username || '').toLowerCase().includes(q),
    );
  }, [posts, feedQuery]);

  // ─── FORUMS ───
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [forumCategory, setForumCategory] = useState('All');
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState('General');

  const loadThreads = async () => {
    setThreadsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/thread/list/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === 'success') setThreads(data.data.threads || []);
    } catch (err) {
      console.error('Threads fetch error:', err);
    } finally {
      setThreadsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionReady && activeTab === 'forums') loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, sessionReady]);

  const filteredThreads = useMemo(() => {
    if (forumCategory === 'All') return threads;
    return threads.filter((t) => t.category === forumCategory);
  }, [threads, forumCategory]);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadBody.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/thread/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newThreadTitle.trim(),
          body: newThreadBody.trim(),
          category: newThreadCategory,
        }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.thread) {
        setThreads((prev) => [data.data.thread, ...prev]);
        setNewThreadTitle('');
        setNewThreadBody('');
        setNewThreadCategory('General');
        setShowNewThread(false);
      }
    } catch (err) {
      console.error('Create thread error:', err);
    }
  };

  // ─── CLUBS ───
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [clubQuery, setClubQuery] = useState('');

  const loadClubs = async () => {
    setClubsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/club/list/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === 'success') setClubs(data.data.clubs || []);
    } catch (err) {
      console.error('Clubs fetch error:', err);
    } finally {
      setClubsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionReady && activeTab === 'clubs') loadClubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, sessionReady]);

  const filteredClubs = useMemo(() => {
    const q = clubQuery.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.game || '').toLowerCase().includes(q),
    );
  }, [clubs, clubQuery]);

  const handleJoinClub = async (id) => {
    setClubs((prev) => prev.map((c) => c.id === id ? {
      ...c,
      is_joined: true,
      member_count: c.member_count + 1,
    } : c));
    try {
      await fetch(`${apiUrl}/club/${id}/join/`, { method: 'POST', headers: authHeaders() });
    } catch (err) {
      console.error('Join club error:', err);
    }
  };

  // ─── DMs ───
  const [dmThreads, setDmThreads] = useState([]);
  const [dmsLoading, setDmsLoading] = useState(true);
  const [activeDm, setActiveDm] = useState(null);
  const [dmInput, setDmInput] = useState('');
  const [dmContactQuery, setDmContactQuery] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const [dmError, setDmError] = useState('');

  const loadDms = async () => {
    setDmsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/dm/list/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === 'success') setDmThreads(data.data.conversations || []);
    } catch (err) {
      console.error('DMs fetch error:', err);
    } finally {
      setDmsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionReady && activeTab === 'dms') loadDms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, sessionReady]);

  // The API keys each conversation by the person on the other end.
  const otherOf = (convo) => convo?.with || null;

  const filteredDmThreads = useMemo(() => {
    const q = dmContactQuery.trim().toLowerCase();
    if (!q) return dmThreads;
    return dmThreads.filter((t) => {
      const other = otherOf(t);
      return (other?.full_name || '').toLowerCase().includes(q) ||
        (other?.username || '').toLowerCase().includes(q);
    });
  }, [dmThreads, dmContactQuery]);

  const openDm = async (convo) => {
    setDmError('');
    setActiveDm({ ...convo, messages: [] });
    try {
      const res = await fetch(`${apiUrl}/dm/${convo.id}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === 'success') {
        setActiveDm({ ...data.data.conversation, messages: data.data.messages || [] });
        // Opening marks it read server-side; mirror that in the list.
        setDmThreads((prev) => prev.map((t) => (t.id === convo.id ? { ...t, unread_count: 0 } : t)));
      } else {
        setDmError(data.message || 'Could not open that conversation.');
      }
    } catch (err) {
      console.error('Open DM error:', err);
      setDmError('Could not reach the server.');
    }
  };

  const handleSendDm = async () => {
    if (!dmInput.trim() || !activeDm || dmSending) return;
    setDmSending(true);
    const localId = `dmsg_local_${Date.now()}`;
    const optimisticMsg = {
      id: localId,
      body: dmInput.trim(),
      mine: true,
      created_at: new Date().toISOString(),
      _local: true,
    };
    setActiveDm((prev) => ({ ...prev, messages: [...(prev.messages || []), optimisticMsg] }));
    const text = dmInput.trim();
    setDmInput('');

    // Drop the optimistic row: either swap in the row the server stored, or
    // pull it back out so a failed send never looks delivered.
    const replaceLocal = (messages, serverMsg) =>
      serverMsg
        ? (messages || []).map((m) => (m.id === localId ? serverMsg : m))
        : (messages || []).filter((m) => m.id !== localId);

    try {
      const res = await fetch(`${apiUrl}/dm/${activeDm.id}/send/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      const serverMsg = data.status === 'success' ? data.data?.message : null;
      if (!serverMsg) setDmError(data.message || 'Message not sent.');
      setActiveDm((prev) => (prev ? { ...prev, messages: replaceLocal(prev.messages, serverMsg) } : prev));
      if (serverMsg) {
        setDmThreads((prev) => prev.map((t) => t.id === activeDm.id ? {
          ...t,
          last_message: serverMsg.body,
          last_message_at: serverMsg.created_at,
        } : t));
      }
    } catch (err) {
      console.error('Send DM error:', err);
      setDmError('Could not reach the server. Message not sent.');
      setActiveDm((prev) => (prev ? { ...prev, messages: replaceLocal(prev.messages, null) } : prev));
    } finally {
      setDmSending(false);
    }
  };

  // Starting a conversation: the API creates it on the first message.
  // /community?tab=dms&to=<username> opens the composer prefilled, which is how
  // "Message" buttons elsewhere on the site hand off to DMs.
  const dmTarget = searchParams.get('to') || '';
  const [newDmOpen, setNewDmOpen] = useState(Boolean(dmTarget));
  const [newDmUsername, setNewDmUsername] = useState(dmTarget);
  const [newDmBody, setNewDmBody] = useState('');
  const [newDmSending, setNewDmSending] = useState(false);
  const [newDmError, setNewDmError] = useState('');

  const handleStartDm = async () => {
    if (!newDmUsername.trim() || !newDmBody.trim() || newDmSending) return;
    setNewDmSending(true);
    setNewDmError('');
    try {
      const res = await fetch(`${apiUrl}/dm/new/send/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ username: newDmUsername.trim().replace(/^@/, ''), body: newDmBody.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNewDmOpen(false);
        setNewDmUsername('');
        setNewDmBody('');
        await loadDms();
        await openDm({ id: data.data.conversation_id });
      } else {
        setNewDmError(data.message || 'Could not start that conversation.');
      }
    } catch (err) {
      console.error('Start DM error:', err);
      setNewDmError('Could not reach the server.');
    } finally {
      setNewDmSending(false);
    }
  };

  // ─── SCRIMS ───
  const [scrims, setScrims] = useState([]);
  const [scrimsLoading, setScrimsLoading] = useState(true);
  const [scrimFilters, setScrimFilters] = useState({ game: '', region: '', status: '' });

  const [myTeams, setMyTeams] = useState([]);
  const [acceptFor, setAcceptFor] = useState(null); // scrim id awaiting a team choice
  const [scrimError, setScrimError] = useState('');

  const loadScrims = async () => {
    setScrimsLoading(true);
    try {
      const params = new URLSearchParams();
      if (scrimFilters.game) params.set('game', scrimFilters.game);
      if (scrimFilters.region) params.set('region', scrimFilters.region);
      if (scrimFilters.status) params.set('status', scrimFilters.status);
      const qs = params.toString();
      const res = await fetch(`${apiUrl}/scrim/list/${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === 'success') setScrims(data.data.scrims || []);
    } catch (err) {
      console.error('Scrims fetch error:', err);
    } finally {
      setScrimsLoading(false);
    }
  };

  // Accepting a scrim means bringing one of your own teams, so the list is
  // needed before the Accept button can do anything.
  const loadMyTeams = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/team/my-teams/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === 'success') setMyTeams(data.data.teams || []);
    } catch (err) {
      console.error('My teams fetch error:', err);
    }
  };

  useEffect(() => {
    if (sessionReady && activeTab === 'scrims') {
      loadScrims();
      loadMyTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, scrimFilters, token, sessionReady]);

  const acceptScrimWithTeam = async (scrimId, teamId) => {
    setScrimError('');
    setAcceptFor(null);
    try {
      const res = await fetch(`${apiUrl}/scrim/${scrimId}/accept/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ team_id: teamId }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.scrim) {
        setScrims((prev) => prev.map((s) => (s.id === scrimId ? data.data.scrim : s)));
      } else {
        setScrimError(data.message || 'Could not accept that scrim.');
      }
    } catch (err) {
      console.error('Accept scrim error:', err);
      setScrimError('Could not reach the server.');
    }
  };

  const handleAcceptScrim = (scrim) => {
    const eligible = myTeams.filter((t) => (t.id || t.team_id) !== (scrim.team_a?.id));
    if (eligible.length === 0) {
      setScrimError(
        myTeams.length === 0
          ? 'You need a team before you can accept a scrim.'
          : `${scrim.team_a?.name} is your own team. Bring a different one to accept.`,
      );
      return;
    }
    if (eligible.length === 1) {
      acceptScrimWithTeam(scrim.id, eligible[0].id || eligible[0].team_id);
      return;
    }
    setAcceptFor(acceptFor === scrim.id ? null : scrim.id);
  };

  const statusClassFor = (status) => {
    if (status === 'open') return styles.scrimStatusOpen;
    if (status === 'accepted' || status === 'in_progress') return styles.scrimStatusMatched;
    return styles.scrimStatusCompleted;
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Community</h1>
              <p className={styles.pageSubtitle}>
                Feed, forums, clubs, DMs and scrims. The social layer of V-ENT.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabActive : ''}`}
                onClick={() => handleTabChange(t.id)}
                role="tab"
                aria-selected={activeTab === t.id}
              >
                <span className={styles.tabIcon}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── FEED ─── */}
          {activeTab === 'feed' && (
            <div className={styles.feedLayout}>
              <div className={styles.feedSearchBar}>
                <FaSearch className={styles.feedSearchIcon} />
                <input
                  className={styles.feedSearchInput}
                  placeholder="Search posts or users..."
                  value={feedQuery}
                  onChange={(e) => setFeedQuery(e.target.value)}
                />
              </div>

              <div className={styles.composeBox}>
                <div className={styles.composeAvatar}>
                  <Avatar src={me.avatar} name={me.username} size={40} />
                </div>
                <div className={styles.composeBody}>
                  <textarea
                    className={styles.composeTextarea}
                    placeholder={`What's on your mind, ${me.full_name.split(' ')[0]}?`}
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    maxLength={500}
                  />
                  {composeImage && (
                    <div className={styles.composeImageWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={composeImage} alt="attachment preview" className={styles.composeImagePreview} />
                      <button type="button" className={styles.composeImageRemove} onClick={() => setComposeImage('')}>
                        Remove
                      </button>
                    </div>
                  )}
                  <div className={styles.composeActions}>
                    <button type="button" className={styles.composeImageBtn} onClick={handleAttachImage}>
                      <FaImage /> {composeImage ? 'Replace image' : 'Attach image'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <span className={styles.composeCounter}>{composeText.length}/500</span>
                    <button
                      type="button"
                      className={`${styles.composePostBtn} goldBTN`}
                      onClick={handleCreatePost}
                      disabled={!composeText.trim() && !composeImage}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>

              {feedLoading ? (
                <p className={styles.stateText}>Loading feed...</p>
              ) : filteredPosts.length === 0 ? (
                <p className={styles.stateText}>
                  {feedQuery ? 'No posts match your search.' : 'No posts yet. Be the first.'}
                </p>
              ) : (
                filteredPosts.map((post) => (
                  <article key={post.id} className={styles.postCard}>
                    <div className={styles.postHeader}>
                      <Link href={`/user-profile?username=${post.author.username}`} className={styles.postAvatarLink}>
                        <div className={styles.postAvatar}>
                          <Avatar src={post.author.avatar} name={post.author.username} size={40} />
                        </div>
                      </Link>
                      <div className={styles.postAuthorInfo}>
                        <span className={styles.postAuthorName}>
                          {post.author.full_name}
                          {post.author.verified && <span className={styles.verifiedDot} title="Verified" />}
                        </span>
                        <span className={styles.postAuthorHandle}>@{post.author.username}</span>
                      </div>
                      <span className={styles.postTime}>{relativeTime(post.created_at)}</span>
                    </div>

                    <Link href={`/community/post/${post.slug || post.id}`} className={styles.postBodyLink}>
                      <p className={styles.postBody}>{post.content}</p>
                    </Link>

                    {post.images && post.images.length > 0 && (
                      <Link href={`/community/post/${post.slug || post.id}`} className={styles.postBodyLink}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.images[0]} alt="post attachment" className={styles.postImage} />
                      </Link>
                    )}

                    {post.poll && (
                      <div className={styles.poll}>
                        <p className={styles.pollQuestion}>
                          <FaPoll className={styles.pollIcon} /> {post.poll.question}
                        </p>
                        {post.poll.options.map((opt) => {
                          const pct = post.poll.total_votes > 0
                            ? Math.round((opt.votes / post.poll.total_votes) * 100)
                            : 0;
                          return (
                            <div key={opt.id} className={styles.pollOption}>
                              <div className={styles.pollBar} style={{ width: `${pct}%` }} />
                              <span className={styles.pollLabel}>{opt.label}</span>
                              <span className={styles.pollPct}>{pct}%</span>
                            </div>
                          );
                        })}
                        <p className={styles.pollFooter}>{post.poll.total_votes.toLocaleString()} votes</p>
                      </div>
                    )}

                    <div className={styles.postActions}>
                      <button
                        className={`${styles.reactBtn} ${post.is_liked ? styles.liked : ''}`}
                        onClick={() => handleToggleLike(post.id)}
                        aria-label="like"
                      >
                        {post.is_liked ? <FaHeart className={styles.reactIcon} /> : <FaRegHeart className={styles.reactIcon} />}
                        <span>{post.likes_count}</span>
                      </button>
                      <Link href={`/community/post/${post.slug || post.id}`} className={styles.reactBtn} aria-label="comment">
                        <FaRegComment className={styles.reactIcon} />
                        <span>{post.comments_count}</span>
                      </Link>
                      <button className={styles.reactBtn} aria-label="share">
                        <FaShare className={styles.reactIcon} />
                        <span>{post.shares}</span>
                      </button>
                      <button
                        className={`${styles.reactBtn} ${styles.reactBookmark} ${post.is_bookmarked ? styles.bookmarked : ''}`}
                        onClick={() => handleToggleBookmark(post.id)}
                        aria-label="bookmark"
                      >
                        {post.is_bookmarked ? <FaBookmark className={styles.reactIcon} /> : <FaRegBookmark className={styles.reactIcon} />}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* ─── FORUMS ─── */}
          {activeTab === 'forums' && (
            <div className={styles.forumsLayout}>
              <div className={styles.categoryList} role="tablist" aria-label="Forum categories">
                {FORUM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`${styles.categoryBtn} ${forumCategory === cat ? styles.categoryActive : ''}`}
                    onClick={() => setForumCategory(cat)}
                  >
                    <span>{cat}</span>
                  </button>
                ))}
                <button
                  className={`${styles.newThreadCta} goldBTN`}
                  onClick={() => setShowNewThread((s) => !s)}
                >
                  <FaPlus /> New thread
                </button>
              </div>

              <div className={styles.threadColumn}>
                {showNewThread && (
                  <div className={styles.newThreadBox}>
                    <h3 className={styles.newThreadTitle}>Start a new thread</h3>
                    <input
                      className={styles.newThreadInput}
                      placeholder="Thread title"
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      maxLength={120}
                    />
                    <select
                      className={styles.newThreadSelect}
                      value={newThreadCategory}
                      onChange={(e) => setNewThreadCategory(e.target.value)}
                    >
                      {FORUM_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <textarea
                      className={styles.newThreadTextarea}
                      placeholder="Write your post..."
                      value={newThreadBody}
                      onChange={(e) => setNewThreadBody(e.target.value)}
                      maxLength={2000}
                    />
                    <div className={styles.newThreadActions}>
                      <button
                        className={styles.newThreadCancel}
                        onClick={() => setShowNewThread(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className={`${styles.newThreadSubmit} goldBTN`}
                        onClick={handleCreateThread}
                        disabled={!newThreadTitle.trim() || !newThreadBody.trim()}
                      >
                        Post thread
                      </button>
                    </div>
                  </div>
                )}

                <div className={styles.threadList}>
                  {threadsLoading ? (
                    <p className={styles.stateText}>Loading threads...</p>
                  ) : filteredThreads.length === 0 ? (
                    <p className={styles.stateText}>No threads in this category.</p>
                  ) : (
                    filteredThreads.map((thread) => (
                      <Link
                        key={thread.id}
                        href={`/community/thread/${thread.slug || thread.id}`}
                        className={styles.threadRow}
                      >
                        <div className={styles.threadAvatar}>
                          <Avatar src={thread.author.avatar} name={thread.author.username} size={36} />
                        </div>
                        <div className={styles.threadMain}>
                          <h3 className={styles.threadTitle}>
                            {thread.is_pinned && <FaThumbtack className={styles.threadPin} title="Pinned" />}
                            {thread.is_locked && <FaLock className={styles.threadLock} title="Locked" />}
                            {thread.title}
                          </h3>
                          <div className={styles.threadMeta}>
                            <span className={styles.threadCategoryPill}>{thread.category}</span>
                            <span>by @{thread.author.username}</span>
                            <span>Updated {relativeTime(thread.last_activity)}</span>
                          </div>
                        </div>
                        <div className={styles.threadStats}>
                          <span className={styles.threadReplyCount}>{thread.reply_count}</span>
                          <span className={styles.threadReplyLabel}>replies</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── CLUBS ─── */}
          {activeTab === 'clubs' && (
            <div className={styles.clubsSection}>
              <div className={styles.feedSearchBar}>
                <FaSearch className={styles.feedSearchIcon} />
                <input
                  className={styles.feedSearchInput}
                  placeholder="Search clubs by name or game..."
                  value={clubQuery}
                  onChange={(e) => setClubQuery(e.target.value)}
                />
              </div>

              <div className={styles.clubsGrid}>
                {clubsLoading ? (
                  <p className={styles.stateText}>Loading clubs...</p>
                ) : filteredClubs.length === 0 ? (
                  <p className={styles.stateText}>No clubs match your search.</p>
                ) : (
                  filteredClubs.map((club) => (
                    <div key={club.id} className={styles.clubCard}>
                      <Link href={`/community/club/${club.slug || club.id}`} className={styles.clubLink}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {club.banner ? (
                          <img src={club.banner} alt={`${club.name} banner`} className={styles.clubBanner} />
                        ) : (
                          <div className={styles.clubBannerFallback} />
                        )}
                        <div className={styles.clubBody}>
                          <div className={styles.clubLogoWrap}>
                            <Avatar src={club.logo} name={club.name} size={50} />
                          </div>
                          <h3 className={styles.clubName}>{club.name}</h3>
                          <p className={styles.clubMeta}>
                            {club.member_count.toLocaleString()} {club.member_count === 1 ? 'member' : 'members'} · {club.game || 'No game set'}
                          </p>
                          <p className={styles.clubDesc}>{club.description}</p>
                        </div>
                      </Link>
                      <div className={styles.clubFoot}>
                        {club.is_owner ? (
                          <button className={styles.clubJoinedBtn} disabled>
                            <FaCheck /> Owner
                          </button>
                        ) : club.is_joined ? (
                          <button className={styles.clubJoinedBtn} disabled>
                            <FaCheck /> Joined
                          </button>
                        ) : (
                          <button
                            className={`${styles.clubJoinBtn} goldBTN`}
                            onClick={() => handleJoinClub(club.id)}
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── DMs ─── */}
          {activeTab === 'dms' && (
            <div className={styles.dmLayout}>
              <div className={styles.dmConvoListWrap}>
                <div className={styles.dmContactSearch}>
                  <FaSearch className={styles.feedSearchIcon} />
                  <input
                    className={styles.feedSearchInput}
                    placeholder="Search contacts..."
                    value={dmContactQuery}
                    onChange={(e) => setDmContactQuery(e.target.value)}
                  />
                </div>

                <button
                  className={`${styles.dmNewBtn} goldBTN`}
                  onClick={() => setNewDmOpen((v) => !v)}
                >
                  <FaPlus /> New message
                </button>

                {newDmOpen && (
                  <div className={styles.dmNewForm}>
                    <input
                      className={styles.dmNewInput}
                      placeholder="Username, e.g. playr"
                      value={newDmUsername}
                      onChange={(e) => setNewDmUsername(e.target.value)}
                    />
                    <textarea
                      className={styles.dmNewTextarea}
                      placeholder="First message..."
                      value={newDmBody}
                      onChange={(e) => setNewDmBody(e.target.value)}
                      maxLength={1000}
                    />
                    {newDmError && <p className={styles.dmError}>{newDmError}</p>}
                    <button
                      className={`${styles.dmNewSendBtn} goldBTN`}
                      onClick={handleStartDm}
                      disabled={!newDmUsername.trim() || !newDmBody.trim() || newDmSending}
                    >
                      {newDmSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                )}

                <div className={styles.dmConvoList}>
                  {dmsLoading ? (
                    <p className={styles.stateText}>Loading conversations...</p>
                  ) : dmThreads.length === 0 ? (
                    <p className={styles.stateText}>No conversations yet. Start one above.</p>
                  ) : filteredDmThreads.length === 0 ? (
                    <p className={styles.stateText}>No conversations match that search.</p>
                  ) : (
                    filteredDmThreads.map((convo) => {
                      const other = otherOf(convo);
                      return (
                        <div
                          key={convo.id}
                          className={`${styles.dmConvoItem} ${activeDm?.id === convo.id ? styles.dmConvoActive : ''}`}
                          onClick={() => openDm(convo)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') openDm(convo); }}
                        >
                          <div className={styles.dmConvoAvatar}>
                            <Avatar src={other?.avatar} name={other?.full_name || other?.username || 'user'} size={38} />
                          </div>
                          <div className={styles.dmConvoMain}>
                            <div className={styles.dmConvoHeader}>
                              <span className={styles.dmConvoName}>
                                {other?.full_name || other?.username || 'User'}
                              </span>
                              <span className={styles.dmConvoTime}>{relativeTime(convo.last_message_at)}</span>
                            </div>
                            <span className={styles.dmConvoPreview}>
                              {convo.last_message || 'No messages yet'}
                            </span>
                          </div>
                          {convo.unread_count > 0 && (
                            <span className={styles.dmUnreadBadge}>{convo.unread_count}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={styles.dmThreadPane}>
                {activeDm ? (
                  <>
                    <div className={styles.dmThreadHeader}>
                      <div className={styles.dmConvoAvatar}>
                        <Avatar
                          src={otherOf(activeDm)?.avatar}
                          name={otherOf(activeDm)?.full_name || otherOf(activeDm)?.username || 'user'}
                          size={38}
                        />
                      </div>
                      <div>
                        <p className={styles.dmThreadName}>
                          {otherOf(activeDm)?.full_name || otherOf(activeDm)?.username || 'Conversation'}
                        </p>
                        <span className={styles.dmThreadHandle}>@{otherOf(activeDm)?.username || ''}</span>
                      </div>
                      <Link
                        href={`/community/dm/${activeDm.slug || activeDm.id}`}
                        className={styles.dmFullScreenLink}
                      >
                        Full screen
                      </Link>
                    </div>
                    <div className={styles.dmThreadMessages}>
                      {(activeDm.messages || []).length === 0 ? (
                        <p className={styles.stateText}>No messages yet. Send the first one.</p>
                      ) : (
                        activeDm.messages.map((msg) => {
                          const isMine = Boolean(msg.mine);
                          return (
                            <div
                              key={msg.id}
                              className={`${styles.dmBubble} ${isMine ? styles.dmBubbleSent : styles.dmBubbleReceived}`}
                            >
                              {msg.body}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {dmError && <p className={styles.dmError}>{dmError}</p>}
                    <div className={styles.dmCompose}>
                      <input
                        className={styles.dmComposeInput}
                        placeholder="Type a message..."
                        value={dmInput}
                        onChange={(e) => { setDmInput(e.target.value); if (dmError) setDmError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendDm(); }}
                      />
                      <button
                        className={`${styles.dmSendBtn} redBTN`}
                        onClick={handleSendDm}
                        disabled={!dmInput.trim() || dmSending}
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.dmEmpty}>
                    <FaEnvelope className={styles.dmEmptyIcon} />
                    <p>Pick a conversation</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── SCRIMS ─── */}
          {activeTab === 'scrims' && (
            <div className={styles.scrimsSection}>
              <div className={styles.scrimsHeaderRow}>
                <div className={styles.scrimsFilters}>
                  <select
                    className={styles.scrimSelect}
                    value={scrimFilters.game}
                    onChange={(e) => setScrimFilters((p) => ({ ...p, game: e.target.value }))}
                  >
                    <option value="">All games</option>
                    {gameTitles.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select
                    className={styles.scrimSelect}
                    value={scrimFilters.region}
                    onChange={(e) => setScrimFilters((p) => ({ ...p, region: e.target.value }))}
                  >
                    <option value="">All regions</option>
                    {SCRIM_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select
                    className={styles.scrimSelect}
                    value={scrimFilters.status}
                    onChange={(e) => setScrimFilters((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="matched">Matched</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <Link href="/community/scrim/create" className={`${styles.scrimChallengeCta} goldBTN`}>
                  <FaPlus /> Challenge
                </Link>
              </div>

              {scrimError && <p className={styles.dmError}>{scrimError}</p>}

              <div className={styles.scrimTable}>
                <div className={styles.scrimTableHeader}>
                  <div>Team</div>
                  <div>Opponent</div>
                  <div>Game</div>
                  <div>Format</div>
                  <div>When</div>
                  <div>Status</div>
                  <div style={{ textAlign: 'right' }}>Action</div>
                </div>

                {scrimsLoading ? (
                  <p className={styles.stateText}>Loading scrims...</p>
                ) : scrims.length === 0 ? (
                  <p className={styles.stateText}>No scrims match your filters.</p>
                ) : (
                  scrims.map((scrim) => {
                    const oppBlock = scrim.opponent_open_or_team_b;
                    const opponent = oppBlock?.opponent;
                    const isOpen = oppBlock?.open || scrim.status === 'open';
                    return (
                      <div key={scrim.id} className={styles.scrimRow}>
                        <div className={`${styles.scrimCol} ${styles.scrimTeam}`} data-label="Team">
                          {scrim.team_a?.tag && <span className={styles.scrimTag}>[{scrim.team_a.tag}]</span>}{' '}
                          {scrim.team_a?.name}
                        </div>
                        <div className={styles.scrimCol} data-label="Opponent">
                          {opponent ? (
                            <>
                              {opponent.tag && <span className={styles.scrimTag}>[{opponent.tag}]</span>}{' '}
                              {opponent.name}
                            </>
                          ) : (
                            <span className={styles.scrimOpenSlot}>Open slot</span>
                          )}
                        </div>
                        <div className={styles.scrimCol} data-label="Game">{scrim.game}</div>
                        <div className={styles.scrimCol} data-label="Format">
                          {scrim.format || 'Not set'}
                          {scrim.region && <span className={styles.scrimRegionMini}> · {scrim.region}</span>}
                        </div>
                        <div className={styles.scrimCol} data-label="When">
                          {scrim.scheduled_at ? formatDateTime(scrim.scheduled_at) : 'Flexible'}
                        </div>
                        <div className={styles.scrimCol} data-label="Status">
                          <span className={`${styles.scrimStatus} ${statusClassFor(scrim.status)}`}>
                            {scrim.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className={styles.scrimCol} style={{ textAlign: 'right' }} data-label="Action">
                          {scrim.is_mine && scrim.status === 'open' ? (
                            <span className={styles.scrimOwnLabel}>Yours</span>
                          ) : (
                            <button
                              className={`${styles.scrimAcceptBtn} ${isOpen && !scrim.is_mine ? 'goldBTN' : ''}`}
                              onClick={() => handleAcceptScrim(scrim)}
                              disabled={!isOpen || scrim.status !== 'open' || !token}
                            >
                              {scrim.status === 'open' ? 'Accept' : scrim.status === 'accepted' ? 'Matched' : 'Closed'}
                            </button>
                          )}
                          {acceptFor === scrim.id && (
                            <div className={styles.scrimTeamPicker}>
                              {myTeams
                                .filter((t) => (t.id || t.team_id) !== scrim.team_a?.id)
                                .map((t) => (
                                  <button
                                    key={t.id || t.team_id}
                                    className={styles.scrimTeamPickBtn}
                                    onClick={() => acceptScrimWithTeam(scrim.id, t.id || t.team_id)}
                                  >
                                    {t.name || t.team_name}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const Community = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <CommunityInner />
  </Suspense>
);

export default Community;
