import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react'; // Add this import
import Image from 'next/image'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { FaUsers } from 'react-icons/fa';
import { IoWalletOutline, IoGameControllerOutline } from "react-icons/io5";
import profileImageSmall from "@/images/signed_in_user_small.webp"
import styles from './bottom-menu.module.css'

const BottomMenu = ({ customClass }) => {
  const pathname = usePathname()
  const { data: session } = useSession(); // Add session hook
  const [menuOpen , setMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [profilePic, setProfilePic] = useState(profileImageSmall);
  const [isExternalImage, setIsExternalImage] = useState(false);
  const menuRef = useRef(null);

  // Function to Check if the Route is Active
  const isActive = (href) => {
      if (href === '/') {
          return pathname === '/';
      }
      return pathname === href || pathname.startsWith(href);
  }

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  }

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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    }
  
  return (
    <div className={styles.bottomMenuContainer}>
        <nav className={styles.bottomNavContainer}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/home') ? styles.activeLink : ''}`}>
                    <Link href={'/home'} className={styles.iconTextLink}>
                        <BiHomeCircle className={`${styles.sidebarIcon} ${isActive('/home') ? styles.activeSidebarIcon : ''}`} /> Home
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        <IoGameControllerOutline className={`${styles.sidebarIcon} ${isActive('/tournaments') ? styles.activeSidebarIcon : ''}`} /> Tournaments
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        <MdOutlineEvent className={`${styles.sidebarIcon} ${isActive('/events') ? styles.activeSidebarIcon : ''}`} /> Events
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/teams') ? styles.activeLink : ''}`}>
                    <Link href={'/teams'} className={styles.iconTextLink}>
                        <FaUsers className={`${styles.sidebarIcon} ${isActive('/teams') ? styles.activeSidebarIcon : ''}`} /> Teams
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink}>
                        <IoWalletOutline className={`${styles.sidebarIcon} ${isActive('/wallets') ? styles.activeSidebarIcon : ''}`} /> Wallets
                    </Link>
                </li>
            </ul>
        </nav>

        <div className={styles.profileContainerOuter} ref={menuRef}>
            <div className={styles.profileContainer} onClick={toggleMenu}>
                <div className={styles.profileImageContainer}>
                    {isExternalImage ? (
                        <Image
                            src={profilePic}
                            alt="Profile"
                            className={styles.profileImage}
                            width={40}
                            height={40}
                        />
                    ) : (
                        <Image
                            src={profilePic}
                            alt="Profile"
                            className={styles.profileImage}
                            width={40}
                            height={40}
                        />
                    )}
                </div>
                <p className={styles.username}>My Profile</p>
            </div>

            {menuOpen && (
                <div className={styles.openUpMenu}>
                    <Link href="/user-profile" className={styles.openUpItem}>User Profile</Link>
                    <Link href={'/login'} className={styles.openUpItem} onClick={handleLogout}>Logout</Link>
                </div>
            )}

        </div>

    </div>
  )
}

export default BottomMenu;