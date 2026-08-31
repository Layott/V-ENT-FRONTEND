import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react'; // Add this import
import Image from 'next/image';
import Link from 'next/link';
import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { FaUsers } from 'react-icons/fa';
import { IoWalletOutline, IoGameControllerOutline } from "react-icons/io5";
import { FiLogIn } from 'react-icons/fi';
import profileImageSmall from "@/images/signed_in_user_small.webp";
import styles from './bottom-menu.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { logOut } from '@/lib/logout';
const BottomMenu = ({
  customClass
}) => {
  const tt = useT();
  const t = useT();
  const pathname = usePathname();
  const {
    data: session,
    status
  } = useSession();
  // `data` alone cannot tell "signed out" from "still asking", and treating the
  // second as the first is what makes a shell flicker. Decide on `status`.
  const signedIn = status === 'authenticated';
  const signedOut = status === 'unauthenticated';
  const [menuOpen, setMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [profilePic, setProfilePic] = useState(profileImageSmall);
  const [isExternalImage, setIsExternalImage] = useState(false);
  const menuRef = useRef(null);

  // Function to Check if the Route is Active
  const isActive = href => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href);
  };
  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  // Get user information from localStorage and session
  useEffect(() => {
    const getUserInfo = () => {
      try {
        // First try to get from localStorage (same as UserProfile component)
        const storedProfile = localStorage.getItem("userProfile");
        if (storedProfile) {
          const profileData = JSON.parse(storedProfile);
          setUserInfo(profileData);

          // Set profile picture if available
          if (profileData.profile_picture) {
            setProfilePic(profileData.profile_picture);
            setIsExternalImage(true);
          }
          return;
        }

        // Fallback to session data if localStorage is empty
        if (session?.user) {
          const sessionUserData = {
            full_name: session.user.name,
            username: session.user.username || session.user.email,
            profile_picture: session.user.image
          };
          setUserInfo(sessionUserData);
          if (session.user.image) {
            setProfilePic(session.user.image);
            setIsExternalImage(true);
          }
        }
      } catch (error) {
        console.error('Error getting user information:', error);
      }
    };
    getUserInfo();

    // Listen for localStorage changes (when profile is updated)
    const handleStorageChange = () => {
      getUserInfo();
    };
    window.addEventListener('storage', handleStorageChange);

    // There used to be a setInterval(getUserInfo, 1000) here, "to check for
    // localStorage updates within the same tab". It re-ran on every tick and
    // wrote fresh state objects whether anything had changed or not, so the
    // navigation re-rendered once a second for as long as the app was open.
    // A write in this tab now announces itself instead; a write in another tab
    // still arrives as a storage event.
    window.addEventListener('vent:profile-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vent:profile-updated', handleStorageChange);
    };
  }, [session]);
  useEffect(() => {
    const handleClickOutside = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleLogout = async () => {
    // One way out for the whole app: see src/lib/logout.js. This used to
    // call signOut() alone, which leaves the `session` cookie the
    // middleware also accepts, so pressing Logout did not sign anybody out.
    await logOut();
  };
  return <div className={styles.bottomMenuContainer}>
        <nav className={styles.bottomNavContainer}>
            <ul className={styles.sidebarList}>
                {/* Home is a member's dashboard and redirects a visitor to
                    sign in, so it is not a place to send one from the bar. */}
                {signedIn && <li className={`${styles.sidebarItem} ${isActive('/home') ? styles.activeLink : ''}`}>
                    <Link href={'/home'} className={styles.iconTextLink}>
                        <BiHomeCircle className={`${styles.sidebarIcon} ${isActive('/home') ? styles.activeSidebarIcon : ''}`} /> {t('nav.home')}
                    </Link>
                </li>}

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        <IoGameControllerOutline className={`${styles.sidebarIcon} ${isActive('/tournaments') ? styles.activeSidebarIcon : ''}`} /> {t('nav.tournaments')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        <MdOutlineEvent className={`${styles.sidebarIcon} ${isActive('/events') ? styles.activeSidebarIcon : ''}`} /> {t('nav.events')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/teams') ? styles.activeLink : ''}`}>
                    <Link href={'/teams'} className={styles.iconTextLink}>
                        <FaUsers className={`${styles.sidebarIcon} ${isActive('/teams') ? styles.activeSidebarIcon : ''}`} /> {t('nav.teams')}
                    </Link>
                </li>

                {/* A wallet belongs to somebody. Offering one to a visitor with
                    no account is the shell claiming they have things here. */}
                {signedIn && <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink}>
                        <IoWalletOutline className={`${styles.sidebarIcon} ${isActive('/wallets') ? styles.activeSidebarIcon : ''}`} /> {t('nav.wallets')}
                    </Link>
                </li>}
                {signedOut && <li className={`${styles.sidebarItem} ${isActive('/community') ? styles.activeLink : ''}`}>
                    <Link href={'/community'} className={styles.iconTextLink}>
                        <FaUsers className={`${styles.sidebarIcon} ${isActive('/community') ? styles.activeSidebarIcon : ''}`} /> {t('nav.community')}
                    </Link>
                </li>}
            </ul>
        </nav>

        {/* While the session is still resolving, neither state is drawn. A
            shell that shows an avatar and then flips to "Log in" a moment later
            is worse than one that waits: it looks like being signed out. */}
        {signedOut ? <div className={styles.profileContainerOuter}>
            <Link href="/login" className={styles.signInLink}>
                <FiLogIn className={styles.sidebarIcon} />
                <span className={styles.signInLabel}>{tt("ui.log.f7c4", "Log in")}</span>
            </Link>
        </div> : signedIn ? <div className={styles.profileContainerOuter} ref={menuRef}>
            <div className={styles.profileContainer} onClick={toggleMenu}>
                <div className={styles.profileImageContainer}>
                    {isExternalImage ? <Image src={profilePic} alt={tt("ui.profile.ff4f", "Profile")} className={styles.profileImage} width={40} height={40} /> : <Image src={profilePic} alt={tt("ui.profile.ff4f", "Profile")} className={styles.profileImage} width={40} height={40} />}
                </div>
                <p className={styles.username}>{tt("ui.my.profile.9ba8", "My Profile")}</p>
            </div>

            {menuOpen && <div className={styles.openUpMenu}>
                    <Link href="/user-profile" className={styles.openUpItem}>{tt("ui.user.profile.5f38", "User Profile")}</Link>
                    <Link href={'/login'} className={styles.openUpItem} onClick={handleLogout}>{tt("ui.logout.e43d", "Logout")}</Link>
                </div>}

        </div> : <div className={styles.profileContainerOuter} />}

    </div>;
};
export default BottomMenu;