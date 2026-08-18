'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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

const buildClubPosts = (club) => {
  if (!club) return [];
  const posters = [
    { username: 'lead_scout', full_name: 'Adaeze Lead', avatar: 'https://i.pravatar.cc/120?img=33' },
    { username: 'iron_grip', full_name: 'Tunde I.', avatar: 'https://i.pravatar.cc/120?img=11' },
    { username: 'mira_v', full_name: 'Mira V.', avatar: 'https://i.pravatar.cc/120?img=47' },
    { username: 'broforce', full_name: 'Bro Force', avatar: 'https://i.pravatar.cc/120?img=8' },
    { username: 'kira_x', full_name: 'Kira X.', avatar: 'https://i.pravatar.cc/120?img=22' },
  ];
  const lines = [
    `Welcome to ${club.name}. Drop your username and main map.`,
    `Tryouts open this Friday — top 4 join the club roster.`,
    `Just dropped a tutorial — link below. Hope it helps the new members.`,
    `Internal scrim tonight, 8 PM WAT. React if you can roll.`,
    `Patch notes are out. Loadout meta is shifting again. Thoughts?`,
  ];
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `clbpost_${club.id}_${i}`,
    author: posters[i % posters.length],
    body: lines[i % lines.length],
    likes_count: 12 + i * 7,
    comments_count: 2 + i,
    created_at: new Date(Date.now() - (i + 1) * 3600 * 1000 * (i + 2)).toISOString(),
  }));
};

const buildClubMembers = (club) => {
  if (!club) return [];
  const total = Math.min(12, Math.max(6, Math.round(club.member_count / 50)));
  const roles = ['Owner', 'Mod', ...Array(total - 2).fill('Member')];
  const names = ['Tari K.', 'Dami O.', 'Femi A.', 'Nneka P.', 'Zee M.', 'Emeka N.',
    'Ada V.', 'Bode L.', 'Chika T.', 'Kunle B.', 'Funke A.', 'Ebuka R.'];
  return Array.from({ length: total }).map((_, i) => ({
    id: `clbm_${club.id}_${i}`,
    username: names[i].toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''),
    full_name: names[i],
    avatar: `https://i.pravatar.cc/120?img=${(i * 5 + 12) % 70}`,
    role: roles[i],
    joined_at: new Date(Date.now() - (i + 1) * 5 * 86400 * 1000).toISOString(),
  }));
};

const buildClubEvents = (club) => {
  if (!club) return [];
  return [
    {
      id: `clbevt_${club.id}_0`,
      title: `${club.game} Internal Cup`,
      starts_at: new Date(Date.now() + 4 * 86400 * 1000).toISOString(),
      type: 'Tournament',
      location: 'Online · NG-West',
    },
    {
      id: `clbevt_${club.id}_1`,
      title: `Weekly Scrim Night`,
      starts_at: new Date(Date.now() + 1 * 86400 * 1000).toISOString(),
      type: 'Scrim',
      location: 'Online',
    },
    {
      id: `clbevt_${club.id}_2`,
      title: `Member Meetup — Lagos`,
      starts_at: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      type: 'Meetup',
      location: 'Lagos, NG',
    },
  ];
};

const ClubInner = () => {
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
        if (data.status === 'success') setClub(data.data.club || null);
      } catch (err) {
        console.error('Club fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClub();
  }, [id, apiUrl]);

  const posts = useMemo(() => buildClubPosts(club), [club]);
  const members = useMemo(() => buildClubMembers(club), [club]);
  const events = useMemo(() => buildClubEvents(club), [club]);

  const handleJoin = async () => {
    if (!club) return;
    setClub((prev) => ({
      ...prev,
      is_joined: true,
      member_count: (prev.member_count || 0) + 1,
    }));
    try {
      await fetch(`${apiUrl}/club/${club.id}/join/`, { method: 'POST' });
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
                          <Image src={p.author.avatar} alt={p.author.username} width={36} height={36} unoptimized />
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
                        <Image src={m.avatar} alt={m.username} width={48} height={48} unoptimized />
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
