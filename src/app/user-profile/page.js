'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { getJson } from '@/lib/apiCache';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import OverviewPanel from '@/components/profile-panels/OverviewPanel';
import ActivityPanel from '@/components/profile-panels/ActivityPanel';
import GalleryPanel from '@/components/profile-panels/GalleryPanel';
import SocialLinksPanel from '@/components/profile-panels/SocialLinksPanel';
import FavoriteGamesPanel from '@/components/profile-panels/FavoriteGamesPanel';
import EmptyStatePanel from '@/components/profile-panels/EmptyStatePanel';
import { jsonHeaders } from '@/lib/authHeader';
import styles from './user-profile.module.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'gallery', label: 'Image Gallery' },
  { id: 'social', label: 'Social Links' },
  { id: 'games', label: 'Favorite Games' },
];

// ── helpers ───────────────────────────────────────────────────────────────

const buildAbsolute = (apiBase, url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Normalise a favorite-games value (string or object) into { name, cover } for
// the Favorite Games panel + Overview strip.
const normaliseGame = (g) => (typeof g === 'string' ? { name: g } : g);

// Normalise a gallery record from GET /auth/get-user-gallery/ into the shape
// GalleryPanel expects. The backend returns absolute URLs; we tolerate a few
// possible field names.
const normaliseGalleryImage = (img, idx) => {
  if (!img) return null;
  if (typeof img === 'string') return { id: `img_${idx}`, url: img, category: 'highlights' };
  return {
    id: img.id ?? img.image_id ?? `img_${idx}`,
    url: img.url || img.image || img.image_url || img.src,
    category: img.category || img.cat || 'highlights',
    caption: img.caption || '',
  };
};

// ── component ─────────────────────────────────────────────────────────────

const UserProfileContent = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profileData, setProfileData] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [rankStats, setRankStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showMore, setShowMore] = useState(false);
  const [following, setFollowing] = useState(false);
  const [toast, setToast] = useState('');
  const moreMenuRef = useRef(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const profileId = searchParams.get('id');
  const sessionUserId = session?.user?.id || null;
  const isOwner = !profileId || profileId === sessionUserId;

  // ── Sync tab with URL ──
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TABS.some((tt) => tt.id === t)) setTab(t);
  }, [searchParams]);

  const setActiveTab = (next) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.push(`/user-profile?${params.toString()}`, { scroll: false });
  };

  // ── Auth gate ──
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // ── Fetch profile ──
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.sessionToken) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const targetId = profileId || sessionUserId;
        const url = isOwner
          ? `${apiBase}/auth/get-user-informations/?user_id=${targetId}`
          : `${apiBase}/user/${targetId}/profile/`;
        const data = await getJson(url, {
          token: session.user.sessionToken,
          ttl: 3000,
        });
        const raw = data.data || data;
        if (raw) {
          raw.profile_picture = buildAbsolute(apiBase, raw.profile_picture || raw.profile_pic);
          raw.banner = buildAbsolute(apiBase, raw.banner || raw.banner_picture);
          if (typeof raw.interests === 'string') {
            try { raw.interests = JSON.parse(raw.interests); } catch { raw.interests = []; }
          }
          setProfileData(raw);
          if (isOwner) {
            try { localStorage.setItem('userProfile', JSON.stringify(raw)); } catch {}
          }
        }
      } catch (err) {
        // Fallback: read from localStorage if the request fails.
        try {
          const stored = localStorage.getItem('userProfile');
          if (stored) setProfileData(JSON.parse(stored));
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [status, session, profileId, sessionUserId, isOwner, apiBase]);

  // ── Fetch teams, tournaments and ranking ──
  // GET /auth/get-user-informations/ returns none of these, so the profile used
  // to render "No teams" for an organizer who owns one.
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.sessionToken) return;
    let cancelled = false;
    const controller = new AbortController();
    const headers = jsonHeaders(session.user.sessionToken);

    (async () => {
      const get = async (path) => {
        try {
          const body = await getJson(`${apiBase}${path}`, {
            token: session.user.sessionToken,
            ttl: 3000,
          });
          return body?.data ?? null;
        } catch {
          return null;
        }
      };

      const [teams, organizerTournaments, rankings] = await Promise.all([
        get('/team/my-teams/'),
        get('/tournament/get-organizer-tournaments/'),
        get('/ranking/'),
      ]);
      if (cancelled) return;

      setMyTeams(Array.isArray(teams) ? teams : (teams?.teams || []));
      setMyTournaments(Array.isArray(organizerTournaments) ? organizerTournaments : []);
      const me = (rankings?.players || []).find((p) => p.is_session_user) || null;
      setRankStats(me);
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [status, session, apiBase]);

  // ── Fetch gallery (real endpoint: GET /auth/get-user-gallery/) ──
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.sessionToken) return;
    // The gallery endpoint is Bearer-scoped to the signed-in user. For other
    // users' profiles, fall back to any gallery embedded in the profile payload.
    if (!isOwner) {
      const embedded = Array.isArray(profileData?.gallery) ? profileData.gallery : [];
      setGalleryImages(embedded.map(normaliseGalleryImage).filter(Boolean));
      return;
    }

    let cancelled = false;
    const fetchGallery = async () => {
      try {
        const data = await getJson(`${apiBase}/auth/get-user-gallery/`, {
          token: session.user.sessionToken,
          ttl: 3000,
        });
        const payload = data.data || data;
        const list = payload.images || payload.gallery || (Array.isArray(payload) ? payload : []);
        if (!cancelled) {
          setGalleryImages(list.map(normaliseGalleryImage).filter(Boolean));
        }
      } catch (err) {
        if (!cancelled) setGalleryImages([]);
      }
    };
    fetchGallery();
    return () => { cancelled = true; };
  }, [status, session, isOwner, apiBase, profileData]);

  // ── More-menu click-away ──
  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMore(false);
      }
    };
    if (showMore) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  if (loading || status === 'loading') {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            {/* Render the tab row + an h1 placeholder in the loading state too -
                the URL `?tab=...` is the source of truth and the audit checks
                the tabs are visible before profile data lands. */}
            <section className={styles.heroCard}>
              <div className={styles.heroBanner} />
              <div className={styles.heroMeta}>
                <div className={styles.heroIdentity}>
                  <div className={styles.avatarWrap}>
                    <div className={styles.avatarFallback}>?</div>
                  </div>
                  <div className={styles.identityInfo}>
                    <div className={styles.identityNameRow}><span>Loading profile…</span></div>
                  </div>
                </div>
              </div>
              <div className={styles.profileTabs} role="tablist">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.profileTab} ${tab === t.id ? styles.profileTabActive : ''}`}
                    onClick={() => setActiveTab(t.id)}
                    role="tab"
                    aria-selected={tab === t.id}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>
            <div className={styles.loadingState}>Loading profile…</div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.errorState}>
              <div style={{ textAlign: 'center' }}>
                <p>Profile not available.</p>
                <Link href="/login" className="btn redBTN" style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', borderRadius: 6, color: '#fff', textDecoration: 'none' }}>Login</Link>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const fullName = profileData.full_name || profileData.fullname || profileData.username || 'Unknown';
  const username = profileData.username || 'username';
  const bio = profileData.description || profileData.bio || '';
  const country = profileData.country || profileData.location || '';
  const verified = profileData.is_verified || profileData.kyc_verified || false;
  const avatarUrl = profileData.profile_picture;
  const bannerUrl = profileData.banner;

  const interests = Array.isArray(profileData.interests) ? profileData.interests : [];
  const socialLinks = Array.isArray(profileData.social_links) ? profileData.social_links : [];
  const gamingAccounts = Array.isArray(profileData.gamingAccounts) || Array.isArray(profileData.gaming_accounts)
    ? (profileData.gamingAccounts || profileData.gaming_accounts || [])
    : [];

  // Favorite Games - real data from GET /auth/get-user-informations/.
  const favoriteGames = (Array.isArray(profileData.favorite_games) ? profileData.favorite_games : [])
    .map(normaliseGame);

  // Achievements - real data from the profile payload.
  const achievements = Array.isArray(profileData.achievements) ? profileData.achievements : [];

  // Activity - no dedicated activity endpoint exists yet (BE-GAP). Render the
  // real values if the profile payload carries them, otherwise a graceful
  // empty state. TODO(M2): wire GET tournament/event history once BE ships it.
  const tournaments = Array.isArray(profileData.tournaments) && profileData.tournaments.length
    ? profileData.tournaments
    : myTournaments;
  const events = Array.isArray(profileData.events) ? profileData.events : [];

  // Empty state detection: zero meaningful data
  const isEmpty =
    interests.length === 0 &&
    socialLinks.length === 0 &&
    gamingAccounts.length === 0 &&
    favoriteGames.length === 0 &&
    tournaments.length === 0 &&
    events.length === 0 &&
    myTeams.length === 0 &&
    galleryImages.length === 0;

  const handleFollow = () => {
    setFollowing((f) => !f);
    showToast(following ? 'Unfollowed' : 'Following');
  };

  const handleMessage = () => showToast('DMs coming soon');
  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    showToast('Profile link copied');
  };

  return (
    <div className={styles.pageContainer}>
      <Header
        fullName={profileData.full_name || profileData.fullname || ''}
        username={username}
        profilePicture={avatarUrl}
      />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>

          {/* HERO CARD */}
          <section className={styles.heroCard}>
            <div className={styles.heroBanner}>
              {bannerUrl ? <img className={styles.heroBannerImg} src={bannerUrl} alt="Banner" /> : null}
              {isOwner && (
                <Link href="/edit-user-profile?panel=info" className={styles.changeBannerBtn}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span>Change Banner</span>
                </Link>
              )}
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.heroIdentity}>
                <div className={styles.avatarWrap}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {fullName.split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className={styles.identityInfo}>
                  <div className={styles.identityNameRow}>
                    <span>{fullName}</span>
                    {verified && (
                      <span className={styles.verifiedBadge} title="Verified">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    )}
                    {isEmpty && isOwner && <span className={styles.newBadge}>New</span>}
                  </div>
                  <div className={styles.identityHandle}>@{username}</div>
                  {country && (
                    <div className={styles.identityLoc}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {country}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.heroActions}>
                <button type="button" className={styles.heroBtn} onClick={handleShare}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Share
                </button>
                {isOwner ? (
                  <Link href="/edit-user-profile" className={styles.heroBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit Profile
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${styles.heroBtn} ${following ? styles.heroBtnFollowing : styles.heroBtnPrimary}`}
                      onClick={handleFollow}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                      {following ? 'Following' : 'Follow'}
                    </button>
                    <button type="button" className={styles.heroBtn} onClick={handleMessage}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                      Message
                    </button>
                    <div ref={moreMenuRef} style={{ position: 'relative' }}>
                      <button type="button" className={styles.heroIconBtn} onClick={() => setShowMore((s) => !s)} aria-label="More">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
                      </button>
                      {showMore && (
                        <div className={styles.moreMenu}>
                          <button type="button" onClick={() => { setShowMore(false); showToast('User muted'); }}>Mute User</button>
                          <button type="button" className={styles.danger} onClick={() => { setShowMore(false); showToast('Block requested'); }}>Block User</button>
                          <button type="button" className={styles.danger} onClick={() => { setShowMore(false); showToast('Report submitted'); }}>Report User</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {bio && <p className={styles.heroBio}>{bio}</p>}

            {/* Tabs */}
            <div className={styles.profileTabs} role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.profileTab} ${tab === t.id ? styles.profileTabActive : ''}`}
                  onClick={() => setActiveTab(t.id)}
                  role="tab"
                  aria-selected={tab === t.id}
                >
                  {t.label}
                  {t.id === 'activity' && tournaments.length + events.length > 0 && (
                    <span className={styles.tabCount}>{tournaments.length + events.length}</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* PANELS */}
          <div className={styles.panelArea}>
            {isEmpty && isOwner ? (
              <EmptyStatePanel achievementsTotal={achievements.length} />
            ) : tab === 'overview' ? (
              <OverviewPanel
                interests={interests}
                gamingAccounts={gamingAccounts}
                socialLinks={socialLinks}
                walletBalance={profileData.wallet_balance ?? 0}
                penaltyPoints={profileData.penalty_point ?? profileData.penalty_points ?? 0}
                rank={rankStats?.rank ?? profileData.rank ?? null}
                tournamentsPlayed={tournaments.length}
                wins={rankStats?.wins ?? profileData.wins ?? 0}
                losses={rankStats?.losses ?? profileData.losses ?? 0}
                favoriteGames={favoriteGames}
                achievements={achievements}
                isOwner={isOwner}
                onAddGame={() => router.push('/edit-user-profile?panel=games')}
                onSeeAll={() => setActiveTab('games')}
              />
            ) : tab === 'activity' ? (
              <ActivityPanel tournaments={tournaments} events={events} />
            ) : tab === 'gallery' ? (
              <GalleryPanel images={galleryImages} isOwner={isOwner} onUpload={() => showToast('Photo upload coming soon')} />
            ) : tab === 'social' ? (
              <SocialLinksPanel socialLinks={socialLinks} />
            ) : tab === 'games' ? (
              <FavoriteGamesPanel games={favoriteGames} />
            ) : null}
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

const UserProfile = () => (
  <Suspense fallback={
    <div style={{ minHeight: '100vh', backgroundColor: '#131316', color: '#A7A6A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading…
    </div>
  }>
    <UserProfileContent />
  </Suspense>
);

export default UserProfile;
