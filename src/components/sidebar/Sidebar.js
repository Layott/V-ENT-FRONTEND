import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiHome, FiSettings } from "react-icons/fi";
import { MdOutlineEvent } from "react-icons/md";
import { FaTrophy, FaUsers, FaShoppingCart, FaTv } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import logoRed from "@/images/logo_mark_red.svg"
import styles from './sidebar.module.css'

const Sidebar = ({ customClass }) => {
    const pathname = usePathname()      // Gets the current pathname

    // Function to Check if the Route is Active
    const isActive = (href) => pathname === href

  return (
    <div className={`${styles.desktopSidebar} ${customClass ? customClass : ''}`}>
        <div className={styles.logoContainer}>
            <Link className={styles.logoLink} href={'/'}>
                <div className={styles.innerLogoContainer}>
                    <Image
                        src={logoRed}
                        alt='Logo'
                        className={styles.logo}
                    />
                </div>
                <h1>v-ent</h1>
            </Link>
        </div>

        <nav className={styles.sidebarNav}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/') ? styles.activeLink : ''}`}>
                    <Link href={'/'} className={styles.iconTextLink}>
                        <FiHome className={styles.sidebarIcon} /> Home
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        <FaTrophy className={styles.sidebarIcon} /> Tournaments
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        <MdOutlineEvent className={styles.sidebarIcon} /> Events
                    </Link>
                </li>
                
                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        <FaTv className={styles.sidebarIcon} /> Anime
                    </Link>
                </li>
                
                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        <PiRankingBold className={styles.sidebarIcon} /> Rankings
                    </Link>
                </li>
                
                <li className={`${styles.sidebarItem} ${isActive('/teams') ? styles.activeLink : ''}`}>
                    <Link href={'/teams'} className={styles.iconTextLink}>
                        <FaUsers className={styles.sidebarIcon} /> Teams
                    </Link>
                </li>
                            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <FaShoppingCart className={styles.sidebarIcon} /> Marketplace
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>
            
                <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink}>
                        <FiSettings className={styles.sidebarIcon} /> Settings
                    </Link>
                </li>
            </ul>
        </nav>
    </div>
  )
}

export default Sidebar