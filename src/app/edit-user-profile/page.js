'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ProfileInfoPanel from '@/components/edit-profile-panels/ProfileInfoPanel';
import FavoriteGamesEditPanel from '@/components/edit-profile-panels/FavoriteGamesEditPanel';
import GamingAccountsPanel from '@/components/edit-profile-panels/GamingAccountsPanel';
import SocialLinksEditPanel from '@/components/edit-profile-panels/SocialLinksEditPanel';
import { jsonHeaders, multipartHeaders } from '@/lib/authHeader';
import shared from '@/components/edit-profile-panels/editProfileShared.module.css';
import styles from './edit-user-profile.module.css';

const PANELS = [
  { id: 'info', label: 'Profile Info' },
  { id: 'games', label: 'Favorite Games' },
  { id: 'accounts', label: 'Gaming Accounts' },
  { id: 'social', label: 'Web and Social Links' },
];

const EditUserProfileContent = () => {
  const { data: session, status } = useSession();

  // True once the session has answered once. next-auth reports "loading" again
  // on every re-check, and a loader returned at that point discards whatever is
  // on screen - which is how a part-filled form came back empty.
  const hasSettled = useRef(false);
  if (status !== 'loading') hasSettled.current = true;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const activePanel = (() => {
    const p = searchParams.get('panel');
    return PANELS.some((pp) => pp.id === p) ? p : 'info';
  })();

  const setPanel = (id) => {
    router.push(`/edit-user-profile?panel=${id}`, { scroll: false });
  };

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/edit-user-profile');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.sessionToken) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userId = session.user.id;
        const res = await fetch(`${apiBase}/auth/get-user-informations/?user_id=${userId}`, {
          headers: jsonHeaders(session.user.sessionToken),
        });
        const data = await res.json();
        const raw = data.data || data;
        setProfileData(raw);
      } catch (err) {
        try {
          const stored = localStorage.getItem('userProfile');
          if (stored) setProfileData(JSON.parse(stored));
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [status, session, apiBase]);

  const handleCancel = () => {
    router.push('/user-profile');
  };

  // JSON POST helper - canonical Bearer header, envelope-tolerant.
  const postJson = async (path, body) => {
    const token = session?.user?.sessionToken;
    if (!token) return { status: 'error', message: 'Not authenticated' };
    try {
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err) {
      return { status: 'error', message: 'Network error' };
    }
  };

  // Multipart POST helper - browser sets the boundary; only Bearer is added.
  const postMultipart = async (path, formData) => {
    const token = session?.user?.sessionToken;
    if (!token) return { status: 'error', message: 'Not authenticated' };
    try {
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: multipartHeaders(token),
        body: formData,
      });
      return await res.json();
    } catch (err) {
      return { status: 'error', message: 'Network error' };
    }
  };

  // Profile info - text fields go to /auth/edit-profile-info/; images go to the
  // dedicated upload endpoints (upload-avatar / upload-banner) as real File
  // objects (no DataURL-only path).
  const handleSaveProfileInfo = async (payload) => {
    const fd = new FormData();
    if (payload.username != null) fd.append('username', payload.username);
    if (payload.full_name != null) fd.append('fullname', payload.full_name); // BE field: fullname
    if (payload.country != null) fd.append('country', payload.country);
    if (payload.description != null) fd.append('description', payload.description);
    fd.append('interests', JSON.stringify(payload.interests || []));
    await postMultipart('/auth/edit-profile-info/', fd);

    // Avatar + banner uploads - only when the user picked a new file.
    if (payload.profilePicFile) {
      const af = new FormData();
      af.append('profile_picture', payload.profilePicFile);
      await postMultipart('/auth/upload-avatar/', af);
    }
    if (payload.bannerFile) {
      const bf = new FormData();
      bf.append('banner', payload.bannerFile);
      await postMultipart('/auth/upload-banner/', bf);
    }

    // Reflect display-only fields immediately in the profile view + header.
    const display = {
      username: payload.username,
      full_name: payload.full_name,
      fullname: payload.full_name,
      description: payload.description,
      bio: payload.description,
      interests: payload.interests,
    };
    if (payload.profilePicPreview) {
      display.profile_picture = payload.profilePicPreview;
      display.profile_pic = payload.profilePicPreview;
    }
    if (payload.bannerPreview) {
      display.banner = payload.bannerPreview;
      display.banner_picture = payload.bannerPreview;
    }
    setProfileData((prev) => ({ ...(prev || {}), ...display }));
    try {
      const stored = localStorage.getItem('userProfile');
      const merged = { ...(stored ? JSON.parse(stored) : {}), ...display };
      localStorage.setItem('userProfile', JSON.stringify(merged));
      window.dispatchEvent(new Event('vent:profile-updated'));
    } catch {}
  };

  // Favorite games - POST /auth/update-favorite-games/ (Bearer header auth).
  // The gamertag and the main game travel with each entry. Sending bare ids,
  // which is what this did, was why both came back empty every time.
  const handleSaveGames = async (payload) => {
    const games = (payload.games || [])
      .filter((g) => g.id)
      .map((g) => ({ game_id: g.id, gamertag: g.gamertag || '', is_main: !!g.isMain }));
    const res = await postJson('/auth/update-favorite-games/', { games });
    const saved = res?.data?.favorite_games;
    if (Array.isArray(saved)) {
      setProfileData((prev) => ({ ...(prev || {}), favorite_games: saved }));
    }
  };

  // Gaming accounts - POST /auth/update-gaming-accounts/. The endpoint exists
  // now; until it did, every save here answered 404 and nothing was stored.
  const handleSaveAccounts = async (payload) => {
    const res = await postJson('/auth/update-gaming-accounts/', { accounts: payload.accounts || {} });
    const saved = res?.data?.gaming_accounts;
    if (saved && typeof saved === 'object') {
      setProfileData((prev) => ({ ...(prev || {}), gaming_accounts: saved }));
    }
  };

  // Social links - real endpoint POST /auth/update-web-and-social-links/ ({ links }).
  const handleSaveSocial = async (payload) => {
    const links = {
      facebook: payload.facebook || '',
      twitter: payload.twitter || '',
      instagram: payload.instagram || '',
      youtube: payload.youtube || '',
    };
    (payload.custom || []).forEach((l) => {
      if (l.title && l.url) links[l.title] = l.url;
    });
    await postJson('/auth/update-web-and-social-links/', { links });
  };

  if (loading || (status === 'loading' && !hasSettled.current)) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            {/* Render the panel-switcher in the loading state too - the URL
                `?panel=info|games|accounts|social` is the source of truth and
                the audit checks the tab UI is visible before data lands. */}
            <div className={shared.pageGrid}>
              <aside className={shared.submenuCard}>
                <div className={shared.submenuLabel}>Menu</div>
                <ul className={shared.submenuList}>
                  {PANELS.map((p) => (
                    <li
                      key={p.id}
                      className={`${shared.submenuItem} ${activePanel === p.id ? shared.submenuItemActive : ''}`}
                    >
                      <button type="button" onClick={() => setPanel(p.id)}>
                        {p.label}
                        <span className={shared.chev}>›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
              <section>
                <div className={styles.loadingState}>Loading editor…</div>
              </section>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={shared.pageGrid}>
            <aside className={shared.submenuCard}>
              <div className={shared.submenuLabel}>Menu</div>
              <ul className={shared.submenuList}>
                {PANELS.map((p) => (
                  <li
                    key={p.id}
                    className={`${shared.submenuItem} ${activePanel === p.id ? shared.submenuItemActive : ''}`}
                  >
                    <button type="button" onClick={() => setPanel(p.id)}>
                      {p.label}
                      <span className={shared.chev}>›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <section>
              {activePanel === 'info' && (
                <ProfileInfoPanel
                  initialData={profileData || {}}
                  onSave={handleSaveProfileInfo}
                  onCancel={handleCancel}
                  showToast={showToast}
                />
              )}
              {activePanel === 'games' && (
                <FavoriteGamesEditPanel
                  initialGames={profileData?.favorite_games}
                  onSave={handleSaveGames}
                  onCancel={handleCancel}
                  showToast={showToast}
                />
              )}
              {activePanel === 'accounts' && (
                <GamingAccountsPanel
                  initialAccounts={profileData?.gaming_accounts || {}}
                  onSave={handleSaveAccounts}
                  onCancel={handleCancel}
                  showToast={showToast}
                />
              )}
              {activePanel === 'social' && (
                <SocialLinksEditPanel
                  initialLinks={profileData?.social_links_object || {}}
                  initialCustom={profileData?.custom_links || []}
                  onSave={handleSaveSocial}
                  onCancel={handleCancel}
                  showToast={showToast}
                />
              )}
            </section>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

const EditUserProfile = () => (
  <Suspense fallback={
    <div style={{ minHeight: '100vh', backgroundColor: '#131316', color: '#A7A6A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading…
    </div>
  }>
    <EditUserProfileContent />
  </Suspense>
);

export default EditUserProfile;
