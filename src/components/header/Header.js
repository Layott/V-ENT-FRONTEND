import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { FiArrowLeft } from "react-icons/fi";
import { MdKeyboardArrowRight, MdOutlineClose } from "react-icons/md";
import { FcSearch } from "react-icons/fc";
import { CiSearch } from "react-icons/ci";
import profileImageSmall from "@/images/signed_in_user_small.webp"
import styles from './header.module.css'

const Header = ({ className }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);

    const handleSearch = () => {
      if (searchQuery.trim() != '') {
        console.log(`Searching for: ${searchQuery}`)
        // Add your search logic here
      }
    }
  
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        handleSearch()
      }
    }

    const toggleSearchBar = () => {
      setIsSearchBarVisible((prev) => !prev);
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
              <Link href={'./profile'} className={styles.currentSectionLink}>My Profile</Link>
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
            type='text'
            placeholder='Search tournaments, events, users...'
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div 
          className={`${styles.searchIconMobileContainer} ${isSearchBarVisible ? styles.moveRight : ''}`}
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


        <div className={styles.userDetails}>
            <div className={styles.userInfo}>
            <p className={styles.userName}>Nathan Drake</p>    
            <p className={styles.userUsername}>@frostbite</p>
            </div>
            <div className={styles.userAvatar}>
            <Image
                src={profileImageSmall}
                alt='Signed in user'
            />
            </div>
        </div>

        </div>

    </div>
  )
}

export default Header