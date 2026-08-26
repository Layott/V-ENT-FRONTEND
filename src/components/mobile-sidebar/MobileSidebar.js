import { usePathname } from 'next/navigation';
import Link from 'next/link';
// import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { FaUsers, FaTv, FaUserFriends } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import { IoWalletOutline } from "react-icons/io5";
import { FiShoppingBag } from "react-icons/fi";
import { RiShoppingCart2Line } from "react-icons/ri";
import { MdOutlineSettings, MdBusiness } from "react-icons/md";
import { LuGamepad2 } from "react-icons/lu";
import { MdLogout } from "react-icons/md";
import { signOut } from "next-auth/react";  // Import signOut function from next-auth
import styles from './mobile-sidebar.module.css'
import { PiUserCircle } from "react-icons/pi";
import { useT } from '@/i18n/LanguageProvider';


const MobileSidebar = ({ isOpen }) => {
    const t = useT();
    const pathname = usePathname()      // Gets the current pathname

    // Function to Check if the Route is Active
    const isActive = (href) => {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname === href || pathname.startsWith(href);
    }

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
    <div className={`${styles.mobileSidebar} ${isOpen ? styles.open : ''}`}>

        <nav className={styles.sidebarNav}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/user-profile') ? styles.activeLink : ''}`}>
                    <Link href={'/user-profile'} className={styles.iconTextLink}>
                        {t('nav.profile')} <PiUserCircle className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        {t('nav.tournaments')} <LuGamepad2 className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        {t('nav.events')} <MdOutlineEvent className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/teams') ? styles.activeLink : ''}`}>
                    <Link href={'/teams'} className={styles.iconTextLink}>
                        {t('nav.teams')} <FaUsers className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        {t('nav.rankings')} <PiRankingBold className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink}>
                        {t('nav.wallets')} <IoWalletOutline className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        {t('nav.anime')} <FaTv className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/community') ? styles.activeLink : ''}`}>
                    <Link href={'/community'} className={styles.iconTextLink}>
                        <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>
                        <span className={styles.iconMarketplaceSpan}>{t('nav.community')} <FaUserFriends className={styles.sidebarIcon} /></span>
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/organizations') ? styles.activeLink : ''}`}>
                    <Link href={'/organizations'} className={styles.iconTextLink}>
                        <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>
                        <span className={styles.iconMarketplaceSpan}>{t('nav.organizations')} <MdBusiness className={styles.sidebarIcon} /></span>
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/marketplace') ? styles.activeLink : ''}`}>
                    <Link href={'/marketplace'} className={styles.iconTextLink}>
                        <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>
                        <span className={styles.iconMarketplaceSpan}>{t('nav.marketplace')} <RiShoppingCart2Line className={styles.sidebarIcon} /></span>
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/shop') ? styles.activeLink : ''}`}>
                    <Link href={'/shop'} className={styles.iconTextLink}>
                        <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>
                        <span className={styles.iconShopSpan}>{t('nav.shop')} <FiShoppingBag className={styles.sidebarIcon} /></span>
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink}>
                        {t('nav.settings')} <MdOutlineSettings className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={styles.sidebarItem}>
                    <button onClick={handleLogout} className={styles.logoutButtonLink}>
                        Logout <MdLogout className={styles.sidebarIcon} />
                    </button>
                </li>
            </ul>
        </nav>
    </div>
  )
}

export default MobileSidebar;
