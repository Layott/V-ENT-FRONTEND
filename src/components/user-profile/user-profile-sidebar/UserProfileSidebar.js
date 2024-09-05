import Link from 'next/link';
import { FiHome, FiSettings } from "react-icons/fi";
import { MdOutlineEvent } from "react-icons/md";
import { FaTrophy, FaUsers, FaShoppingCart, FaTv } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import styles from './sidebar.module.css'

const UserProfileSidebar = () => {
  return (
    <div className={styles.desktopSidebar}>
        <nav className={styles.sidebarNav}>
        <ul className={styles.sidebarList}>
            <li className={styles.sidebarItem}>
            <Link href={'./'} className={styles.iconLink}>
                <FiHome className={styles.sidebarIcon} />
            </Link>
            <Link href={'./'}>Home</Link>
            </li>
            <li className={styles.sidebarItem}>
            <Link href={'./tournaments'} className={styles.iconLink}>
                <FaTrophy className={styles.sidebarIcon} />
            </Link>
            <Link href={'./tournaments'}>Tournaments</Link>
            </li>
            <li className={styles.sidebarItem}>
            <Link href={'./events'} className={styles.iconLink}>
                <MdOutlineEvent className={styles.sidebarIcon} />
            </Link>
            <Link href={'./events'}>Events</Link>
            </li>
            <li className={styles.sidebarItem}>
            <Link href={'./anime'} className={styles.iconLink}>
                <FaTv className={styles.sidebarIcon} />
            </Link>
            <Link href={'./anime'}>Anime</Link>
            </li>
            <li className={styles.sidebarItem}>
            <Link href={'./rankings'} className={styles.iconLink}>
                <PiRankingBold className={styles.sidebarIcon} />
            </Link>
            <Link href={'./rankings'}>Rankings</Link>
            </li>
            <li className={styles.sidebarItem}>
            <Link href={'./teams'} className={styles.iconLink}>
                <FaUsers className={styles.sidebarIcon} />
            </Link>
            <Link href={'./teams'}>Teams</Link>
            </li>
            <li className={styles.sidebarItem}>
            <Link href={'./marketplace'} className={styles.iconLink}>
                <FaShoppingCart className={styles.sidebarIcon} />
            </Link>
            <Link href={'./marketplace'}>Marketplace</Link> <span className={styles.comingSoon}>Coming Soon</span>
            </li>
            <li className={styles.sidebarItem}>
            <Link href={'./settings'} className={styles.iconLink}>
                <FiSettings className={styles.sidebarIcon} />
            </Link>
            <Link href={'./settings'}>Settings</Link>
            </li>
        </ul>
        </nav>
    </div>
  )
}

export default UserProfileSidebar