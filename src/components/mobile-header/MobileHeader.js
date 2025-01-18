import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logoRed from "@/images/logo_mark_red.svg"
import { FiArrowLeft } from "react-icons/fi";
import { MdKeyboardArrowRight, MdOutlineClose } from "react-icons/md";
// import { FcSearch } from "react-icons/fc";
import { LuSearch } from "react-icons/lu";
import { CiSearch } from "react-icons/ci";
import { FaCaretDown } from "react-icons/fa";
import profileImageSmall from "@/images/signed_in_user_small.webp";
import breadCrumbTitles from '../header/BreadCrumbData';
import styles from './mobile-header.module.css';
import { usePathname } from 'next/navigation';

import MobileSidebar from '../mobile-sidebar/MobileSidebar';

import { signOut } from "next-auth/react";  // Import signOut function from next-auth

const MobileHeader = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [username, setUsername] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef(null);

  const { title: currentSection, showBackArrow, fallbackURL } = breadCrumbTitles[pathname] || {
    title: '',
    showBackArrow: false,
    fallbackURL: '/'
  } 

  const handleBackNavigation = (fallbackURL = '/') => {
    if (window.document.referrer) {
      window.history.back();
    } else {
      window.location.href = fallbackURL
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

    const handleVisibilityChange = () => {
      if (window.document.visibilityState === 'hidden') {
        setIsDropdownOpen(false);
      }
    }

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
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
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const handleLogout = () => {    
    // Remove the user profile and session data from localStorage
    localStorage.removeItem('userProfile');
    localStorage.removeItem('authToken');
    
    // Sign out the user using NextAuth's signOut function
    signOut({ callbackUrl: '/login' }); // Redirect to home page after logout
  }

  return (
    <div className={`${styles.profileHeader} ${className}`}>
      <div className={styles.headerContent}>

        <div className={styles.leftHeaderContainer}>
          <div className={styles.logoContainer}>
              <Link className={styles.logoLink} href={'/'}>
                <div className={styles.innerLogoContainer}>
                  <Image
                    src={logoRed}
                    alt='Logo'
                    className={styles.logo}
                  />
                </div>
                <h1 className={styles.vEntH1}>v-ent</h1>
              </Link>
          </div>

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

        <div className={`${styles.searchIconMobileContainer}`}>
          {isSearchBarVisible ? (
            <MdOutlineClose
              className={styles.searchCloseIconMobile}
              onClick={toggleSearchBar}
            />
          ) : (
            <LuSearch
              className={styles.searchIconMobile}
              onClick={toggleSearchBar}
            />
          )}
        </div>

        <div className={styles.hamburgerContainer} onClick={toggleMobileMenu}>
          <label className={styles.hamburger}>
            <span className={`${styles.hamburgerLines} ${isMobileMenuOpen ? styles.show : ''}`}></span>
          </label> 
        </div>

        <MobileSidebar isOpen={isMobileMenuOpen} />

      </div>
    </div>
  );
};

export default MobileHeader;
