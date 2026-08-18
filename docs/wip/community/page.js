'use client';

import { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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

const TABS = [
  { id: 'feed', label: 'Feed', icon: <FaComments /> },
  { id: 'forums', label: 'Forums', icon: <FaComments /> },
  { id: 'clubs', label: 'Clubs', icon: <FaUsers /> },
  { id: 'dms', label: 'DMs', icon: <FaEnvelope /> },
  { id: 'scrims', label: 'Scrims', icon: <FaCrosshairs /> },
];

const FORUM_CATEGORIES = ['All', 'General', 'Tournaments', 'Anime', 'Marketplace', 'Tech'];
const SCRIM_GAMES = ['FIFA', 'PUBG Mobile', 'Call of Duty Mobile', 'Free Fire', 'Fortnite', 'Minecraft'];
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const tabParam = searchParams.get('tab');
  const initialTab = TABS.find((t) => t.id === tabParam) ? tabParam : 'feed';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [me, setMe] = useState({
    username: 'you',
    full_name: 'You',
    avatar: 'https://i.pravatar.cc/100?img=12',
  });

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
      if (stored) {
        const p = JSON.parse(stored);
        setMe({
          username: p.username || 'you',
          full_name: p.full_name || p.fullname || 'You',
          avatar: p.profile_picture || 'https://i.pravatar.cc/100?img=12',
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
      const res = await fetch(`${apiUrl}/post/list/`);
      const data = await res.json();
      if (data.status === 'success') setPosts(data.data.posts || []);
    } catch (err) {
      console.error('Posts fetch error:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feed' && posts.length === 0) loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreatePost = async () => {
    if (!composeText.trim() && !composeImage) return;
    try {
      const res = await fetch(`${apiUrl}/post/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      await fetch(`${apiUrl}/post/${postId}/like/`, { method: 'POST' });
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
      const res = await fetch(`${apiUrl}/thread/list/`);
      const data = await res.json();
      if (data.status === 'success') setThreads(data.data.threads || []);
    } catch (err) {
      console.error('Threads fetch error:', err);
    } finally {
      setThreadsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'forums' && threads.length === 0) loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredThreads = useMemo(() => {
    if (forumCategory === 'All') return threads;
    return threads.filter((t) => t.category === forumCategory);
  }, [threads, forumCategory]);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadBody.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/thread/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${apiUrl}/club/list/`);
      const data = await res.json();
      if (data.status === 'success') setClubs(data.data.clubs || []);
    } catch (err) {
      console.error('Clubs fetch error:', err);
    } finally {
      setClubsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'clubs' && clubs.length === 0) loadClubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
      await fetch(`${apiUrl}/club/${id}/join/`, { method: 'POST' });
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

  const loadDms = async () => {
    setDmsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/dm/list/`);
      const data = await res.json();
      if (data.status === 'success') setDmThreads(data.data.threads || []);
    } catch (err) {
      console.error('DMs fetch error:', err);
    } finally {
      setDmsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dms' && dmThreads.length === 0) loadDms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const otherOf = (thread, meUsername) => {
    if (!thread?.participants) return null;
    return thread.participants.find((p) => p.username !== meUsername) || thread.participants[1] || thread.participants[0];
  };

  const filteredDmThreads = useMemo(() => {
    const q = dmContactQuery.trim().toLowerCase();
    if (!q) return dmThreads;
    return dmThreads.filter((t) => {
      const other = otherOf(t, me.username);
      return (other?.full_name || '').toLowerCase().includes(q) ||
        (other?.username || '').toLowerCase().includes(q);
    });
  }, [dmThreads, dmContactQuery, me.username]);

  const handleSendDm = async () => {
    if (!dmInput.trim() || !activeDm || dmSending) return;
    setDmSending(true);
    const optimisticMsg = {
      id: `dmsg_local_${Date.now()}`,
      thread_id: activeDm.id,
      from: 'me',
      body: dmInput.trim(),
      created_at: new Date().toISOString(),
      read: false,
      _local: true,
    };
    setActiveDm((prev) => ({ ...prev, messages: [...(prev.messages || []), optimisticMsg] }));
    const text = dmInput.trim();
    setDmInput('');
    setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/dm/${activeDm.id}/send/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        });
        const data = await res.json();
        if (data.status === 'success' && data.data?.message) {
          setDmThreads((prev) => prev.map((t) => t.id === activeDm.id ? {
            ...t,
            messages: [...(t.messages || []), data.data.message],
            last_message_at: data.data.message.created_at,
          } : t));
        }
      } catch (err) {
        console.error('Send DM error:', err);
      } finally {
        setDmSending(false);
      }
    }, 350);
  };

  // ─── SCRIMS ───
  const [scrims, setScrims] = useState([]);
  const [scrimsLoading, setScrimsLoading] = useState(true);
  const [scrimFilters, setScrimFilters] = useState({ game: '', region: '', status: '' });

  const loadScrims = async () => {
    setScrimsLoading(true);
    try {
      const params = new URLSearchParams();
      if (scrimFilters.game) params.set('game', scrimFilters.game);
      if (scrimFilters.region) params.set('region', scrimFilters.region);
      if (scrimFilters.status) params.set('status', scrimFilters.status);
      const qs = params.toString();
      const res = await fetch(`${apiUrl}/scrim/list/${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      if (data.status === 'success') setScrims(data.data.scrims || []);
    } catch (err) {
      console.error('Scrims fetch error:', err);
    } finally {
      setScrimsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'scrims') loadScrims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, scrimFilters]);

  const handleAcceptScrim = async (id) => {
    setScrims((prev) => prev.map((s) => s.id === id ? { ...s, status: 'matched' } : s));
    try {
      await fetch(`${apiUrl}/scrim/${id}/accept/`, { method: 'POST' });
    } catch (err) {
      console.error('Accept scrim error:', err);
    }
  };

  const statusClassFor = (status) => {
    if (status === 'open') return styles.scrimStatusOpen;
    if (status === 'matched' || status === 'in_progress') return styles.scrimStatusMatched;
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
                Feed, forums, clubs, DMs, and scrims — the social layer of V-ENT.
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
                  <Image src={me.avatar} alt={me.username} width={40} height={40} unoptimized />
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
                          <Image
                            src={post.author.avatar}
                            alt={post.author.username}
                            width={40}
                            height={40}
                            unoptimized
                          />
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

                    <Link href={`/community/post?id=${post.id}`} className={styles.postBodyLink}>
                      <p className={styles.postBody}>{post.content}</p>
                    </Link>

                    {post.images && post.images.length > 0 && (
                      <Link href={`/community/post?id=${post.id}`} className={styles.postBodyLink}>
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
                      <Link href={`/community/post?id=${post.id}`} className={styles.reactBtn} aria-label="comment">
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
                        href={`/community/thread?id=${thread.id}`}
                        className={styles.threadRow}
                      >
                        <div className={styles.threadAvatar}>
                          <Image
                            src={thread.author.avatar}
                            alt={thread.author.username}
                            width={36}
                            height={36}
                            unoptimized
                          />
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
                      <Link href={`/community/club?id=${club.id}`} className={styles.clubLink}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={club.banner} alt={`${club.name} banner`} className={styles.clubBanner} />
                        <div className={styles.clubBody}>
                          <div className={styles.clubLogoWrap}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={club.logo} alt={`${club.name} logo`} className={styles.clubLogo} />
                          </div>
                          <h3 className={styles.clubName}>{club.name}</h3>
                          <p className={styles.clubMeta}>
                            {club.member_count.toLocaleString()} members · {club.game}
                          </p>
                          <p className={styles.clubDesc}>{club.description}</p>
                        </div>
                      </Link>
                      <div className={styles.clubFoot}>
                        {club.is_joined ? (
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
                <div className={styles.dmConvoList}>
                  {dmsLoading ? (
                    <p className={styles.stateText}>Loading conversations...</p>
                  ) : filteredDmThreads.length === 0 ? (
                    <p className={styles.stateText}>No conversations match.</p>
                  ) : (
                    filteredDmThreads.map((thread) => {
                      const other = otherOf(thread, me.username);
                      const lastMsg = thread.messages?.[thread.messages.length - 1];
                      return (
                        <div
                          key={thread.id}
                          className={`${styles.dmConvoItem} ${activeDm?.id === thread.id ? styles.dmConvoActive : ''}`}
                          onClick={() => setActiveDm(thread)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') setActiveDm(thread); }}
                        >
                          <div className={styles.dmConvoAvatar}>
                            <Image
                              src={other?.avatar || 'https://i.pravatar.cc/100?img=12'}
                              alt={other?.username || 'user'}
                              width={38}
                              height={38}
                              unoptimized
                            />
                          </div>
                          <div className={styles.dmConvoMain}>
                            <div className={styles.dmConvoHeader}>
                              <span className={styles.dmConvoName}>
                                {other?.full_name || other?.username || 'User'}
                              </span>
                              <span className={styles.dmConvoTime}>{relativeTime(thread.last_message_at)}</span>
                            </div>
                            <span className={styles.dmConvoPreview}>{lastMsg?.body || '—'}</span>
                          </div>
                          {thread.unread_count > 0 && (
                            <span className={styles.dmUnreadBadge}>{thread.unread_count}</span>
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
                        <Image
                          src={otherOf(activeDm, me.username)?.avatar || 'https://i.pravatar.cc/100?img=12'}
                          alt="user"
                          width={38}
                          height={38}
                          unoptimized
                        />
                      </div>
                      <div>
                        <p className={styles.dmThreadName}>
                          {otherOf(activeDm, me.username)?.full_name || otherOf(activeDm, me.username)?.username}
                        </p>
                        <span className={styles.dmThreadHandle}>@{otherOf(activeDm, me.username)?.username}</span>
                      </div>
                      <Link
                        href={`/community/dm?id=${activeDm.id}`}
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
                          const isMine = msg.from === 'me' || msg.from === 'user_001' || msg.from === me?.id;
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
                    <div className={styles.dmCompose}>
                      <input
                        className={styles.dmComposeInput}
                        placeholder="Type a message..."
                        value={dmInput}
                        onChange={(e) => setDmInput(e.target.value)}
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
                    {SCRIM_GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
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
                          {scrim.format}
                          <span className={styles.scrimRegionMini}> · {scrim.region}</span>
                        </div>
                        <div className={styles.scrimCol} data-label="When">
                          {formatDateTime(scrim.scheduled_at)}
                        </div>
                        <div className={styles.scrimCol} data-label="Status">
                          <span className={`${styles.scrimStatus} ${statusClassFor(scrim.status)}`}>
                            {scrim.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className={styles.scrimCol} style={{ textAlign: 'right' }} data-label="Action">
                          <button
                            className={`${styles.scrimAcceptBtn} ${isOpen ? 'goldBTN' : ''}`}
                            onClick={() => handleAcceptScrim(scrim.id)}
                            disabled={!isOpen || scrim.status !== 'open'}
                          >
                            {scrim.status === 'open' ? 'Accept' : scrim.status === 'matched' ? 'Matched' : 'Closed'}
                          </button>
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
