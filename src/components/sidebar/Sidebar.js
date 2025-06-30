import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { FaUsers, FaTv } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import { IoWalletOutline } from "react-icons/io5";
import { FiShoppingBag } from "react-icons/fi";
import { RiShoppingCart2Line } from "react-icons/ri";
import { LuGamepad2 } from "react-icons/lu";
import { MdOutlineSettings } from "react-icons/md";
import { MdLogout } from "react-icons/md";
import logoRed from "@/images/logo_mark_red.svg"
import styles from './sidebar.module.css'
import { signOut } from "next-auth/react";  // Import signOut function from next-auth

const Sidebar = ({ customClass }) => {
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
                <li className={`${styles.sidebarItem} ${isActive('/user-profile') ? styles.activeLink : ''}`}>
                    <Link href={'/user-profile'} className={styles.iconTextLink}>
                        <BiHomeCircle className={styles.sidebarIcon} /> Home
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        <LuGamepad2 className={styles.sidebarIcon} /> Tournaments
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        <MdOutlineEvent className={styles.sidebarIcon} /> Events
                    </Link>
                </li>
                
                {/* <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
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
                
                    <Link href={''} className={styles.iconTextLink}>
                        <FaUsers className={styles.sidebarIcon} /> Teams
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink}>
                        <IoWalletOutline className={styles.sidebarIcon} /> Wallets
                    </Link>
                </li> */}
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconMarketplaceSpan}><FaTv className={styles.sidebarIcon} /> Anime</span>
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconMarketplaceSpan}><PiRankingBold className={styles.sidebarIcon} /> Ranking</span>
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconMarketplaceSpan}><FaUsers className={styles.sidebarIcon} /> Teams</span>
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconMarketplaceSpan}><IoWalletOutline className={styles.sidebarIcon} /> Wallets</span>
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>
                            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconMarketplaceSpan}><RiShoppingCart2Line className={styles.sidebarIcon} /> Marketplace</span>
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>
            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconShopSpan}><FiShoppingBag className={styles.sidebarIcon} /> Shop</span>
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.iconMarketplaceSpan}><MdOutlineSettings className={styles.sidebarIcon} /> Settings</span>
                        <span className={styles.comingSoon}>Coming Soon</span>
                    </span>
                </li>

                
                <li className={`${styles.sidebarItem} ? styles.activeLink : ''}`}>
                    <button onClick={handleLogout} className={styles.logoutButtonLink}>
                        <MdLogout className={styles.sidebarIcon} /> Logout
                    </button>
                </li>
            
                {/* <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink}>
                        <MdOutlineSettings className={styles.sidebarIcon} /> Settings
                    </Link>
                </li> */}
            </ul>
        </nav>
    </div>
  )
}

export default Sidebar;