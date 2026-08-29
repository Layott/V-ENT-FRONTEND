import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logoRed from "@/images/logo_mark_red.svg";
import { FiArrowLeft } from "react-icons/fi";
import { MdKeyboardArrowRight, MdOutlineClose } from "react-icons/md";
// import { FcSearch } from "react-icons/fc";
import { LuSearch } from "react-icons/lu";
import { CiSearch } from "react-icons/ci";
import { FaCaretDown } from "react-icons/fa";
import { IoNotificationsOutline } from "react-icons/io5";
import profileImageSmall from "@/images/signed_in_user_small.webp";
import breadCrumbTitles from '../header/BreadCrumbData';
import { unreadCount } from '@/components/notifications/notificationsApi';
import styles from './mobile-header.module.css';
import { usePathname, useRouter } from 'next/navigation';
import MobileSidebar from '../mobile-sidebar/MobileSidebar';
import { useT } from '@/i18n/LanguageProvider';
import { signOut, useSession } from "next-auth/react"; // Import signOut function from next-auth

const MobileHeader = ({
  className = ''
}) => {
  const tt = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [username, setUsername] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const sessionToken = session?.user?.sessionToken;
  const dropdownRef = useRef(null);
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
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('userProfile');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setProfileImage(parsedData?.profile_picture || null);
        setFullName(parsedData?.full_name || null);
        setUsername(parsedData?.username || null);
      }
    } catch (error) {
      console.error("Failed to load profile picture from localStorage:", error);
    }
  }, []);

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
  }, [isDropdownOpen]);
  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    // Always navigate to /search - see Header.js for rationale. This makes the
    // Enter key behaviour predictable regardless of nested-form weirdness.
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsSearchBarVisible(false);
  };
  const handleKeyDown = event => {
    if (event.key === 'Enter') {
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
  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
  const toggleDropdown = () => setIsDropdownOpen(prev => !prev);
  const handleLogout = () => {
    // Remove the user profile and session data from localStorage
    localStorage.removeItem('userProfile');
    localStorage.removeItem('authToken');

    // Sign out the user using NextAuth's signOut function
    // Absolute: next-auth's client baseUrl falls back to localhost:3000 in the
    // browser, so a relative callbackUrl points at the wrong host in production.
    signOut({
      callbackUrl: `${window.location.origin}/login`
    });
  };
  return <div className={`${styles.profileHeader} ${className}`}>
      <div className={styles.headerContent}>

        <div className={styles.leftHeaderContainer}>
          <div className={styles.logoContainer}>
              <Link className={styles.logoLink} href={session ? '/home' : '/'}>
                <div className={styles.innerLogoContainer}>
                  <Image src={logoRed} alt="V-ENT" className={styles.logo} />
                </div>
                <span className={styles.vEntH1}>v-ent</span>
              </Link>
          </div>

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
            {pathname === '/edit-user-profile' && <nav className={styles.breadcrumbNav}>
                <Link href={'./'}>{tt("ui.home.70f8", "Home")}</Link>
                <MdKeyboardArrowRight className={styles.arrowRightIcon} />
                <Link href={'./edit-user-profile'} className={styles.currentSectionLink}>
                  {tt("ui.edit.my.profile.a837", "Edit My Profile")}
                </Link>
              </nav>}
          </div>
        </div>

        <form className={`${styles.searchBar} ${isSearchBarVisible ? styles.showSearchBar : ''}`} onSubmit={handleSearchFormSubmit} role="search">
          <CiSearch className={styles.searchIcon} onClick={handleSearch} />
          <input type="search" placeholder={tt("ui.search.tournaments.events.users.47ad", "Search tournaments, events, users...")} className={styles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} aria-label={tt("ui.search.v.ent.6327", "Search V-ENT")} />
          <button type="submit" style={{
          display: 'none'
        }} aria-hidden="true" tabIndex={-1}>{tt("ui.search.bce0", "Search")}</button>
        </form>

        {/* One row, evenly spaced. Each of these used to be absolutely
            positioned at a hard-coded offset from the right edge, so the bell
            and the search icon collided while a gap sat next to the hamburger,
            and the spacing changed with the width of the phone. CEO,
            29 August 2026: it "doesn't look good and is not efficient". */}
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerAction}
            onClick={toggleSearchBar}
            aria-label={isSearchBarVisible
              ? tt("ui.close.search.4a1c", "Close search")
              : tt("ui.search.v.ent.6327", "Search V-ENT")}
            aria-expanded={isSearchBarVisible}
          >
            {isSearchBarVisible
              ? <MdOutlineClose className={styles.searchCloseIconMobile} />
              : <LuSearch className={styles.searchIconMobile} />}
          </button>

          {!isSearchBarVisible && <Link href="/notifications" className={`${styles.headerAction} ${styles.bellContainer}`} aria-label={tt("ui.notifications.753a", "Notifications")}>
              <IoNotificationsOutline className={styles.bellIconMobile} />
              {notifCount > 0 && <span className={styles.bellBadgeMobile}>{notifCount > 99 ? '99+' : notifCount}</span>}
            </Link>}

          <div className={`${styles.headerAction} ${styles.hamburgerContainer}`} onClick={toggleMobileMenu}>
            <label className={styles.hamburger}>
              <span className={`${styles.hamburgerLines} ${isMobileMenuOpen ? styles.show : ''}`}></span>
            </label>
          </div>
        </div>

        <MobileSidebar isOpen={isMobileMenuOpen} />

      </div>
    </div>;
};
export default MobileHeader;