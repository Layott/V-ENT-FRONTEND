import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft } from "react-icons/fi";
import { MdKeyboardArrowRight, MdOutlineClose } from "react-icons/md";
import { FcSearch } from "react-icons/fc";
import { CiSearch } from "react-icons/ci";
import { FaCaretDown } from "react-icons/fa";
import profileImageSmall from "@/images/signed_in_user_small.webp";
import breadCrumbTitles from './BreadCrumbData';
import styles from './header.module.css';
import { usePathname } from 'next/navigation';
import { signOut } from "next-auth/react";  // Import signOut function from next-auth

const Header = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [username, setUsername] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef(null);

  const { title: currentSection, showBackArrow, fallbackURL } = breadCrumbTitles[pathname] || {
    title: '',
    showBackArrow: false,
    fallbackURL: '/'
  } 

  const handleBackNavigation = (fallbackURL = '/') => {
    if (typeof window !== 'undefined' && window.referrer) {
      window.history.back();
    } else {
      window.location.href = fallbackURL;
    }
  }

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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          setIsDropdownOpen(false);
        }
      }

      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('mousedown', handleOutsideClick)
        window.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    };
  }, [isDropdownOpen]);

  const handleSearch = () => {
    if (searchQuery.trim() !== '') {
      console.log(`Searching for: ${searchQuery}`);
      // Add your search logic here
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleSearchBar = () => setIsSearchBarVisible((prev) => !prev);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const handleLogout = async () => {    
    // Clear all authentication data from localStorage
    localStorage.removeItem('userProfile');
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    
    // Set a cookie to indicate logged out state (will be read by middleware)
    document.cookie = "isLoggedOut=true; path=/; max-age=60";
    
    // Use NextAuth's signOut with redirect
    await signOut({ 
      callbackUrl: '/login',
      redirect: true,
    });
  }

  return (
    <div className={`${styles.profileHeader} ${className}`}>
      <div className={styles.headerContent}>
        <div className={styles.breadcrumbContainer}>
          <h3 className={styles.breadcrumbTitle}>
            {showBackArrow && (
              <span 
                className={styles.backArrow} 
                onClick={() => handleBackNavigation(fallbackURL)}
              >
                
                <FiArrowLeft className={styles.backArrowIcon} />
              </span>
            )}
            <span className={styles.currentSection}>{currentSection}</span>
          </h3>
          
          {pathname === '/user-profile' && (
            <nav className={styles.breadcrumbNav}>
              <Link href={'./'}>Home</Link>
              <MdKeyboardArrowRight className={styles.arrowRightIcon} />
              <Link href={'./user-profile'} className={styles.currentSectionLink}>
                My Profile
              </Link>
            </nav>
          )}
        </div>

        <div className={`${styles.searchBar} ${isSearchBarVisible ? styles.showSearchBar : ''}`}>
          <CiSearch className={styles.searchIcon} onClick={handleSearch}/>
          <input
            type="text"
            placeholder="Search tournaments, events, users..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className={`${styles.searchIconMobileContainer} ${isSearchBarVisible ? styles.moveRight : ''}`}>
          {isSearchBarVisible ? (
            <MdOutlineClose
              className={styles.searchIconMobile}
              onClick={toggleSearchBar}
            />
          ) : (
            <FcSearch
              className={styles.searchIconMobile}
              onClick={toggleSearchBar}
            />
          )}
        </div>

        <div className={styles.userDetails} ref={dropdownRef}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{fullName || 'Signed in user'}</p>
            <p className={styles.userUsername}>@{username || 'username'}</p>
          </div>
          <div className={styles.userAvatar}>
            <Image
              src={profileImage || profileImageSmall}
              width={100}
              height={100}
              alt="Signed in user"
              className={styles.profileImage}
              onClick={toggleDropdown}
            />
            <FaCaretDown className={styles.dropdownArrow} onClick={toggleDropdown}/>
          </div>
            {isDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <Link href={'/user-profile'} className={styles.viewProfile}>
                  View Profile
                </Link>

                <button className={styles.logoutBTN} onClick={handleLogout} >
                  Logout
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Header;
