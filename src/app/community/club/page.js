'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Avatar from '@/components/avatar/Avatar';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import {
  FaUsers,
  FaCheck,
  FaCalendarAlt,
  FaInfoCircle,
  FaCommentDots,
  FaCrown,
  FaShieldAlt,
} from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './club.module.css';

const TABS = [
  { id: 'posts', label: 'Posts', icon: <FaCommentDots /> },
  { id: 'members', label: 'Members', icon: <FaUsers /> },
  { id: 'about', label: 'About', icon: <FaInfoCircle /> },
  { id: 'events', label: 'Events', icon: <FaCalendarAlt /> },
];

const relativeTime = (iso) => {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ClubInner = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchClub = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/club/${id}/`);
        const data = await res.json();
        if (data.status === 'success') {
          setClub(data.data.club || null);
          setMembers(data.data.members || []);
          setPosts(data.data.posts || []);
        }
      } catch (err) {
        console.error('Club fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClub();
  }, [id, apiUrl]);

  // Real club content - the page used to generate five fake posts, a dozen fake
  // members and invented events from the club's own name.
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const events = [];   // club events are not modelled yet

  const handleJoin = async () => {
    if (!club) return;
    setClub((prev) => ({
      ...prev,
      is_joined: true,
      member_count: (prev.member_count || 0) + 1,
    }));
    try {
      const res = await fetch(`${apiUrl}/club/${club.id}/join/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken ? { Authorization: `Bearer ${session.user.sessionToken}` } : {}),
        },
      });
      const body = await res.json();
      if (body?.status === 'success') {
        setClub((prev) => prev && ({ ...prev, joined: body.data.joined, member_count: body.data.member_count }));
      }
    } catch (err) {
      console.error('Join error:', err);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <button className={styles.backLink} onClick={() => router.push('/community?tab=clubs')}>
            <FiArrowLeft /> Back to clubs
          </button>

          {loading ? (
            <p className={styles.stateText}>Loading club...</p>
          ) : !club ? (
            <p className={styles.stateText}>Club not found.</p>
          ) : (
            <>
              <section className={styles.hero}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={club.banner} alt={`${club.name} banner`} className={styles.heroBanner} />
                <div className={styles.heroOverlay} />
                <div className={styles.heroBody}>
                  <div className={styles.heroLogoWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={club.logo} alt={`${club.name} logo`} className={styles.heroLogo} />
                  </div>
                  <div className={styles.heroInfo}>
                    <div className={styles.heroTitleRow}>
                      <h1 className={styles.heroName}>{club.name}</h1>
                      {club.type === 'invite_only' && (
                        <span className={styles.heroBadge}>
                          <FaShieldAlt /> Invite only
                        </span>
                      )}
                    </div>
                    <p className={styles.heroMeta}>
                      <FaUsers /> {club.member_count.toLocaleString()} members · {club.game}
                    </p>
                  </div>
                  <div className={styles.heroCta}>
                    {club.is_joined ? (
                      <button className={styles.joinedBtn} disabled>
                        <FaCheck /> Joined
                      </button>
                    ) : (
                      <button className={`${styles.joinBtn} goldBTN`} onClick={handleJoin}>
                        Join club
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <div className={styles.tabs} role="tablist">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(t.id)}
                    role="tab"
                    aria-selected={activeTab === t.id}
                  >
                    <span className={styles.tabIcon}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'posts' && (
                <div className={styles.postsList}>
                  {posts.map((p) => (
                    <article key={p.id} className={styles.postCard}>
                      <div className={styles.postHeader}>
                        <div className={styles.postAvatar}>
                          <Avatar src={p.author.avatar} name={p.author.username} size={36} />
                        </div>
                        <div className={styles.postAuthorInfo}>
                          <span className={styles.postAuthorName}>{p.author.full_name}</span>
                          <span className={styles.postAuthorHandle}>@{p.author.username}</span>
                        </div>
                        <span className={styles.postTime}>{relativeTime(p.created_at)}</span>
                      </div>
                      <p className={styles.postBody}>{p.body}</p>
                      <div className={styles.postFooter}>
                        <span>{p.likes_count} likes</span>
                        <span>{p.comments_count} comments</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {activeTab === 'members' && (
                <div className={styles.membersGrid}>
                  {members.map((m) => (
                    <Link href={`/user-profile?username=${m.username}`} key={m.id} className={styles.memberCard}>
                      <div className={styles.memberAvatar}>
                        <Avatar src={m.avatar} name={m.username} size={48} />
                      </div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{m.full_name}</span>
                        <span className={styles.memberHandle}>@{m.username}</span>
                      </div>
                      <span className={`${styles.memberRole} ${m.role === 'Owner' ? styles.roleOwner : m.role === 'Mod' ? styles.roleMod : ''}`}>
                        {m.role === 'Owner' && <FaCrown style={{ marginRight: 4 }} />}
                        {m.role}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {activeTab === 'about' && (
                <div className={styles.aboutCard}>
                  <h2 className={styles.aboutHeading}>About {club.name}</h2>
                  <p className={styles.aboutText}>{club.description}</p>

                  <div className={styles.aboutStats}>
                    <div className={styles.aboutStat}>
                      <span className={styles.aboutStatLabel}>Game</span>
                      <span className={styles.aboutStatValue}>{club.game}</span>
                    </div>
                    <div className={styles.aboutStat}>
                      <span className={styles.aboutStatLabel}>Members</span>
                      <span className={styles.aboutStatValue}>{club.member_count.toLocaleString()}</span>
                    </div>
                    <div className={styles.aboutStat}>
                      <span className={styles.aboutStatLabel}>Posts</span>
                      <span className={styles.aboutStatValue}>{(club.posts_count || 0).toLocaleString()}</span>
                    </div>
                    <div className={styles.aboutStat}>
                      <span className={styles.aboutStatLabel}>Type</span>
                      <span className={styles.aboutStatValue}>{club.type === 'invite_only' ? 'Invite only' : 'Public'}</span>
                    </div>
                    <div className={styles.aboutStat}>
                      <span className={styles.aboutStatLabel}>Created</span>
                      <span className={styles.aboutStatValue}>
                        {new Date(club.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <h3 className={styles.aboutSubheading}>Rules</h3>
                  <ul className={styles.rulesList}>
                    <li>No toxic behaviour or harassment.</li>
                    <li>Posts must be on-topic for {club.game}.</li>
                    <li>Spam, advertising, or self-promo gets auto-removed.</li>
                    <li>Only owners and mods schedule official events.</li>
                  </ul>
                </div>
              )}

              {activeTab === 'events' && (
                <div className={styles.eventsList}>
                  {events.map((e) => (
                    <div key={e.id} className={styles.eventCard}>
                      <div className={styles.eventDate}>
                        <FaCalendarAlt />
                        <span>{formatDateTime(e.starts_at)}</span>
                      </div>
                      <div className={styles.eventBody}>
                        <span className={styles.eventType}>{e.type}</span>
                        <h3 className={styles.eventTitle}>{e.title}</h3>
                        <p className={styles.eventLocation}>{e.location}</p>
                      </div>
                      <button className={`${styles.eventCta} goldBTN`}>Interested</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const ClubPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <ClubInner />
  </Suspense>
);

export default ClubPage;
