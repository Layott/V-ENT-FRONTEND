import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation';
import Image from 'next/image'
import Link from 'next/link'
import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { FaUsers, FaTv } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import { IoWalletOutline, IoGameControllerOutline } from "react-icons/io5";
import { FiShoppingBag } from "react-icons/fi";
import { RiShoppingCart2Line } from "react-icons/ri";
import { MdOutlineSettings } from "react-icons/md";
import profileImageSmall from "@/images/signed_in_user_small.webp"
import styles from './bottom-menu.module.css'

const BottomMenu = ({ customClass }) => {
  const pathname = usePathname()
  const [menuOpen , setMenuOpen] = useState(false);
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className={styles.bottomMenuContainer}>
        <nav className={styles.bottomNavContainer}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/') ? styles.activeLink : ''}`}>
                    <Link href={'/'} className={styles.iconTextLink}>
                        <BiHomeCircle className={`${styles.sidebarIcon} `} /> Home
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
                
                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        <FaTv className={`${styles.sidebarIcon} ${isActive('/anime') ? styles.activeSidebarIcon : ''}`} /> Anime
                    </Link>
                </li>
                
                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        <PiRankingBold className={`${styles.sidebarIcon} ${isActive('/rankings') ? styles.activeSidebarIcon : ''}`} /> Rankings
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
                            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconMarketplaceSpan}><RiShoppingCart2Line className={styles.sidebarIcon} /> Marketplace</span>
                        <span className={styles.comingSoon}>
                            Coming<br />Soon
                        </span>
                    </span>
                </li>
            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconShopSpan}><FiShoppingBag className={`${styles.sidebarIcon} ${styles.noFillSidebarIcon}`} /> Shop</span>
                        <span className={styles.comingSoon}>
                            Coming<br />Soon
                        </span>
                    </span>
                </li>
            
                <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink}>
                        <MdOutlineSettings className={`${styles.sidebarIcon} ${isActive('/settings') ? styles.activeSidebarIcon : ''}`} /> Settings
                    </Link>
                </li>
            </ul>
        </nav>

        <div className={styles.profileContainerOuter} ref={menuRef}>
            <div className={styles.profileContainer} onClick={toggleMenu}>
                <div className={styles.profileImageContainer}>
                    <Image
                        src={profileImageSmall}
                        alt="Profile"
                        className={styles.profileImage}
                        width={40}
                        height={40}
                    />
                </div>
                <p className={styles.username}>My Profile</p>
            </div>

            {menuOpen && (
                <div className={styles.openUpMenu}>
                    <Link href="/user-profile" className={styles.openUpItem}>User Profile</Link>
                    <Link href={'/'} className={styles.openUpItem}>Logout</Link>
                </div>
            )}

        </div>

    </div>
  )
}

export default BottomMenu