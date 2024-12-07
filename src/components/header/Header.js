import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft } from "react-icons/fi";
import { MdKeyboardArrowRight, MdOutlineClose } from "react-icons/md";
import { FcSearch } from "react-icons/fc";
import { CiSearch } from "react-icons/ci";
import { FaCaretDown } from "react-icons/fa";
import profileImageSmall from "@/images/signed_in_user_small.webp";
import styles from './header.module.css';

const Header = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [username, setUsername] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

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
      if (document.visibilityState === 'hidden') {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

  const toggleSearchBar = () => {
    setIsSearchBarVisible((prev) => !prev);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  }

  const handleLogout = () => {
    console.log("Logging out...");
    
    localStorage.removeItem('userProfile');
    window.location.reload();
  }

  return (
    <div className={`${styles.profileHeader} ${className}`}>
      <div className={styles.headerContent}>
        <div className={styles.breadcrumbContainer}>
          <h3 className={styles.breadcrumbTitle}>
            <span className={styles.backArrow}>
              <FiArrowLeft className={styles.backArrowIcon} />
            </span>
            <span className={styles.currentSection}>My Profile</span>
          </h3>

          <nav className={styles.breadcrumbNav}>
            <Link href={'./'}>Home</Link>
            <MdKeyboardArrowRight className={styles.arrowRightIcon} />
            <Link
              href={'./user-profile'}
              className={styles.currentSectionLink}
            >
              My Profile
            </Link>
          </nav>
        </div>

        <div
          className={`${styles.searchBar} ${
            isSearchBarVisible ? styles.showSearchBar : ''
          }`}
        >
          <CiSearch
            className={styles.searchIcon}
            onClick={handleSearch}
          />
          <input
            type="text"
            placeholder="Search tournaments, events, users..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div
          className={`${styles.searchIconMobileContainer} ${
            isSearchBarVisible ? styles.moveRight : ''
          }`}
        >
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
            <FaCaretDown
              className={styles.dropdownArrow}
              onClick={toggleDropdown}
            />
          </div>
            {isDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <Link
                  href={'/user-profile'}
                  className={styles.viewProfile}
                >
                  View Profile
                </Link>

                <button
                  className={styles.logoutBTN}
                  onClick={handleLogout}
                >
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
