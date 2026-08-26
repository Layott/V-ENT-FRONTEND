import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft } from "react-icons/fi";
import { MdKeyboardArrowRight, MdOutlineClose } from "react-icons/md";
import { FcSearch } from "react-icons/fc";
import { CiSearch } from "react-icons/ci";
import { FaCaretDown } from "react-icons/fa";
import { IoNotificationsOutline } from "react-icons/io5";
import profileImageSmall from "@/images/signed_in_user_small.webp";
import breadCrumbTitles from './BreadCrumbData';
import { unreadCount } from '@/components/notifications/notificationsApi';
import { getJson } from '@/lib/apiCache';
import styles from './header.module.css';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { signOut, useSession } from "next-auth/react"; // Import signOut function from next-auth

const Header = ({
  className = ''
}) => {
  const tx = useTx();
  const tt = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [username, setUsername] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef(null);
  const {
    data: session
  } = useSession();
  const {
    title: currentSection,
    showBackArrow,
    fallbackURL
  } = breadCrumbTitles[pathname] || {
    title: '',
    showBackArrow: false,
    fallbackURL: '/'
  };
  const handleBackNavigation = (fallbackURL = '/') => {
    if (typeof window !== 'undefined' && window.referrer) {
      window.history.back();
    } else {
      window.location.href = fallbackURL;
    }
  };

  // Instant paint from cache - but ONLY if the cached profile belongs to the
  // current session. localStorage.userProfile can be stale from a prior account
  // (logout via an expired session / non-Sidebar path doesn't clear it), so
  // painting it blindly leaks the previous user's name, avatar, and wallet.
  const sessionIdentity = session?.user?.email; // username-or-email used at login
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('userProfile');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const belongsToSession = sessionIdentity && (parsedData?.username === sessionIdentity || parsedData?.email === sessionIdentity);
        if (belongsToSession) {
          setProfileImage(parsedData?.profile_picture || null);
          setFullName(parsedData?.full_name || null);
          setUsername(parsedData?.username || null);
        }
      }
    } catch (error) {
      console.error("Failed to load profile picture from localStorage:", error);
    }
  }, [sessionIdentity]);

  // Authoritative hydrate: fetch the logged-in user's real profile and overwrite
  // both state and the cache. This is the source of truth for the header chip and
  // heals any stale/cross-account localStorage.
  const sessionToken = session?.user?.sessionToken;
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    (async () => {
      try {
        // Shared GET: the page body usually wants this same profile, and the
        // effect re-runs when the session resolves. One request serves them all.
        const json = await getJson(`${process.env.NEXT_PUBLIC_API_URL}/auth/get-user-informations/`, {
          token: sessionToken
        });
        if (cancelled || json?.status !== 'success') return;
        const d = json.data || {};
        setProfileImage(d.profile_picture || null);
        setFullName(d.full_name || null);
        setUsername(d.username || null);
        try {
          localStorage.setItem('userProfile', JSON.stringify(d));
        } catch {/* ignore */}
        window.dispatchEvent(new Event('vent:profile-updated'));
      } catch (error) {
        console.error("Failed to hydrate header profile:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  // Poll the unread notification count for the bell badge. Guarded on the token
  // (no tokenless request), polls every 60s, clears on unmount. Failures are
  // swallowed silently - the bell simply shows no badge.
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await unreadCount(sessionToken);
        if (!cancelled) setNotifCount(Number(data?.unread_count || 0));
      } catch {
        /* silent - leave the badge as-is */
      }
    };
    poll();
    const intervalId = setInterval(poll, 60000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionToken]);
  useEffect(() => {
    const handleOutsideClick = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          setIsDropdownOpen(false);
        }
      };
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        window.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    ;
  }, [isDropdownOpen]);
  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    // Always navigate to search - empty query lands on /search and shows
    // recent/empty state. This guarantees the Enter key binding is reliable
    // even on pages that nest the Header inside another <form> or rich-text
    // editor that may try to swallow the event.
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };
  const handleKeyDown = event => {
    if (event.key === 'Enter') {
      // Stop the parent form (or any keydown listener bubbling up from a
      // RichText editor / wizard step) from intercepting the Enter key.
      event.preventDefault();
      event.stopPropagation();
      handleSearch();
    }
  };
  const handleSearchFormSubmit = event => {
    event.preventDefault();
    handleSearch();
  };
  const toggleSearchBar = () => setIsSearchBarVisible(prev => !prev);
  const toggleDropdown = () => setIsDropdownOpen(prev => !prev);
  const handleLogout = async () => {
    try {
      // First clear all local storage items
      localStorage.removeItem('userProfile');
      localStorage.removeItem('authToken');
      sessionStorage.clear();

      // Set the logged out cookie
      document.cookie = "isLoggedOut=true; path=/; max-age=60";

      // Use NextAuth signOut but handle it properly
      await signOut({
        redirect: false // Change this to false
      }).then(() => {
        // Manual redirect after successful signOut
        window.location.href = '/login';
      });
    } catch (error) {
      console.error("Error during logout:", error);
      // Still redirect even if there was an error
      window.location.href = '/login';
    }
  };
  return <div className={`${styles.profileHeader} ${className}`}>
      <div className={styles.headerContent}>
        <div className={styles.breadcrumbContainer}>
          <p className={styles.breadcrumbTitle}>
            {showBackArrow && <span className={styles.backArrow} onClick={() => handleBackNavigation(fallbackURL)}>
                
                <FiArrowLeft className={styles.backArrowIcon} />
              </span>}
            <span className={styles.currentSection}>{currentSection}</span>
          </p>
          
          {pathname === '/user-profile' && <nav className={styles.breadcrumbNav}>
              <Link href={'./'}>{tt("ui.home.70f8", "Home")}</Link>
              <MdKeyboardArrowRight className={styles.arrowRightIcon} />
              <Link href={'./user-profile'} className={styles.currentSectionLink}>
                {tt("ui.my.profile.9ba8", "My Profile")}
              </Link>
            </nav>}
        </div>

        <form className={`${styles.searchBar} ${isSearchBarVisible ? styles.showSearchBar : ''}`} onSubmit={handleSearchFormSubmit} role="search" data-tour="search">
          <CiSearch className={styles.searchIcon} onClick={handleSearch} />
          <input type="search" placeholder={tt("ui.search.tournaments.events.users.47ad", "Search tournaments, events, users...")} className={styles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} aria-label={tt("ui.search.v.ent.6327", "Search V-ENT")} />
          {/* Hidden submit so Enter triggers form submission even when the
              input sits inside a parent <form> that already swallowed the key. */}
          <button type="submit" style={{
          display: 'none'
        }} aria-hidden="true" tabIndex={-1}>{tt("ui.search.bce0", "Search")}</button>
        </form>

        <div className={`${styles.searchIconMobileContainer} ${isSearchBarVisible ? styles.moveRight : ''}`}>
          {isSearchBarVisible ? <MdOutlineClose className={styles.searchIconMobile} onClick={toggleSearchBar} /> : <FcSearch className={styles.searchIconMobile} onClick={toggleSearchBar} />}
        </div>

        <Link href="/notifications" className={styles.bellBtn} aria-label={tt("ui.notifications.753a", "Notifications")}>
          <IoNotificationsOutline className={styles.bellIcon} />
          {notifCount > 0 && <span className={styles.bellBadge}>{notifCount > 99 ? '99+' : notifCount}</span>}
        </Link>

        {/* Signed out: offer the way in rather than a placeholder identity. */}
        {!session ? <Link href="/login" className={`btn redBTN ${styles.headerLoginBtn}`}>
            {tt("ui.log.f7c4", "Log in")}
          </Link> : <div className={styles.userDetails} ref={dropdownRef}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{fullName || session?.user?.name || tx("Your account")}</p>
            {username && <p className={styles.userUsername}>@{username}</p>}
          </div>
          <div className={styles.userAvatar}>
            <Image src={mediaUrl(profileImage || profileImageSmall)} width={100} height={100} alt={tt("ui.signed.user.5f34", "Signed in user")} className={styles.profileImage} onClick={toggleDropdown} />
            <FaCaretDown className={styles.dropdownArrow} onClick={toggleDropdown} />
          </div>
            {isDropdownOpen && <div className={styles.dropdownMenu}>
                <Link href={'/user-profile'} className={styles.viewProfile}>
                  {tt("ui.view.profile.685e", "View Profile")}
                </Link>

                <button className={styles.logoutBTN} onClick={handleLogout}>
                  {tt("ui.logout.e43d", "Logout")}
                </button>
              </div>}
        </div>}
      </div>
    </div>;
};
export default Header;